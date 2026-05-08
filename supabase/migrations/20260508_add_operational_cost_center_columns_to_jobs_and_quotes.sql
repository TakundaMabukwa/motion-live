alter table if exists public.job_cards
  add column if not exists cost_center_code text,
  add column if not exists cost_center_name text;

alter table if exists public.client_quotes
  add column if not exists cost_center_code text,
  add column if not exists cost_center_name text;

create index if not exists job_cards_cost_center_code_idx
  on public.job_cards (cost_center_code);

create index if not exists client_quotes_cost_center_code_idx
  on public.client_quotes (cost_center_code);

comment on column public.job_cards.cost_center_code is
  'Operational cost center code for the site-specific cost center when applicable.';

comment on column public.job_cards.cost_center_name is
  'Operational cost center/site name captured when creating or quoting a job.';

comment on column public.client_quotes.cost_center_code is
  'Operational cost center code for the site-specific cost center when applicable.';

comment on column public.client_quotes.cost_center_name is
  'Operational cost center/site name captured when creating a quote.';
