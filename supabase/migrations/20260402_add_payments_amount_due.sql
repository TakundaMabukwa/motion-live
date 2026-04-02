alter table public.payments_
  add column if not exists amount_due numeric(12, 2) not null default 0;

update public.payments_
set amount_due = coalesce(outstanding_balance, balance_due, 0)
where coalesce(amount_due, 0) <> coalesce(outstanding_balance, balance_due, 0);

comment on column public.payments_.amount_due is 'Legacy/current amount due mirror kept in sync with outstanding_balance for reporting and import compatibility.';
