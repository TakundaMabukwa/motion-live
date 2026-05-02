create table if not exists public.invoice_number_events (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  sequence_name text not null default 'invoice',
  prefix text not null default 'INV',
  source text not null,
  request_key text null,
  allocated_by uuid null,
  status text not null default 'allocated',
  context jsonb not null default '{}'::jsonb,
  allocated_at timestamptz not null default now(),
  persisted_table text null,
  persisted_invoice_id uuid null,
  persisted_at timestamptz null,
  failed_at timestamptz null,
  error_message text null
);

create index if not exists invoice_number_events_status_idx
  on public.invoice_number_events (status);

create index if not exists invoice_number_events_source_idx
  on public.invoice_number_events (source);

create index if not exists invoice_number_events_request_key_idx
  on public.invoice_number_events (request_key);

with ranked as (
  select
    id,
    row_number() over (
      partition by source, request_key
      order by allocated_at desc, id desc
    ) as rn
  from public.invoice_number_events
  where request_key is not null
)
delete from public.invoice_number_events e
using ranked r
where e.id = r.id
  and r.rn > 1;

create unique index if not exists invoice_number_events_source_request_key_uidx
  on public.invoice_number_events (source, request_key)
  where request_key is not null;

update public.invoices i
set account_number = nullif(btrim(jc.new_account_number), '')
from public.job_cards jc
where jc.id = i.job_card_id
  and nullif(btrim(i.account_number), '') is null
  and nullif(btrim(jc.new_account_number), '') is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'invoices_account_number_required_chk'
      and conrelid = 'public.invoices'::regclass
  ) then
    alter table public.invoices
      add constraint invoices_account_number_required_chk
      check (nullif(btrim(account_number), '') is not null) not valid;
  end if;
end;
$$;
