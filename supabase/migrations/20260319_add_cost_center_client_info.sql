ALTER TABLE public.cost_centers
ADD COLUMN IF NOT EXISTS source_entity_id text,
ADD COLUMN IF NOT EXISTS legal_name text,
ADD COLUMN IF NOT EXISTS contact_name text,
ADD COLUMN IF NOT EXISTS vat_number text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS registration_number text,
ADD COLUMN IF NOT EXISTS physical_address_1 text,
ADD COLUMN IF NOT EXISTS physical_address_2 text,
ADD COLUMN IF NOT EXISTS physical_address_3 text,
ADD COLUMN IF NOT EXISTS physical_area text,
ADD COLUMN IF NOT EXISTS physical_code text,
ADD COLUMN IF NOT EXISTS postal_address_1 text,
ADD COLUMN IF NOT EXISTS postal_address_2 text,
ADD COLUMN IF NOT EXISTS postal_address_3 text,
ADD COLUMN IF NOT EXISTS client_info_matched_at timestamptz,
ADD COLUMN IF NOT EXISTS client_info_match_score numeric(5,4),
ADD COLUMN IF NOT EXISTS client_info_match_source text;

CREATE INDEX IF NOT EXISTS idx_cost_centers_legal_name
ON public.cost_centers USING btree (legal_name);

CREATE INDEX IF NOT EXISTS idx_cost_centers_source_entity_id
ON public.cost_centers USING btree (source_entity_id);
