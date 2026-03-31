alter table public.payments_
add column if not exists credit_amount numeric(12, 2) not null default 0;

comment on column public.payments_.credit_amount is 'Client credit available after payments exceed the linked invoice balance.';
