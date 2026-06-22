-- Add secondary_role to users table for dual-role users (e.g., master/fc)
ALTER TABLE users ADD COLUMN IF NOT EXISTS secondary_role TEXT;

COMMENT ON COLUMN users.secondary_role IS 'Optional secondary role for dual-role users. E.g., a master user who also acts as fc would have secondary_role = fc.';
