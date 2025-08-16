import { z } from 'zod';

/**
 * Job photo metadata type
 */
export interface JobPhoto {
  id: string;
  filename: string;
  storage_path: string;
  public_url: string;
  description?: string;
  timestamp: string;
  type: 'before' | 'after';
  uploaded_at: string;
}

/**
 * Job photo data URL type
 */
export interface JobPhotoUpload {
  id: string;
  url: string; // Data URL
  description?: string;
  timestamp: string;
}

/**
 * Vehicle data for creating a new vehicle during photo upload
 */
export interface VehicleDataForUpload {
  id?: number;
  products?: any[];
  active?: boolean;
  group_name?: string;
  new_registration?: string;
  beame_1?: string;
  beame_2?: string;
  beame_3?: string;
  ip_address?: string;
  new_account_number?: string;
  vin_number?: string;
  company?: string;
  comment?: string;
}

/**
 * POST /api/job-photos request schema
 */
export const SaveJobPhotosSchema = z.object({
  jobId: z.string().uuid('Job ID must be a valid UUID'),
  jobNumber: z.string().min(1, 'Job number is required'),
  vehicleRegistration: z.string().optional(),
  photos: z.array(
    z.object({
      id: z.string().min(1, 'Photo ID is required'),
      url: z.string().min(1, 'Photo URL is required'),
      description: z.string().optional(),
      timestamp: z.string().min(1, 'Timestamp is required')
    })
  ).min(1, 'At least one photo is required'),
  vehicleData: z.object({
    id: z.number().optional(),
    products: z.array(z.any()).optional(),
    active: z.boolean().optional(),
    group_name: z.string().optional(),
    new_registration: z.string().optional(),
    beame_1: z.string().optional(),
    beame_2: z.string().optional(),
    beame_3: z.string().optional(),
    ip_address: z.string().optional(),
    new_account_number: z.string().optional(),
    vin_number: z.string().optional(),
    company: z.string().optional(),
    comment: z.string().optional()
  }).optional()
});

export type SaveJobPhotosRequest = z.infer<typeof SaveJobPhotosSchema>;

/**
 * Schema for validating job photos save request
 */
export const saveJobPhotosRequestSchema = SaveJobPhotosSchema;

/**
 * POST /api/job-photos response
 */
export interface SaveJobPhotosResponse {
  success: boolean;
  photos: JobPhoto[];
  totalPhotos: number;
  vehicleId?: number | null;
  message: string;
}

/**
 * GET /api/job-photos request parameters
 */
export interface GetJobPhotosRequest {
  jobId?: string;
  jobNumber?: string;
}

/**
 * Schema for validating job photos get request
 */
export const getJobPhotosRequestSchema = z.object({
  jobId: z.string().uuid('Job ID must be a valid UUID').optional(),
  jobNumber: z.string().min(1, 'Job number is required').optional()
}).refine(data => data.jobId || data.jobNumber, {
  message: 'Either jobId or jobNumber must be provided',
  path: ['jobId']
});

/**
 * GET /api/job-photos response
 */
export interface GetJobPhotosResponse {
  photos: JobPhoto[];
  jobId?: string;
  jobNumber?: string;
}

/**
 * Job photo API health check response
 */
export interface JobPhotoHealthCheckResponse {
  status: string;
  message: string;
  timestamp: string;
  supabaseConnection: boolean;
  storageConnection: boolean;
}
