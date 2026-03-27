alter table public.account_invoices
add column if not exists company_registration_number text null;
