begin;

-- The monthly payments_ table is now a mirror of account_invoices.
-- Old flows created placeholder rows per cost_code, which breaks month-to-month billing.
-- This repair intentionally starts clean from the current month onward.

-- 1) Remove legacy unique constraint/indexes that only allow one payments_ row per cost_code.
do $$
declare
  constraint_record record;
  index_record record;
begin
  for constraint_record in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'payments_'
      and con.contype = 'u'
      and pg_get_constraintdef(con.oid) ilike '%(cost_code)%'
      and pg_get_constraintdef(con.oid) not ilike '%billing_month%'
  loop
    execute format('alter table public.payments_ drop constraint if exists %I', constraint_record.conname);
  end loop;

  for index_record in
    select idx.indexname
    from pg_indexes idx
    where idx.schemaname = 'public'
      and idx.tablename = 'payments_'
      and idx.indexdef ilike '%unique%'
      and idx.indexdef ilike '%(cost_code)%'
      and idx.indexdef not ilike '%billing_month%'
  loop
    execute format('drop index if exists public.%I', index_record.indexname);
  end loop;
end $$;

-- 2) Stop the old job-card trigger from creating placeholder payments_ rows.
create or replace function public.sync_job_card_accounts()
returns trigger
language plpgsql
as $$
declare
  v_account text;
  v_company text;
  v_job_type text;
  v_reg text;
begin
  v_account := nullif(btrim(new.new_account_number), '');
  if v_account is null then
    return new;
  end if;

  v_company := coalesce(nullif(btrim(new.customer_name), ''), v_account);
  v_job_type := lower(coalesce(new.job_type, ''));
  v_reg := nullif(btrim(new.vehicle_registration), '');

  -- cost_centers (always ensure exists)
  if not exists (
    select 1 from public.cost_centers where cost_code = v_account
  ) then
    insert into public.cost_centers(company, cost_code, validated)
    values (v_company, v_account, false);
  end if;

  -- customers_grouped (company_group + legal_names from customer_name)
  if not exists (
    select 1 from public.customers_grouped where company_group = v_company
  ) then
    insert into public.customers_grouped(
      company_group,
      legal_names,
      all_new_account_numbers,
      cost_code
    )
    values (
      v_company,
      v_company,
      v_account,
      v_account
    );
  else
    update public.customers_grouped
    set
      legal_names = coalesce(legal_names, v_company),
      cost_code = coalesce(cost_code, v_account),
      all_new_account_numbers = case
        when all_new_account_numbers is null or btrim(all_new_account_numbers) = '' then v_account
        when position(v_account in all_new_account_numbers) > 0 then all_new_account_numbers
        else all_new_account_numbers || ',' || v_account
      end
    where company_group = v_company;
  end if;

  -- vehicles: install jobs only, key by reg
  if v_reg is not null and v_job_type like 'install%' then
    if not exists (
      select 1 from public.vehicles where lower(reg) = lower(v_reg)
    ) then
      insert into public.vehicles(
        reg,
        make,
        model,
        year,
        company,
        new_account_number
      )
      values (
        v_reg,
        new.vehicle_make,
        new.vehicle_model,
        new.vehicle_year,
        v_company,
        v_account
      );
    end if;
  end if;

  return new;
end;
$$;

-- 3) Clear payment state from the current month onward.
delete from public.account_invoice_payments aip
using public.account_invoices ai
where ai.id = aip.account_invoice_id
  and ai.billing_month >= date_trunc('month', current_date)::date;

update public.account_invoices ai
set
  paid_amount = 0,
  balance_due = coalesce(ai.total_amount, 0),
  payment_status = 'pending',
  last_payment_at = null,
  last_payment_reference = null,
  fully_paid_at = null,
  updated_at = now()
where ai.billing_month >= date_trunc('month', current_date)::date;

-- 4) Recalculate older account_invoices from the payment ledger.
with payment_totals as (
  select
    account_invoice_id,
    coalesce(sum(amount), 0)::numeric(12,2) as paid_amount,
    max(payment_date) as last_payment_at,
    (
      array_remove(array_agg(payment_reference order by payment_date desc), null)
    )[1] as last_payment_reference
  from public.account_invoice_payments
  group by account_invoice_id
)
update public.account_invoices ai
set
  paid_amount = coalesce(pt.paid_amount, 0),
  balance_due = greatest(coalesce(ai.total_amount, 0) - coalesce(pt.paid_amount, 0), 0),
  payment_status = case
    when greatest(coalesce(ai.total_amount, 0) - coalesce(pt.paid_amount, 0), 0) <= 0 then 'paid'
    when coalesce(pt.paid_amount, 0) > 0 and ai.due_date is not null and ai.due_date < current_date then 'overdue'
    when coalesce(pt.paid_amount, 0) > 0 then 'partial'
    when ai.due_date is not null and ai.due_date < current_date then 'overdue'
    else 'pending'
  end,
  last_payment_at = pt.last_payment_at,
  last_payment_reference = pt.last_payment_reference,
  fully_paid_at = case
    when greatest(coalesce(ai.total_amount, 0) - coalesce(pt.paid_amount, 0), 0) <= 0
      then coalesce(ai.fully_paid_at, pt.last_payment_at, now())
    else null
  end,
  updated_at = now()
from payment_totals pt
where pt.account_invoice_id = ai.id;

update public.account_invoices ai
set
  paid_amount = 0,
  balance_due = coalesce(ai.total_amount, 0),
  payment_status = case
    when ai.due_date is not null and ai.due_date < current_date then 'overdue'
    else 'pending'
  end,
  last_payment_at = null,
  last_payment_reference = null,
  fully_paid_at = null,
  updated_at = now()
where not exists (
  select 1
  from public.account_invoice_payments aip
  where aip.account_invoice_id = ai.id
)
and ai.billing_month < date_trunc('month', current_date)::date;

-- 5) Delete orphan/legacy payments_ rows that do not map to a real monthly invoice.
delete from public.payments_ p
where not exists (
  select 1
  from public.account_invoices ai
  where ai.account_number = p.cost_code
    and coalesce(ai.billing_month, date '1900-01-01') = coalesce(p.billing_month, date '1900-01-01')
);

-- 6) Rebuild payments_ from account_invoices without relying on ON CONFLICT.
with invoice_snapshot as (
  select
    coalesce(ai.company_name, cc.legal_name, cc.company, '') as company,
    ai.account_number as cost_code,
    ai.id as account_invoice_id,
    ai.invoice_number,
    ai.invoice_number as reference,
    coalesce(ai.total_amount, 0) as due_amount,
    coalesce(ai.paid_amount, 0) as paid_amount,
    coalesce(ai.balance_due, coalesce(ai.total_amount, 0)) as balance_due,
    coalesce(ai.payment_status, 'pending') as payment_status,
    coalesce(ai.invoice_date::date, current_date) as invoice_date,
    ai.due_date,
    case
      when coalesce(ai.balance_due, 0) > 0
        and ai.due_date is not null
        and current_date - ai.due_date between 1 and 30
      then coalesce(ai.balance_due, 0)
      else 0
    end as overdue_30_days,
    case
      when coalesce(ai.balance_due, 0) > 0
        and ai.due_date is not null
        and current_date - ai.due_date between 31 and 60
      then coalesce(ai.balance_due, 0)
      else 0
    end as overdue_60_days,
    case
      when coalesce(ai.balance_due, 0) > 0
        and ai.due_date is not null
        and current_date - ai.due_date >= 61
      then coalesce(ai.balance_due, 0)
      else 0
    end as overdue_90_days,
    ai.billing_month,
    now() as last_updated
  from public.account_invoices ai
  left join public.cost_centers cc
    on cc.cost_code = ai.account_number
)
update public.payments_ p
set
  company = s.company,
  account_invoice_id = s.account_invoice_id,
  invoice_number = s.invoice_number,
  reference = s.reference,
  due_amount = s.due_amount,
  paid_amount = s.paid_amount,
  balance_due = s.balance_due,
  payment_status = s.payment_status,
  invoice_date = s.invoice_date,
  due_date = s.due_date,
  overdue_30_days = s.overdue_30_days,
  overdue_60_days = s.overdue_60_days,
  overdue_90_days = s.overdue_90_days,
  last_updated = s.last_updated
from invoice_snapshot s
where p.cost_code = s.cost_code
  and coalesce(p.billing_month, date '1900-01-01') = coalesce(s.billing_month, date '1900-01-01');

with invoice_snapshot as (
  select
    coalesce(ai.company_name, cc.legal_name, cc.company, '') as company,
    ai.account_number as cost_code,
    ai.id as account_invoice_id,
    ai.invoice_number,
    ai.invoice_number as reference,
    coalesce(ai.total_amount, 0) as due_amount,
    coalesce(ai.paid_amount, 0) as paid_amount,
    coalesce(ai.balance_due, coalesce(ai.total_amount, 0)) as balance_due,
    coalesce(ai.payment_status, 'pending') as payment_status,
    coalesce(ai.invoice_date::date, current_date) as invoice_date,
    ai.due_date,
    case
      when coalesce(ai.balance_due, 0) > 0
        and ai.due_date is not null
        and current_date - ai.due_date between 1 and 30
      then coalesce(ai.balance_due, 0)
      else 0
    end as overdue_30_days,
    case
      when coalesce(ai.balance_due, 0) > 0
        and ai.due_date is not null
        and current_date - ai.due_date between 31 and 60
      then coalesce(ai.balance_due, 0)
      else 0
    end as overdue_60_days,
    case
      when coalesce(ai.balance_due, 0) > 0
        and ai.due_date is not null
        and current_date - ai.due_date >= 61
      then coalesce(ai.balance_due, 0)
      else 0
    end as overdue_90_days,
    ai.billing_month,
    now() as last_updated
  from public.account_invoices ai
  left join public.cost_centers cc
    on cc.cost_code = ai.account_number
)
insert into public.payments_ (
  company,
  cost_code,
  account_invoice_id,
  invoice_number,
  reference,
  due_amount,
  paid_amount,
  balance_due,
  payment_status,
  invoice_date,
  due_date,
  overdue_30_days,
  overdue_60_days,
  overdue_90_days,
  billing_month,
  last_updated
)
select
  s.company,
  s.cost_code,
  s.account_invoice_id,
  s.invoice_number,
  s.reference,
  s.due_amount,
  s.paid_amount,
  s.balance_due,
  s.payment_status,
  s.invoice_date,
  s.due_date,
  s.overdue_30_days,
  s.overdue_60_days,
  s.overdue_90_days,
  s.billing_month,
  s.last_updated
from invoice_snapshot s
where not exists (
  select 1
  from public.payments_ p
  where p.cost_code = s.cost_code
    and coalesce(p.billing_month, date '1900-01-01') = coalesce(s.billing_month, date '1900-01-01')
);

commit;
