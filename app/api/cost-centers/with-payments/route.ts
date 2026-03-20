import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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
        reference,
        due_amount,
        paid_amount,
        balance_due,
        invoice_date,
        due_date,
        payment_status,
        overdue_30_days,
        overdue_60_days,
        overdue_90_days,
        last_updated,
        billing_month
      `)
      .in('cost_code', codes)
      .order('billing_month', { ascending: false })
      .order('due_date', { ascending: false });

    const { data: accountInvoices, error: invoicesError } = await supabase
      .from('account_invoices')
      .select(`
        id,
        account_number,
        billing_month,
        invoice_number,
        invoice_date,
        subtotal,
        vat_amount,
        total_amount,
        created_at
      `)
      .in('account_number', codes)
      .order('billing_month', { ascending: false })
      .order('created_at', { ascending: false });

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

    const latestPaymentByCode = new Map();
    (payments || []).forEach((payment) => {
      if (!payment?.cost_code) return;
      if (!latestPaymentByCode.has(payment.cost_code)) {
        latestPaymentByCode.set(payment.cost_code, payment);
      }
    });

    const latestInvoiceByCode = new Map();
    (accountInvoices || []).forEach((invoice) => {
      if (!invoice?.account_number) return;
      if (!latestInvoiceByCode.has(invoice.account_number)) {
        latestInvoiceByCode.set(invoice.account_number, invoice);
      }
    });

    const enrichedCostCenters = (costCenters || []).map((center) => ({
      ...center,
      payment: latestPaymentByCode.get(center.cost_code) || null,
      invoice: latestInvoiceByCode.get(center.cost_code) || null,
    }));

    return NextResponse.json({ costCenters: enrichedCostCenters });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Unexpected error', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
