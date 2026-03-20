alter table public.vehicles
add column if not exists tt_linehaul_software_development text null,
add column if not exists tt_express_software_development text null,
add column if not exists tt_fmcg_software_development text null,
add column if not exists rapid_freight_software_development text null,
add column if not exists remco_freight_software_development text null,
add column if not exists vt_logistics_software_development text null,
add column if not exists epilite_software_development text null;

alter table public.vehicles_duplicate
add column if not exists tt_linehaul_software_development text null,
add column if not exists tt_express_software_development text null,
add column if not exists tt_fmcg_software_development text null,
add column if not exists rapid_freight_software_development text null,
add column if not exists remco_freight_software_development text null,
add column if not exists vt_logistics_software_development text null,
add column if not exists epilite_software_development text null;

comment on column public.vehicles.tt_linehaul_software_development is
'Monthly software development service for TT Linehaul.';
comment on column public.vehicles.tt_express_software_development is
'Monthly software development service for TT Express.';
comment on column public.vehicles.tt_fmcg_software_development is
'Monthly software development service for TT FMCG.';
comment on column public.vehicles.rapid_freight_software_development is
'Monthly software development service for Rapid Freight.';
comment on column public.vehicles.remco_freight_software_development is
'Monthly software development service for REMCO Freight.';
comment on column public.vehicles.vt_logistics_software_development is
'Monthly software development service for VT Logistics.';
comment on column public.vehicles.epilite_software_development is
'Monthly software development service for Epilite.';

comment on column public.vehicles_duplicate.tt_linehaul_software_development is
'Monthly software development service for TT Linehaul.';
comment on column public.vehicles_duplicate.tt_express_software_development is
'Monthly software development service for TT Express.';
comment on column public.vehicles_duplicate.tt_fmcg_software_development is
'Monthly software development service for TT FMCG.';
comment on column public.vehicles_duplicate.rapid_freight_software_development is
'Monthly software development service for Rapid Freight.';
comment on column public.vehicles_duplicate.remco_freight_software_development is
'Monthly software development service for REMCO Freight.';
comment on column public.vehicles_duplicate.vt_logistics_software_development is
'Monthly software development service for VT Logistics.';
comment on column public.vehicles_duplicate.epilite_software_development is
'Monthly software development service for Epilite.';
