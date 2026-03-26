create table if not exists public.xero_invoice_sync_logs (
  id uuid primary key default gen_random_uuid(),
  source_table text not null,
  source_invoice_id uuid not null,
  account_number text not null,
  billing_month date null,
  local_invoice_number text null,
  xero_invoice_id text null,
  xero_invoice_number text null,
  action text not null default 'dry_run',
  status text not null default 'pending',
  dry_run boolean not null default true,
  payload jsonb not null default '{}'::jsonb,
  response jsonb null,
  error_message text null,
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists xero_invoice_sync_logs_source_idx
  on public.xero_invoice_sync_logs (source_table, source_invoice_id);

create index if not exists xero_invoice_sync_logs_account_idx
  on public.xero_invoice_sync_logs (account_number, billing_month);

create index if not exists xero_invoice_sync_logs_status_idx
  on public.xero_invoice_sync_logs (status, dry_run, created_at desc);

create or replace function public.set_updated_at_xero_invoice_sync_logs()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_set_updated_at_xero_invoice_sync_logs on public.xero_invoice_sync_logs;

create trigger trigger_set_updated_at_xero_invoice_sync_logs
before update on public.xero_invoice_sync_logs
for each row
execute function public.set_updated_at_xero_invoice_sync_logs();
