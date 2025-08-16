import { VehicleLogRepository } from '@/lib/repositories/vehicle-log-repository';
import { VehicleLog } from '@/lib/types/database/vehicle-log';
import { CreateVehicleLogRequest, GetVehicleLogsRequest } from '@/lib/types/api/vehicle-log';
import { BadRequestError, NotFoundError } from '@/lib/errors';

/**
 * Service for vehicle log-related business logic
 */
export class VehicleLogService {
  private repository: VehicleLogRepository;
  
  constructor() {
    this.repository = new VehicleLogRepository();
  }
  
  /**
   * Get logs for a specific vehicle
   * @param params Request parameters
   * @returns Array of vehicle logs
   */
  async getVehicleLogs(params: GetVehicleLogsRequest): Promise<VehicleLog[]> {
    try {
      if (!params.vehicleId) {
        throw new BadRequestError('Vehicle ID is required');
      }
      
      return await this.repository.findByVehicle(
        params.vehicleId,
        params.startDate,
        params.endDate,
        params.logType
      );
    } catch (error) {
      console.error('Error in vehicle log service:', error);
      throw error;
    }
  }
  
  /**
   * Create a new vehicle log
   * @param logData The log data to create
   * @param userId The ID of the user creating the log
   * @returns The created log and a success message
   */
  async createVehicleLog(
    logData: CreateVehicleLogRequest,
    userId: string
  ): Promise<{ log: VehicleLog; message: string }> {
    try {
      if (!logData.vehicleId) {
        throw new BadRequestError('Vehicle ID is required');
      }
      
      if (!userId) {
        throw new BadRequestError('User ID is required');
      }
      
      const log = await this.repository.create(logData, userId);
      
      return {
        log,
        message: 'Vehicle log created successfully'
      };
    } catch (error) {
      console.error('Error in vehicle log service:', error);
      throw error;
    }
  }
}
