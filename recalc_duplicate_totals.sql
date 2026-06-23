-- Zero totals
UPDATE vehicles_duplicate_duplicate SET total_rental = 0, total_sub = 0, total_rental_sub = 0;

-- Recalculate from billing columns dynamically (handles R prefix)
UPDATE vehicles_duplicate_duplicate vd
SET
  total_rental = (
    SELECT COALESCE(SUM(NULLIF(REGEXP_REPLACE(value, '[^0-9\.\-]', '', 'g'), '')::numeric), 0)
    FROM jsonb_each_text(to_jsonb(vd))
    WHERE key LIKE '%_rental'
      AND key NOT IN ('total_rental', 'total_rental_sub')
  ),
  total_sub = (
    SELECT COALESCE(SUM(NULLIF(REGEXP_REPLACE(value, '[^0-9\.\-]', '', 'g'), '')::numeric), 0)
    FROM jsonb_each_text(to_jsonb(vd))
    WHERE (key LIKE '%_sub' OR key IN (
      'consultancy', 'roaming', 'maintenance', 'after_hours',
      'controlroom', 'driver_app', 'yotg_software_development',
      'eps_software_development', 'maysene_software_development',
      'waterford_software_development', 'klaver_software_development',
      'advertrans_software_development', 'tt_linehaul_software_development',
      'tt_express_software_development', 'tt_fmcg_software_development',
      'rapid_freight_software_development', 'remco_freight_software_development',
      'vt_logistics_software_development', 'epilite_software_development'
    ))
      AND key NOT IN ('total_sub', 'total_rental_sub')
  ),
  total_rental_sub = (
    SELECT COALESCE(SUM(NULLIF(REGEXP_REPLACE(value, '[^0-9\.\-]', '', 'g'), '')::numeric), 0)
    FROM jsonb_each_text(to_jsonb(vd))
    WHERE (key LIKE '%_rental' OR key LIKE '%_sub' OR key IN (
      'consultancy', 'roaming', 'maintenance', 'after_hours',
      'controlroom', 'driver_app', 'yotg_software_development',
      'eps_software_development', 'maysene_software_development',
      'waterford_software_development', 'klaver_software_development',
      'advertrans_software_development', 'tt_linehaul_software_development',
      'tt_express_software_development', 'tt_fmcg_software_development',
      'rapid_freight_software_development', 'remco_freight_software_development',
      'vt_logistics_software_development', 'epilite_software_development'
    ))
      AND key NOT IN ('total_rental', 'total_sub', 'total_rental_sub')
  );
