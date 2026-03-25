alter table public.vehicles
add column if not exists bidtrack text null,
add column if not exists bidtrack_rental text null,
add column if not exists bidtrack_sub text null;

alter table public.vehicles_duplicate
add column if not exists bidtrack text null,
add column if not exists bidtrack_rental text null,
add column if not exists bidtrack_sub text null;

comment on column public.vehicles.bidtrack is
'Installed Bidtrack equipment label/value.';
comment on column public.vehicles.bidtrack_rental is
'Monthly rental charge for Bidtrack.';
comment on column public.vehicles.bidtrack_sub is
'Monthly subscription charge for Bidtrack.';

comment on column public.vehicles_duplicate.bidtrack is
'Installed Bidtrack equipment label/value.';
comment on column public.vehicles_duplicate.bidtrack_rental is
'Monthly rental charge for Bidtrack.';
comment on column public.vehicles_duplicate.bidtrack_sub is
'Monthly subscription charge for Bidtrack.';
