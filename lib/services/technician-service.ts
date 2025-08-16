import { TechnicianRepository } from '@/lib/repositories/technician-repository';
import { Technician } from '@/lib/types/database/technician';
import { GetTechnicianJobsRequest } from '@/lib/types/api/technician';
import { BadRequestError, NotFoundError, ForbiddenError } from '@/lib/errors';
import { Cache } from '@/lib/cache/memory-cache';
import { Logger } from '@/lib/logger';

/**
 * Service for technician-related business logic
 */
export class TechnicianService {
  private repository: TechnicianRepository;
  private cache: Cache;
  private logger: Logger;
  
  constructor() {
    this.repository = new TechnicianRepository();
    this.cache = Cache.getInstance();
    this.logger = new Logger('TechnicianService');
  }
  
  /**
   * Get all technicians
   * @returns Array of technicians
   */
  async getAllTechnicians(): Promise<Technician[]> {
    try {
      this.logger.debug('Getting all technicians');
      
      const cacheKey = 'technicians:all';
      
      return await this.cache.getOrSet(
        cacheKey,
        async () => {
          this.logger.debug('Cache miss for all technicians, fetching from database');
          const technicians = await this.repository.findAll();
          this.logger.info(`Found ${technicians.length} technicians`);
          return technicians;
        },
        { ttl: 10 * 60 * 1000 } // Cache for 10 minutes
      );
    } catch (error) {
      this.logger.error('Error getting all technicians', error as Error);
      throw error;
    }
  }
  
  /**
   * Get a technician by ID
   * @param id The technician ID
   * @returns The technician
   * @throws NotFoundError if technician not found
   */
  async getTechnicianById(id: string): Promise<Technician> {
    try {
      this.logger.debug(`Getting technician by ID: ${id}`);
      
      const cacheKey = `technician:id:${id}`;
      const cachedTechnician = this.cache.get<Technician>(cacheKey);
      
      if (cachedTechnician) {
        this.logger.debug(`Cache hit for technician ID: ${id}`);
        return cachedTechnician;
      }
      
      this.logger.debug(`Cache miss for technician ID: ${id}, fetching from database`);
      const technician = await this.repository.findById(id);
      
      if (!technician) {
        this.logger.warn(`Technician with ID ${id} not found`);
        throw new NotFoundError(`Technician with ID ${id} not found`);
      }
      
      this.cache.set(cacheKey, technician, { ttl: 30 * 60 * 1000 }); // Cache for 30 minutes
      this.logger.info(`Found technician: ${technician.name}`);
      
      return technician;
    } catch (error) {
      this.logger.error(`Error getting technician by ID: ${id}`, error as Error);
      throw error;
    }
  }
  
  /**
   * Get technician by user ID
   * @param userId The user ID
   * @returns Technician info and admin status
   */
  async getTechUserInfo(userId: string): Promise<{ technician: Technician | null; isAdmin: boolean }> {
    try {
      if (!userId) {
        this.logger.warn('Get technician user info called without user ID');
        throw new BadRequestError('User ID is required');
      }
      
      this.logger.debug(`Getting technician info for user ID: ${userId}`);
      
      const cacheKey = `technician:userId:${userId}`;
      const cachedResult = this.cache.get<{ technician: Technician | null; isAdmin: boolean }>(cacheKey);
      
      if (cachedResult) {
        this.logger.debug(`Cache hit for user ID: ${userId}`);
        return cachedResult;
      }
      
      this.logger.debug(`Cache miss for user ID: ${userId}, fetching from database`);
      const technician = await this.repository.findByUserId(userId);
      const isAdmin = Boolean(technician?.is_admin);
      
      const result = { technician, isAdmin };
      
      this.cache.set(cacheKey, result, { ttl: 15 * 60 * 1000 }); // Cache for 15 minutes
      this.logger.info(`Found technician info for user ID: ${userId}`, { 
        found: !!technician,
        isAdmin 
      });
      
      return result;
    } catch (error) {
      this.logger.error(`Error getting technician info for user ID: ${userId}`, error as Error);
      throw error;
    }
  }
  
  /**
   * Get technician by user ID along with user role information
   * @param userId The user ID
   * @returns Technician info, admin status, and user info
   */
  async getTechUserInfoWithRole(userId: string): Promise<{ 
    technician: Technician | null; 
    isAdmin: boolean;
    user: { id: string; email: string; role: string; tech_admin?: boolean } 
  }> {
    try {
      if (!userId) {
        this.logger.warn('Get technician user info with role called without user ID');
        throw new BadRequestError('User ID is required');
      }
      
      this.logger.debug(`Getting technician info with role for user ID: ${userId}`);
      
      // Get user info from users table
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, role, tech_admin')
        .eq('id', userId)
        .single();

      if (userError) {
        this.logger.error(`Error fetching user data for ID: ${userId}`, userError);
        throw new Error('Failed to fetch user data');
      }

      if (!userData) {
        this.logger.warn(`User with ID ${userId} not found`);
        throw new NotFoundError('User not found');
      }

      // Check if user is a technician
      if (userData.role !== 'tech') {
        this.logger.warn(`User with ID ${userId} is not a technician`);
        throw new ForbiddenError('Access denied. Technician role required.');
      }
      
      // Get technician info
      const { technician, isAdmin } = await this.getTechUserInfo(userId);
      
      return { 
        technician, 
        isAdmin,
        user: userData
      };
    } catch (error) {
      this.logger.error(`Error getting technician info with role for user ID: ${userId}`, error as Error);
      throw error;
    }
  }
  
  /**
   * Get jobs for a specific technician
   * @param params Request parameters
   * @returns Jobs and count
   */
  async getTechnicianJobs(params: GetTechnicianJobsRequest): Promise<{ jobs: any[]; count: number }> {
    try {
      if (!params.technicianId) {
        this.logger.warn('Get technician jobs called without technician ID');
        throw new BadRequestError('Technician ID is required');
      }
      
      this.logger.debug('Getting jobs for technician', { 
        technicianId: params.technicianId,
        startDate: params.startDate,
        endDate: params.endDate,
        status: params.status
      });
      
      const cacheKey = `technician:jobs:${params.technicianId}:${params.startDate || ''}:${params.endDate || ''}:${params.status || ''}`;
      
      return await this.cache.getOrSet(
        cacheKey,
        async () => {
          this.logger.debug('Cache miss for technician jobs, fetching from database');
          const result = await this.repository.getJobs(
            params.technicianId,
            params.startDate,
            params.endDate,
            params.status
          );
          
          this.logger.info(`Found ${result.jobs.length} jobs for technician`, { 
            technicianId: params.technicianId 
          });
          
          return result;
        },
        { ttl: 5 * 60 * 1000 } // Cache for 5 minutes
      );
    } catch (error) {
      this.logger.error('Error getting technician jobs', error as Error, { 
        technicianId: params.technicianId 
      });
      throw error;
    }
  }
}
