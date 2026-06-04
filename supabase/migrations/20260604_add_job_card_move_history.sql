ALTER TABLE job_cards
ADD COLUMN move_history JSONB NOT NULL DEFAULT '[]'::jsonb;
