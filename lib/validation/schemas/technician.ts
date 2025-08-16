import { z } from 'zod';

/**
 * Schema for validating technician jobs requests
 */
export const GetTechnicianJobsSchema = z.object({
  technicianId: z.string().uuid('Technician ID must be a valid UUID'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.string().optional(),
});

/**
 * Schema for validating tech user info requests
 */
export const GetTechUserInfoSchema = z.object({
  userId: z.string().uuid('User ID must be a valid UUID'),
});
