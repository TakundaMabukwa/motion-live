import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  buildDraftPaymentsFromVehicles,
  buildInvoiceFinancials,
  calculateOverdueBuckets,
  getOperationalBillingMonthKey,
  normalizeBillingMonth,
} from '@/lib/server/account-invoice-payments';

const toNumeric = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundMoney = (value: unknown) => Number(toNumeric(value).toFixed(2));

const uniqueAccountNumbers = (values: unknown[]) =>
  Array.from(
    new Set(
      values
        .map((value) => String(value || '').trim().toUpperCase())
        .filter(Boolean),
    ),
  );

const aggregateMirrorRows = (rows: Array<Record<string, unknown>> = []) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  const sortedRows = [...rows].sort((left, right) => {
    const leftTime = new Date(
      String(left?.last_updated || left?.invoice_date || left?.billing_month || 0),
    ).getTime();
    const rightTime = new Date(
      String(right?.last_updated || right?.invoice_date || right?.billing_month || 0),
    ).getTime();
    return rightTime - leftTime;
  });

  const latestRow = sortedRows[0];

  return {
    ...latestRow,
    current_due: roundMoney(sortedRows.reduce((sum, row) => sum + toNumeric(row?.current_due), 0)),
    overdue_30_days: roundMoney(
      sortedRows.reduce((sum, row) => sum + toNumeric(row?.overdue_30_days), 0),
    ),
    overdue_60_days: roundMoney(
      sortedRows.reduce((sum, row) => sum + toNumeric(row?.overdue_60_days), 0),
    ),
    overdue_90_days: roundMoney(
      sortedRows.reduce((sum, row) => sum + toNumeric(row?.overdue_90_days), 0),
    ),
    overdue_120_plus_days: roundMoney(
      sortedRows.reduce((sum, row) => sum + toNumeric(row?.overdue_120_plus_days), 0),
    ),
    outstanding_balance: roundMoney(
      sortedRows.reduce(
        (sum, row) =>
          sum +
          toNumeric(
            row?.outstanding_balance ?? row?.balance_due ?? row?.amount_due ?? 0,
          ),
        0,
      ),
    ),
    paid_amount: roundMoney(
      sortedRows.reduce((sum, row) => sum + toNumeric(row?.paid_amount), 0),
    ),
    credit_amount: roundMoney(
      sortedRows.reduce((sum, row) => sum + toNumeric(row?.credit_amount), 0),
    ),
    balance_due: roundMoney(
      sortedRows.reduce(
        (sum, row) => sum + toNumeric(row?.balance_due ?? row?.amount_due ?? 0),
        0,
      ),
    ),
    due_amount: roundMoney(
      sortedRows.reduce((sum, row) => sum + toNumeric(row?.due_amount ?? row?.amount_due ?? 0), 0),
    ),
  };
};

const aggregateInvoiceRows = (rows: Array<Record<string, unknown>> = []) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  const sortedRows = [...rows].sort((left, right) => {
    const leftTime = new Date(
      String(left?.created_at || left?.invoice_date || left?.billing_month || 0),
    ).getTime();
    const rightTime = new Date(
      String(right?.created_at || right?.invoice_date || right?.billing_month || 0),
    ).getTime();
    return rightTime - leftTime;
  });

  const latestRow = sortedRows[0];
  const summedTotal = roundMoney(sortedRows.reduce((sum, row) => sum + toNumeric(row?.total_amount), 0));
  const summedPaid = roundMoney(sortedRows.reduce((sum, row) => sum + toNumeric(row?.paid_amount), 0));
  const summedBalance = roundMoney(sortedRows.reduce((sum, row) => sum + toNumeric(row?.balance_due), 0));

  return {
    ...latestRow,
    invoice_number: sortedRows.length === 1 ? latestRow?.invoice_number || null : null,
    total_amount: summedTotal,
    paid_amount: summedPaid,
    balance_due: summedBalance,
    payment_status: sortedRows.every((row) => String(row?.payment_status || '').toLowerCase() === 'paid')
      ? 'paid'
      : sortedRows.some((row) => toNumeric(row?.paid_amount) > 0)
        ? 'partial'
        : latestRow?.payment_status || 'pending',
  };
};

const aggregateDraftRows = (drafts: Array<Record<string, unknown>> = []) => {
  if (!Array.isArray(drafts) || drafts.length === 0) {
    return null;
  }

  const latestDraft = drafts[0];
  return {
    ...latestDraft,
    due_amount: roundMoney(drafts.reduce((sum, row) => sum + toNumeric(row?.due_amount), 0)),
    paid_amount: roundMoney(drafts.reduce((sum, row) => sum + toNumeric(row?.paid_amount), 0)),
    balance_due: roundMoney(drafts.reduce((sum, row) => sum + toNumeric(row?.balance_due), 0)),
  };
};

const normalizeAgingBuckets = (row: Record<string, unknown> | null) => {
  const buckets = {
    current_due: toNumeric(row?.current_due),
    overdue_30_days: toNumeric(row?.overdue_30_days),
    overdue_60_days: toNumeric(row?.overdue_60_days),
    overdue_90_days: toNumeric(row?.overdue_90_days),
    overdue_120_plus_days: toNumeric(row?.overdue_120_plus_days),
  };

  const outstanding = toNumeric(row?.outstanding_balance);
  const total =
    buckets.current_due +
    buckets.overdue_30_days +
    buckets.overdue_60_days +
    buckets.overdue_90_days +
    buckets.overdue_120_plus_days;

  if (total <= outstanding + 0.01) {
    return buckets;
  }

  let overflow = total - outstanding;
  const bucketKeys = ['overdue_120_plus_days', 'overdue_90_days', 'overdue_60_days', 'overdue_30_days', 'current_due'] as const;
  for (const key of bucketKeys) {
    if (overflow <= 0.01) break;
    const available = buckets[key];
    if (available <= 0) continue;
    const deduction = Math.min(available, overflow);
    buckets[key] = Math.max(0, available - deduction);
    overflow -= deduction;
  }

  return buckets;
};

const rollForwardPriorAging = (row: Record<string, unknown> | null) => {
  const normalized = normalizeAgingBuckets(row);
  return {
    overdue_30_days: normalized.current_due,
    overdue_60_days: normalized.overdue_30_days,
    overdue_90_days: normalized.overdue_60_days,
    overdue_120_plus_days: normalized.overdue_90_days + normalized.overdue_120_plus_days,
  };
};

const monthsBetweenBillingMonths = (fromBillingMonth: unknown, toBillingMonth: unknown) => {
  const fromRaw = String(fromBillingMonth || '').slice(0, 10);
  const toRaw = String(toBillingMonth || '').slice(0, 10);
  if (!fromRaw || !toRaw) return 0;

  const fromDate = new Date(`${fromRaw}T00:00:00.000Z`);
  const toDate = new Date(`${toRaw}T00:00:00.000Z`);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return 0;

  return Math.max(
    0,
    (toDate.getUTCFullYear() - fromDate.getUTCFullYear()) * 12 +
      (toDate.getUTCMonth() - fromDate.getUTCMonth()),
  );
};

const shiftAgingBucketsByMonths = (row: Record<string, unknown> | null, months: number) => {
  const normalized = normalizeAgingBuckets(row);
  const shifted = { ...normalized };

  for (let index = 0; index < months; index += 1) {
    shifted.overdue_120_plus_days =
      shifted.overdue_120_plus_days + shifted.overdue_90_days;
    shifted.overdue_90_days = shifted.overdue_60_days;
    shifted.overdue_60_days = shifted.overdue_30_days;
    shifted.overdue_30_days = shifted.current_due;
    shifted.current_due = 0;
  }

  return shifted;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountNumber = String(searchParams.get('accountNumber') || '').trim().toUpperCase();
    const accountNumbers = uniqueAccountNumbers([
      accountNumber,
      ...String(searchParams.get('accountNumbers') || '')
        .split(',')
        .map((value) => value.trim()),
    ]);
    const billingMonth = normalizeBillingMonth(searchParams.get('billingMonth'));

    if (!accountNumber) {
      return NextResponse.json(
        { error: 'Missing required parameter: accountNumber' },
        { status: 400 },
      );
    }

    const currentBillingMonth = billingMonth || getOperationalBillingMonthKey();

    const supabase = await createClient();

    const [
      { data: invoiceRows, error: invoiceError },
      { data: paymentsMirrorRows, error: paymentsMirrorError },
      { data: latestAgingRows, error: latestAgingError },
      { data: priorAgingRows, error: priorAgingError },
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
        .in('account_number', accountNumbers)
        .eq('billing_month', currentBillingMonth)
        .order('created_at', { ascending: false })
        ,
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
        .in('cost_code', accountNumbers)
        .eq('billing_month', currentBillingMonth)
        .order('last_updated', { ascending: false }),
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
        .in('cost_code', accountNumbers)
        .lte('billing_month', currentBillingMonth)
        .order('billing_month', { ascending: false })
        .order('last_updated', { ascending: false }),
      supabase
        .from('payments_')
        .select(`
          cost_code,
          paid_amount,
          credit_amount,
          current_due,
          overdue_30_days,
          overdue_60_days,
          overdue_90_days,
          overdue_120_plus_days,
          outstanding_balance,
          billing_month,
          last_updated
        `)
        .in('cost_code', accountNumbers)
        .lt('billing_month', currentBillingMonth)
        .order('billing_month', { ascending: false })
        .order('last_updated', { ascending: false }),
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
        .in('cost_code', accountNumbers)
    ]);

    if (invoiceError || paymentsMirrorError || latestAgingError || priorAgingError || vehiclesByNewAccountError || vehiclesByAccountError || costCenterError) {
      const message =
        invoiceError?.message ||
        paymentsMirrorError?.message ||
        latestAgingError?.message ||
        priorAgingError?.message ||
        vehiclesByNewAccountError?.message ||
        vehiclesByAccountError?.message ||
        costCenterError?.message ||
        'Unknown database error';

      console.error('Error in by-account endpoint:', message);
      return NextResponse.json({ error: `Database error: ${message}` }, { status: 500 });
    }

    const invoice = aggregateInvoiceRows(Array.isArray(invoiceRows) ? invoiceRows : []);
    const paymentsMirror = aggregateMirrorRows(
      Array.isArray(paymentsMirrorRows) ? paymentsMirrorRows : [],
    );
    const latestAgingCandidates = Array.isArray(latestAgingRows) ? latestAgingRows : [];
    const latestAging = aggregateMirrorRows(
      latestAgingCandidates.filter(
        (row) => normalizeBillingMonth(row?.billing_month) === currentBillingMonth,
      ),
    ) ||
      aggregateMirrorRows(latestAgingCandidates);
    const priorAgingRowsList = Array.isArray(priorAgingRows) ? priorAgingRows : [];

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

    const draftMap = buildDraftPaymentsFromVehicles(Array.from(dedupedVehicles.values()));
    const draft = aggregateDraftRows(
      accountNumbers
        .map((number) => draftMap.get(number))
        .filter(Boolean) as Record<string, unknown>[],
    );
    const company =
      invoice?.company_name ||
      draft?.company ||
      (Array.isArray(costCenterRow)
        ? costCenterRow.find((row) => String(row?.cost_code || '').trim().toUpperCase() === accountNumber)?.legal_name ||
          costCenterRow.find((row) => String(row?.cost_code || '').trim().toUpperCase() === accountNumber)?.company ||
          costCenterRow[0]?.legal_name ||
          costCenterRow[0]?.company
        : costCenterRow?.legal_name || costCenterRow?.company) ||
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
    const priorAgingByMonth = new Map<string, Record<string, unknown>[]>();
    priorAgingRowsList.forEach((row) => {
      const key = normalizeBillingMonth(row?.billing_month) || '';
      if (!key) return;
      const current = priorAgingByMonth.get(key) || [];
      current.push(row);
      priorAgingByMonth.set(key, current);
    });

    const aggregatedPriorAgingRows = Array.from(priorAgingByMonth.entries())
      .map(([billingMonthKey, rows]) => {
        const aggregated = aggregateMirrorRows(rows);
        return aggregated ? { ...aggregated, billing_month: billingMonthKey } : null;
      })
      .filter(Boolean) as Record<string, unknown>[];

    const agingCandidates = [latestAging, ...aggregatedPriorAgingRows].filter(Boolean) as Record<string, unknown>[];
    const effectiveAgingRow =
      agingCandidates.find((row) => {
        const normalized = normalizeAgingBuckets(row);
        return (
          normalized.current_due +
            normalized.overdue_30_days +
            normalized.overdue_60_days +
            normalized.overdue_90_days +
            normalized.overdue_120_plus_days >
          0.01
        );
      }) || null;
    const effectiveAgingMonths = effectiveAgingRow
      ? monthsBetweenBillingMonths(effectiveAgingRow.billing_month, currentBillingMonth)
      : 0;
    const shiftedAging = effectiveAgingRow
      ? shiftAgingBucketsByMonths(effectiveAgingRow, effectiveAgingMonths)
      : null;
    const fallbackCurrentDue = Number(
      paymentsMirror?.current_due ??
        payment.balance_due ??
        overdue.currentDue ??
        0,
    );
    const mirroredCurrentDue = Number(
      shiftedAging?.current_due ??
        effectiveAgingRow?.current_due ??
        fallbackCurrentDue,
    );
    const mirroredOverdue30 = Number(
      shiftedAging?.overdue_30_days ??
        effectiveAgingRow?.overdue_30_days ??
        overdue.overdue30Days ??
        0,
    );
    const mirroredOverdue60 = Number(
      shiftedAging?.overdue_60_days ??
        effectiveAgingRow?.overdue_60_days ??
        overdue.overdue60Days ??
        0,
    );
    const mirroredOverdue90 = Number(
      shiftedAging?.overdue_90_days ??
        effectiveAgingRow?.overdue_90_days ??
        overdue.overdue90Days ??
        0,
    );
    const mirroredOverdue120FromAging = Number(
      shiftedAging?.overdue_120_plus_days ??
        effectiveAgingRow?.overdue_120_plus_days ??
        paymentsMirror?.overdue_120_plus_days ??
        overdue.overdue91PlusDays ??
        0,
    );
    const mirroredOutstanding = Number(
      shiftedAging
        ? mirroredCurrentDue +
            mirroredOverdue30 +
            mirroredOverdue60 +
            mirroredOverdue90 +
            mirroredOverdue120FromAging
        : effectiveAgingRow?.outstanding_balance ??
            paymentsMirror?.outstanding_balance ??
            (mirroredCurrentDue +
              overdue.overdue30Days +
              overdue.overdue60Days +
              overdue.overdue90Days +
              overdue.overdue91PlusDays),
    );
    const statementPaidAmount = Number(
      priorAgingRowsList.reduce((sum, row) => sum + toNumeric(row?.paid_amount), 0) +
        toNumeric(paymentsMirror?.paid_amount ?? payment?.paid_amount),
    );
    const statementCreditAmount = Number(
      paymentsMirror?.credit_amount ?? payment?.credit_amount ?? 0,
    );
    const statementTotalInvoiced = Number(
      mirroredOutstanding + statementPaidAmount + statementCreditAmount,
    );

    return NextResponse.json({
      payment: {
        ...payment,
        paid_amount: Number(payment?.paid_amount ?? 0),
        overdue_30_days: mirroredOverdue30,
        overdue_60_days: mirroredOverdue60,
        overdue_90_days: mirroredOverdue90,
        overdue_120_plus_days: mirroredOverdue120FromAging,
        overdue_91_plus_days: mirroredOverdue120FromAging,
        current_due: mirroredCurrentDue,
        outstanding_balance: mirroredOutstanding,
        statement_paid_amount: statementPaidAmount,
        statement_total_invoiced: statementTotalInvoiced,
        statement_credit_amount: statementCreditAmount,
      },
      message: 'Current billing record retrieved successfully',
    });
  } catch (error) {
    console.error('Error in by-account endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
