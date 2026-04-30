-- Fix ambiguous "quotation_number" reference in quotation trigger helpers.
-- The previous function body could collide with a PL/pgSQL variable name.

create or replace function public.generate_quotation_number()
returns text
language plpgsql
as $$
declare
  next_number integer;
begin
  select coalesce(max(cast(substring(jc.quotation_number from 4) as integer)), 0) + 1
    into next_number
  from public.job_cards as jc
  where jc.quotation_number like 'QT-%';

  return 'QT-' || lpad(next_number::text, 6, '0');
end;
$$;

create or replace function public.set_quotation_number()
returns trigger
language plpgsql
as $$
begin
  if new.quotation_number is null or btrim(new.quotation_number) = '' then
    new.quotation_number := public.generate_quotation_number();
  end if;

  return new;
end;
$$;
