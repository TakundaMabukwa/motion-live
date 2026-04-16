const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(Boolean).filter(l=>!l.startsWith('#')).map(l=>{const i=l.indexOf('='); return [l.slice(0,i), l.slice(i+1)];}));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
(async () => {
  const [imported, ledgerImported, openingInvoices, mirrors] = await Promise.all([
    supabase.from('imported_account_payments').select('id,account_number,amount', { count: 'exact', head: false }),
    supabase.from('account_invoice_payments').select('id,account_number,amount,payment_reference,notes', { count: 'exact', head: false }).like('payment_reference','IMPORTED-MARCH-%'),
    supabase.from('account_invoices').select('id,account_number,invoice_number,billing_month', { count: 'exact', head: false }).like('invoice_number','OPEN-%'),
    supabase.from('payments_').select('id,cost_code,invoice_number,reference,billing_month,account_invoice_id', { count: 'exact', head: false }).like('invoice_number','OPEN-%')
  ]);
  const importedAccounts = new Set((imported.data||[]).map(r=>r.account_number));
  const ledgerAccounts = new Set((ledgerImported.data||[]).map(r=>r.account_number));
  const openingAccounts = new Set((openingInvoices.data||[]).map(r=>r.account_number));
  const missingLedgerAccounts = [...importedAccounts].filter(a=>!ledgerAccounts.has(a)).sort();
  const missingOpeningAccounts = [...importedAccounts].filter(a=>!openingAccounts.has(a)).sort();
  console.log(JSON.stringify({
    imported_rows: imported.count,
    imported_accounts: importedAccounts.size,
    ledger_imported_rows: ledgerImported.count,
    ledger_imported_accounts: ledgerAccounts.size,
    opening_invoice_rows: openingInvoices.count,
    opening_invoice_accounts: openingAccounts.size,
    opening_mirror_rows: mirrors.count,
    missing_ledger_accounts_count: missingLedgerAccounts.length,
    missing_ledger_accounts_sample: missingLedgerAccounts.slice(0,20),
    missing_opening_accounts_count: missingOpeningAccounts.length,
    missing_opening_accounts_sample: missingOpeningAccounts.slice(0,20)
  }, null, 2));
})();
