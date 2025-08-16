import { Vehicle, VehicleIp } from '@/lib/types/database/vehicle';
import { z } from 'zod';

/**
 * GET /api/vehicles/search request parameters
 */
export interface SearchVehicleRequest {
  vin?: string;
  registration?: string;
}

/**
 * GET /api/vehicles/search response
 */
export interface SearchVehicleResponse {
  vehicle: Vehicle | VehicleIp | null;
  message?: string;
}

/**
 * GET /api/vehicles-by-company request parameters
 */
export interface VehiclesByCompanyRequest {
  company: string;
}

/**
 * GET /api/vehicles-by-company response
 */
export interface VehiclesByCompanyResponse {
  vehicles: VehicleIp[];
}

/**
 * POST /api/vehicles-ip request schema
 */
export const CreateVehicleIpSchema = z.object({
  new_registration: z.string().min(1, 'Registration is required'),
  new_account_number: z.string().min(1, 'Account number is required'),
  ip_address: z.string().min(1, 'IP address is required'),
  vin_number: z.string().optional().nullable(),
  company: z.string().optional(),
  products: z.array(z.any()).optional().default([]),
  active: z.boolean().optional().default(true),
  comment: z.string().optional().nullable(),
  group_name: z.string().optional().nullable(),
  beame_1: z.string().optional().nullable(),
  beame_2: z.string().optional().nullable(),
  beame_3: z.string().optional().nullable()
});

export type CreateVehicleIpRequest = z.infer<typeof CreateVehicleIpSchema>;

/**
 * POST /api/vehicles-ip response
 */
export interface CreateVehicleIpResponse {
  success: boolean;
  vehicle: VehicleIp;
  message: string;
}

/**
 * GET /api/vehicles-ip request parameters
 */
export interface GetVehiclesIpRequest {
  registration?: string;
  accountNumber?: string;
}

/**
 * GET /api/vehicles-ip response
 */
export interface GetVehiclesIpResponse {
  vehicles: VehicleIp[];
  total: number;
}

/**
 * GET /api/vehicles-by-account request parameters
 */
export interface VehiclesByAccountRequest {
  accountNumber: string;
}

/**
 * Vehicle response transformed for client display
 */
export interface TransformedVehicle {
  id: number;
  plate_number: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: string;
  ip_address: string;
  company: string;
  comment: string;
  products: any[];
  active: boolean;
  group_name: string | null;
  new_account_number: string;
}

/**
 * GET /api/vehicles-by-account response
 */
export interface VehiclesByAccountResponse {
  vehicles: TransformedVehicle[];
  count: number;
}

/**
 * POST /api/vehicles-by-account request
 */
export interface CreateTestVehiclesRequest {
  accountNumber: string;
}
