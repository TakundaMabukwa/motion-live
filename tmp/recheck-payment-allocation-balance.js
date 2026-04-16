const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(Boolean).filter(l=>!l.startsWith('#')).map(l=>{const i=l.indexOf('='); return [l.slice(0,i), l.slice(i+1)];}));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const round = (n) => Number(Number(n || 0).toFixed(2));
(async () => {
  const [paymentsRes, allocRes] = await Promise.all([
    supabase.from('account_invoice_payments').select('id,account_number,invoice_number,amount,payment_reference,payment_date,notes').order('payment_date',{ascending:false}).limit(5000),
    supabase.from('account_payment_allocations').select('payment_id,allocation_type,amount').limit(20000)
  ]);
  const payments = paymentsRes.data || [];
  const allocs = allocRes.data || [];
  const allocByPayment = new Map();
  for (const a of allocs) { const key = String(a.payment_id || ''); allocByPayment.set(key, round((allocByPayment.get(key) || 0) + Number(a.amount || 0))); }
  const mismatches = payments.filter(p => Math.abs(round(p.amount) - round(allocByPayment.get(String(p.id||'')) || 0)) > 0.01).map(p => ({ payment_id: p.id, account_number: p.account_number, invoice_number: p.invoice_number, payment_amount: round(p.amount), allocation_total: round(allocByPayment.get(String(p.id||''))||0), payment_reference: p.payment_reference, notes: p.notes })).slice(0,30);
  console.log(JSON.stringify({ payments_checked: payments.length, allocation_rows: allocs.length, mismatch_count: mismatches.length, mismatch_sample: mismatches }, null, 2));
})();
