-- Run this after loading a workbook batch into public.age_analysis_imports.
-- Replace the batch id below with the batch you want to validate.

with import_batch as (
  select *
  from public.age_analysis_imports
  where batch_id = '00000000-0000-0000-0000-000000000000'::uuid
),
cost_center_matches as (
  select
    ib.id,
    ib.account_number,
    cc.cost_code
  from import_batch ib
  left join public.cost_centers cc
    on upper(trim(cc.cost_code)) = upper(trim(ib.account_number))
),
vehicle_matches as (
  select
    ib.id,
    ib.account_number,
    count(*) filter (
      where upper(trim(coalesce(v.new_account_number, ''))) = upper(trim(ib.account_number))
         or upper(trim(coalesce(v.account_number, ''))) = upper(trim(ib.account_number))
    ) as vehicle_count
  from import_batch ib
  left join public.vehicles v
    on upper(trim(coalesce(v.new_account_number, ''))) = upper(trim(ib.account_number))
    or upper(trim(coalesce(v.account_number, ''))) = upper(trim(ib.account_number))
  group by ib.id, ib.account_number
),
payments_matches as (
  select
    ib.id,
    ib.account_number,
    count(*) filter (
      where upper(trim(coalesce(p.cost_code, ''))) = upper(trim(ib.account_number))
    ) as payments_rows
  from import_batch ib
  left join public.payments_ p
    on upper(trim(coalesce(p.cost_code, ''))) = upper(trim(ib.account_number))
  group by ib.id, ib.account_number
)
select
  ib.account_number,
  ib.client,
  case when ccm.cost_code is null then 'ALERT: no exact cost_center match' else 'ok' end as cost_center_status,
  coalesce(vm.vehicle_count, 0) as matched_vehicles,
  coalesce(pm.payments_rows, 0) as existing_payments_rows,
  ib.current_due,
  ib.overdue_30_days,
  ib.overdue_60_days,
  ib.overdue_90_days,
  ib.overdue_120_plus_days,
  ib.outstanding_balance
from import_batch ib
left join cost_center_matches ccm
  on ccm.id = ib.id
left join vehicle_matches vm
  on vm.id = ib.id
left join payments_matches pm
  on pm.id = ib.id
where ccm.cost_code is null
   or coalesce(vm.vehicle_count, 0) = 0
order by ib.account_number;

-- Summary counts for the same batch.
with import_batch as (
  select *
  from public.age_analysis_imports
  where batch_id = '00000000-0000-0000-0000-000000000000'::uuid
)
select
  count(*) as imported_rows,
  count(*) filter (
    where exists (
      select 1
      from public.cost_centers cc
      where upper(trim(cc.cost_code)) = upper(trim(import_batch.account_number))
    )
  ) as cost_center_matches,
  count(*) filter (
    where exists (
      select 1
      from public.vehicles v
      where upper(trim(coalesce(v.new_account_number, ''))) = upper(trim(import_batch.account_number))
         or upper(trim(coalesce(v.account_number, ''))) = upper(trim(import_batch.account_number))
    )
  ) as vehicle_matches,
  count(*) filter (
    where not exists (
      select 1
      from public.cost_centers cc
      where upper(trim(cc.cost_code)) = upper(trim(import_batch.account_number))
    )
  ) as missing_cost_center_matches,
  count(*) filter (
    where not exists (
      select 1
      from public.vehicles v
      where upper(trim(coalesce(v.new_account_number, ''))) = upper(trim(import_batch.account_number))
         or upper(trim(coalesce(v.account_number, ''))) = upper(trim(import_batch.account_number))
    )
  ) as missing_vehicle_matches
from import_batch;
