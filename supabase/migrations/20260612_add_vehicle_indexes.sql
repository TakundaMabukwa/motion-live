-- Add trigram indexes on vehicles_duplicate for reg and fleet_number (ilike lookups)
-- These match the existing indexes on the vehicles table
CREATE INDEX IF NOT EXISTS vehicles_duplicate_reg_trgm_idx
  ON vehicles_duplicate USING gin (reg gin_trgm_ops);

CREATE INDEX IF NOT EXISTS vehicles_duplicate_fleet_number_trgm_idx
  ON vehicles_duplicate USING gin (fleet_number gin_trgm_ops);

-- Add B-tree indexes on new_account_number (most queried column, 20+ routes)
CREATE INDEX IF NOT EXISTS idx_vehicles_new_account_number
  ON vehicles(new_account_number);

CREATE INDEX IF NOT EXISTS idx_vehicles_duplicate_new_account_number
  ON vehicles_duplicate(new_account_number);

-- Add B-tree indexes on account_number (secondary lookup, 10+ routes)
CREATE INDEX IF NOT EXISTS idx_vehicles_account_number
  ON vehicles(account_number);

CREATE INDEX IF NOT EXISTS idx_vehicles_duplicate_account_number
  ON vehicles_duplicate(account_number);
