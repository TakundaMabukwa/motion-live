-- Atomic account invoice creation.
-- Every call = new invoice number + new row. No upsert, no idempotency.
-- Returns the allocated invoice number + a new row in account_invoices.
-- On failure, the caller (TypeScript API) handles savepoint rollback to prevent sequence gaps.

create or replace function public.create_atomic_account_invoice(
  p_user_id uuid,
  p_account_number text,
  p_billing_month text default null,
  p_company_name text default null,
  p_company_registration_number text default null,
  p_client_address text default null,
  p_customer_vat_number text default null,
  p_invoice_date timestamptz default now(),
  p_subtotal numeric(12,2) default 0,
  p_vat_amount numeric(12,2) default 0,
  p_discount_amount numeric(12,2) default 0,
  p_total_amount numeric(12,2) default 0,
  p_line_items jsonb default '[]'::jsonb,
  p_notes text default null,
  p_invoice_prefix text default 'INV'
)
returns jsonb
language plpgsql
as $$
declare
  v_invoice_number text;
  v_audit_id uuid;
  v_inserted_invoice jsonb;
  v_billing_month date;
begin
  -- Parse billing month to date (handles YYYY-MM or YYYY-MM-DD)
  if p_billing_month is not null and p_billing_month != '' then
    if length(p_billing_month) = 7 then
      v_billing_month := (p_billing_month || '-01')::date;
    else
      v_billing_month := p_billing_month::date;
    end if;
  else
    v_billing_month := date_trunc('month', now())::date;
  end if;

  -- 1. Allocate invoice number (atomic sequence increment)
  select public.allocate_document_number('invoice', p_invoice_prefix) into v_invoice_number;

  if v_invoice_number is null or v_invoice_number = '' then
    raise exception 'Failed to allocate invoice number';
  end if;

  -- 2. Insert audit row
  insert into public.invoice_number_events (
    invoice_number, sequence_name, prefix, source, request_key,
    allocated_by, status, context, allocated_at
  ) values (
    v_invoice_number, 'invoice', p_invoice_prefix,
    'rpc/create_atomic_account_invoice',
    p_account_number || '|' || to_char(v_billing_month, 'YYYY-MM') || '|' || extract(epoch from now())::bigint,
    p_user_id, 'allocated',
    jsonb_build_object('account_number', p_account_number, 'billing_month', v_billing_month),
    now()
  )
  returning id into v_audit_id;

  -- 3. Insert invoice (always new row, no conflict logic)
  insert into public.account_invoices (
    account_number, billing_month, invoice_number, invoice_date,
    company_name, company_registration_number, client_address, customer_vat_number,
    subtotal, vat_amount, discount_amount, total_amount,
    paid_amount, balance_due, payment_status,
    line_items, notes, created_by
  ) values (
    p_account_number, v_billing_month, v_invoice_number, p_invoice_date,
    p_company_name, p_company_registration_number, p_client_address, p_customer_vat_number,
    p_subtotal, p_vat_amount, p_discount_amount, p_total_amount,
    0, p_total_amount, 'pending',
    p_line_items, p_notes, p_user_id
  )
  returning to_jsonb(account_invoices.*) into v_inserted_invoice;

  -- 4. Mark audit as persisted
  update public.invoice_number_events
  set status = 'persisted',
      persisted_table = 'account_invoices',
      persisted_invoice_id = (v_inserted_invoice->>'id')::uuid,
      persisted_at = now()
  where id = v_audit_id;

  return jsonb_build_object('invoice', v_inserted_invoice, 'reused', false);

exception
  when others then
    -- Mark any allocated audit row as failed (exception handler only runs if the exception propagates)
    update public.invoice_number_events
    set status = 'failed',
        error_message = SQLERRM,
        failed_at = now()
    where id = v_audit_id
      and status = 'allocated';

    raise;
end;
$$;

grant execute on function public.create_atomic_account_invoice(
  uuid, text, text, text, text, text, text, timestamptz,
  numeric, numeric, numeric, numeric, jsonb, text, text
) to authenticated;

grant execute on function public.create_atomic_account_invoice(
  uuid, text, text, text, text, text, text, timestamptz,
  numeric, numeric, numeric, numeric, jsonb, text, text
) to service_role;
