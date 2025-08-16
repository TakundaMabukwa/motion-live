/**
 * VehicleLog database entity type
 * Represents a vehicle log entry in the vehicle_logs table
 */
export interface VehicleLog {
  id: string; // uuid
  vehicle_id: string; // uuid, references vehicles.id
  registration_number: string;
  log_date: string; // ISO date string
  log_type: string;
  odometer_reading: number;
  fuel_quantity?: number;
  fuel_cost?: number;
  maintenance_cost?: number;
  maintenance_description?: string;
  service_cost?: number;
  service_description?: string;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
  created_by?: string; // uuid
  updated_by?: string; // uuid
  location?: string;
  notes?: string;
}
