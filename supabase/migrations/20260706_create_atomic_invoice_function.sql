-- Atomic invoice creation: allocate number + insert invoice in one transaction.
-- Either both succeed (no gaps, no orphans) or both fail (nothing stored).

create or replace function public.create_atomic_invoice(
  p_source text,
  p_request_key text,
  p_user_id uuid,
  p_job_card_id uuid,
  p_job_number text default null,
  p_quotation_number text default null,
  p_account_number text default null,
  p_client_name text default null,
  p_client_email text default null,
  p_client_phone text default null,
  p_client_address text default null,
  p_invoice_date timestamptz default now(),
  p_due_date date default null,
  p_payment_terms text default null,
  p_notes text default null,
  p_subtotal numeric(12,2) default 0,
  p_vat_amount numeric(12,2) default 0,
  p_discount_amount numeric(12,2) default 0,
  p_total_amount numeric(12,2) default 0,
  p_line_items jsonb default '[]'::jsonb,
  p_invoice_prefix text default 'INV'
)
returns jsonb
language plpgsql
as $$
declare
  v_invoice_number text;
  v_audit_id uuid;
  v_inserted_invoice jsonb;
  v_existing jsonb;
begin
  -- 1. Check for existing invoice by job_card_id (idempotent — hard lock)
  select to_jsonb(i.*) into v_existing
  from public.invoices i
  where i.job_card_id = p_job_card_id
  order by i.created_at desc
  limit 1;

  if v_existing is not null then
    return jsonb_build_object('invoice', v_existing, 'reused', true);
  end if;

  -- 2. Check for existing audit event with same request_key
  --    Handles allocated, persisted, AND failed (reuse failed number)
  select to_jsonb(ine.*) into v_existing
  from public.invoice_number_events ine
  where ine.source = p_source
    and ine.request_key = p_request_key
    and ine.status in ('allocated', 'persisted', 'failed')
  order by
    case ine.status
      when 'allocated' then 1
      when 'failed' then 2
      when 'persisted' then 3
    end,
    ine.allocated_at desc
  limit 1;

  if v_existing is not null then
    v_invoice_number := (v_existing->>'invoice_number')::text;
    v_audit_id := (v_existing->>'id')::uuid;

    -- If status is 'allocated' or 'failed', try to insert the invoice with this number
    if (v_existing->>'status')::text in ('allocated', 'failed') then
      -- Restore failed audit to allocated
      if (v_existing->>'status')::text = 'failed' then
        update public.invoice_number_events
        set status = 'allocated',
            failed_at = null,
            error_message = null,
            allocated_at = now()
        where id = v_audit_id;
      end if;

      insert into public.invoices (
        invoice_number, job_card_id, job_number, quotation_number, account_number,
        client_name, client_email, client_phone, client_address,
        invoice_date, due_date, payment_terms, notes,
        subtotal, vat_amount, discount_amount, total_amount,
        line_items, created_by
      ) values (
        v_invoice_number, p_job_card_id, p_job_number, p_quotation_number, p_account_number,
        p_client_name, p_client_email, p_client_phone, p_client_address,
        p_invoice_date, p_due_date, p_payment_terms, p_notes,
        p_subtotal, p_vat_amount, p_discount_amount, p_total_amount,
        p_line_items, p_user_id
      )
      on conflict (job_card_id) do nothing
      returning to_jsonb(invoices.*) into v_inserted_invoice;

      if v_inserted_invoice is null then
        select to_jsonb(i.*) into v_inserted_invoice
        from public.invoices i
        where i.job_card_id = p_job_card_id
        limit 1;
        return jsonb_build_object('invoice', v_inserted_invoice, 'reused', true);
      end if;

      update public.invoice_number_events
      set status = 'persisted',
          persisted_table = 'invoices',
          persisted_invoice_id = (v_inserted_invoice->>'id')::uuid,
          persisted_at = now(),
          error_message = null
      where id = v_audit_id;

      return jsonb_build_object('invoice', v_inserted_invoice, 'reused', false);
    end if;

    -- If status is 'persisted', the invoice already exists
    if (v_existing->>'status')::text = 'persisted' then
      select to_jsonb(i.*) into v_inserted_invoice
      from public.invoices i
      where i.job_card_id = p_job_card_id
      limit 1;
      return jsonb_build_object('invoice', v_inserted_invoice, 'reused', true);
    end if;
  end if;

  -- 3. Allocate new invoice number (atomic sequence increment)
  select public.allocate_document_number('invoice', p_invoice_prefix) into v_invoice_number;

  if v_invoice_number is null or v_invoice_number = '' then
    raise exception 'Failed to allocate invoice number';
  end if;

  -- 4. Insert audit row
  insert into public.invoice_number_events (
    invoice_number, sequence_name, prefix, source, request_key,
    allocated_by, status, context, allocated_at
  ) values (
    v_invoice_number, 'invoice', p_invoice_prefix, p_source, p_request_key,
    p_user_id, 'allocated', jsonb_build_object('job_card_id', p_job_card_id), now()
  )
  returning id into v_audit_id;

  -- 5. Insert invoice with allocated number (ON CONFLICT handles race condition)
  insert into public.invoices (
    invoice_number, job_card_id, job_number, quotation_number, account_number,
    client_name, client_email, client_phone, client_address,
    invoice_date, due_date, payment_terms, notes,
    subtotal, vat_amount, discount_amount, total_amount,
    line_items, created_by
  ) values (
    v_invoice_number, p_job_card_id, p_job_number, p_quotation_number, p_account_number,
    p_client_name, p_client_email, p_client_phone, p_client_address,
    p_invoice_date, p_due_date, p_payment_terms, p_notes,
    p_subtotal, p_vat_amount, p_discount_amount, p_total_amount,
    p_line_items, p_user_id
  )
  on conflict (job_card_id) do nothing
  returning to_jsonb(invoices.*) into v_inserted_invoice;

  if v_inserted_invoice is null then
    -- Race: another request inserted first. Return existing and mark our number as failed.
    select to_jsonb(i.*) into v_inserted_invoice
    from public.invoices i
    where i.job_card_id = p_job_card_id
    limit 1;

    update public.invoice_number_events
    set status = 'failed',
        error_message = 'Race condition: another request inserted first',
        failed_at = now()
    where id = v_audit_id;

    return jsonb_build_object('invoice', v_inserted_invoice, 'reused', true);
  end if;

  -- 6. Mark audit as persisted
  update public.invoice_number_events
  set status = 'persisted',
      persisted_table = 'invoices',
      persisted_invoice_id = (v_inserted_invoice->>'id')::uuid,
      persisted_at = now()
  where id = v_audit_id;

  return jsonb_build_object('invoice', v_inserted_invoice, 'reused', false);
exception
  when others then
    if v_audit_id is not null then
      update public.invoice_number_events
      set status = 'failed',
          error_message = SQLERRM,
          failed_at = now()
      where id = v_audit_id
        and status = 'allocated';
    end if;
    raise;
end;
$$;

grant execute on function public.create_atomic_invoice(
  text, text, uuid, uuid, text, text, text, text, text, text, text,
  timestamptz, date, text, text, numeric, numeric, numeric, numeric, jsonb, text
) to authenticated;

grant execute on function public.create_atomic_invoice(
  text, text, uuid, uuid, text, text, text, text, text, text, text,
  timestamptz, date, text, text, numeric, numeric, numeric, numeric, jsonb, text
) to service_role;
