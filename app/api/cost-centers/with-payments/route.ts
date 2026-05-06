import { createClient } from '@/lib/supabase/server';
import {
  getOperationalBillingMonthKey,
  normalizeAgingBucketsToOutstanding,
} from '@/lib/server/account-invoice-payments';
import { NextResponse } from 'next/server';
import { buildDraftPaymentsFromVehicles } from '@/lib/server/account-invoice-payments';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get('prefix');

    if (!prefix) {
      return NextResponse.json({ error: 'prefix is required' }, { status: 400 });
    }

    const cleanPrefix = prefix.trim().replace(/-+$/, '');
    if (!cleanPrefix) {
      return NextResponse.json({ costCenters: [] }, { status: 200 });
    }

    const supabase = await createClient();
    const currentBillingMonthKey = getOperationalBillingMonthKey();

    const { data: costCenters, error: centersError } = await supabase
      .from('cost_centers')
      .select('*')
      .ilike('cost_code', `${cleanPrefix}-%`)
      .order('cost_code', { ascending: true });

    if (centersError) {
      console.error('Error fetching cost centers:', centersError);
      return NextResponse.json(
        { error: 'Failed to fetch cost centers', details: centersError.message },
        { status: 500 }
      );
    }

    const codes = (costCenters || [])
      .map((center) => center.cost_code)
      .filter((code): code is string => typeof code === 'string' && code.length > 0);

    if (codes.length === 0) {
      return NextResponse.json({ costCenters: [] }, { status: 200 });
    }

    const { data: payments, error: paymentsError } = await supabase
      .from('payments_')
      .select(`
        id,
        company,
        cost_code,
        account_invoice_id,
        invoice_number,
        reference,
        due_amount,
        paid_amount,
        balance_due,
        credit_amount,
        invoice_date,
        due_date,
        payment_status,
        current_due,
        overdue_30_days,
        overdue_60_days,
        overdue_90_days,
        overdue_120_plus_days,
        outstanding_balance,
        last_updated,
        billing_month
      `)
      .in('cost_code', codes)
      .order('billing_month', { ascending: false })
      .order('last_updated', { ascending: false })
      .order('due_date', { ascending: false });

    const { data: accountInvoices, error: invoicesError } = await supabase
      .from('account_invoices')
      .select(`
        id,
        account_number,
        billing_month,
        invoice_number,
        company_name,
        invoice_date,
        due_date,
        subtotal,
        vat_amount,
        total_amount,
        paid_amount,
        balance_due,
        payment_status,
        created_at
      `)
      .in('account_number', codes)
      .order('billing_month', { ascending: false })
      .order('created_at', { ascending: false });

    const { data: vehiclesByNewAccount, error: vehiclesByNewAccountError } = await supabase
      .from('vehicles')
      .select('id, reg, company, new_account_number, account_number, total_rental, total_sub')
      .in('new_account_number', codes);

    const { data: vehiclesByAccount, error: vehiclesByAccountError } = await supabase
      .from('vehicles')
      .select('id, reg, company, new_account_number, account_number, total_rental, total_sub')
      .in('account_number', codes);

    if (paymentsError) {
      console.error('Error fetching payments for cost centers:', paymentsError);
      return NextResponse.json(
        { error: 'Failed to fetch payments', details: paymentsError.message },
        { status: 500 }
      );
    }

    if (invoicesError) {
      console.error('Error fetching account invoices for cost centers:', invoicesError);
      return NextResponse.json(
        { error: 'Failed to fetch account invoices', details: invoicesError.message },
        { status: 500 }
      );
    }

    if (vehiclesByNewAccountError || vehiclesByAccountError) {
      console.error('Error fetching vehicles draft totals for cost centers:', vehiclesByNewAccountError || vehiclesByAccountError);
      return NextResponse.json(
        {
          error: 'Failed to fetch vehicle billing totals',
          details: vehiclesByNewAccountError?.message || vehiclesByAccountError?.message,
        },
        { status: 500 }
      );
    }

    const paymentByCodeAndMonth = new Map();
    const getPaymentRowTime = (row: Record<string, unknown> | null | undefined) =>
      new Date(String(row?.last_updated || row?.invoice_date || row?.billing_month || 0)).getTime();
    (payments || []).forEach((payment) => {
      if (!payment?.cost_code) return;
      const paymentKey = `${payment.cost_code}|${payment.billing_month || ''}`;
      const existingPayment = paymentByCodeAndMonth.get(paymentKey);
      if (!existingPayment || getPaymentRowTime(payment) > getPaymentRowTime(existingPayment)) {
        paymentByCodeAndMonth.set(paymentKey, payment);
      }
    });

    const invoiceByCodeAndMonth = new Map();
    (accountInvoices || []).forEach((invoice) => {
      if (!invoice?.account_number) return;
      const invoiceKey = `${invoice.account_number}|${invoice.billing_month || ''}`;
      if (!invoiceByCodeAndMonth.has(invoiceKey)) {
        invoiceByCodeAndMonth.set(invoiceKey, invoice);
      }
    });

    const vehicleMap = new Map();
    [...(vehiclesByNewAccount || []), ...(vehiclesByAccount || [])].forEach((vehicle) => {
      const vehicleKey =
        String(vehicle?.id || '').trim() ||
        String(vehicle?.reg || '').trim().toUpperCase() ||
        JSON.stringify([
          vehicle?.new_account_number || '',
          vehicle?.account_number || '',
          vehicle?.company || '',
          vehicle?.total_rental || '',
          vehicle?.total_sub || '',
        ]);
      if (!vehicleMap.has(vehicleKey)) {
        vehicleMap.set(vehicleKey, vehicle);
      }
    });

    const draftPaymentsByCode = buildDraftPaymentsFromVehicles(Array.from(vehicleMap.values()));

    const enrichedCostCenters = (costCenters || []).map((center) => {
      const currentKey = `${center.cost_code}|${currentBillingMonthKey}`;
      const invoice = invoiceByCodeAndMonth.get(currentKey) || null;
      const paymentKey = currentKey;
      const payment =
        paymentByCodeAndMonth.get(paymentKey) ||
        null;

      const normalizedPayment = invoice
        ? {
            ...(payment || {}),
            id: payment?.id || invoice.id || null,
            company:
              invoice.company_name ||
              payment?.company ||
              center.legal_name ||
              center.company ||
              '',
            cost_code: invoice.account_number || center.cost_code,
            account_invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
            reference: invoice.invoice_number || payment?.reference || '',
            due_amount: Number(invoice.total_amount || payment?.due_amount || 0),
            paid_amount: Number(invoice.paid_amount || payment?.paid_amount || 0),
            balance_due: Number(
              invoice.balance_due ??
                payment?.balance_due ??
                payment?.outstanding_balance ??
                invoice.total_amount ??
                0,
            ),
            credit_amount: Number(payment?.credit_amount || invoice.credit_amount || 0),
            invoice_date: invoice.invoice_date || payment?.invoice_date || null,
            due_date: invoice.due_date || payment?.due_date || null,
            payment_status: invoice.payment_status || payment?.payment_status || 'pending',
            current_due: Number(
              payment?.current_due ??
                invoice.balance_due ??
                invoice.total_amount ??
                0,
            ),
            overdue_30_days: Number(payment?.overdue_30_days || 0),
            overdue_60_days: Number(payment?.overdue_60_days || 0),
            overdue_90_days: Number(payment?.overdue_90_days || 0),
            overdue_120_plus_days: Number(payment?.overdue_120_plus_days || 0),
            outstanding_balance: Number(
              payment?.outstanding_balance ??
                invoice.balance_due ??
                invoice.total_amount ??
                0,
            ),
            last_updated: payment?.last_updated || invoice.created_at || null,
            billing_month: invoice.billing_month || payment?.billing_month || null,
            source: payment ? 'account_invoice_with_mirror' : 'account_invoice',
          }
        : payment ||
          draftPaymentsByCode.get(String(center.cost_code || '').trim().toUpperCase()) ||
          null;

      const balancedPayment = normalizedPayment
        ? (() => {
            const normalizedAging = normalizeAgingBucketsToOutstanding(
              normalizedPayment,
              normalizedPayment.outstanding_balance ?? normalizedPayment.balance_due,
            );

            return {
              ...normalizedPayment,
              current_due: normalizedAging.current_due,
              overdue_30_days: normalizedAging.overdue_30_days,
              overdue_60_days: normalizedAging.overdue_60_days,
              overdue_90_days: normalizedAging.overdue_90_days,
              overdue_120_plus_days: normalizedAging.overdue_120_plus_days,
              outstanding_balance: normalizedAging.outstanding_balance,
              balance_due:
                Number(normalizedPayment.balance_due ?? normalizedAging.outstanding_balance) > 0
                  ? Number(normalizedPayment.balance_due ?? normalizedAging.outstanding_balance)
                  : normalizedAging.outstanding_balance,
            };
          })()
        : null;

      return {
        ...center,
        payment: balancedPayment,
        invoice,
      };
    });

    return NextResponse.json({ costCenters: enrichedCostCenters });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Unexpected error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
