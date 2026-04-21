alter table public.job_cards
  add column if not exists escalation_role text null,
  add column if not exists escalation_source_role text null,
  add column if not exists escalated_at timestamp with time zone null;

create index if not exists idx_job_cards_escalation_role
  on public.job_cards using btree (escalation_role);