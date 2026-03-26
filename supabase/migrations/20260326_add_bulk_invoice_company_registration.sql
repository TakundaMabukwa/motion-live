alter table public.bulk_account_invoices
add column if not exists company_registration_number text null;
