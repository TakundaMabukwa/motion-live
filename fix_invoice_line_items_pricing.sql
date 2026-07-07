-- ============================================================
-- FIX INVOICE LINE_ITEMS PRICING FROM QUOTATION_PRODUCTS
-- Run in Supabase Dashboard SQL Editor
-- ============================================================

-- STEP 0: Temporarily allow UPDATE on invoices (RLS blocks it)
-- ============================================================
DO $$
DECLARE
  pol record;
BEGIN
  -- Drop any existing UPDATE policies
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'invoices' AND cmd = 'UPDATE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.invoices', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "invoices_update_temp" ON invoices
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Also temporarily grant UPDATE to authenticated
GRANT UPDATE ON public.invoices TO authenticated;

-- ============================================================
-- STEP 1: Preview — which invoices will change (read-only check)
-- ============================================================
SELECT
  i.invoice_number,
  i.job_card_id,
  (li->>'description') AS description,
  (li->>'item_code') AS item_code,
  (li->>'unit_price')::numeric AS old_unit_price,
  (li->>'total_incl')::numeric AS old_total_incl,
  COALESCE(
    (SELECT (qp->>'subscription_gross')::numeric
     FROM job_cards jc,
          jsonb_array_elements(jc.quotation_products) qp
     WHERE jc.id = i.job_card_id
       AND (
         (qp->>'description')::text = (li->>'description')::text
         OR (qp->>'name')::text = (li->>'description')::text
       )
       AND (qp->>'subscription_gross')::numeric > 0
     LIMIT 1),
    0
  ) AS new_unit_price
FROM invoices i,
     jsonb_array_elements(i.line_items) li
WHERE i.line_items IS NOT NULL
  AND (li->>'item_code') = 'Annuity'
  AND (li->>'unit_price')::numeric = 0
ORDER BY i.invoice_number, (li->>'description');

-- STEP 2: Fix line_items — set correct unit_price, total_incl, vat_amount
-- ============================================================
UPDATE invoices
SET line_items = (
  SELECT jsonb_agg(
    CASE
      WHEN (li->>'item_code') = 'Annuity' AND (li->>'unit_price')::numeric = 0 THEN
        li || jsonb_build_object(
          'unit_price', COALESCE(
            (SELECT (qp->>'subscription_gross')::numeric
             FROM job_cards jc,
                  jsonb_array_elements(jc.quotation_products) qp
             WHERE jc.id = invoices.job_card_id
               AND (
                 (qp->>'description')::text = (li->>'description')::text
                 OR (qp->>'name')::text = (li->>'description')::text
               )
               AND (qp->>'subscription_gross')::numeric > 0
             LIMIT 1),
            0
          ),
          'total_incl', COALESCE(
            (SELECT (qp->>'subscription_gross')::numeric
             FROM job_cards jc,
                  jsonb_array_elements(jc.quotation_products) qp
             WHERE jc.id = invoices.job_card_id
               AND (
                 (qp->>'description')::text = (li->>'description')::text
                 OR (qp->>'name')::text = (li->>'description')::text
               )
               AND (qp->>'subscription_gross')::numeric > 0
             LIMIT 1),
            0
          ),
          'vat_amount', COALESCE(
            (SELECT ROUND((qp->>'subscription_gross')::numeric * 0.15, 2)
             FROM job_cards jc,
                  jsonb_array_elements(jc.quotation_products) qp
             WHERE jc.id = invoices.job_card_id
               AND (
                 (qp->>'description')::text = (li->>'description')::text
                 OR (qp->>'name')::text = (li->>'description')::text
               )
               AND (qp->>'subscription_gross')::numeric > 0
             LIMIT 1),
            0
          ),
          'vat_percent', '15.00%'
        )
      ELSE li
    END
  )
  FROM jsonb_array_elements(invoices.line_items) AS li
)
WHERE line_items IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(line_items) AS li
    WHERE (li->>'item_code') = 'Annuity'
      AND (li->>'unit_price')::numeric = 0
  );

-- STEP 3: Recalculate invoice totals from corrected line_items
-- ============================================================
UPDATE invoices
SET
  subtotal = (
    SELECT COALESCE(SUM(
      (li->>'total_incl')::numeric - (li->>'vat_amount')::numeric
    ), 0)
    FROM jsonb_array_elements(line_items) AS li
  ),
  vat_amount = (
    SELECT COALESCE(SUM((li->>'vat_amount')::numeric), 0)
    FROM jsonb_array_elements(line_items) AS li
  ),
  total_amount = (
    SELECT COALESCE(SUM((li->>'total_incl')::numeric), 0)
    FROM jsonb_array_elements(line_items) AS li
  )
WHERE line_items IS NOT NULL
  AND jsonb_array_length(line_items) > 0;

-- STEP 4: Verify results
-- ============================================================
SELECT
  i.invoice_number,
  i.subtotal,
  i.vat_amount,
  i.total_amount,
  jsonb_array_length(i.line_items) AS line_item_count,
  (SELECT jsonb_agg(li->>'item_code' || ': ' || (li->>'unit_price') || ' x' || (li->>'quantity'))
   FROM jsonb_array_elements(i.line_items) li) AS line_summary
FROM invoices i
WHERE i.line_items IS NOT NULL
  AND jsonb_array_length(i.line_items) > 0;

-- ============================================================
-- STEP 5: Re-block UPDATE on invoices (restore RLS protection)
-- ============================================================
DROP POLICY IF EXISTS "invoices_update_temp" ON public.invoices;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'invoices' AND cmd = 'UPDATE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.invoices', pol.policyname);
  END LOOP;
END $$;

REVOKE UPDATE ON public.invoices FROM authenticated;

-- Recreate read-only policies
CREATE POLICY "invoices_select" ON invoices
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "invoices_insert" ON invoices
  FOR INSERT TO anon, authenticated WITH CHECK (true);
