const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(Boolean).filter(l=>!l.startsWith('#')).map(l=>{const i=l.indexOf('='); return [l.slice(0,i), l.slice(i+1)];}));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const round = (n) => Number(Number(n || 0).toFixed(2));
function buildCurrent(paymentAmount, invoiceTotal, invoicePaidBefore) {
  const total = round(invoiceTotal); const paidBefore = round(invoicePaidBefore); const outstanding = Math.max(0, round(total - paidBefore)); const received = Math.max(0, round(paymentAmount)); const applied = Math.min(received, outstanding); const credit = round(received - applied); return { applied, credit, sum: round(applied + credit), outstandingBefore: outstanding };
}
function buildOutstanding(row, paymentAmount) {
  let remaining = Math.max(0, round(paymentAmount));
  const buckets = [
    ['overdue_120_plus_days', round(row.overdue_120_plus_days)],
    ['overdue_90_days', round(row.overdue_90_days)],
    ['overdue_60_days', round(row.overdue_60_days)],
    ['overdue_30_days', round(row.overdue_30_days)],
    ['current_due', round(row.current_due)],
  ];
  const allocations = [];
  for (const [key, amount] of buckets) { if (remaining <= 0 || amount <= 0) continue; const applied = Math.min(amount, remaining); allocations.push({ key, amount: round(applied) }); remaining = round(remaining - applied); }
  if (remaining > 0) allocations.push({ key: 'credit', amount: remaining });
  return { allocations, total: round(allocations.reduce((s,a)=>s+a.amount,0)), remainingCredit: round(remaining) };
}
(async () => {
  const [paymentsRes, allocRes, invoicesRes, agingRes] = await Promise.all([
    supabase.from('account_invoice_payments').select('id,account_invoice_id,account_number,billing_month,invoice_number,amount,payment_reference,payment_date,notes').order('payment_date',{ascending:false}).limit(5000),
    supabase.from('account_payment_allocations').select('payment_id,account_invoice_id,account_number,billing_month,allocation_type,amount,payment_date').limit(10000),
    supabase.from('account_invoices').select('id,account_number,billing_month,invoice_number,total_amount,paid_amount,balance_due').in('account_number',['EDGE-0002','GOEA-0001']).order('billing_month',{ascending:false}),
    supabase.from('payments_').select('id,cost_code,billing_month,current_due,overdue_30_days,overdue_60_days,overdue_90_days,overdue_120_plus_days,outstanding_balance,paid_amount,balance_due,credit_amount').order('billing_month',{ascending:true}).limit(5000)
  ]);
  const payments = paymentsRes.data || []; const allocs = allocRes.data || []; const invoices = invoicesRes.data || []; const aging = agingRes.data || [];
  const allocByPayment = new Map();
  for (const a of allocs) { const key = String(a.payment_id||''); allocByPayment.set(key, round((allocByPayment.get(key)||0) + Number(a.amount||0))); }
  const mismatches = payments.filter(p => Math.abs(round(p.amount) - round(allocByPayment.get(String(p.id||'')) || 0)) > 0.01).map(p => ({ payment_id: p.id, account_number: p.account_number, invoice_number: p.invoice_number, payment_amount: round(p.amount), allocation_total: round(allocByPayment.get(String(p.id||''))||0), payment_reference: p.payment_reference, payment_date: p.payment_date, notes: p.notes })).slice(0,20);

  const edgeInvoice = invoices.find(i => i.account_number === 'EDGE-0002' && i.billing_month === '2026-03-01');
  const goeaInvoice = invoices.find(i => i.account_number === 'GOEA-0001' && i.billing_month === '2026-03-01');
  const currentSim = edgeInvoice ? buildCurrent(200, edgeInvoice.total_amount, 0) : null;
  const currentPartialSim = goeaInvoice ? buildCurrent(61050.92, goeaInvoice.total_amount, 0) : null;
  const adriRows = aging.filter(r => r.cost_code === 'ADRI-0001').sort((a,b) => String(a.billing_month).localeCompare(String(b.billing_month)));
  const oldestOutstanding = adriRows.find(r => round(r.outstanding_balance || r.balance_due) > 0) || null;
  const outstandingSim = oldestOutstanding ? buildOutstanding(oldestOutstanding, 545.41) : null;
  const outstandingOverpaySim = oldestOutstanding ? buildOutstanding(oldestOutstanding, 1200) : null;

  console.log(JSON.stringify({
    existing_payments_checked: payments.length,
    allocation_rows_checked: allocs.length,
    mismatch_count: mismatches.length,
    mismatch_sample: mismatches,
    current_payment_simulations: {
      EDGE_0002_overpayment_200: edgeInvoice ? { invoice_total: round(edgeInvoice.total_amount), ...currentSim } : null,
      GOEA_0001_partial_61050_92: goeaInvoice ? { invoice_total: round(goeaInvoice.total_amount), ...currentPartialSim } : null,
    },
    outstanding_payment_simulations: oldestOutstanding ? {
      account: 'ADRI-0001',
      chosen_billing_month: oldestOutstanding.billing_month,
      row_before: {
        current_due: round(oldestOutstanding.current_due), overdue_30_days: round(oldestOutstanding.overdue_30_days), overdue_60_days: round(oldestOutstanding.overdue_60_days), overdue_90_days: round(oldestOutstanding.overdue_90_days), overdue_120_plus_days: round(oldestOutstanding.overdue_120_plus_days), outstanding_balance: round(oldestOutstanding.outstanding_balance || oldestOutstanding.balance_due)
      },
      payment_545_41: outstandingSim,
      payment_1200: outstandingOverpaySim
    } : null
  }, null, 2));
})();
