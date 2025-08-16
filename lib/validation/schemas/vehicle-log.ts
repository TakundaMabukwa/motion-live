import { z } from 'zod';

/**
 * Schema for validating vehicle log requests
 */
export const GetVehicleLogsSchema = z.object({
  vehicleId: z.string().uuid('Vehicle ID must be a valid UUID'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  logType: z.string().optional(),
});

/**
 * Schema for validating create vehicle log requests
 */
export const CreateVehicleLogSchema = z.object({
  vehicleId: z.string().uuid('Vehicle ID must be a valid UUID'),
  registrationNumber: z.string().min(1, 'Registration number is required'),
  logDate: z.string().datetime('Log date must be a valid date'),
  logType: z.string().min(1, 'Log type is required'),
  odometerReading: z.number().min(0, 'Odometer reading must be a positive number'),
  fuelQuantity: z.number().min(0).optional(),
  fuelCost: z.number().min(0).optional(),
  maintenanceCost: z.number().min(0).optional(),
  maintenanceDescription: z.string().optional(),
  serviceCost: z.number().min(0).optional(),
  serviceDescription: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});
