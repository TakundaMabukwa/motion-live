create extension if not exists pg_trgm;

create index if not exists vehicles_reg_trgm_idx
on public.vehicles using gin (reg gin_trgm_ops);

create index if not exists vehicles_fleet_number_trgm_idx
on public.vehicles using gin (fleet_number gin_trgm_ops);
