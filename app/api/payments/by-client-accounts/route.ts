import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  buildDraftPaymentsFromVehicles,
  buildInvoiceFinancials,
  calculateOverdueBuckets,
} from '@/lib/server/account-invoice-payments';

const roundCurrency = (value: unknown) => Number(Number(value || 0).toFixed(2));

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const allNewAccountNumbers = searchParams.get('all_new_account_numbers');

    if (!allNewAccountNumbers) {
      return NextResponse.json(
        { error: 'Missing required parameter: all_new_account_numbers' },
        { status: 400 },
      );
    }

    const accountNumbers = allNewAccountNumbers
      .split(',')
      .map((code) => code.trim().toUpperCase())
      .filter((code) => code.length > 0);

    if (accountNumbers.length === 0) {
      return NextResponse.json({
        payments: [],
        summary: {
          totalDueAmount: 0,
          totalPaidAmount: 0,
          totalBalanceDue: 0,
          totalOverdue30: 0,
          totalOverdue60: 0,
          totalOverdue90: 0,
          paymentCount: 0,
          statusCounts: {
            pending: 0,
            paid: 0,
            overdue: 0,
            partial: 0,
          },
        },
        accountNumbers: [],
        message: 'No valid account numbers provided',
      });
    }

    const supabase = await createClient();
    const currentBillingMonth = new Date();
    currentBillingMonth.setDate(1);
    const currentBillingMonthKey = currentBillingMonth.toISOString().slice(0, 10);

    const [
      { data: invoices, error: invoicesError },
      { data: vehiclesByNewAccount, error: vehiclesByNewAccountError },
      { data: vehiclesByAccount, error: vehiclesByAccountError },
      { data: costCenters, error: costCentersError },
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
        .in('account_number', accountNumbers)
        .eq('billing_month', currentBillingMonthKey)
        .order('created_at', { ascending: false }),
      supabase
        .from('vehicles')
        .select('id, reg, company, new_account_number, account_number, total_rental, total_sub')
        .in('new_account_number', accountNumbers),
      supabase
        .from('vehicles')
        .select('id, reg, company, new_account_number, account_number, total_rental, total_sub')
        .in('account_number', accountNumbers),
      supabase
        .from('cost_centers')
        .select('cost_code, company, legal_name')
        .in('cost_code', accountNumbers),
    ]);

    if (invoicesError || vehiclesByNewAccountError || vehiclesByAccountError || costCentersError) {
      return NextResponse.json(
        {
          error: `Database error: ${
            invoicesError?.message ||
            vehiclesByNewAccountError?.message ||
            vehiclesByAccountError?.message ||
            costCentersError?.message
          }`,
        },
        { status: 500 },
      );
    }

    const invoiceByCode = new Map<string, Record<string, unknown>>();
    (invoices || []).forEach((invoice) => {
      const accountNumber = String(invoice?.account_number || '').trim().toUpperCase();
      if (!accountNumber || invoiceByCode.has(accountNumber)) {
        return;
      }
      invoiceByCode.set(accountNumber, invoice);
    });

    const vehicleMap = new Map<string, Record<string, unknown>>();
    [...(vehiclesByNewAccount || []), ...(vehiclesByAccount || [])].forEach((vehicle) => {
      const vehicleKey =
        String(vehicle?.id || '').trim() ||
        String(vehicle?.reg || '').trim().toUpperCase() ||
        JSON.stringify([
          String(vehicle?.new_account_number || '').trim().toUpperCase(),
          String(vehicle?.account_number || '').trim().toUpperCase(),
          vehicle?.company || '',
          vehicle?.total_rental || '',
          vehicle?.total_sub || '',
        ]);
      if (!vehicleMap.has(vehicleKey)) {
        vehicleMap.set(vehicleKey, vehicle);
      }
    });

    const draftPaymentsByCode = buildDraftPaymentsFromVehicles(Array.from(vehicleMap.values()));
    const costCenterByCode = new Map<string, Record<string, unknown>>();
    (costCenters || []).forEach((center) => {
      const accountNumber = String(center?.cost_code || '').trim().toUpperCase();
      if (accountNumber) {
        costCenterByCode.set(accountNumber, center);
      }
    });

    const rows = accountNumbers.map((accountNumber) => {
      const invoice = invoiceByCode.get(accountNumber);
      const draft = draftPaymentsByCode.get(accountNumber);
      const center = costCenterByCode.get(accountNumber);
      const company =
        invoice?.company_name ||
        draft?.company ||
        center?.legal_name ||
        center?.company ||
        accountNumber;

      if (invoice) {
        const financials = buildInvoiceFinancials({
          totalAmount: invoice.total_amount,
          paidAmount: invoice.paid_amount,
          dueDate: invoice.due_date,
        });

        return {
          id: invoice.id,
          company,
          cost_code: accountNumber,
          account_invoice_id: invoice.id,
          invoice_number: invoice.invoice_number || null,
          reference: invoice.invoice_number || '',
          due_amount: roundCurrency(financials.totalAmount),
          paid_amount: roundCurrency(financials.paidAmount),
          balance_due: roundCurrency(financials.balanceDue),
          invoice_date: invoice.invoice_date || null,
          due_date: invoice.due_date || null,
          payment_status: invoice.payment_status || financials.paymentStatus,
          last_updated: invoice.created_at || new Date().toISOString(),
          billing_month: invoice.billing_month || currentBillingMonthKey,
          source: 'account_invoice',
        };
      }

      if (draft) {
        return {
          ...draft,
          company: draft.company || company,
          cost_code: accountNumber,
          due_amount: roundCurrency(draft.due_amount),
          paid_amount: roundCurrency(draft.paid_amount),
          balance_due: roundCurrency(draft.balance_due),
          billing_month: draft.billing_month || currentBillingMonthKey,
        };
      }

      return {
        id: null,
        company,
        cost_code: accountNumber,
        account_invoice_id: null,
        invoice_number: null,
        reference: '',
        due_amount: 0,
        paid_amount: 0,
        balance_due: 0,
        invoice_date: null,
        due_date: null,
        payment_status: 'pending',
        overdue_30_days: 0,
        overdue_60_days: 0,
        overdue_90_days: 0,
        last_updated: new Date().toISOString(),
        billing_month: currentBillingMonthKey,
        source: 'no_billing_data',
      };
    });

    const summary = {
      totalDueAmount: 0,
      totalPaidAmount: 0,
      totalBalanceDue: 0,
      totalOverdue30: 0,
      totalOverdue60: 0,
      totalOverdue90: 0,
      paymentCount: rows.length,
      statusCounts: {
        pending: 0,
        paid: 0,
        overdue: 0,
        partial: 0,
      },
    };

    const payments = rows.map((row) => {
      const overdue = calculateOverdueBuckets({
        balanceDue: row.balance_due,
        dueDate: row.due_date,
      });

      summary.totalDueAmount += Number(row.due_amount || 0);
      summary.totalPaidAmount += Number(row.paid_amount || 0);
      summary.totalBalanceDue += Number(row.balance_due || 0);
      summary.totalOverdue30 += overdue.overdue30Days;
      summary.totalOverdue60 += overdue.overdue60Days;
      summary.totalOverdue90 += overdue.overdue90Days + overdue.overdue91PlusDays;

      const status = String(row.payment_status || '').toLowerCase();
      if (Object.prototype.hasOwnProperty.call(summary.statusCounts, status)) {
        summary.statusCounts[status as keyof typeof summary.statusCounts] += 1;
      }

      return {
        ...row,
        overdue_30_days: overdue.overdue30Days,
        overdue_60_days: overdue.overdue60Days,
        overdue_90_days: overdue.overdue90Days + overdue.overdue91PlusDays,
        overdue_91_plus_days: overdue.overdue91PlusDays,
        current_due: overdue.currentDue,
      };
    });

    return NextResponse.json({
      payments,
      summary,
      accountNumbers,
      message: `Retrieved ${payments.length} current-month billing records for ${accountNumbers.length} account numbers`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
