-- Monthly age-analysis rollover using real monthly movements.
-- Logic:
-- 1) Shift prior month buckets forward (current->30, 30->60, 60->90, 90->120+).
-- 2) Add current month invoiced value to current due.
-- 3) Apply current month payments + credit notes + carried credit to oldest buckets first.
-- 4) Persist one summary row per account/month (reference = AGE-ROLLFORWARD).

delete from public.payments_ p
using (
  select
    id,
    row_number() over (
      partition by cost_code, billing_month, reference
      order by last_updated desc nulls last, id desc
    ) as rn
  from public.payments_
  where reference = 'AGE-ROLLFORWARD'
) d
where p.id = d.id
  and d.rn > 1;

create unique index if not exists payments_age_rollforward_uidx
  on public.payments_ (cost_code, billing_month, reference)
  where reference = 'AGE-ROLLFORWARD';

create or replace function public.calculate_age_analysis_rollover_month(
  p_target_billing_month date default null,
  p_account_number text default null
)
returns table (
  account_number text,
  company text,
  billing_month date,
  current_due numeric(12,2),
  overdue_30_days numeric(12,2),
  overdue_60_days numeric(12,2),
  overdue_90_days numeric(12,2),
  overdue_120_plus_days numeric(12,2),
  outstanding_balance numeric(12,2),
  paid_amount numeric(12,2),
  credit_amount numeric(12,2),
  invoice_total numeric(12,2),
  payment_total numeric(12,2),
  credit_note_total numeric(12,2),
  payment_status text
)
language sql
stable
as $$
with params as (
  select
    date_trunc('month', coalesce(p_target_billing_month, current_date)::timestamp)::date as target_month
),
boundaries as (
  select
    target_month,
    (target_month + interval '1 month')::date as next_month,
    (target_month - interval '1 month')::date as prev_month
  from params
),
requested_account as (
  select nullif(upper(btrim(p_account_number)), '') as account_number
),
accounts as (
  select distinct upper(btrim(p.cost_code)) as account_number
  from public.payments_ p
  join boundaries b
    on p.billing_month in (b.prev_month, b.target_month)
  where nullif(btrim(p.cost_code), '') is not null

  union

  select distinct upper(btrim(ai.account_number)) as account_number
  from public.account_invoices ai
  join boundaries b
    on ai.billing_month = b.target_month
  where nullif(btrim(ai.account_number), '') is not null

  union

  select distinct upper(btrim(aip.account_number)) as account_number
  from public.account_invoice_payments aip
  join boundaries b
    on aip.payment_date >= b.target_month
   and aip.payment_date < b.next_month
  where nullif(btrim(aip.account_number), '') is not null

  union

  select distinct upper(btrim(cn.account_number)) as account_number
  from public.credit_notes cn
  join boundaries b
    on cn.billing_month_applies_to = b.target_month
  where nullif(btrim(cn.account_number), '') is not null
),
filtered_accounts as (
  select a.account_number
  from accounts a
  cross join requested_account ra
  where ra.account_number is null or a.account_number = ra.account_number
),
cost_center_info as (
  select
    upper(btrim(cc.cost_code)) as account_number,
    nullif(btrim(cc.legal_name), '') as legal_name,
    nullif(btrim(cc.company), '') as company
  from public.cost_centers cc
  where nullif(btrim(cc.cost_code), '') is not null
),
prior_age as (
  select
    fa.account_number,
    max(nullif(btrim(p.company), '')) as prior_company,
    sum(coalesce(p.current_due, 0))::numeric as prev_current_due,
    sum(coalesce(p.overdue_30_days, 0))::numeric as prev_overdue_30_days,
    sum(coalesce(p.overdue_60_days, 0))::numeric as prev_overdue_60_days,
    sum(coalesce(p.overdue_90_days, 0))::numeric as prev_overdue_90_days,
    sum(coalesce(p.overdue_120_plus_days, 0))::numeric as prev_overdue_120_plus_days,
    sum(coalesce(p.credit_amount, 0))::numeric as prev_credit_amount
  from filtered_accounts fa
  join boundaries b on true
  left join public.payments_ p
    on upper(btrim(p.cost_code)) = fa.account_number
   and p.billing_month = b.prev_month
  group by fa.account_number
),
current_month_invoices as (
  select
    fa.account_number,
    sum(coalesce(ai.total_amount, 0))::numeric as invoice_total,
    max(nullif(btrim(ai.company_name), '')) as invoice_company
  from filtered_accounts fa
  join boundaries b on true
  left join public.account_invoices ai
    on upper(btrim(ai.account_number)) = fa.account_number
   and ai.billing_month = b.target_month
  group by fa.account_number
),
payments_in_month as (
  select
    fa.account_number,
    sum(coalesce(aip.amount, 0))::numeric as payment_total
  from filtered_accounts fa
  join boundaries b on true
  left join public.account_invoice_payments aip
    on upper(btrim(aip.account_number)) = fa.account_number
   and aip.payment_date >= b.target_month
   and aip.payment_date < b.next_month
  group by fa.account_number
),
credit_notes_in_month as (
  select
    fa.account_number,
    sum(
      coalesce(
        cn.amount,
        coalesce(cn.applied_amount, 0) + coalesce(cn.unapplied_amount, 0),
        0
      )
    )::numeric as credit_note_total
  from filtered_accounts fa
  join boundaries b on true
  left join public.credit_notes cn
    on upper(btrim(cn.account_number)) = fa.account_number
   and cn.billing_month_applies_to = b.target_month
  group by fa.account_number
),
base as (
  select
    fa.account_number,
    coalesce(
      ci.legal_name,
      ci.company,
      cmi.invoice_company,
      pa.prior_company,
      fa.account_number
    ) as company,
    b.target_month as billing_month,
    coalesce(pa.prev_current_due, 0)::numeric as prev_current_due,
    coalesce(pa.prev_overdue_30_days, 0)::numeric as prev_overdue_30_days,
    coalesce(pa.prev_overdue_60_days, 0)::numeric as prev_overdue_60_days,
    coalesce(pa.prev_overdue_90_days, 0)::numeric as prev_overdue_90_days,
    coalesce(pa.prev_overdue_120_plus_days, 0)::numeric as prev_overdue_120_plus_days,
    coalesce(pa.prev_credit_amount, 0)::numeric as prev_credit_amount,
    coalesce(cmi.invoice_total, 0)::numeric as invoice_total,
    coalesce(pm.payment_total, 0)::numeric as payment_total,
    coalesce(cn.credit_note_total, 0)::numeric as credit_note_total
  from filtered_accounts fa
  join boundaries b on true
  left join prior_age pa
    on pa.account_number = fa.account_number
  left join current_month_invoices cmi
    on cmi.account_number = fa.account_number
  left join payments_in_month pm
    on pm.account_number = fa.account_number
  left join credit_notes_in_month cn
    on cn.account_number = fa.account_number
  left join cost_center_info ci
    on ci.account_number = fa.account_number
),
rolled as (
  select
    account_number,
    company,
    billing_month,
    0::numeric as rolled_current_due,
    prev_current_due as rolled_overdue_30_days,
    prev_overdue_30_days as rolled_overdue_60_days,
    prev_overdue_60_days as rolled_overdue_90_days,
    (prev_overdue_90_days + prev_overdue_120_plus_days)::numeric as rolled_overdue_120_plus_days,
    invoice_total,
    payment_total,
    credit_note_total,
    prev_credit_amount
  from base
),
pre_allocation as (
  select
    account_number,
    company,
    billing_month,
    (rolled_current_due + invoice_total)::numeric as bucket_current_due,
    rolled_overdue_30_days::numeric as bucket_overdue_30_days,
    rolled_overdue_60_days::numeric as bucket_overdue_60_days,
    rolled_overdue_90_days::numeric as bucket_overdue_90_days,
    rolled_overdue_120_plus_days::numeric as bucket_overdue_120_plus_days,
    invoice_total,
    payment_total,
    credit_note_total,
    greatest(prev_credit_amount + payment_total + credit_note_total, 0)::numeric as total_reduction
  from rolled
),
alloc_120 as (
  select
    *,
    greatest(bucket_overdue_120_plus_days - total_reduction, 0)::numeric as final_overdue_120_plus_days,
    greatest(total_reduction - bucket_overdue_120_plus_days, 0)::numeric as remaining_after_120
  from pre_allocation
),
alloc_90 as (
  select
    *,
    greatest(bucket_overdue_90_days - remaining_after_120, 0)::numeric as final_overdue_90_days,
    greatest(remaining_after_120 - bucket_overdue_90_days, 0)::numeric as remaining_after_90
  from alloc_120
),
alloc_60 as (
  select
    *,
    greatest(bucket_overdue_60_days - remaining_after_90, 0)::numeric as final_overdue_60_days,
    greatest(remaining_after_90 - bucket_overdue_60_days, 0)::numeric as remaining_after_60
  from alloc_90
),
alloc_30 as (
  select
    *,
    greatest(bucket_overdue_30_days - remaining_after_60, 0)::numeric as final_overdue_30_days,
    greatest(remaining_after_60 - bucket_overdue_30_days, 0)::numeric as remaining_after_30
  from alloc_60
),
alloc_current as (
  select
    *,
    greatest(bucket_current_due - remaining_after_30, 0)::numeric as final_current_due,
    greatest(remaining_after_30 - bucket_current_due, 0)::numeric as remaining_credit
  from alloc_30
),
final_rows as (
  select
    account_number,
    company,
    billing_month,
    round(final_current_due, 2)::numeric(12,2) as current_due,
    round(final_overdue_30_days, 2)::numeric(12,2) as overdue_30_days,
    round(final_overdue_60_days, 2)::numeric(12,2) as overdue_60_days,
    round(final_overdue_90_days, 2)::numeric(12,2) as overdue_90_days,
    round(final_overdue_120_plus_days, 2)::numeric(12,2) as overdue_120_plus_days,
    round(
      final_current_due +
      final_overdue_30_days +
      final_overdue_60_days +
      final_overdue_90_days +
      final_overdue_120_plus_days,
      2
    )::numeric(12,2) as outstanding_balance,
    round(payment_total, 2)::numeric(12,2) as paid_amount,
    round(remaining_credit, 2)::numeric(12,2) as credit_amount,
    round(invoice_total, 2)::numeric(12,2) as invoice_total,
    round(payment_total, 2)::numeric(12,2) as payment_total,
    round(credit_note_total, 2)::numeric(12,2) as credit_note_total
  from alloc_current
)
select
  fr.account_number,
  fr.company,
  fr.billing_month,
  fr.current_due,
  fr.overdue_30_days,
  fr.overdue_60_days,
  fr.overdue_90_days,
  fr.overdue_120_plus_days,
  fr.outstanding_balance,
  fr.paid_amount,
  fr.credit_amount,
  fr.invoice_total,
  fr.payment_total,
  fr.credit_note_total,
  case
    -- payments_.payment_status constraint does not allow "credit";
    -- credit is tracked in credit_amount while status remains paid.
    when fr.outstanding_balance <= 0.01 then 'paid'
    when fr.paid_amount > 0.01 or fr.credit_note_total > 0.01 then 'partial'
    else 'pending'
  end as payment_status
from final_rows fr
where
  abs(fr.current_due) > 0.01
  or abs(fr.overdue_30_days) > 0.01
  or abs(fr.overdue_60_days) > 0.01
  or abs(fr.overdue_90_days) > 0.01
  or abs(fr.overdue_120_plus_days) > 0.01
  or abs(fr.paid_amount) > 0.01
  or abs(fr.credit_amount) > 0.01
  or abs(fr.invoice_total) > 0.01
  or abs(fr.credit_note_total) > 0.01;
$$;

create or replace function public.rollover_age_analysis_month(
  p_target_billing_month date default null,
  p_account_number text default null,
  p_persist boolean default true
)
returns table (
  account_number text,
  company text,
  billing_month date,
  current_due numeric(12,2),
  overdue_30_days numeric(12,2),
  overdue_60_days numeric(12,2),
  overdue_90_days numeric(12,2),
  overdue_120_plus_days numeric(12,2),
  outstanding_balance numeric(12,2),
  paid_amount numeric(12,2),
  credit_amount numeric(12,2),
  invoice_total numeric(12,2),
  payment_total numeric(12,2),
  credit_note_total numeric(12,2),
  payment_status text,
  persisted boolean
)
language plpgsql
security definer
as $$
#variable_conflict use_column
declare
  v_target_month date := date_trunc('month', coalesce(p_target_billing_month, current_date)::timestamp)::date;
begin
  if p_persist then
    with roll_rows as (
      select
        r.company,
        r.account_number,
        r.billing_month,
        r.payment_status,
        r.current_due,
        r.overdue_30_days,
        r.overdue_60_days,
        r.overdue_90_days,
        r.overdue_120_plus_days,
        r.outstanding_balance,
        r.paid_amount,
        r.credit_amount
      from public.calculate_age_analysis_rollover_month(v_target_month, p_account_number) r
    ),
    updated as (
      update public.payments_ p
      set
        company = rr.company,
        due_amount = (rr.outstanding_balance + rr.paid_amount)::numeric(12,2),
        amount_due = rr.outstanding_balance,
        balance_due = rr.outstanding_balance,
        invoice_date = rr.billing_month::timestamptz,
        due_date = (rr.billing_month + interval '1 month' - interval '1 day')::date,
        payment_status = rr.payment_status,
        current_due = rr.current_due,
        overdue_30_days = rr.overdue_30_days,
        overdue_60_days = rr.overdue_60_days,
        overdue_90_days = rr.overdue_90_days,
        overdue_120_plus_days = rr.overdue_120_plus_days,
        outstanding_balance = rr.outstanding_balance,
        paid_amount = rr.paid_amount,
        credit_amount = rr.credit_amount,
        last_updated = now()
      from roll_rows rr
      where upper(btrim(p.cost_code)) = rr.account_number
        and p.billing_month = rr.billing_month
      returning p.cost_code, p.billing_month
    )
    insert into public.payments_ (
      company,
      cost_code,
      account_invoice_id,
      invoice_number,
      reference,
      due_amount,
      amount_due,
      balance_due,
      invoice_date,
      due_date,
      payment_status,
      current_due,
      overdue_30_days,
      overdue_60_days,
      overdue_90_days,
      overdue_120_plus_days,
      outstanding_balance,
      paid_amount,
      credit_amount,
      billing_month,
      last_updated
    )
    select
      rr.company,
      rr.account_number,
      null,
      null,
      'AGE-ROLLFORWARD',
      (rr.outstanding_balance + rr.paid_amount)::numeric(12,2),
      rr.outstanding_balance,
      rr.outstanding_balance,
      rr.billing_month::timestamptz,
      (rr.billing_month + interval '1 month' - interval '1 day')::date,
      rr.payment_status,
      rr.current_due,
      rr.overdue_30_days,
      rr.overdue_60_days,
      rr.overdue_90_days,
      rr.overdue_120_plus_days,
      rr.outstanding_balance,
      rr.paid_amount,
      rr.credit_amount,
      rr.billing_month,
      now()
    from roll_rows rr
    where not exists (
      select 1
      from updated u
      where upper(btrim(u.cost_code)) = rr.account_number
        and u.billing_month = rr.billing_month
    );
  end if;

  return query
  select
    r.account_number,
    r.company,
    r.billing_month,
    r.current_due,
    r.overdue_30_days,
    r.overdue_60_days,
    r.overdue_90_days,
    r.overdue_120_plus_days,
    r.outstanding_balance,
    r.paid_amount,
    r.credit_amount,
    r.invoice_total,
    r.payment_total,
    r.credit_note_total,
    r.payment_status,
    p_persist as persisted
  from public.calculate_age_analysis_rollover_month(v_target_month, p_account_number) r
  order by r.account_number;
end;
$$;

create or replace function public.rollover_age_analysis_backfill(
  p_from_billing_month date,
  p_to_billing_month date default null,
  p_account_number text default null,
  p_persist boolean default true
)
returns table (
  billing_month date,
  accounts_processed integer
)
language plpgsql
security definer
as $$
#variable_conflict use_column
declare
  v_month date;
  v_end date;
begin
  if p_from_billing_month is null then
    raise exception 'p_from_billing_month is required';
  end if;

  v_month := date_trunc('month', p_from_billing_month::timestamp)::date;
  v_end := date_trunc('month', coalesce(p_to_billing_month, current_date)::timestamp)::date;

  if v_month > v_end then
    raise exception 'p_from_billing_month (%) must be <= p_to_billing_month (%)', v_month, v_end;
  end if;

  while v_month <= v_end loop
    billing_month := v_month;
    select count(*)
      into accounts_processed
    from public.rollover_age_analysis_month(
      p_target_billing_month => v_month,
      p_account_number => p_account_number,
      p_persist => p_persist
    );
    return next;
    v_month := (v_month + interval '1 month')::date;
  end loop;
end;
$$;
