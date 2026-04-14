with ordered_payments as (
  select
    aip.id as payment_id,
    aip.account_invoice_id,
    aip.account_number,
    aip.billing_month,
    aip.payment_reference,
    aip.notes,
    aip.payment_date,
    aip.created_by,
    aip.created_by_email,
    aip.created_at,
    coalesce(aip.amount, 0)::numeric(12, 2) as payment_amount,
    coalesce(ai.total_amount, 0)::numeric(12, 2) as invoice_total,
    coalesce(
      sum(coalesce(aip.amount, 0)) over (
        partition by aip.account_invoice_id
        order by coalesce(aip.payment_date, aip.created_at), aip.created_at, aip.id
        rows between unbounded preceding and 1 preceding
      ),
      0
    )::numeric(12, 2) as prior_paid_against_invoice
  from public.account_invoice_payments aip
  left join public.account_invoices ai
    on ai.id = aip.account_invoice_id
),
calculated_allocations as (
  select
    payment_id,
    account_invoice_id,
    account_number,
    billing_month,
    payment_reference,
    notes,
    payment_date,
    created_by,
    created_by_email,
    created_at,
    payment_amount,
    invoice_total,
    prior_paid_against_invoice,
    case
      when account_invoice_id is null then payment_amount
      when invoice_total <= 0 then payment_amount
      else least(
        payment_amount,
        greatest(invoice_total - prior_paid_against_invoice, 0)
      )::numeric(12, 2)
    end as invoice_applied_amount
  from ordered_payments
),
invoice_rows as (
  select
    gen_random_uuid() as id,
    ca.payment_id,
    ca.account_number,
    ca.account_invoice_id,
    ca.billing_month,
    'invoice'::text as allocation_type,
    ca.invoice_applied_amount as amount,
    ca.payment_date,
    ca.payment_reference as reference,
    ca.notes,
    jsonb_build_object(
      'backfilled', true,
      'source', 'account_invoice_payments',
      'payment_amount', ca.payment_amount,
      'invoice_total', ca.invoice_total,
      'prior_paid_against_invoice', ca.prior_paid_against_invoice
    ) as meta,
    ca.created_by,
    ca.created_by_email,
    coalesce(ca.created_at, now()) as created_at,
    now() as updated_at
  from calculated_allocations ca
  where ca.invoice_applied_amount > 0
    and not exists (
      select 1
      from public.account_payment_allocations apa
      where apa.payment_id = ca.payment_id
        and apa.allocation_type = 'invoice'
    )
),
credit_rows as (
  select
    gen_random_uuid() as id,
    ca.payment_id,
    ca.account_number,
    ca.account_invoice_id,
    ca.billing_month,
    'credit'::text as allocation_type,
    greatest(ca.payment_amount - ca.invoice_applied_amount, 0)::numeric(12, 2) as amount,
    ca.payment_date,
    ca.payment_reference as reference,
    ca.notes,
    jsonb_build_object(
      'backfilled', true,
      'source', 'account_invoice_payments',
      'payment_amount', ca.payment_amount,
      'invoice_total', ca.invoice_total,
      'prior_paid_against_invoice', ca.prior_paid_against_invoice
    ) as meta,
    ca.created_by,
    ca.created_by_email,
    coalesce(ca.created_at, now()) as created_at,
    now() as updated_at
  from calculated_allocations ca
  where greatest(ca.payment_amount - ca.invoice_applied_amount, 0) > 0
    and not exists (
      select 1
      from public.account_payment_allocations apa
      where apa.payment_id = ca.payment_id
        and apa.allocation_type = 'credit'
    )
)
insert into public.account_payment_allocations (
  id,
  payment_id,
  account_number,
  account_invoice_id,
  billing_month,
  allocation_type,
  amount,
  payment_date,
  reference,
  notes,
  meta,
  created_by,
  created_by_email,
  created_at,
  updated_at
)
select * from invoice_rows
union all
select * from credit_rows;
