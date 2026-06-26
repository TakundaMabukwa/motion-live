insert into public.document_sequences (name, next_value)
values ('credit_note_temp', 1)
on conflict (name) do nothing;

create or replace function public.allocate_credit_note_temp_number()
returns text
language plpgsql
as $$
declare
  allocated_value bigint;
begin
  update public.document_sequences
  set
    next_value = next_value + 1,
    updated_at = now()
  where name = 'credit_note_temp'
  returning next_value - 1 into allocated_value;

  if allocated_value is null then
    raise exception 'Credit note temp sequence does not exist';
  end if;

  return 'TEMP-' || allocated_value::text;
end;
$$;

grant execute on function public.allocate_credit_note_temp_number() to authenticated;
grant execute on function public.allocate_credit_note_temp_number() to service_role;
