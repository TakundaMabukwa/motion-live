create or replace function public.tech_stock_append_assigned_parts(
  p_technician_email text,
  p_parts jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(btrim(coalesce(p_technician_email, '')));
  v_parts jsonb := coalesce(p_parts, '[]'::jsonb);
  v_primary_stock_id bigint;
  v_existing_parts jsonb := '[]'::jsonb;
  v_merged_parts jsonb := '[]'::jsonb;
begin
  if v_email = '' then
    raise exception 'p_technician_email is required';
  end if;

  if jsonb_typeof(v_parts) is distinct from 'array' then
    raise exception 'p_parts must be a JSON array';
  end if;

  -- Lock all matching rows first (case-insensitive).
  perform 1
  from public.tech_stock ts
  where lower(btrim(ts.technician_email)) = v_email
  for update;

  select ts.id
    into v_primary_stock_id
  from public.tech_stock ts
  where lower(btrim(ts.technician_email)) = v_email
  order by ts.id asc
  limit 1;

  select coalesce(jsonb_agg(part), '[]'::jsonb)
    into v_existing_parts
  from (
    select jsonb_array_elements(
      case
        when jsonb_typeof(coalesce(ts.assigned_parts, '[]'::jsonb)) = 'array'
          then coalesce(ts.assigned_parts, '[]'::jsonb)
        else '[]'::jsonb
      end
    ) as part
    from public.tech_stock ts
    where lower(btrim(ts.technician_email)) = v_email
  ) parts_union;

  v_merged_parts := coalesce(v_existing_parts, '[]'::jsonb) || v_parts;

  if v_primary_stock_id is null then
    insert into public.tech_stock (technician_email, assigned_parts)
    values (v_email, v_merged_parts)
    returning id into v_primary_stock_id;
  else
    update public.tech_stock
    set assigned_parts = v_merged_parts
    where id = v_primary_stock_id;

    -- Collapse duplicates for same technician email (case-insensitive) after merge.
    delete from public.tech_stock ts
    where ts.id <> v_primary_stock_id
      and lower(btrim(ts.technician_email)) = v_email;
  end if;

  return coalesce(v_merged_parts, '[]'::jsonb);
end;
$$;

grant execute on function public.tech_stock_append_assigned_parts(text, jsonb)
  to authenticated, service_role;
