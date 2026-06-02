-- Add fc_id column to cost_centers for per-client FC assignment
ALTER TABLE public.cost_centers ADD COLUMN fc_id UUID REFERENCES public.users(id);

-- Index for efficient FC-based queries
CREATE INDEX idx_cost_centers_fc_id ON public.cost_centers(fc_id);
