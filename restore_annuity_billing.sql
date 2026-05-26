UPDATE vehicles_duplicate vd
SET
  total_rental = vals.total_rental,
  total_sub = vals.total_sub,
  total_rental_sub = vals.total_rental + vals.total_sub,
  beame_1_sub = vals.beame_1_sub,
  beame_2_sub = vals.beame_2_sub,
  beame_1_rental = vals.beame_1_rental,
  beame_2_rental = vals.beame_2_rental,
  skylink_pro_rental = vals.skylink_pro_rental,
  skylink_pro_sub = vals.skylink_pro_sub,
  sky_scout_12v_rental = vals.sky_scout_12v_rental,
  sky_scout_12v_sub = vals.sky_scout_12v_sub,
  sky_ican_rental = vals.sky_ican_rental,
  dual_probe_rental = vals.dual_probe_rental,
  consultancy = vals.consultancy
FROM (VALUES
  ('CF208819', 'EDGE-0008', 0, 70, 70, 70, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('HV97GMGP', 'FUEL-0001', 0, 511.92, 511.92, NULL, NULL, NULL, NULL, NULL, 430.92, NULL, NULL, NULL, NULL, 81),
  ('HV97GMGP', 'FUSP-0001', 1059.56, 88.18, 1147.74, NULL, NULL, 114.79, NULL, 465.42, NULL, NULL, NULL, 13.93, 465.42, 88.18),
  ('LF90KFGP', 'AVVA-0001', 0, 100, 100, 50, 50, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('LJ43FLGP', 'AVVA-0001', 0, 100, 100, 50, 50, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('LJ75MMGP', 'AVVA-0001', 0, 100, 100, 50, 50, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('LJ75MWGP', 'AVVA-0001', 165, 224, 389, 27, 27, 23, 23, NULL, NULL, 119, 170, NULL, NULL, NULL),
  ('LJ81FHGP', 'AVVA-0001', 165, 224, 389, 27, 27, 23, 23, NULL, NULL, 119, 170, NULL, NULL, NULL),
  ('LJ81GFGP', 'AVVA-0001', 0, 100, 100, 50, 50, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('LK15GWGP', 'AVVA-0001', 165, 224, 389, 27, 27, 23, 23, NULL, NULL, 119, 170, NULL, NULL, NULL),
  ('LL58BMGP', 'AVVA-0001', 0, 100, 100, 50, 50, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('LN47PTGP', 'AVVA-0001', 165, 224, 389, 27, 27, 23, 23, NULL, NULL, 119, 170, NULL, NULL, NULL),
  ('LN47SMGP', 'AVVA-0001', 0, 100, 100, 50, 50, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('LP36PJGP', 'AVVA-0001', 165, 224, 389, 27, 27, 23, 23, NULL, NULL, 119, 170, NULL, NULL, NULL),
  ('LP36PXGP', 'AVVA-0001', 165, 224, 389, 27, 27, 23, 23, NULL, NULL, 119, 170, NULL, NULL, NULL),
  ('LR88MPGP', 'AVVA-0001', 165, 224, 389, 27, 27, 23, 23, NULL, NULL, 119, 170, NULL, NULL, NULL),
  ('LT99VTGP', 'AVVA-0001', 0, 100, 100, 50, 50, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('LX69RBGP', 'AVVA-0001', 0, 100, 100, 50, 50, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('TEMP994491', 'EDGE-0008', 0, 80.50, 80.50, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
) AS vals(reg, account, total_rental, total_sub, total_rental_sub, beame_1_sub, beame_2_sub, beame_1_rental, beame_2_rental, skylink_pro_rental, skylink_pro_sub, sky_scout_12v_rental, sky_scout_12v_sub, sky_ican_rental, dual_probe_rental, consultancy)
WHERE LOWER(TRIM(vd.reg)) = LOWER(TRIM(vals.reg))
  AND (LOWER(TRIM(vd.new_account_number)) = LOWER(TRIM(vals.account)) OR LOWER(TRIM(vd.account_number)) = LOWER(TRIM(vals.account)));
