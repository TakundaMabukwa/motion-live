-- Transaction savepoint control for the API layer.
-- Allows SAVEPOINT / ROLLBACK TO / RELEASE SAVEPOINT from Supabase client.
-- Restricted to savepoint commands only via prefix check.

create or replace function public.exec_savepoint_action(action text, savepoint_name text)
returns void
language plpgsql
security definer
as $$
declare
  upper_action text := upper(trim(action));
  safe_name text := trim(savepoint_name);
begin
  -- Only allow savepoint-related commands
  if safe_name !~ '^[a-zA-Z_][a-zA-Z0-9_]*$' then
    raise exception 'Invalid savepoint name: %', safe_name;
  end if;

  if upper_action = 'SAVEPOINT' then
    execute format('SAVEPOINT %I', safe_name);
  elsif upper_action = 'ROLLBACK' then
    execute format('ROLLBACK TO SAVEPOINT %I', safe_name);
  elsif upper_action = 'RELEASE' then
    execute format('RELEASE SAVEPOINT %I', safe_name);
  else
    raise exception 'Unknown savepoint action: %. Allowed: SAVEPOINT, ROLLBACK, RELEASE', upper_action;
  end if;
end;
$$;

grant execute on function public.exec_savepoint_action(text, text) to authenticated;
grant execute on function public.exec_savepoint_action(text, text) to service_role;
