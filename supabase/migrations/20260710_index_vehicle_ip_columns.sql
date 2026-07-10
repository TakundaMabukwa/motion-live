-- ============================================================
-- Migration: Add btree indexes on vehicles_duplicate IP/serial columns
-- ============================================================
-- Enables fast ILIKE prefix searches on IP and serial number columns.
-- Run this after the stock_movements audit migration.
-- ============================================================

-- IP address columns
CREATE INDEX IF NOT EXISTS idx_vehicles_duplicate_skylink_ip
  ON public.vehicles_duplicate (skylink_trailer_unit_ip);

CREATE INDEX IF NOT EXISTS idx_vehicles_duplicate_batt_ip
  ON public.vehicles_duplicate (sky_on_batt_ign_unit_ip);

CREATE INDEX IF NOT EXISTS idx_vehicles_duplicate_voice_ip
  ON public.vehicles_duplicate (skylink_voice_kit_ip);

CREATE INDEX IF NOT EXISTS idx_vehicles_duplicate_scout12_ip
  ON public.vehicles_duplicate (sky_scout_12v_ip);

CREATE INDEX IF NOT EXISTS idx_vehicles_duplicate_scout24_ip
  ON public.vehicles_duplicate (sky_scout_24v_ip);

CREATE INDEX IF NOT EXISTS idx_vehicles_duplicate_pro_ip
  ON public.vehicles_duplicate (skylink_pro_ip);

CREATE INDEX IF NOT EXISTS idx_vehicles_duplicate_vw100ip
  ON public.vehicles_duplicate (vw100ip_driver_facing_ip);

-- Serial number columns
CREATE INDEX IF NOT EXISTS idx_vehicles_duplicate_skylink_serial
  ON public.vehicles_duplicate (skylink_trailer_unit_serial_number);

CREATE INDEX IF NOT EXISTS idx_vehicles_duplicate_batt_serial
  ON public.vehicles_duplicate (sky_on_batt_ign_unit_serial_number);

CREATE INDEX IF NOT EXISTS idx_vehicles_duplicate_voice_serial
  ON public.vehicles_duplicate (skylink_voice_kit_serial_number);

CREATE INDEX IF NOT EXISTS idx_vehicles_duplicate_scout12_serial
  ON public.vehicles_duplicate (sky_scout_12v_serial_number);

CREATE INDEX IF NOT EXISTS idx_vehicles_duplicate_scout24_serial
  ON public.vehicles_duplicate (sky_scout_24v_serial_number);

CREATE INDEX IF NOT EXISTS idx_vehicles_duplicate_pro_serial
  ON public.vehicles_duplicate (skylink_pro_serial_number);