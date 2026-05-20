-- Build assigned_parts from locked inventory_items rows (not client payload).
-- Appends to existing assigned_parts for the target technician in one transaction.
create or replace function public.tech_stock_assign_inventory_parts(
  p_technician_email text,
  p_inventory_item_ids bigint[],
  p_parts jsonb default null,
  p_tech_stock_id bigint default null
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
  v_new_parts jsonb := '[]'::jsonb;
  v_ids bigint[];
  v_expected_count integer := 0;
  v_locked_inventory_count integer := 0;
  v_primary_stock_id bigint;
  v_existing_parts jsonb := '[]'::jsonb;
  v_merged_parts jsonb := '[]'::jsonb;
  v_deleted_count integer := 0;
  v_row_email text;
begin
  if v_email = '' then
    raise exception 'p_technician_email is required';
  end if;

  select coalesce(array_agg(distinct id), '{}'::bigint[])
    into v_ids
  from unnest(coalesce(p_inventory_item_ids, '{}'::bigint[])) as src(id)
  where id is not null;

  v_expected_count := coalesce(array_length(v_ids, 1), 0);
  if v_expected_count = 0 then
    raise exception 'p_inventory_item_ids is required';
  end if;

  if p_tech_stock_id is not null then
    select ts.id, lower(btrim(ts.technician_email))
      into v_primary_stock_id, v_row_email
    from public.tech_stock ts
    where ts.id = p_tech_stock_id
    for update;

    if v_primary_stock_id is null then
      raise exception 'tech_stock row % was not found', p_tech_stock_id;
    end if;

    if v_row_email is distinct from v_email then
      raise exception
        'Technician email mismatch for tech_stock row % (expected %, got %)',
        p_tech_stock_id,
        v_email,
        v_row_email;
    end if;
  else
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
  end if;

  with locked_inventory as (
    select
      ii.id,
      ii.category_code,
      ii.serial_number,
      ii.notes,
      ii.company
    from public.inventory_items ii
    where ii.id = any(v_ids)
      and upper(coalesce(ii.status, 'IN STOCK')) = 'IN STOCK'
    for update of ii
  ),
  locked_with_categories as (
    select
      li.id,
      li.category_code,
      li.serial_number,
      li.notes,
      li.company,
      ic.description as category_description
    from locked_inventory li
    left join public.inventory_categories ic
      on ic.code = li.category_code
  )
  select
    count(*),
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'stock_id', li.id::text,
          'inventory_item_id', li.id,
          'serial_number', btrim(coalesce(li.serial_number, '')),
          'code', btrim(coalesce(li.category_code, '')),
          'description', btrim(
            coalesce(
              li.category_description,
              li.category_code,
              'Item'
            )
          ),
          'supplier', 'N/A',
          'quantity', 1,
          'source', 'inventory_items',
          'assigned_at', to_jsonb(now())
        )
        order by li.id
      ),
      '[]'::jsonb
    )
    into v_locked_inventory_count, v_new_parts
  from locked_with_categories li;

  if v_locked_inventory_count <> v_expected_count then
    raise exception
      'One or more inventory items are missing or no longer IN STOCK (expected %, locked %)',
      v_expected_count,
      v_locked_inventory_count;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_new_parts) elem
    where btrim(coalesce(elem->>'serial_number', '')) = ''
  ) then
    raise exception 'One or more inventory items are missing serial_number';
  end if;

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

  -- Append only parts that are not already assigned by inventory item id.
  v_merged_parts :=
    coalesce(v_existing_parts, '[]'::jsonb)
    || coalesce(
      (
        select coalesce(jsonb_agg(elem), '[]'::jsonb)
        from jsonb_array_elements(v_new_parts) elem
        where not exists (
          select 1
          from jsonb_array_elements(coalesce(v_existing_parts, '[]'::jsonb)) existing
          where btrim(coalesce(existing->>'stock_id', existing->>'inventory_item_id', ''))
            = btrim(coalesce(elem->>'stock_id', elem->>'inventory_item_id', ''))
        )
      ),
      '[]'::jsonb
    );

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
    set assigned_parts = v_merged_parts
    where id = v_primary_stock_id;

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

grant execute on function public.tech_stock_assign_inventory_parts(text, bigint[], jsonb, bigint)
  to authenticated, service_role;
