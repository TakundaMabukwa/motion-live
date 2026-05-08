create or replace function public.return_all_tech_stock_to_inventory()
returns table (
  moved_rows integer,
  inserted_rows integer,
  conflict_rows integer,
  cleared_tech_rows integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_moved_rows integer := 0;
  v_inserted_rows integer := 0;
  v_cleared_rows integer := 0;
  v_missing_category_count integer := 0;
begin
  create table if not exists public.tech_stock_return_backups (
    backup_id uuid not null default gen_random_uuid(),
    taken_at timestamptz not null default now(),
    tech_stock_id bigint not null,
    technician_email text null,
    stock jsonb null,
    assigned_parts jsonb null,
    new_stock_assigned boolean null
  );

  insert into public.tech_stock_return_backups (
    tech_stock_id,
    technician_email,
    stock,
    assigned_parts,
    new_stock_assigned
  )
  select
    ts.id,
    ts.technician_email,
    coalesce(ts.stock, '{}'::jsonb),
    coalesce(ts.assigned_parts, '[]'::jsonb),
    ts.new_stock_assigned
  from public.tech_stock ts;

  create temp table tmp_tech_stock_move_source (
    tech_stock_id bigint not null,
    technician_email text null,
    source_type text not null,
    part_index integer not null,
    category_code text null,
    serial_base text null,
    description text null,
    quantity integer not null default 1
  ) on commit drop;

  insert into tmp_tech_stock_move_source (
    tech_stock_id,
    technician_email,
    source_type,
    part_index,
    category_code,
    serial_base,
    description,
    quantity
  )
  select
    ts.id as tech_stock_id,
    lower(btrim(coalesce(ts.technician_email, ''))) as technician_email,
    'assigned_parts' as source_type,
    ap.ordinality::integer as part_index,
    nullif(
      btrim(
        coalesce(
          ap.part ->> 'category_code',
          ap.part ->> 'code',
          ap.part ->> 'item_code',
          ''
        )
      ),
      ''
    ) as category_code,
    nullif(
      btrim(
        coalesce(
          ap.part ->> 'serial_number',
          ap.part ->> 'serial',
          ap.part ->> 'serialNumber',
          ap.part ->> 'ip_address',
          ''
        )
      ),
      ''
    ) as serial_base,
    nullif(
      btrim(
        coalesce(
          ap.part ->> 'description',
          ap.part ->> 'name',
          ap.part ->> 'item_description',
          ap.part ->> 'code',
          ''
        )
      ),
      ''
    ) as description,
    greatest(
      1,
      case
        when coalesce(ap.part ->> 'quantity', '') ~ '^[0-9]+$'
          then (ap.part ->> 'quantity')::integer
        when coalesce(ap.part ->> 'count', '') ~ '^[0-9]+$'
          then (ap.part ->> 'count')::integer
        else 1
      end
    ) as quantity
  from public.tech_stock ts
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(coalesce(ts.assigned_parts, '[]'::jsonb)) = 'array'
        then coalesce(ts.assigned_parts, '[]'::jsonb)
      else '[]'::jsonb
    end
  )
    with ordinality as ap(part, ordinality);

  insert into tmp_tech_stock_move_source (
    tech_stock_id,
    technician_email,
    source_type,
    part_index,
    category_code,
    serial_base,
    description,
    quantity
  )
  select
    ts.id as tech_stock_id,
    lower(btrim(coalesce(ts.technician_email, ''))) as technician_email,
    'legacy_stock_flat' as source_type,
    row_number() over (partition by ts.id order by stock_entry.code)::integer as part_index,
    nullif(btrim(stock_entry.code), '') as category_code,
    nullif(
      btrim(
        coalesce(
          stock_entry.value ->> 'serial_number',
          stock_entry.value ->> 'serial',
          stock_entry.value ->> 'serialNumber',
          stock_entry.value ->> 'ip_address',
          ''
        )
      ),
      ''
    ) as serial_base,
    nullif(
      btrim(
        coalesce(
          stock_entry.value ->> 'description',
          stock_entry.code,
          ''
        )
      ),
      ''
    ) as description,
    greatest(
      1,
      case
        when coalesce(stock_entry.value ->> 'count', '') ~ '^[0-9]+$'
          then (stock_entry.value ->> 'count')::integer
        when coalesce(stock_entry.value ->> 'quantity', '') ~ '^[0-9]+$'
          then (stock_entry.value ->> 'quantity')::integer
        else 1
      end
    ) as quantity
  from public.tech_stock ts
  cross join lateral jsonb_each(
    case
      when jsonb_typeof(coalesce(ts.stock, '{}'::jsonb)) = 'object'
        then coalesce(ts.stock, '{}'::jsonb)
      else '{}'::jsonb
    end
  ) as stock_entry(code, value)
  where jsonb_typeof(stock_entry.value) = 'object'
    and (
      stock_entry.value ? 'count'
      or stock_entry.value ? 'quantity'
    );

  insert into tmp_tech_stock_move_source (
    tech_stock_id,
    technician_email,
    source_type,
    part_index,
    category_code,
    serial_base,
    description,
    quantity
  )
  select
    ts.id as tech_stock_id,
    lower(btrim(coalesce(ts.technician_email, ''))) as technician_email,
    'legacy_stock_nested' as source_type,
    row_number() over (
      partition by ts.id, supplier_entry.supplier
      order by part_entry.code
    )::integer as part_index,
    nullif(btrim(part_entry.code), '') as category_code,
    nullif(
      btrim(
        coalesce(
          part_entry.value ->> 'serial_number',
          part_entry.value ->> 'serial',
          part_entry.value ->> 'serialNumber',
          part_entry.value ->> 'ip_address',
          ''
        )
      ),
      ''
    ) as serial_base,
    nullif(
      btrim(
        coalesce(
          part_entry.value ->> 'description',
          part_entry.code,
          ''
        )
      ),
      ''
    ) as description,
    greatest(
      1,
      case
        when coalesce(part_entry.value ->> 'count', '') ~ '^[0-9]+$'
          then (part_entry.value ->> 'count')::integer
        when coalesce(part_entry.value ->> 'quantity', '') ~ '^[0-9]+$'
          then (part_entry.value ->> 'quantity')::integer
        else 1
      end
    ) as quantity
  from public.tech_stock ts
  cross join lateral jsonb_each(
    case
      when jsonb_typeof(coalesce(ts.stock, '{}'::jsonb)) = 'object'
        then coalesce(ts.stock, '{}'::jsonb)
      else '{}'::jsonb
    end
  ) as supplier_entry(supplier, parts_map)
  cross join lateral jsonb_each(
    case
      when jsonb_typeof(supplier_entry.parts_map) = 'object'
        then supplier_entry.parts_map
      else '{}'::jsonb
    end
  ) as part_entry(code, value)
  where jsonb_typeof(supplier_entry.parts_map) = 'object'
    and not (
      supplier_entry.parts_map ? 'count'
      or supplier_entry.parts_map ? 'quantity'
    )
    and jsonb_typeof(part_entry.value) = 'object'
    and (
      part_entry.value ? 'count'
      or part_entry.value ? 'quantity'
    );

  create temp table tmp_tech_stock_move_units (
    tech_stock_id bigint not null,
    technician_email text null,
    source_type text not null,
    part_index integer not null,
    unit_no integer not null,
    category_code text not null,
    serial_number text not null,
    description text null
  ) on commit drop;

  insert into tmp_tech_stock_move_units (
    tech_stock_id,
    technician_email,
    source_type,
    part_index,
    unit_no,
    category_code,
    serial_number,
    description
  )
  select
    src.tech_stock_id,
    src.technician_email,
    src.source_type,
    src.part_index,
    gs.unit_no,
    btrim(src.category_code) as category_code,
    case
      when coalesce(src.serial_base, '') <> '' and src.quantity = 1
        then btrim(src.serial_base)
      when coalesce(src.serial_base, '') <> '' and src.quantity > 1
        then btrim(src.serial_base) || '-' || lpad(gs.unit_no::text, 3, '0')
      else
        'MIG-TECH-' ||
        src.tech_stock_id::text ||
        '-' ||
        regexp_replace(upper(coalesce(src.category_code, 'UNCAT')), '[^A-Z0-9]+', '', 'g') ||
        '-' ||
        lpad(gs.unit_no::text, 3, '0')
    end as serial_number,
    src.description
  from tmp_tech_stock_move_source src
  cross join lateral generate_series(1, greatest(1, src.quantity)) as gs(unit_no)
  where coalesce(btrim(src.category_code), '') <> '';

  select count(*)
    into v_moved_rows
  from tmp_tech_stock_move_units;

  if to_regclass('public.inventory_categories') is not null then
    select count(*)
      into v_missing_category_count
    from (
      select distinct u.category_code
      from tmp_tech_stock_move_units u
    ) missing
    left join public.inventory_categories ic
      on ic.code = missing.category_code
    where ic.code is null;

    if v_missing_category_count > 0 then
      raise exception
        'Cannot move stock: % category_code values do not exist in inventory_categories',
        v_missing_category_count;
    end if;
  end if;

  insert into public.inventory_items (
    category_code,
    serial_number,
    status,
    assigned_to_technician,
    assigned_date,
    direction,
    container,
    notes
  )
  select
    u.category_code,
    u.serial_number,
    'IN STOCK',
    u.technician_email,
    now(),
    'IN',
    'TECH_RETURN',
    case
      when coalesce(u.description, '') <> ''
        then 'Returned from technician stock: ' || u.description
      else 'Returned from technician stock'
    end
  from tmp_tech_stock_move_units u
  on conflict do nothing;

  get diagnostics v_inserted_rows = row_count;

  update public.tech_stock ts
  set
    assigned_parts = '[]'::jsonb,
    stock = '{}'::jsonb,
    new_stock_assigned = false
  where
    case
      when jsonb_typeof(coalesce(ts.assigned_parts, '[]'::jsonb)) = 'array'
        then jsonb_array_length(coalesce(ts.assigned_parts, '[]'::jsonb))
      else 0
    end > 0
    or
    case
      when jsonb_typeof(coalesce(ts.stock, '{}'::jsonb)) = 'object'
        then jsonb_object_length(coalesce(ts.stock, '{}'::jsonb))
      else 0
    end > 0;

  get diagnostics v_cleared_rows = row_count;

  return query
  select
    v_moved_rows,
    v_inserted_rows,
    greatest(v_moved_rows - v_inserted_rows, 0) as conflict_rows,
    v_cleared_rows;
end;
$$;

grant execute on function public.return_all_tech_stock_to_inventory()
  to authenticated, service_role;
