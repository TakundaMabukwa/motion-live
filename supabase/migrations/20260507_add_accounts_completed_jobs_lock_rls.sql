alter table if exists public.accounts_completed_jobs_locks
  enable row level security;

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'accounts_completed_jobs_locks'
      and policyname = 'accounts_completed_jobs_locks_select_authenticated'
  ) then
    drop policy accounts_completed_jobs_locks_select_authenticated
      on public.accounts_completed_jobs_locks;
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'accounts_completed_jobs_locks'
      and policyname = 'accounts_completed_jobs_locks_insert_authenticated'
  ) then
    drop policy accounts_completed_jobs_locks_insert_authenticated
      on public.accounts_completed_jobs_locks;
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'accounts_completed_jobs_locks'
      and policyname = 'accounts_completed_jobs_locks_update_authenticated'
  ) then
    drop policy accounts_completed_jobs_locks_update_authenticated
      on public.accounts_completed_jobs_locks;
  end if;
end
$$;

create policy accounts_completed_jobs_locks_select_authenticated
  on public.accounts_completed_jobs_locks
  for select
  to authenticated
  using (true);

create policy accounts_completed_jobs_locks_insert_authenticated
  on public.accounts_completed_jobs_locks
  for insert
  to authenticated
  with check (true);

create policy accounts_completed_jobs_locks_update_authenticated
  on public.accounts_completed_jobs_locks
  for update
  to authenticated
  using (true)
  with check (true);

