const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(Boolean).filter(l=>!l.startsWith('#')).map(l=>{const i=l.indexOf('='); return [l.slice(0,i), l.slice(i+1)];}));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
(async () => {
  const account='EPSC-0009';
  const tables = [
    ['bulk_account_invoices','account_number'],
    ['account_invoices','account_number'],
    ['payments_','cost_code'],
    ['cost_centers','cost_code'],
    ['vehicles_duplicate','new_account_number'],
  ];
  for (const [table,col] of tables) {
    let q = supabase.from(table).select('*').eq(col, account).limit(20);
    if (table !== 'vehicles_duplicate') q = q.order('created_at', { ascending: false, nullsFirst: false });
    const { data, error } = await q;
    console.log('\nTABLE', table);
    if (error) { console.log('ERROR', error.message); continue; }
    console.log(JSON.stringify(data, null, 2));
  }
})();
