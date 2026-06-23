-- ============================================================
-- Step 1: Zero deinstall billing on vehicles_duplicate
-- with recalculated totals from remaining service columns
-- ============================================================

DO $$
DECLARE
  v_regs TEXT[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT LOWER(TRIM(jc.vehicle_registration)))
  INTO v_regs
  FROM job_cards jc
  WHERE jc.new_account_number = 'AVVA-0001'
    AND jc.annuity_end_date IS NOT NULL
    AND jc.annuity_end_date < CURRENT_DATE;

  IF v_regs IS NULL OR array_length(v_regs, 1) = 0 THEN
    RAISE NOTICE 'No affected regs found.';
    RETURN;
  END IF;

  EXECUTE format(
    'UPDATE vehicles_duplicate vd SET
      beame_1_rental = ''0'',
      beame_1_sub = ''0'',
      beame_2_rental = ''0'',
      beame_2_sub = ''0'',
      beame_3_rental = ''0'',
      beame_3_sub = ''0'',
      beame_4_rental = ''0'',
      beame_4_sub = ''0'',
      beame_5_rental = ''0'',
      beame_5_sub = ''0'',
      skylink_pro_rental = ''0'',
      skylink_pro_sub = ''0'',
      sky_scout_12v_rental = ''0'',
      sky_scout_12v_sub = ''0'',
      sky_ican_rental = ''0'',
      total_rental = 0,
      total_sub = (
        SELECT COALESCE(SUM(COALESCE(NULLIF(TRIM(v::text), ''''), ''0'')::numeric), 0)
        FROM (VALUES
          (vd.consultancy), (vd.roaming), (vd.maintenance),
          (vd.after_hours), (vd.controlroom), (vd.software),
          (vd.additional_data), (vd.driver_app),
          (vd.eps_software_development), (vd.maysene_software_development),
          (vd.waterford_software_development), (vd.klaver_software_development),
          (vd.advertrans_software_development), (vd.tt_linehaul_software_development),
          (vd.tt_express_software_development), (vd.tt_fmcg_software_development),
          (vd.rapid_freight_software_development), (vd.remco_freight_software_development),
          (vd.vt_logistics_software_development), (vd.epilite_software_development),
          (vd.yotg_software_development)
        ) AS vals(v)
      ),
      total_rental_sub = (
        SELECT COALESCE(SUM(COALESCE(NULLIF(TRIM(v::text), ''''), ''0'')::numeric), 0)
        FROM (VALUES
          (vd.consultancy), (vd.roaming), (vd.maintenance),
          (vd.after_hours), (vd.controlroom), (vd.software),
          (vd.additional_data), (vd.driver_app),
          (vd.eps_software_development), (vd.maysene_software_development),
          (vd.waterford_software_development), (vd.klaver_software_development),
          (vd.advertrans_software_development), (vd.tt_linehaul_software_development),
          (vd.tt_express_software_development), (vd.tt_fmcg_software_development),
          (vd.rapid_freight_software_development), (vd.remco_freight_software_development),
          (vd.vt_logistics_software_development), (vd.epilite_software_development),
          (vd.yotg_software_development)
        ) AS vals(v)
      )
    WHERE vd.new_account_number = ''AVVA-0001''
      AND LOWER(TRIM(vd.reg)) = ANY(%L)',
    v_regs
  );

  RAISE NOTICE 'Updated vehicles_duplicate for % regs', array_length(v_regs, 1);
END $$;

-- ============================================================
-- Step 2: Strip annuity_end_date from job_cards
-- ============================================================

BEGIN;

UPDATE job_cards jc
SET
  annuity_end_date = NULL,
  quotation_products = (
    SELECT jsonb_agg(
      CASE
        WHEN p->>'annuity_end_date' IS NOT NULL
          AND (p->>'annuity_end_date')::date < CURRENT_DATE
        THEN p - 'annuity_end_date'
        ELSE p
      END
    )
    FROM jsonb_array_elements(jc.quotation_products) AS p
  )
WHERE jc.new_account_number = 'AVVA-0001'
  AND jc.annuity_end_date IS NOT NULL
  AND jc.annuity_end_date < CURRENT_DATE;

COMMIT;

-- ============================================================
-- Verify
-- ============================================================

SELECT vd.id, vd.reg,
  vd.total_rental, vd.total_sub, vd.total_rental_sub,
  vd.beame_1_rental, vd.beame_1_sub,
  vd.skylink_pro_rental, vd.skylink_pro_sub,
  vd.consultancy, vd.roaming, vd.maintenance, vd.controlroom
FROM vehicles_duplicate vd
WHERE vd.new_account_number = 'AVVA-0001'
  AND LOWER(TRIM(vd.reg)) = ANY(
    ARRAY(SELECT DISTINCT LOWER(TRIM(jc.vehicle_registration))
      FROM job_cards jc
      WHERE jc.new_account_number = 'AVVA-0001'
        AND jc.annuity_end_date IS NULL
        AND jc.quotation_products IS NOT NULL)
  )
ORDER BY vd.reg, vd.id;

SELECT jc.job_number, jc.vehicle_registration,
  jc.annuity_end_date AS column_still_set
FROM job_cards jc
WHERE jc.new_account_number = 'AVVA-0001'
  AND jc.annuity_end_date IS NOT NULL
  AND jc.annuity_end_date < CURRENT_DATE
ORDER BY jc.job_number;
