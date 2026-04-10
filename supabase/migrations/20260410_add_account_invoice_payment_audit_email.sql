alter table public.account_invoice_payments
  add column if not exists created_by_email text null;

comment on column public.account_invoice_payments.created_by_email is
  'Email address of the user who recorded the payment.';
