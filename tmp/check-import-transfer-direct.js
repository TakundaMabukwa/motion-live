const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(Boolean).filter(l=>!l.startsWith('#')).map(l=>{const i=l.indexOf('='); return [l.slice(0,i), l.slice(i+1)];}));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
(async () => {
  const [openInv, importedPay, payMirror] = await Promise.all([
    supabase.from('account_invoices').select('id,account_number,invoice_number,billing_month,notes', { count:'exact', head:false }).like('invoice_number','OPEN-%'),
    supabase.from('account_invoice_payments').select('id,account_number,invoice_number,billing_month,payment_reference,notes', { count:'exact', head:false }).like('payment_reference','IMPORTED-MARCH-%'),
    supabase.from('payments_').select('id,cost_code,invoice_number,reference,billing_month,account_invoice_id', { count:'exact', head:false }).like('invoice_number','OPEN-%')
  ]);
  console.log(JSON.stringify({
    opening_invoice_rows: openInv.count,
    opening_invoice_sample: (openInv.data||[]).slice(0,5),
    imported_payment_rows: importedPay.count,
    imported_payment_sample: (importedPay.data||[]).slice(0,5),
    opening_mirror_rows: payMirror.count,
    opening_mirror_sample: (payMirror.data||[]).slice(0,5)
  }, null, 2));
})();
