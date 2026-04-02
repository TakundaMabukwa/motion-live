alter table public.job_cards
  add column if not exists fc_note_acknowledged boolean not null default false;

comment on column public.job_cards.fc_note_acknowledged is 'Whether a note sent to FC has been acknowledged by FC.';
