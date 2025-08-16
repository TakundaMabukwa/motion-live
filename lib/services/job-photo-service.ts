import { JobPhotoRepository } from '@/lib/repositories/job-photo-repository';
import { 
  JobPhoto, 
  JobPhotoUpload, 
  VehicleDataForUpload, 
  SaveJobPhotosRequest,
  JobPhotoHealthCheckResponse,
  GetJobPhotosRequest 
} from '@/lib/types/api/job-photo';
import { BadRequestError } from '@/lib/errors';
import { Logger } from '@/lib/logger';
import { Cache } from '@/lib/cache/memory-cache';

/**
 * Service for job photo operations
 */
export class JobPhotoService {
  private repository: JobPhotoRepository;
  private logger: Logger;
  private cache: Cache;
  
  constructor() {
    this.repository = new JobPhotoRepository();
    this.logger = new Logger('JobPhotoService');
    this.cache = Cache.getInstance();
  }
  
  /**
   * Save job photos to storage and update job card
   * @param data Request data containing job info and photos
   * @returns Upload result with metadata
   */
  async saveJobPhotos(data: SaveJobPhotosRequest): Promise<{
    success: boolean;
    photos: JobPhoto[];
    totalPhotos: number;
    vehicleId: number | null;
    message: string;
  }> {
    try {
      this.logger.debug('Saving job photos', { 
        jobId: data.jobId, 
        jobNumber: data.jobNumber,
        photoCount: data.photos.length 
      });
      
      if (!data.jobId || !data.photos || data.photos.length === 0) {
        this.logger.warn('Invalid job photo upload request', { 
          jobId: data.jobId, 
          hasPhotos: !!data.photos, 
          photoCount: data.photos?.length 
        });
        throw new BadRequestError('Job ID and at least one photo are required');
      }
      
      // Call repository to save photos
      const result = await this.repository.saveJobPhotos(
        data.jobId,
        data.jobNumber,
        data.photos,
        data.vehicleRegistration,
        data.vehicleData
      );
      
      // Invalidate any cached job data
      this.cache.delete(`job:${data.jobId}`);
      this.cache.delete(`job:photos:${data.jobId}`);
      
      this.logger.info('Successfully saved job photos', { 
        jobId: data.jobId, 
        uploadedCount: result.photos.length,
        totalCount: result.totalPhotos,
        vehicleId: result.vehicleId
      });
      
      return {
        success: true,
        photos: result.photos,
        totalPhotos: result.totalPhotos,
        vehicleId: result.vehicleId,
        message: `${result.photos.length} photos uploaded and saved successfully`
      };
    } catch (error) {
      this.logger.error('Error saving job photos', error as Error, { 
        jobId: data.jobId 
      });
      throw error;
    }
  }
  
  /**
   * Get photos for a specific job
   * @param params Job identification parameters
   * @returns Job photos
   */
  async getJobPhotos(params: GetJobPhotosRequest): Promise<{
    photos: JobPhoto[];
    jobId?: string;
    jobNumber?: string;
  }> {
    try {
      const { jobId, jobNumber } = params;
      
      this.logger.debug('Getting job photos', { jobId, jobNumber });
      
      if (!jobId && !jobNumber) {
        this.logger.warn('Get job photos called without job ID or number');
        return { photos: [] };
      }
      
      // Try to get from cache if we have a job ID
      let photos: JobPhoto[] = [];
      const cacheKey = jobId ? `job:photos:${jobId}` : `job:photos:number:${jobNumber}`;
      
      photos = await this.cache.getOrSet(
        cacheKey,
        async () => {
          this.logger.debug('Cache miss for job photos, fetching from database', { 
            jobId, 
            jobNumber 
          });
          return await this.repository.getJobPhotos(jobId, jobNumber);
        },
        { ttl: 15 * 60 * 1000 } // Cache for 15 minutes
      );
      
      this.logger.info(`Found ${photos.length} photos for job`, { jobId, jobNumber });
      
      return {
        photos,
        jobId,
        jobNumber
      };
    } catch (error) {
      this.logger.error('Error getting job photos', error as Error, { 
        jobId: params.jobId,
        jobNumber: params.jobNumber 
      });
      throw error;
    }
  }
  
  /**
   * Check health of the job photos API
   * @returns Health check results
   */
  async checkHealth(): Promise<JobPhotoHealthCheckResponse> {
    try {
      this.logger.debug('Running job photos API health check');
      
      const health = await this.repository.checkHealth();
      
      const result: JobPhotoHealthCheckResponse = {
        status: health.supabaseConnection && health.storageConnection ? 'healthy' : 'unhealthy',
        message: 'Job photos API health check',
        timestamp: new Date().toISOString(),
        supabaseConnection: health.supabaseConnection,
        storageConnection: health.storageConnection
      };
      
      this.logger.info('Job photos API health check result', result);
      
      return result;
    } catch (error) {
      this.logger.error('Error checking job photos API health', error as Error);
      
      return {
        status: 'error',
        message: `Health check error: ${(error as Error).message}`,
        timestamp: new Date().toISOString(),
        supabaseConnection: false,
        storageConnection: false
      };
    }
  }
}
