-- Payment and ledger verification queries
-- Safe to run read-only.

-- 1. Every payment should equal the sum of its allocation rows.
select
  aip.id as payment_id,
  aip.account_number,
  aip.account_invoice_id,
  aip.amount as payment_amount,
  coalesce(sum(apa.amount), 0)::numeric(12, 2) as allocation_total,
  (aip.amount - coalesce(sum(apa.amount), 0))::numeric(12, 2) as difference
from public.account_invoice_payments aip
left join public.account_payment_allocations apa
  on apa.payment_id = aip.id
group by aip.id, aip.account_number, aip.account_invoice_id, aip.amount
having abs(aip.amount - coalesce(sum(apa.amount), 0)) > 0.01
order by aip.payment_date desc nulls last, aip.created_at desc nulls last;

-- 2. Invoice balances should match payment totals capped at invoice total.
select
  ai.id as account_invoice_id,
  ai.account_number,
  ai.invoice_number,
  ai.total_amount,
  ai.paid_amount,
  ai.balance_due,
  least(ai.total_amount, coalesce(sum(aip.amount), 0))::numeric(12, 2) as expected_paid_amount,
  greatest(ai.total_amount - least(ai.total_amount, coalesce(sum(aip.amount), 0)), 0)::numeric(12, 2) as expected_balance_due
from public.account_invoices ai
left join public.account_invoice_payments aip
  on aip.account_invoice_id = ai.id
group by ai.id, ai.account_number, ai.invoice_number, ai.total_amount, ai.paid_amount, ai.balance_due
having abs(ai.paid_amount - least(ai.total_amount, coalesce(sum(aip.amount), 0))) > 0.01
   or abs(ai.balance_due - greatest(ai.total_amount - least(ai.total_amount, coalesce(sum(aip.amount), 0)), 0)) > 0.01
order by ai.created_at desc nulls last;

-- 3. payments_ mirror should balance internally:
--    current_due + overdue buckets should equal outstanding_balance,
--    and balance_due should match outstanding_balance.
select
  p.id,
  p.cost_code,
  p.billing_month,
  p.current_due,
  p.overdue_30_days,
  p.overdue_60_days,
  p.overdue_90_days,
  p.overdue_120_plus_days,
  p.outstanding_balance,
  p.balance_due,
  (
    coalesce(p.current_due, 0) +
    coalesce(p.overdue_30_days, 0) +
    coalesce(p.overdue_60_days, 0) +
    coalesce(p.overdue_90_days, 0) +
    coalesce(p.overdue_120_plus_days, 0)
  )::numeric(12, 2) as bucket_total
from public.payments_ p
where abs(
  coalesce(p.outstanding_balance, 0) - (
    coalesce(p.current_due, 0) +
    coalesce(p.overdue_30_days, 0) +
    coalesce(p.overdue_60_days, 0) +
    coalesce(p.overdue_90_days, 0) +
    coalesce(p.overdue_120_plus_days, 0)
  )
) > 0.01
or abs(coalesce(p.balance_due, 0) - coalesce(p.outstanding_balance, 0)) > 0.01
order by p.last_updated desc nulls last;

-- 4. Credit allocations should reconcile to invoice overpayments.
select
  ai.id as account_invoice_id,
  ai.account_number,
  ai.invoice_number,
  greatest(coalesce(sum(aip.amount), 0) - ai.total_amount, 0)::numeric(12, 2) as expected_credit,
  coalesce(sum(case when apa.allocation_type = 'credit' then apa.amount else 0 end), 0)::numeric(12, 2) as credited_in_ledger
from public.account_invoices ai
left join public.account_invoice_payments aip
  on aip.account_invoice_id = ai.id
left join public.account_payment_allocations apa
  on apa.account_invoice_id = ai.id
group by ai.id, ai.account_number, ai.invoice_number, ai.total_amount
having abs(
  greatest(coalesce(sum(aip.amount), 0) - ai.total_amount, 0) -
  coalesce(sum(case when apa.allocation_type = 'credit' then apa.amount else 0 end), 0)
) > 0.01
order by ai.created_at desc nulls last;