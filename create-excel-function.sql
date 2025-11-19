-- Create a database function to generate Excel data
CREATE OR REPLACE FUNCTION generate_bulk_invoice_data(account_id_param text DEFAULT 'all')
RETURNS TABLE (
  vehicle_id text,
  cost_code text,
  company text,
  service_description text,
  amount_excl_vat numeric,
  vat_amount numeric,
  total_amount numeric,
  invoice_date date
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(v.reg, v.fleet_number, 'N/A') as vehicle_id,
    COALESCE(v.account_number, '') as cost_code,
    COALESCE(v.company, '') as company,
    CASE 
      WHEN v.skylink_trailer_unit_serial_number IS NOT NULL THEN 'Skylink Units'
      WHEN v._4ch_mdvr IS NOT NULL OR v._8ch_mdvr IS NOT NULL THEN 'Camera Systems'
      WHEN v.pfk_main_unit IS NOT NULL THEN 'PFK Equipment'
      ELSE 'Vehicle Tracking Service'
    END as service_description,
    COALESCE(v.total_rental_sub, v.total_rental, 0) as amount_excl_vat,
    (COALESCE(v.total_rental_sub, v.total_rental, 0) * 0.15) as vat_amount,
    (COALESCE(v.total_rental_sub, v.total_rental, 0) * 1.15) as total_amount,
    CURRENT_DATE as invoice_date
  FROM vehicles v
  WHERE (account_id_param = 'all' OR v.account_number = account_id_param);
END;
$$;