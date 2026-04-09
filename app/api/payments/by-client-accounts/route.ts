import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  buildDraftPaymentsFromVehicles,
  buildInvoiceFinancials,
  calculateOverdueBuckets,
  getOperationalBillingMonthKey,
} from '@/lib/server/account-invoice-payments';

const roundCurrency = (value: unknown) => Number(Number(value || 0).toFixed(2));

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const allNewAccountNumbers = searchParams.get('all_new_account_numbers');
    const requestedBillingMonth = searchParams.get('billingMonth');

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
    const currentBillingMonthKey =
      requestedBillingMonth && /^\d{4}-\d{2}(?:-\d{2})?$/.test(requestedBillingMonth)
        ? `${requestedBillingMonth.slice(0, 7)}-01`
        : getOperationalBillingMonthKey();

    const [
      { data: paymentsMirrorRows, error: paymentsMirrorError },
      { data: invoices, error: invoicesError },
      { data: bulkInvoices, error: bulkInvoicesError },
      { data: vehiclesByNewAccount, error: vehiclesByNewAccountError },
      { data: vehiclesByAccount, error: vehiclesByAccountError },
      { data: costCenters, error: costCentersError },
    ] = await Promise.all([
      supabase
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
          outstanding_balance,
          credit_amount,
          invoice_date,
          due_date,
          payment_status,
          current_due,
          overdue_30_days,
          overdue_60_days,
          overdue_90_days,
          overdue_120_plus_days,
          last_updated,
          billing_month
        `)
        .in('cost_code', accountNumbers)
        .eq('billing_month', currentBillingMonthKey)
        .order('last_updated', { ascending: false }),
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
        .from('bulk_account_invoices')
        .select(`
          id,
          account_number,
          invoice_number,
          invoice_date,
          total_amount,
          billing_month,
          created_at,
          invoice_locked
        `)
        .in('account_number', accountNumbers)
        .eq('billing_month', currentBillingMonthKey)
        .eq('invoice_locked', true)
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

    if (paymentsMirrorError || invoicesError || bulkInvoicesError || vehiclesByNewAccountError || vehiclesByAccountError || costCentersError) {
      return NextResponse.json(
        {
          error: `Database error: ${
            paymentsMirrorError?.message ||
            invoicesError?.message ||
            bulkInvoicesError?.message ||
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

    const lockedBulkInvoiceByCode = new Map<string, Record<string, unknown>>();
    (bulkInvoices || []).forEach((invoice) => {
      const accountNumber = String(invoice?.account_number || '').trim().toUpperCase();
      if (!accountNumber || lockedBulkInvoiceByCode.has(accountNumber)) {
        return;
      }
      lockedBulkInvoiceByCode.set(accountNumber, invoice);
    });

    const paymentsMirrorByCode = new Map<string, Record<string, unknown>>();
    (paymentsMirrorRows || []).forEach((payment) => {
      const accountNumber = String(payment?.cost_code || '').trim().toUpperCase();
      if (!accountNumber || paymentsMirrorByCode.has(accountNumber)) {
        return;
      }
      paymentsMirrorByCode.set(accountNumber, payment);
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
      const mirroredPayment = paymentsMirrorByCode.get(accountNumber);
      const invoice = invoiceByCode.get(accountNumber);
      const lockedBulkInvoice = lockedBulkInvoiceByCode.get(accountNumber);
      const draft = draftPaymentsByCode.get(accountNumber);
      const center = costCenterByCode.get(accountNumber);
      const company =
        center?.legal_name ||
        center?.company ||
        invoice?.company_name ||
        draft?.company ||
        accountNumber;

      if (lockedBulkInvoice) {
        const financials = buildInvoiceFinancials({
          totalAmount: lockedBulkInvoice.total_amount,
          paidAmount: 0,
          dueDate: lockedBulkInvoice.invoice_date,
        });

        return {
          id: lockedBulkInvoice.id,
          company,
          cost_code: accountNumber,
          account_invoice_id: lockedBulkInvoice.id,
          invoice_number: lockedBulkInvoice.invoice_number || null,
          reference: lockedBulkInvoice.invoice_number || '',
          due_amount: roundCurrency(financials.totalAmount),
          paid_amount: 0,
          balance_due: roundCurrency(financials.totalAmount),
          invoice_date: lockedBulkInvoice.invoice_date || null,
          due_date: null,
          payment_status: 'pending',
          last_updated: lockedBulkInvoice.created_at || new Date().toISOString(),
          billing_month: lockedBulkInvoice.billing_month || currentBillingMonthKey,
          source: 'locked_bulk_invoice',
          current_due: 0,
          overdue_30_days: 0,
          overdue_60_days: 0,
          overdue_90_days: 0,
          overdue_120_plus_days: 0,
          outstanding_balance: roundCurrency(financials.totalAmount),
          credit_amount: 0,
          invoice_locked: true,
        };
      }

      if (mirroredPayment) {
        return {
          ...mirroredPayment,
          company: mirroredPayment.company || company,
          cost_code: accountNumber,
          due_amount: roundCurrency(mirroredPayment.due_amount),
          paid_amount: roundCurrency(mirroredPayment.paid_amount),
          balance_due: roundCurrency(
            mirroredPayment.outstanding_balance ?? mirroredPayment.balance_due,
          ),
          outstanding_balance: roundCurrency(
            mirroredPayment.outstanding_balance ?? mirroredPayment.balance_due,
          ),
          current_due: roundCurrency(mirroredPayment.current_due),
          overdue_30_days: roundCurrency(mirroredPayment.overdue_30_days),
          overdue_60_days: roundCurrency(mirroredPayment.overdue_60_days),
          overdue_90_days: roundCurrency(mirroredPayment.overdue_90_days),
          overdue_120_plus_days: roundCurrency(mirroredPayment.overdue_120_plus_days),
          credit_amount: roundCurrency(mirroredPayment.credit_amount),
          source: 'payments_mirror',
        };
      }

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
          current_due: 0,
          overdue_30_days: 0,
          overdue_60_days: 0,
          overdue_90_days: 0,
          overdue_120_plus_days: 0,
          outstanding_balance: roundCurrency(financials.balanceDue),
          credit_amount: 0,
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
          outstanding_balance: roundCurrency(draft.balance_due),
          current_due: roundCurrency(draft.current_due),
          overdue_30_days: roundCurrency(draft.overdue_30_days),
          overdue_60_days: roundCurrency(draft.overdue_60_days),
          overdue_90_days: roundCurrency(draft.overdue_90_days),
          overdue_120_plus_days: roundCurrency(draft.overdue_120_plus_days),
          credit_amount: 0,
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
        current_due: 0,
        overdue_30_days: 0,
        overdue_60_days: 0,
        overdue_90_days: 0,
        overdue_120_plus_days: 0,
        outstanding_balance: 0,
        credit_amount: 0,
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
      const currentDue = roundCurrency(row.current_due ?? overdue.currentDue);
      const overdue30 = roundCurrency(row.overdue_30_days ?? overdue.overdue30Days);
      const overdue60 = roundCurrency(row.overdue_60_days ?? overdue.overdue60Days);
      const overdue90 = roundCurrency(row.overdue_90_days ?? overdue.overdue90Days);
      const overdue120 = roundCurrency(row.overdue_120_plus_days ?? overdue.overdue91PlusDays);
      const outstandingBalance = roundCurrency(row.outstanding_balance ?? row.balance_due);

      summary.totalDueAmount += Number(row.due_amount || 0);
      summary.totalPaidAmount += Number(row.paid_amount || 0);
      summary.totalBalanceDue += outstandingBalance;
      summary.totalOverdue30 += overdue30;
      summary.totalOverdue60 += overdue60;
      summary.totalOverdue90 += overdue90 + overdue120;

      const status = String(row.payment_status || '').toLowerCase();
      if (Object.prototype.hasOwnProperty.call(summary.statusCounts, status)) {
        summary.statusCounts[status as keyof typeof summary.statusCounts] += 1;
      }

      return {
        ...row,
        balance_due: outstandingBalance,
        outstanding_balance: outstandingBalance,
        overdue_30_days: overdue30,
        overdue_60_days: overdue60,
        overdue_90_days: overdue90,
        overdue_120_plus_days: overdue120,
        overdue_91_plus_days: overdue120,
        current_due: currentDue,
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
