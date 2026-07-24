-- ============================================================
-- Migration: Add indexes for stock verification performance
-- ============================================================

-- Single-column index on client_inventory_items.serial_number
-- The existing UNIQUE constraint is on (client_code, cost_code, serial_number)
-- so .in("serial_number", [...]) can't use it efficiently
CREATE INDEX IF NOT EXISTS idx_client_inventory_items_serial_number
  ON public.client_inventory_items (serial_number);

-- GIN index on tech_stock.assigned_parts for JSONB containment queries
CREATE INDEX IF NOT EXISTS idx_tech_stock_assigned_parts_gin
  ON public.tech_stock USING gin (assigned_parts jsonb_path_ops);
