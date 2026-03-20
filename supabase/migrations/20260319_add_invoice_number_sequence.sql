create table if not exists public.document_sequences (
  name text primary key,
  next_value bigint not null,
  updated_at timestamptz not null default now()
);

insert into public.document_sequences (name, next_value)
values ('invoice', 200000)
on conflict (name) do nothing;

create or replace function public.allocate_document_number(
  sequence_name text,
  prefix text default 'SOL-'
)
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
  where name = sequence_name
  returning next_value - 1 into allocated_value;

  if allocated_value is null then
    raise exception 'Document sequence % does not exist', sequence_name;
  end if;

  return prefix || allocated_value::text;
end;
$$;

grant execute on function public.allocate_document_number(text, text) to authenticated;
grant execute on function public.allocate_document_number(text, text) to service_role;
