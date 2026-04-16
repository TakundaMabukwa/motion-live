const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(Boolean).filter(l=>!l.startsWith('#')).map(l=>{const i=l.indexOf('='); return [l.slice(0,i), l.slice(i+1)];}));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
(async () => {
  const accounts = ['AVVA-0001','INAN-0001'];
  for (const account of accounts) {
    const [imp, inv, pay, alloc, mir] = await Promise.all([
      supabase.from('imported_account_payments').select('*').eq('account_number',account).order('payment_date',{ascending:true}),
      supabase.from('account_invoices').select('*').eq('account_number',account).order('billing_month',{ascending:true}),
      supabase.from('account_invoice_payments').select('*').eq('account_number',account).order('payment_date',{ascending:true}),
      supabase.from('account_payment_allocations').select('*').eq('account_number',account).order('payment_date',{ascending:true}),
      supabase.from('payments_').select('*').eq('cost_code',account).order('billing_month',{ascending:true})
    ]);
    console.log('\nACCOUNT', account);
    console.log(JSON.stringify({ imported: imp.data, invoices: inv.data, payments: pay.data, allocations: alloc.data, mirror: mir.data }, null, 2));
  }
})();
