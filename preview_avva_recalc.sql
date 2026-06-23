-- Preview AVVA-0001 recalculation

-- Show one AVVA row's billing columns that have values
SELECT key, value
FROM vehicles_duplicate vd,
LATERAL jsonb_each_text(to_jsonb(vd))
WHERE vd.new_account_number = 'AVVA-0001'
  AND NULLIF(vd.beame_1_rental, '') IS NOT NULL
  AND (
    key LIKE '%_rental'
    OR key LIKE '%_sub'
    OR key IN ('consultancy', 'roaming', 'maintenance', 'after_hours', 'controlroom')
  )
  AND key NOT IN ('total_rental', 'total_sub', 'total_rental_sub', 'total_rental_sub')
  AND NULLIF(value, '') IS NOT NULL
LIMIT 50;

-- Show calculated totals for that same row
SELECT
  vd.reg,
  vd.new_account_number,
  (SELECT COALESCE(SUM(NULLIF(value, '')::numeric), 0)
   FROM jsonb_each_text(to_jsonb(vd))
   WHERE key LIKE '%_rental'
     AND key NOT IN ('total_rental', 'total_rental_sub')) AS calculated_rental,
  (SELECT COALESCE(SUM(NULLIF(value, '')::numeric), 0)
   FROM jsonb_each_text(to_jsonb(vd))
   WHERE (key LIKE '%_sub' OR key IN (
     'consultancy', 'roaming', 'maintenance', 'after_hours', 'controlroom',
     'driver_app', 'yotg_software_development',
     'eps_software_development', 'maysene_software_development',
     'waterford_software_development', 'klaver_software_development',
     'advertrans_software_development', 'tt_linehaul_software_development',
     'tt_express_software_development', 'tt_fmcg_software_development',
     'rapid_freight_software_development', 'remco_freight_software_development',
     'vt_logistics_software_development', 'epilite_software_development'
   ))
     AND key NOT IN ('total_sub', 'total_rental_sub')) AS calculated_sub,
  (SELECT COALESCE(SUM(NULLIF(value, '')::numeric), 0)
   FROM jsonb_each_text(to_jsonb(vd))
   WHERE (key LIKE '%_rental' OR key LIKE '%_sub' OR key IN (
     'consultancy', 'roaming', 'maintenance', 'after_hours', 'controlroom',
     'driver_app', 'yotg_software_development',
     'eps_software_development', 'maysene_software_development',
     'waterford_software_development', 'klaver_software_development',
     'advertrans_software_development', 'tt_linehaul_software_development',
     'tt_express_software_development', 'tt_fmcg_software_development',
     'rapid_freight_software_development', 'remco_freight_software_development',
     'vt_logistics_software_development', 'epilite_software_development'
   ))
     AND key NOT IN ('total_rental', 'total_sub', 'total_rental_sub')) AS calculated_rental_sub
FROM vehicles_duplicate vd
WHERE vd.new_account_number = 'AVVA-0001'
  AND NULLIF(vd.beame_1_rental, '') IS NOT NULL
LIMIT 5;
