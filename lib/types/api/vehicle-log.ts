import { VehicleLog } from '@/lib/types/database/vehicle-log';

/**
 * GET /api/vehicle-logs request parameters
 */
export interface GetVehicleLogsRequest {
  vehicleId: string;
  startDate?: string;
  endDate?: string;
  logType?: string;
}

/**
 * GET /api/vehicle-logs response
 */
export interface GetVehicleLogsResponse {
  logs: VehicleLog[];
}

/**
 * POST /api/vehicle-logs request body
 */
export interface CreateVehicleLogRequest {
  vehicleId: string;
  registrationNumber: string;
  logDate: string;
  logType: string;
  odometerReading: number;
  fuelQuantity?: number;
  fuelCost?: number;
  maintenanceCost?: number;
  maintenanceDescription?: string;
  serviceCost?: number;
  serviceDescription?: string;
  location?: string;
  notes?: string;
}

/**
 * POST /api/vehicle-logs response
 */
export interface CreateVehicleLogResponse {
  log: VehicleLog;
  message: string;
}
