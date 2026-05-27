-- Recalculate AVVA-0001 totals based on remaining billing columns

DO $$
DECLARE
  v_rental_cols TEXT[];
  v_sub_cols TEXT[];
  v_sum_rental TEXT;
  v_sum_sub TEXT;
BEGIN
  -- Get rental column names (text-only billing columns)
  SELECT ARRAY_AGG(column_name ORDER BY column_name)
  INTO v_rental_cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'vehicles_duplicate'
    AND column_name LIKE '%_rental'
    AND column_name NOT IN ('total_rental', 'total_rental_sub')
    AND column_name NOT IN ('tag_rental_', 'tag_reader_rental_');

  -- Get sub columns (text-only, no JSONB columns)
  SELECT ARRAY_AGG(column_name ORDER BY column_name)
  INTO v_sub_cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'vehicles_duplicate'
    AND column_name NOT IN ('total_rental', 'total_sub', 'total_rental_sub')
    AND data_type IN ('character varying', 'text', 'character')
    AND (
      column_name LIKE '%_sub'
      OR column_name IN (
        'consultancy', 'roaming', 'maintenance', 'after_hours', 'controlroom'
      )
    );

  -- Build SUM using NULLIF with ::text cast to handle any column type safely
  SELECT string_agg(
    'COALESCE(NULLIF(NULLIF(' || c || '::text, ''''), ''0''), ''0'')::numeric',
    ' + ' ORDER BY c
  ) INTO v_sum_rental
  FROM unnest(v_rental_cols) AS t(c);

  SELECT string_agg(
    'COALESCE(NULLIF(NULLIF(' || c || '::text, ''''), ''0''), ''0'')::numeric',
    ' + ' ORDER BY c
  ) INTO v_sum_sub
  FROM unnest(v_sub_cols) AS t(c);

  -- Execute
  EXECUTE format(
    'UPDATE vehicles_duplicate vd
     SET total_rental = (%s),
         total_sub = (%s),
         total_rental_sub = ((%s) + (%s))
     WHERE vd.new_account_number = ''AVVA-0001''
       AND (NULLIF(NULLIF(vd.beame_1_rental::text, ''''), ''0'') IS NOT NULL
         OR NULLIF(NULLIF(vd.beame_1_sub::text, ''''), ''0'') IS NOT NULL
         OR NULLIF(NULLIF(vd.skylink_pro_rental::text, ''''), ''0'') IS NOT NULL
         OR NULLIF(NULLIF(vd.skylink_pro_sub::text, ''''), ''0'') IS NOT NULL)',
    v_sum_rental, v_sum_sub, v_sum_rental, v_sum_sub
  );

  RAISE NOTICE 'Done.';
END $$;

-- Verify
SELECT vd.id, vd.reg,
  vd.total_rental, vd.total_sub, vd.total_rental_sub,
  vd.beame_1_rental, vd.beame_1_sub,
  vd.skylink_pro_rental, vd.skylink_pro_sub,
  vd.consultancy, vd.roaming, vd.maintenance
FROM vehicles_duplicate vd
WHERE vd.new_account_number = 'AVVA-0001'
  AND NULLIF(NULLIF(vd.beame_1_rental::text, ''), '0') IS NOT NULL
ORDER BY vd.reg, vd.id;
