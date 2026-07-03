-- RLS Policies: Read + Insert only (no UPDATE, no DELETE)
-- Prevents accidental updates to vehicle/invoice data
-- Run this on Supabase SQL Editor

-- Enable RLS on key tables
ALTER TABLE account_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

REVOKE UPDATE, DELETE ON public.account_invoices FROM PUBLIC, anon, authenticated, service_role;
REVOKE UPDATE, DELETE ON public.invoices FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.account_invoices TO anon, authenticated;
GRANT SELECT, INSERT ON public.invoices TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.block_invoice_updates()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Updates are not allowed on %', TG_TABLE_NAME;
END;
$$;

DROP TRIGGER IF EXISTS block_account_invoices_updates ON public.account_invoices;
CREATE TRIGGER block_account_invoices_updates
BEFORE UPDATE ON public.account_invoices
FOR EACH ROW
EXECUTE FUNCTION public.block_invoice_updates();

DROP TRIGGER IF EXISTS block_invoices_updates ON public.invoices;
CREATE TRIGGER block_invoices_updates
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.block_invoice_updates();

-- account_invoices: SELECT + INSERT only
DO $$
DECLARE
  policy_name text;
BEGIN
  FOR policy_name IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'account_invoices'
      AND cmd IN ('UPDATE', 'DELETE')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.account_invoices', policy_name);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "account_invoices_select" ON account_invoices;
DROP POLICY IF EXISTS "account_invoices_insert" ON account_invoices;

CREATE POLICY "account_invoices_select" ON account_invoices
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "account_invoices_insert" ON account_invoices
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- invoices: SELECT + INSERT only
DO $$
DECLARE
  policy_name text;
BEGIN
  FOR policy_name IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'invoices'
      AND cmd IN ('UPDATE', 'DELETE')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.invoices', policy_name);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "invoices_select" ON invoices;
DROP POLICY IF EXISTS "invoices_insert" ON invoices;

CREATE POLICY "invoices_select" ON invoices
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "invoices_insert" ON invoices
  FOR INSERT TO anon, authenticated WITH CHECK (true);