create table if not exists public.bulk_account_invoices (
  id uuid primary key default gen_random_uuid(),
  account_number text not null,
  billing_month date,
  invoice_number text not null unique,
  company_name text,
  client_address text,
  customer_vat_number text,
  invoice_date timestamptz not null default now(),
  subtotal numeric(12,2) not null default 0,
  vat_amount numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  line_items jsonb not null default '[]'::jsonb,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists bulk_account_invoices_account_month_idx
  on public.bulk_account_invoices (account_number, billing_month);

create index if not exists bulk_account_invoices_account_number_idx
  on public.bulk_account_invoices (account_number);

create table if not exists public.bulk_document_sequences (
  name text primary key,
  next_value bigint not null,
  updated_at timestamptz not null default now()
);

insert into public.bulk_document_sequences (name, next_value)
values ('bulk_invoice', 200000)
on conflict (name) do nothing;

create or replace function public.allocate_bulk_document_number(
  sequence_name text,
  prefix text default 'INV'
)
returns text
language plpgsql
as $$
declare
  allocated_value bigint;
begin
  update public.bulk_document_sequences
  set
    next_value = next_value + 1,
    updated_at = now()
  where name = sequence_name
  returning next_value - 1 into allocated_value;

  if allocated_value is null then
    raise exception 'Bulk document sequence % does not exist', sequence_name;
  end if;
  ACCOUNT SOLFLO

  return prefix || allocated_value::text;
end;
$$;

grant execute on function public.allocate_bulk_document_number(text, text) to authenticated;
grant execute on function public.allocate_bulk_document_number(text, text) to service_role;

update public.bulk_document_sequences
set next_value = 200000,
    updated_at = now()
where name = 'bulk_invoice'
  and next_value < 200000;

create or replace function public.set_updated_at_bulk_account_invoices()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_set_updated_at_bulk_account_invoices on public.bulk_account_invoices;

create trigger trigger_set_updated_at_bulk_account_invoices
before update on public.bulk_account_invoices
for each row
execute function public.set_updated_at_bulk_account_invoices();
