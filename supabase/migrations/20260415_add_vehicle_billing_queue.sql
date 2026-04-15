create table if not exists public.vehicle_billing_queue (
  id uuid primary key default gen_random_uuid(),
  job_card_id uuid null,
  cost_code text null,
  vehicle_reg text null,
  action_type text not null,
  payload jsonb not null default '{}'::jsonb,
  lock_date date null,
  status text not null default 'pending',
  error text null,
  queued_by uuid null,
  queued_at timestamptz not null default now(),
  processed_by uuid null,
  processed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_billing_queue_action_type_check
    check (action_type in ('apply_quote_billing', 'sync_job_equipment')),
  constraint vehicle_billing_queue_status_check
    check (status in ('pending', 'processed', 'error'))
);

create index if not exists vehicle_billing_queue_status_idx
  on public.vehicle_billing_queue (status);

create index if not exists vehicle_billing_queue_lock_date_idx
  on public.vehicle_billing_queue (lock_date);

create index if not exists vehicle_billing_queue_job_card_id_idx
  on public.vehicle_billing_queue (job_card_id);

create index if not exists vehicle_billing_queue_cost_code_idx
  on public.vehicle_billing_queue (cost_code);

create index if not exists vehicle_billing_queue_action_type_idx
  on public.vehicle_billing_queue (action_type);

create index if not exists vehicle_billing_queue_pending_lock_idx
  on public.vehicle_billing_queue (status, lock_date);

create or replace function public.update_vehicle_billing_queue_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_update_vehicle_billing_queue_updated_at
  on public.vehicle_billing_queue;

create trigger trigger_update_vehicle_billing_queue_updated_at
before update on public.vehicle_billing_queue
for each row
execute function public.update_vehicle_billing_queue_updated_at();

