create table if not exists public.bulk_account_invoices_archive (
  archive_id uuid primary key default gen_random_uuid(),
  source_invoice_id uuid not null,
  account_number text not null,
  billing_month date null,
  invoice_number text not null,
  invoice_locked boolean not null default false,
  invoice_locked_at timestamptz null,
  system_locked boolean not null default false,
  system_locked_at timestamptz null,
  system_locked_date date null,
  source_created_at timestamptz null,
  source_updated_at timestamptz null,
  archived_at timestamptz not null default now(),
  archive_event text not null default 'locked_snapshot',
  snapshot jsonb not null
);

create unique index if not exists bulk_account_invoices_archive_source_idx
  on public.bulk_account_invoices_archive (source_invoice_id);

create index if not exists bulk_account_invoices_archive_account_month_idx
  on public.bulk_account_invoices_archive (account_number, billing_month);

create or replace function public.snapshot_locked_bulk_account_invoice()
returns trigger
language plpgsql
as $$
declare
  v_archive_event text;
begin
  if tg_op = 'INSERT' then
    v_archive_event := 'locked_insert';
  elsif coalesce(old.invoice_locked, false) is distinct from true then
    v_archive_event := 'locked_transition';
  else
    v_archive_event := 'locked_refresh';
  end if;

  if coalesce(new.invoice_locked, false) then
    insert into public.bulk_account_invoices_archive (
      source_invoice_id,
      account_number,
      billing_month,
      invoice_number,
      invoice_locked,
      invoice_locked_at,
      system_locked,
      system_locked_at,
      system_locked_date,
      source_created_at,
      source_updated_at,
      archived_at,
      archive_event,
      snapshot
    )
    values (
      new.id,
      new.account_number,
      new.billing_month,
      new.invoice_number,
      coalesce(new.invoice_locked, false),
      new.invoice_locked_at,
      coalesce(new.system_locked, false),
      new.system_locked_at,
      new.system_locked_date,
      new.created_at,
      new.updated_at,
      now(),
      v_archive_event,
      to_jsonb(new)
    )
    on conflict (source_invoice_id) do update
    set
      account_number = excluded.account_number,
      billing_month = excluded.billing_month,
      invoice_number = excluded.invoice_number,
      invoice_locked = excluded.invoice_locked,
      invoice_locked_at = excluded.invoice_locked_at,
      system_locked = excluded.system_locked,
      system_locked_at = excluded.system_locked_at,
      system_locked_date = excluded.system_locked_date,
      source_created_at = excluded.source_created_at,
      source_updated_at = excluded.source_updated_at,
      archived_at = excluded.archived_at,
      archive_event = excluded.archive_event,
      snapshot = excluded.snapshot;
  end if;

  return new;
end;
$$;

drop trigger if exists trigger_snapshot_locked_bulk_account_invoice
  on public.bulk_account_invoices;

create trigger trigger_snapshot_locked_bulk_account_invoice
after insert or update on public.bulk_account_invoices
for each row
when (coalesce(new.invoice_locked, false))
execute function public.snapshot_locked_bulk_account_invoice();

insert into public.bulk_account_invoices_archive (
  source_invoice_id,
  account_number,
  billing_month,
  invoice_number,
  invoice_locked,
  invoice_locked_at,
  system_locked,
  system_locked_at,
  system_locked_date,
  source_created_at,
  source_updated_at,
  archived_at,
  archive_event,
  snapshot
)
select
  bi.id as source_invoice_id,
  bi.account_number,
  bi.billing_month,
  bi.invoice_number,
  coalesce(bi.invoice_locked, false) as invoice_locked,
  bi.invoice_locked_at,
  coalesce(bi.system_locked, false) as system_locked,
  bi.system_locked_at,
  bi.system_locked_date,
  bi.created_at as source_created_at,
  bi.updated_at as source_updated_at,
  now() as archived_at,
  'backfill_locked' as archive_event,
  to_jsonb(bi) as snapshot
from public.bulk_account_invoices bi
where coalesce(bi.invoice_locked, false)
on conflict (source_invoice_id) do update
set
  account_number = excluded.account_number,
  billing_month = excluded.billing_month,
  invoice_number = excluded.invoice_number,
  invoice_locked = excluded.invoice_locked,
  invoice_locked_at = excluded.invoice_locked_at,
  system_locked = excluded.system_locked,
  system_locked_at = excluded.system_locked_at,
  system_locked_date = excluded.system_locked_date,
  source_created_at = excluded.source_created_at,
  source_updated_at = excluded.source_updated_at,
  archived_at = excluded.archived_at,
  archive_event = excluded.archive_event,
  snapshot = excluded.snapshot;
