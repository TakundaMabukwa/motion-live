const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(Boolean).filter(l=>!l.startsWith('#')).map(l=>{const i=l.indexOf('='); return [l.slice(0,i), l.slice(i+1)];}));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
(async () => {
  const [invoicesRes,paymentsRes] = await Promise.all([
    supabase.from('account_invoices').select('id,account_number,invoice_number,total_amount,paid_amount,balance_due').like('invoice_number','OPEN-%'),
    supabase.from('account_invoice_payments').select('account_invoice_id,amount,payment_reference').like('payment_reference','IMPORTED-MARCH-%')
  ]);
  const invoices = invoicesRes.data || [];
  const payments = paymentsRes.data || [];
  const payByInvoice = new Map();
  for (const p of payments) {
    const key = String(p.account_invoice_id || '');
    const next = Number((Number(payByInvoice.get(key) || 0) + Number(p.amount || 0)).toFixed(2));
    payByInvoice.set(key, next);
  }
  const negativeOpening = [];
  const positiveMismatches = [];
  for (const inv of invoices) {
    const total = Number(Number(inv.total_amount || 0).toFixed(2));
    const invPaid = Number(Number(inv.paid_amount || 0).toFixed(2));
    const invBal = Number(Number(inv.balance_due || 0).toFixed(2));
    const paidFromLedger = Number(Number(payByInvoice.get(String(inv.id || '')) || 0).toFixed(2));
    if (total < 0 || invBal < 0) {
      negativeOpening.push({ account_number: inv.account_number, invoice_number: inv.invoice_number, total, paid_amount: invPaid, balance_due: invBal });
      continue;
    }
    const expectedBal = Number(Math.max(0, total - paidFromLedger).toFixed(2));
    if (Math.abs(invPaid - paidFromLedger) > 0.01 || Math.abs(invBal - expectedBal) > 0.01) {
      positiveMismatches.push({ account_number: inv.account_number, invoice_number: inv.invoice_number, total, paid_amount: invPaid, ledger_paid: paidFromLedger, balance_due: invBal, expected_balance_due: expectedBal });
    }
  }
  console.log(JSON.stringify({
    opening_invoice_count: invoices.length,
    negative_opening_count: negativeOpening.length,
    negative_opening_accounts: negativeOpening.map(x => x.account_number),
    positive_mismatch_count: positiveMismatches.length,
    positive_mismatch_accounts: positiveMismatches.map(x => x.account_number),
    positive_mismatch_details: positiveMismatches
  }, null, 2));
})();
