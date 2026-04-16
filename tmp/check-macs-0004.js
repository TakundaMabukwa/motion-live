const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(Boolean).filter(l=>!l.startsWith('#')).map(l=>{const i=l.indexOf('='); return [l.slice(0,i), l.slice(i+1)];}));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
(async () => {
  const account = 'MACS-0004';
  const [imp, inv, pay, mir] = await Promise.all([
    supabase.from('imported_account_payments').select('*').eq('account_number',account),
    supabase.from('account_invoices').select('*').eq('account_number',account).order('billing_month',{ascending:false}),
    supabase.from('account_invoice_payments').select('*').eq('account_number',account).order('billing_month',{ascending:false}),
    supabase.from('payments_').select('*').eq('cost_code',account).order('billing_month',{ascending:false})
  ]);
  console.log(JSON.stringify({ imported: imp.data, invoices: inv.data, payments: pay.data, mirror: mir.data }, null, 2));
})();
