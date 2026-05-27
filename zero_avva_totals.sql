-- Just zero totals on AVVA-0001 vehicles that have deinstall billing

UPDATE vehicles_duplicate vd
SET total_rental = 0,
    total_sub = 0,
    total_rental_sub = 0
WHERE vd.new_account_number = 'AVVA-0001'
  AND (
    COALESCE(NULLIF(vd.beame_1_rental, ''), '0') != '0'
    OR COALESCE(NULLIF(vd.beame_1_sub, ''), '0') != '0'
    OR COALESCE(NULLIF(vd.skylink_pro_rental, ''), '0') != '0'
    OR COALESCE(NULLIF(vd.skylink_pro_sub, ''), '0') != '0'
  );

-- Verify
SELECT vd.id, vd.reg,
  vd.total_rental, vd.total_sub, vd.total_rental_sub,
  vd.beame_1_rental, vd.beame_1_sub,
  vd.skylink_pro_rental, vd.skylink_pro_sub,
  vd.consultancy, vd.roaming, vd.maintenance
FROM vehicles_duplicate vd
WHERE vd.new_account_number = 'AVVA-0001'
  AND NULLIF(NULLIF(vd.beame_1_rental, ''), '0') IS NOT NULL
ORDER BY vd.reg, vd.id;
