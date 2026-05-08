create table if not exists public.accounts_completed_jobs_locks (
  id uuid primary key default gen_random_uuid(),
  lock_key text not null unique default 'completed_jobs_invoicing',
  is_locked boolean not null default false,
  lock_date date null,
  locked_by uuid null,
  locked_at timestamptz null,
  unlocked_by uuid null,
  unlocked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.accounts_completed_jobs_locks is
'Dedicated month lock for Accounts > Completed Job Cards invoicing visibility.';

comment on column public.accounts_completed_jobs_locks.lock_key is
'Single-row scope key. Use completed_jobs_invoicing.';

comment on column public.accounts_completed_jobs_locks.lock_date is
'Exact lock date. Jobs finalized after this date are hidden in Accounts completed jobs list until unlock.';
