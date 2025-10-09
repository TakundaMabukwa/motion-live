-- Migration script to update vehicles table structure
-- This script helps transition from the old structure to the new one

-- Step 1: Backup existing data (optional but recommended)
-- CREATE TABLE vehicles_backup AS SELECT * FROM vehicles;

-- Step 2: Add new columns if they don't exist
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS branch text null,
ADD COLUMN IF NOT EXISTS unique_id uuid null DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS controlroom text null;

-- Step 3: Update data types if needed
-- ALTER TABLE public.vehicles 
-- ALTER COLUMN total_rental_sub TYPE numeric(10, 2),
-- ALTER COLUMN total_rental TYPE numeric(10, 2),
-- ALTER COLUMN total_sub TYPE numeric(10, 2);

-- Step 4: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vehicles_account_number ON public.vehicles(new_account_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_company ON public.vehicles(company);
CREATE INDEX IF NOT EXISTS idx_vehicles_reg ON public.vehicles(reg);
CREATE INDEX IF NOT EXISTS idx_vehicles_fleet_number ON public.vehicles(fleet_number);

-- Step 5: Add comments for clarity
COMMENT ON TABLE public.vehicles IS 'Vehicle inventory and billing information';
COMMENT ON COLUMN public.vehicles.company IS 'Company name';
COMMENT ON COLUMN public.vehicles.new_account_number IS 'Account number for billing';
COMMENT ON COLUMN public.vehicles.reg IS 'Vehicle registration number';
COMMENT ON COLUMN public.vehicles.fleet_number IS 'Fleet number if no registration';
COMMENT ON COLUMN public.vehicles.total_rental IS 'Rental amount (if applicable)';
COMMENT ON COLUMN public.vehicles.total_sub IS 'Subscription amount (if applicable)';
COMMENT ON COLUMN public.vehicles.total_rental_sub IS 'Combined rental + subscription amount';

-- Step 6: Verify the structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'vehicles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;
