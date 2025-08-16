import { Technician } from '@/lib/types/database/technician';

/**
 * GET /api/technicians response
 */
export interface GetTechniciansResponse {
  technicians: Technician[];
}

/**
 * GET /api/technicians/jobs request parameters
 */
export interface GetTechnicianJobsRequest {
  technicianId: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

/**
 * GET /api/technicians/jobs response
 */
export interface GetTechnicianJobsResponse {
  jobs: any[]; // Job type would be defined in job-card.ts
  count: number;
}

/**
 * GET /api/tech-user-info request parameters
 */
export interface GetTechUserInfoRequest {
  userId: string;
}

/**
 * GET /api/tech-user-info response
 */
export interface GetTechUserInfoResponse {
  technician: Technician | null;
  isAdmin: boolean;
}
