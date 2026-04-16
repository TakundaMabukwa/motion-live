const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(Boolean).filter(l=>!l.startsWith('#')).map(l=>{const i=l.indexOf('='); return [l.slice(0,i), l.slice(i+1)];}));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

(async () => {
  const ACCOUNT = 'ACTE-0001';
  
  // Get the most recent payment
  const paymentRes = await supabase
    .from('account_invoice_payments')
    .select('*')
    .eq('account_number', ACCOUNT)
    .order('created_at', { ascending: false })
    .limit(1);
    
  if (!paymentRes.data || paymentRes.data.length === 0) {
    console.log('No payments found for ACTE-0001');
    return;
  }
  
  const payment = paymentRes.data[0];
  console.log('=== Most Recent Payment ===');
  console.log(JSON.stringify(payment, null, 2));
  
  // Look for allocations using the payment ID
  const allocationRes = await supabase
    .from('account_payment_allocations')
    .select('*')
    .eq('payment_id', payment.id);
    
  console.log(`\n=== Allocations for Payment ID ${payment.id} ===`);
  console.log(`Found: ${allocationRes.data?.length || 0} allocations`);
  if (allocationRes.data && allocationRes.data.length > 0) {
    console.log(JSON.stringify(allocationRes.data, null, 2));
  }
  
  // Also check all allocations for this account in the last hour
  const recentAllocRes = await supabase
    .from('account_payment_allocations')
    .select('*')
    .eq('account_number', ACCOUNT)
    .gte('created_at', new Date(Date.now() - 3600000).toISOString());
    
  console.log(`\n=== All Recent Allocations for ${ACCOUNT} ===`);
  console.log(`Found: ${recentAllocRes.data?.length || 0} allocations in last hour`);
  if (recentAllocRes.data && recentAllocRes.data.length > 0) {
    console.log(JSON.stringify(recentAllocRes.data, null, 2));
  }
})();