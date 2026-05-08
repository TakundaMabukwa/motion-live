do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'accounts_completed_jobs_locks_month_check'
  ) then
    alter table public.accounts_completed_jobs_locks
      drop constraint accounts_completed_jobs_locks_month_check;
  end if;
end
$$;

