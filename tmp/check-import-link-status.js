const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(Boolean).filter(l=>!l.startsWith('#')).map(l=>{const i=l.indexOf('='); return [l.slice(0,i), l.slice(i+1)];}));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
(async () => {
  const [imported, ledgerImported, openingInvoices] = await Promise.all([
    supabase.from('imported_account_payments').select('id,account_number,amount', { count: 'exact', head: false }),
    supabase.from('account_invoice_payments').select('id,account_number,amount,notes', { count: 'exact', head: false }).ilike('notes', '%Imported from March Receipts sheet%'),
    supabase.from('account_invoices').select('id,account_number,invoice_number,notes', { count: 'exact', head: false }).ilike('notes', '%Imported Opening Balance Snapshot%')
  ]);
  const importedAccounts = new Set((imported.data||[]).map(r=>r.account_number));
  const ledgerAccounts = new Set((ledgerImported.data||[]).map(r=>r.account_number));
  const missingAccounts = [...importedAccounts].filter(a=>!ledgerAccounts.has(a)).sort();
  console.log(JSON.stringify({
    imported_rows: imported.count,
    imported_accounts: importedAccounts.size,
    ledger_imported_rows: ledgerImported.count,
    ledger_imported_accounts: ledgerAccounts.size,
    opening_invoices: openingInvoices.count,
    missing_accounts_count: missingAccounts.length,
    missing_accounts_sample: missingAccounts.slice(0,20)
  }, null, 2));
})();
