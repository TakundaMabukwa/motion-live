alter table public.job_cards
  add column if not exists invoiced_by uuid null;

comment on column public.job_cards.invoiced_by is 'User id of the person who generated the completed job card invoice.';
