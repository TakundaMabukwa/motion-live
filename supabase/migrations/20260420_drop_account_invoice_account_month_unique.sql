drop index if exists public.account_invoices_account_month_idx;

create index if not exists account_invoices_account_month_lookup_idx
  on public.account_invoices (account_number, billing_month);
