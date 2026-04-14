create table if not exists public.system_locks (
  id uuid primary key default gen_random_uuid(),
  lock_key text not null unique,
  is_locked boolean not null default false,
  lock_date date null,
  locked_by uuid null,
  locked_at timestamptz null,
  unlocked_by uuid null,
  unlocked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists system_locks_lock_key_idx
  on public.system_locks (lock_key);

create table if not exists public.job_card_invoice_queue (
  id uuid primary key default gen_random_uuid(),
  job_card_id uuid not null unique,
  job_number text null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  queued_by uuid null,
  queued_at timestamptz not null default now(),
  processed_at timestamptz null,
  processed_by uuid null,
  processed_invoice_id uuid null,
  error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists job_card_invoice_queue_status_idx
  on public.job_card_invoice_queue (status);

create index if not exists job_card_invoice_queue_job_card_id_idx
  on public.job_card_invoice_queue (job_card_id);
