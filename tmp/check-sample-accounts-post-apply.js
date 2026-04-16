const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(Boolean).filter(l=>!l.startsWith('#')).map(l=>{const i=l.indexOf('='); return [l.slice(0,i), l.slice(i+1)];}));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
(async () => {
  const accounts = ['GOEA-0001','MPUM-0001','EDGE-0002','AERZ-0001'];
  for (const account of accounts) {
    const [inv,pay,mir] = await Promise.all([
      supabase.from('account_invoices').select('invoice_number,billing_month,total_amount,paid_amount,balance_due').eq('account_number',account).order('billing_month',{ascending:false}),
      supabase.from('account_invoice_payments').select('invoice_number,billing_month,amount,payment_reference,notes').eq('account_number',account).order('billing_month',{ascending:false}),
      supabase.from('payments_').select('invoice_number,reference,billing_month,paid_amount,balance_due,outstanding_balance').eq('cost_code',account).order('billing_month',{ascending:false})
    ]);
    console.log('\nACCOUNT', account);
    console.log(JSON.stringify({ invoices: inv.data, payments: pay.data, mirror: mir.data }, null, 2));
  }
})();
