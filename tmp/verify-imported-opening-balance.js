 ✓ Compiled /api/payments/process-payments in 1871ms (1665 modules)
 POST /api/payments/process-payments 200 in 6121ms
Fetching cost centers for account numbers: ACTE-0001, ACTE-0001, ACTE-0001
Deduplicated account numbers: [ 'ACTE-0001' ]
 GET /api/billing/by-client-accounts?all_new_account_numbers=ACTE-0001%2C%20ACTE-0001%2C%20ACTE-0001&billingMonth=2026-04-01 200 in 714ms
Found 1 real cost centers and 0 fallback cost centers for account numbers: [ 'ACTE-0001' ]
 GET /api/cost-centers/client?all_new_account_numbers=ACTE-0001%2C%20ACTE-0001%2C%20ACTE-0001 200 in 1515ms
Fetching cost centers for account numbers: ACTE-0001
Deduplicated account numbers: [ 'ACTE-0001' ]
Found 1 real cost centers and 0 fallback cost centers for account numbers: [ 'ACTE-0001' ]
 GET /api/cost-centers/client?all_new_account_numbers=ACTE-0001 200 in 1450ms
 GET /api/invoices/bulk-account?accountNumber=ACTE-0001&billingMonth=2026-04-01 200 in 1885ms
