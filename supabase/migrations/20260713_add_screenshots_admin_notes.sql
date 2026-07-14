-- Add screenshots JSONB column and admin_notes column to job_cards table
ALTER TABLE public.job_cards 
ADD COLUMN IF NOT EXISTS screenshots JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Create index for screenshots
CREATE INDEX IF NOT EXISTS idx_job_cards_screenshots ON public.job_cards USING GIN (screenshots);

-- Comment on columns
COMMENT ON COLUMN public.job_cards.screenshots IS 'Array of screenshot URLs stored in the testing bucket';
COMMENT ON COLUMN public.job_cards.admin_notes IS 'Admin notes for awaiting testing review';