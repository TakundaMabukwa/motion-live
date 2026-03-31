import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  buildDraftPaymentsFromVehicles,
  buildInvoiceFinancials,
  calculateOverdueBuckets,
  normalizeBillingMonth,
} from '@/lib/server/account-invoice-payments';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountNumber = String(searchParams.get('accountNumber') || '').trim().toUpperCase();
    const billingMonth = normalizeBillingMonth(searchParams.get('billingMonth'));

    if (!accountNumber) {
      return NextResponse.json(
        { error: 'Missing required parameter: accountNumber' },
        { status: 400 },
      );
    }

    const currentBillingMonth = billingMonth || (() => {
      const date = new Date();
      date.setDate(1);
      return date.toISOString().slice(0, 10);
    })();

    const supabase = await createClient();

    const [
      { data: invoiceRows, error: invoiceError },
      { data: paymentsMirrorRows, error: paymentsMirrorError },
      { data: latestAgingRows, error: latestAgingError },
      { data: vehiclesByNewAccount, error: vehiclesByNewAccountError },
      { data: vehiclesByAccount, error: vehiclesByAccountError },
      { data: costCenterRow, error: costCenterError },
    ] = await Promise.all([
      supabase
        .from('account_invoices')
        .select(`
          id,
          account_number,
          company_name,
          invoice_number,
          invoice_date,
          due_date,
          total_amount,
          paid_amount,
          balance_due,
          payment_status,
          billing_month,
          created_at
        `)
        .eq('account_number', accountNumber)
        .eq('billing_month', currentBillingMonth)
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('payments_')
        .select(`
          id,
          cost_code,
          account_invoice_id,
          invoice_number,
          reference,
          due_amount,
          paid_amount,
          balance_due,
          invoice_date,
          due_date,
          payment_status,
          current_due,
          billing_month,
          last_updated,
          credit_amount,
          overdue_30_days,
          overdue_60_days,
          overdue_90_days,
          overdue_120_plus_days,
          outstanding_balance
        `)
        .eq('cost_code', accountNumber)
        .eq('billing_month', currentBillingMonth)
        .order('last_updated', { ascending: false })
        .limit(1),
      supabase
        .from('payments_')
        .select(`
          id,
          cost_code,
          current_due,
          overdue_30_days,
          overdue_60_days,
          overdue_90_days,
          overdue_120_plus_days,
          outstanding_balance,
          billing_month,
          last_updated
        `)
        .eq('cost_code', accountNumber)
        .order('billing_month', { ascending: false })
        .order('last_updated', { ascending: false })
        .limit(1),
      supabase
        .from('vehicles')
        .select('id, reg, company, new_account_number, account_number, total_rental, total_sub')
        .eq('new_account_number', accountNumber),
      supabase
        .from('vehicles')
        .select('id, reg, company, new_account_number, account_number, total_rental, total_sub')
        .eq('account_number', accountNumber),
      supabase
        .from('cost_centers')
        .select('cost_code, company, legal_name')
        .eq('cost_code', accountNumber)
        .maybeSingle(),
    ]);

    if (invoiceError || paymentsMirrorError || latestAgingError || vehiclesByNewAccountError || vehiclesByAccountError || costCenterError) {
      const message =
        invoiceError?.message ||
        paymentsMirrorError?.message ||
        latestAgingError?.message ||
        vehiclesByNewAccountError?.message ||
        vehiclesByAccountError?.message ||
        costCenterError?.message ||
        'Unknown database error';

      console.error('Error in by-account endpoint:', message);
      return NextResponse.json({ error: `Database error: ${message}` }, { status: 500 });
    }

    const invoice = Array.isArray(invoiceRows) ? invoiceRows[0] || null : null;
    const paymentsMirror = Array.isArray(paymentsMirrorRows) ? paymentsMirrorRows[0] || null : null;
    const latestAging = Array.isArray(latestAgingRows) ? latestAgingRows[0] || null : null;

    const dedupedVehicles = new Map<string, Record<string, unknown>>();
    [...(vehiclesByNewAccount || []), ...(vehiclesByAccount || [])].forEach((vehicle) => {
      const key =
        String(vehicle?.id || '').trim() ||
        String(vehicle?.reg || '').trim().toUpperCase() ||
        JSON.stringify([
          String(vehicle?.new_account_number || '').trim().toUpperCase(),
          String(vehicle?.account_number || '').trim().toUpperCase(),
          vehicle?.company || '',
          vehicle?.total_rental || '',
          vehicle?.total_sub || '',
        ]);
      if (!dedupedVehicles.has(key)) {
        dedupedVehicles.set(key, vehicle);
      }
    });

    const draft = buildDraftPaymentsFromVehicles(Array.from(dedupedVehicles.values())).get(accountNumber);
    const company =
      invoice?.company_name ||
      draft?.company ||
      costCenterRow?.legal_name ||
      costCenterRow?.company ||
      accountNumber;

    let payment: Record<string, unknown> | null = null;

    if (invoice) {
      const financials = buildInvoiceFinancials({
        totalAmount: invoice.total_amount,
        paidAmount: invoice.paid_amount,
        dueDate: invoice.due_date,
      });

      payment = {
        id: invoice.id,
        company,
        cost_code: accountNumber,
        account_invoice_id: invoice.id,
        invoice_number: invoice.invoice_number || null,
        reference: invoice.invoice_number || '',
        due_amount: Number(financials.totalAmount || 0),
        paid_amount: Number(financials.paidAmount || 0),
        balance_due: Number(financials.balanceDue || 0),
        invoice_date: invoice.invoice_date || null,
        due_date: invoice.due_date || null,
        payment_status: invoice.payment_status || financials.paymentStatus,
        billing_month: invoice.billing_month || currentBillingMonth,
        last_updated: invoice.created_at || new Date().toISOString(),
        credit_amount: Number(paymentsMirror?.credit_amount || 0),
        source: 'account_invoice',
      };
    } else if (draft) {
      payment = {
        ...draft,
        company,
        cost_code: accountNumber,
        billing_month: draft.billing_month || currentBillingMonth,
        credit_amount: Number(paymentsMirror?.credit_amount || 0),
      };
    } else if (paymentsMirror) {
      payment = {
        ...paymentsMirror,
        company,
        cost_code: accountNumber,
        billing_month: paymentsMirror.billing_month || currentBillingMonth,
        credit_amount: Number(paymentsMirror.credit_amount || 0),
        source: 'payments_mirror',
      };
    }

    if (!payment) {
      return NextResponse.json({
        payment: null,
        message: `No current billing record found for account: ${accountNumber}`,
      });
    }

    const overdue = calculateOverdueBuckets({
      balanceDue: payment.balance_due,
      dueDate: payment.due_date,
    });
    const mirroredCurrentDue = Number(
      paymentsMirror?.current_due ??
        payment.balance_due ??
        overdue.currentDue ??
        0,
    );
    const agingSource = latestAging || paymentsMirror || null;
    const mirroredOverdue30 = Number(agingSource?.overdue_30_days ?? overdue.overdue30Days ?? 0);
    const mirroredOverdue60 = Number(agingSource?.overdue_60_days ?? overdue.overdue60Days ?? 0);
    const mirroredOverdue90 = Number(agingSource?.overdue_90_days ?? overdue.overdue90Days ?? 0);
    const mirroredOverdue120 = Number(paymentsMirror?.overdue_120_plus_days ?? overdue.overdue91PlusDays ?? 0);
    const mirroredOverdue120FromAging = Number(
      agingSource?.overdue_120_plus_days ?? mirroredOverdue120 ?? overdue.overdue91PlusDays ?? 0,
    );
    const mirroredOutstanding = Number(
      agingSource?.outstanding_balance ??
        (mirroredCurrentDue + mirroredOverdue30 + mirroredOverdue60 + mirroredOverdue90 + mirroredOverdue120FromAging),
    );

    return NextResponse.json({
      payment: {
        ...payment,
        overdue_30_days: mirroredOverdue30,
        overdue_60_days: mirroredOverdue60,
        overdue_90_days: mirroredOverdue90,
        overdue_120_plus_days: mirroredOverdue120FromAging,
        overdue_91_plus_days: mirroredOverdue120FromAging,
        current_due: mirroredCurrentDue,
        outstanding_balance: mirroredOutstanding,
      },
      message: 'Current billing record retrieved successfully',
    });
  } catch (error) {
    console.error('Error in by-account endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
