alter table public.bulk_account_invoices
  add column if not exists invoice_locked boolean not null default false,
  add column if not exists invoice_locked_by uuid null,
  add column if not exists invoice_locked_at timestamptz null;

comment on column public.bulk_account_invoices.invoice_locked is 'Whether the stored bulk invoice is locked and should always be reused for that billing month.';
comment on column public.bulk_account_invoices.invoice_locked_by is 'Auth user id that locked the bulk invoice.';
comment on column public.bulk_account_invoices.invoice_locked_at is 'Timestamp when the bulk invoice was locked.';
