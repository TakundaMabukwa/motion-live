const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(Boolean).filter(l=>!l.startsWith('#')).map(l=>{const i=l.indexOf('='); return [l.slice(0,i), l.slice(i+1)];}));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
(async () => {
  const row = {
    payment_id: 'cf69ea04-df57-42df-9f6b-0c6fc9f384bb',
    account_number: 'AVVA-0001',
    account_invoice_id: 'a1658f49-079d-461c-ae8f-4cea303ba775',
    billing_month: '2026-02-01',
    allocation_type: 'invoice',
    amount: 0.01,
    payment_date: '2026-03-16T00:00:00+00:00',
    reference: 'TEST-ALLOCATION-INSERT',
    notes: 'test',
    meta: { test: true },
    created_by: null,
    created_by_email: null,
  };
  const { data, error } = await supabase.from('account_payment_allocations').insert(row).select('*');
  console.log(JSON.stringify({ data, error }, null, 2));
})();
