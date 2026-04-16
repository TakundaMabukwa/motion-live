const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(Boolean).filter(l=>!l.startsWith('#')).map(l=>{const i=l.indexOf('='); return [l.slice(0,i), l.slice(i+1)];}));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

(async () => {
  const ACCOUNT = 'ACTE-0001';
  
  // Get invoice info
  const invoiceRes = await supabase
    .from('account_invoices')
    .select('id,account_number,billing_month,invoice_number,total_amount,paid_amount,balance_due')
    .eq('account_number', ACCOUNT)
    .order('billing_month', { ascending: false });
    
  // Get payment info
  const paymentRes = await supabase
    .from('account_invoice_payments')
    .select('account_invoice_id,account_number,billing_month,invoice_number,amount,payment_reference,created_at')
    .eq('account_number', ACCOUNT)
    .order('created_at', { ascending: false });
    
  // Get allocation info
  const allocationRes = await supabase
    .from('account_payment_allocations')
    .select('payment_id,account_number,billing_month,invoice_number,allocated_amount,allocation_type,created_at')
    .eq('account_number', ACCOUNT)
    .order('created_at', { ascending: false });
    
  const invoices = invoiceRes.data || [];
  const payments = paymentRes.data || [];
  const allocations = allocationRes.data || [];
  
  console.log('=== ACTE-0001 Payment Check ===');
  console.log(`Invoices: ${invoices.length}`);
  console.log(`Payments: ${payments.length}`);
  console.log(`Allocations: ${allocations.length}`);
  
  if (invoices.length > 0) {
    console.log('\n=== Recent Invoices ===');
    invoices.slice(0, 3).forEach(inv => {
      console.log(`${inv.invoice_number} (${inv.billing_month}): Total=${inv.total_amount}, Paid=${inv.paid_amount}, Balance=${inv.balance_due}`);
    });
  }
  
  if (payments.length > 0) {
    console.log('\n=== Recent Payments ===');
    payments.slice(0, 5).forEach(pay => {
      console.log(`${pay.payment_reference} (${pay.billing_month}): Amount=${pay.amount}, Created=${pay.created_at}`);
    });
  }
  
  if (allocations.length > 0) {
    console.log('\n=== Recent Allocations ===');
    allocations.slice(0, 5).forEach(alloc => {
      console.log(`${alloc.invoice_number} (${alloc.billing_month}): Allocated=${alloc.allocated_amount}, Type=${alloc.allocation_type}, Created=${alloc.created_at}`);
    });
  }
})();