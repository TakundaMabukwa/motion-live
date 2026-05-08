create or replace function public.tech_stock_assign_inventory_parts(
  p_technician_email text,
  p_inventory_item_ids bigint[],
  p_parts jsonb
)
returns table (
  technician_email text,
  total_parts integer,
  moved_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(btrim(coalesce(p_technician_email, '')));
  v_parts jsonb := coalesce(p_parts, '[]'::jsonb);
  v_ids bigint[];
  v_expected_count integer := 0;
  v_locked_inventory_count integer := 0;
  v_primary_stock_id bigint;
  v_existing_parts jsonb := '[]'::jsonb;
  v_merged_parts jsonb := '[]'::jsonb;
  v_deleted_count integer := 0;
begin
  if v_email = '' then
    raise exception 'p_technician_email is required';
  end if;

  if jsonb_typeof(v_parts) is distinct from 'array' then
    raise exception 'p_parts must be a JSON array';
  end if;

  select coalesce(array_agg(distinct id), '{}'::bigint[])
    into v_ids
  from unnest(coalesce(p_inventory_item_ids, '{}'::bigint[])) as src(id)
  where id is not null;

  v_expected_count := coalesce(array_length(v_ids, 1), 0);
  if v_expected_count = 0 then
    raise exception 'p_inventory_item_ids is required';
  end if;

  -- Lock all selected inventory rows that are currently available.
  with locked_inventory as (
    select id
    from public.inventory_items
    where id = any(v_ids)
      and upper(coalesce(status, 'IN STOCK')) = 'IN STOCK'
    for update
  )
  select count(*)
    into v_locked_inventory_count
  from locked_inventory;

  if v_locked_inventory_count <> v_expected_count then
    raise exception
      'One or more inventory items are missing or no longer IN STOCK (expected %, locked %)',
      v_expected_count,
      v_locked_inventory_count;
  end if;

  -- Lock matching technician stock rows (case-insensitive).
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
    insert into public.tech_stock (
      technician_email,
      assigned_parts
    )
    values (
      v_email,
      v_merged_parts
    )
    returning id into v_primary_stock_id;
  else
    update public.tech_stock
    set
      assigned_parts = v_merged_parts
    where id = v_primary_stock_id;

    -- Collapse duplicate rows for the same technician after merge.
    delete from public.tech_stock ts
    where ts.id <> v_primary_stock_id
      and lower(btrim(ts.technician_email)) = v_email;
  end if;

  delete from public.inventory_items
  where id = any(v_ids);

  get diagnostics v_deleted_count = row_count;

  if v_deleted_count <> v_expected_count then
    raise exception
      'Inventory delete mismatch (expected %, deleted %)',
      v_expected_count,
      v_deleted_count;
  end if;

  return query
  select
    v_email,
    jsonb_array_length(coalesce(v_merged_parts, '[]'::jsonb)),
    v_deleted_count;
end;
$$;

grant execute on function public.tech_stock_assign_inventory_parts(text, bigint[], jsonb)
  to authenticated, service_role;
