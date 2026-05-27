-- Dead simple: zero deinstall columns + recalc totals from 4 service columns
BEGIN;

UPDATE vehicles_duplicate vd
SET
  beame_1_rental = '0',
  beame_1_sub = '0',
  beame_2_rental = '0',
  beame_2_sub = '0',
  beame_3_rental = '0',
  beame_3_sub = '0',
  beame_4_rental = '0',
  beame_4_sub = '0',
  beame_5_rental = '0',
  beame_5_sub = '0',
  skylink_pro_rental = '0',
  skylink_pro_sub = '0',
  sky_scout_12v_rental = '0',
  sky_scout_12v_sub = '0',
  sky_ican_rental = '0',
  total_rental = 0,
  total_sub = (
    COALESCE(NULLIF(vd.consultancy, '')::numeric, 0)
    + COALESCE(NULLIF(vd.roaming, '')::numeric, 0)
    + COALESCE(NULLIF(vd.maintenance, '')::numeric, 0)
    + COALESCE(NULLIF(vd.controlroom, '')::numeric, 0)
    + COALESCE(NULLIF(vd.after_hours, '')::numeric, 0)
  ),
  total_rental_sub = (
    COALESCE(NULLIF(vd.consultancy, '')::numeric, 0)
    + COALESCE(NULLIF(vd.roaming, '')::numeric, 0)
    + COALESCE(NULLIF(vd.maintenance, '')::numeric, 0)
    + COALESCE(NULLIF(vd.controlroom, '')::numeric, 0)
    + COALESCE(NULLIF(vd.after_hours, '')::numeric, 0)
  )
WHERE vd.new_account_number = 'AVVA-0001'
  AND NULLIF(vd.beame_1_rental, '') IS NOT NULL;

COMMIT;

-- Verify
SELECT vd.id, vd.reg,
  vd.total_rental, vd.total_sub, vd.total_rental_sub,
  vd.beame_1_rental, vd.beame_1_sub,
  vd.skylink_pro_rental, vd.skylink_pro_sub,
  vd.consultancy, vd.roaming, vd.maintenance
FROM vehicles_duplicate vd
WHERE vd.new_account_number = 'AVVA-0001'
  AND NULLIF(vd.beame_1_rental, '') IS NOT NULL
ORDER BY vd.reg, vd.id;
