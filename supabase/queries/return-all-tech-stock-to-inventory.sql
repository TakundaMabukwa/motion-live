-- 1) Execute the one-shot move.
select *
from public.return_all_tech_stock_to_inventory();

-- 2) Verify technician stock is cleared.
select
  count(*) as technicians_with_remaining_parts
from public.tech_stock ts
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

-- 3) See latest returned stock rows now in inventory.
select
  id,
  created_at,
  category_code,
  serial_number,
  status,
  assigned_to_technician,
  container
from public.inventory_items
where container = 'TECH_RETURN'
order by created_at desc
limit 200;
