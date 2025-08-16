/**
 * Vehicle database entity type
 * Represents a vehicle in the vehicles table
 */
export interface Vehicle {
  id: string; // uuid
  registration_number: string;
  engine_number: string;
  vin_number: string;
  make: string;
  model: string;
  sub_model?: string;
  manufactured_year: number;
  vehicle_type: string;
  registration_date: string; // ISO date string
  license_expiry_date: string; // ISO date string
  purchase_price?: number;
  retail_price?: number;
  vehicle_priority?: string;
  fuel_type: string;
  transmission_type: string;
  tank_capacity?: number;
  register_number?: string;
  take_on_kilometers?: number;
  service_intervals_km: number;
  boarding_km?: number;
  date_expected_boarding?: string; // ISO date string
  cost_centres: any[]; // jsonb[]
  color: string;
  length_meters?: number;
  width_meters?: number;
  height_meters?: number;
  volume?: number;
  tare_weight?: number;
  gross_weight?: number;
  trailer_count?: number;
  trailer_type?: string;
  has_service_plan: boolean;
  is_factory_service_plan?: boolean;
  is_aftermarket_service_plan?: boolean;
  service_provider?: string;
  service_plan_km?: number;
  service_plan_interval_km?: number;
  service_plan_start_date?: string; // ISO date string
  service_plan_end_date?: string; // ISO date string
  has_maintenance_plan: boolean;
  is_factory_maintenance_plan?: boolean;
  is_aftermarket_maintenance_plan?: boolean;
  maintenance_provider?: string;
  maintenance_plan_km?: number;
  maintenance_plan_interval_km?: number;
  maintenance_plan_start_date?: string; // ISO date string
  maintenance_plan_end_date?: string; // ISO date string
  has_insurance: boolean;
  insurance_policy_number?: string;
  insurance_provider?: string;
  insurance_document_url?: string;
  has_tracking: boolean;
  tracking_provider?: string;
  tracking_document_url?: string;
  has_card: boolean;
  card_type?: string;
  bank_name?: string;
  card_number?: string;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
  created_by?: string; // uuid
  updated_by?: string; // uuid
}

/**
 * Vehicle_ip database entity type
 * Represents a vehicle in the vehicles_ip table
 */
export interface VehicleIp {
  id: number; // smallint
  new_account_number: string;
  company?: string;
  comment?: string;
  group_name?: string;
  new_registration?: string;
  beame_1?: string;
  beame_2?: string;
  beame_3?: string;
  ip_address?: string;
  products: any[]; // jsonb[]
  active: boolean;
  vin_number?: string; // Added based on API usage
}
