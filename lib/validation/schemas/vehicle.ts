import { z } from 'zod';

/**
 * Schema for validating vehicle search requests
 */
export const SearchVehicleSchema = z.object({
  vin: z.string().optional(),
  registration: z.string().optional(),
}).refine(data => data.vin || data.registration, {
  message: 'Either VIN or registration number must be provided',
});

/**
 * Schema for validating vehicles by company requests
 */
export const VehiclesByCompanySchema = z.object({
  company: z.string().min(1, 'Company name is required'),
});
