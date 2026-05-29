create unique index if not exists bulk_account_invoices_account_month_idx
  on public.bulk_account_invoices (account_number, billing_month);
