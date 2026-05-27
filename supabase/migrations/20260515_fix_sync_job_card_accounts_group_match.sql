-- Prevent duplicate customers_grouped rows when job card customer_name changes.
-- Match existing grouped rows by account first (cost_code / all_new_account_numbers),
-- then by company_group.

create or replace function public.sync_job_card_accounts()
returns trigger
language plpgsql
as $$
declare
  v_account text;
  v_company text;
  v_job_type text;
  v_reg text;
  v_grouped_id public.customers_grouped.id%TYPE;
  v_grouped_accounts text;
  v_updated_accounts text;
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
    select 1 from public.cost_centers where lower(coalesce(cost_code, '')) = lower(v_account)
  ) then
    insert into public.cost_centers(company, cost_code, validated)
    values (v_company, v_account, false);
  end if;

  -- customers_grouped:
  -- 1) Prefer matching by account association
  -- 2) Then fallback to matching by company_group name
  select cg.id, coalesce(cg.all_new_account_numbers, '')
    into v_grouped_id, v_grouped_accounts
  from public.customers_grouped cg
  where lower(coalesce(cg.cost_code, '')) = lower(v_account)
     or exists (
       select 1
       from unnest(string_to_array(replace(coalesce(cg.all_new_account_numbers, ''), ' ', ''), ',')) as acc
       where lower(acc) = lower(v_account)
     )
     or lower(coalesce(cg.company_group, '')) = lower(v_company)
  order by
    case
      when lower(coalesce(cg.cost_code, '')) = lower(v_account) then 0
      when exists (
        select 1
        from unnest(string_to_array(replace(coalesce(cg.all_new_account_numbers, ''), ' ', ''), ',')) as acc
        where lower(acc) = lower(v_account)
      ) then 1
      when lower(coalesce(cg.company_group, '')) = lower(v_company) then 2
      else 3
    end,
    cg.id asc
  limit 1;

  if v_grouped_id is null then
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
    if nullif(btrim(v_grouped_accounts), '') is null then
      v_updated_accounts := v_account;
    elsif exists (
      select 1
      from unnest(string_to_array(replace(v_grouped_accounts, ' ', ''), ',')) as acc
      where lower(acc) = lower(v_account)
    ) then
      v_updated_accounts := v_grouped_accounts;
    else
      v_updated_accounts := v_grouped_accounts || ',' || v_account;
    end if;

    update public.customers_grouped
    set
      legal_names = coalesce(nullif(legal_names, ''), v_company),
      cost_code = coalesce(nullif(cost_code, ''), v_account),
      all_new_account_numbers = v_updated_accounts
    where id = v_grouped_id;
  end if;

  return new;
end;
$$;
