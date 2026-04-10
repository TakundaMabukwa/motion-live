alter table public.credit_notes
  add column if not exists created_by_email text null;

alter table public.credit_note_applications
  add column if not exists created_by_email text null;

comment on column public.credit_notes.created_by_email is
  'Email address of the user who created the credit note.';

comment on column public.credit_note_applications.created_by_email is
  'Email address of the user who created the credit note application record.';
