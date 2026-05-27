-- Preview billing columns for a row with data
SELECT key, value
FROM vehicles_duplicate_duplicate vd,
LATERAL jsonb_each_text(to_jsonb(vd))
WHERE vd.id = (
  SELECT id FROM vehicles_duplicate_duplicate
  WHERE NULLIF(beame_1_rental, '') IS NOT NULL
     OR NULLIF(consultancy, '') IS NOT NULL
  LIMIT 1
)
  AND (
    key LIKE '%_rental'
    OR key LIKE '%_sub'
    OR key IN ('consultancy', 'roaming', 'maintenance', 'after_hours', 'controlroom',
               'driver_app', 'yotg_software_development',
               'eps_software_development', 'maysene_software_development',
               'waterford_software_development', 'klaver_software_development',
               'advatrans_software_development', 'tt_linehaul_software_development',
               'tt_express_software_development', 'tt_fmcg_software_development',
               'rapid_freight_software_development', 'remco_freight_software_development',
               'vt_logistics_software_development', 'epilite_software_development')
  )
  AND key NOT IN ('total_rental', 'total_sub', 'total_rental_sub')
ORDER BY key;

-- Preview calculated totals (handles R prefix)
SELECT
  vd.id, vd.reg, vd.new_account_number,
  (SELECT COALESCE(SUM(NULLIF(REGEXP_REPLACE(value, '[^0-9\.\-]', '', 'g'), '')::numeric), 0)
   FROM jsonb_each_text(to_jsonb(vd))
   WHERE key LIKE '%_rental'
     AND key NOT IN ('total_rental', 'total_rental_sub')) AS calc_rental,
  (SELECT COALESCE(SUM(NULLIF(REGEXP_REPLACE(value, '[^0-9\.\-]', '', 'g'), '')::numeric), 0)
   FROM jsonb_each_text(to_jsonb(vd))
   WHERE (key LIKE '%_sub' OR key IN (
     'consultancy', 'roaming', 'maintenance', 'after_hours', 'controlroom',
     'driver_app', 'yotg_software_development',
     'eps_software_development', 'maysene_software_development',
     'waterford_software_development', 'klaver_software_development',
     'advatrans_software_development', 'tt_linehaul_software_development',
     'tt_express_software_development', 'tt_fmcg_software_development',
     'rapid_freight_software_development', 'remco_freight_software_development',
     'vt_logistics_software_development', 'epilite_software_development'
   ))
     AND key NOT IN ('total_sub', 'total_rental_sub')) AS calc_sub,
  (SELECT COALESCE(SUM(NULLIF(REGEXP_REPLACE(value, '[^0-9\.\-]', '', 'g'), '')::numeric), 0)
   FROM jsonb_each_text(to_jsonb(vd))
   WHERE (key LIKE '%_rental' OR key LIKE '%_sub' OR key IN (
     'consultancy', 'roaming', 'maintenance', 'after_hours', 'controlroom',
     'driver_app', 'yotg_software_development',
     'eps_software_development', 'maysene_software_development',
     'waterford_software_development', 'klaver_software_development',
     'advatrans_software_development', 'tt_linehaul_software_development',
     'tt_express_software_development', 'tt_fmcg_software_development',
     'rapid_freight_software_development', 'remco_freight_software_development',
     'vt_logistics_software_development', 'epilite_software_development'
   ))
     AND key NOT IN ('total_rental', 'total_sub', 'total_rental_sub')) AS calc_total
FROM vehicles_duplicate_duplicate vd
WHERE NULLIF(vd.beame_1_rental, '') IS NOT NULL
   OR NULLIF(vd.consultancy, '') IS NOT NULL
LIMIT 5;
