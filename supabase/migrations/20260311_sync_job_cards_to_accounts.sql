-- Sync job_cards.new_account_number into payments_, cost_centers, customers_grouped,
-- and add vehicles for install jobs when reg is present.

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

  -- payments_ (one record per cost_code)
  insert into public.payments_(company, cost_code)
  values (v_company, v_account)
  on conflict (cost_code) do nothing;

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

drop trigger if exists trigger_sync_job_card_accounts on public.job_cards;
create trigger trigger_sync_job_card_accounts
after insert or update of new_account_number, customer_name, job_type, vehicle_registration, vehicle_make, vehicle_model, vehicle_year
on public.job_cards
for each row
execute function public.sync_job_card_accounts();
