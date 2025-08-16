import { VehicleLog } from '@/lib/types/database/vehicle-log';
import { CreateVehicleLogRequest } from '@/lib/types/api/vehicle-log';

/**
 * Repository for interacting with vehicle log data in the database
 */
export class VehicleLogRepository {
  /**
   * Find logs for a specific vehicle
   * @param vehicleId The ID of the vehicle
   * @param startDate Optional start date filter
   * @param endDate Optional end date filter
   * @param logType Optional log type filter
   * @returns Array of vehicle logs
   */
  async findByVehicle(
    vehicleId: string,
    startDate?: string,
    endDate?: string,
    logType?: string
  ): Promise<VehicleLog[]> {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient();
    
    let query = supabase
      .from('vehicle_logs')
      .select('*')
      .eq('vehicle_id', vehicleId);
      
    if (startDate) {
      query = query.gte('log_date', startDate);
    }
    
    if (endDate) {
      query = query.lte('log_date', endDate);
    }
    
    if (logType) {
      query = query.eq('log_type', logType);
    }
    
    const { data, error } = await query.order('log_date', { ascending: false });
      
    if (error) {
      throw error;
    }
    
    return data as VehicleLog[];
  }
  
  /**
   * Create a new vehicle log
   * @param logData The log data to create
   * @param userId The ID of the user creating the log
   * @returns The created vehicle log
   */
  async create(logData: CreateVehicleLogRequest, userId: string): Promise<VehicleLog> {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient();
    
    const log = {
      vehicle_id: logData.vehicleId,
      registration_number: logData.registrationNumber,
      log_date: logData.logDate,
      log_type: logData.logType,
      odometer_reading: logData.odometerReading,
      fuel_quantity: logData.fuelQuantity,
      fuel_cost: logData.fuelCost,
      maintenance_cost: logData.maintenanceCost,
      maintenance_description: logData.maintenanceDescription,
      service_cost: logData.serviceCost,
      service_description: logData.serviceDescription,
      location: logData.location,
      notes: logData.notes,
      created_by: userId,
      updated_by: userId
    };
    
    const { data, error } = await supabase
      .from('vehicle_logs')
      .insert(log)
      .select()
      .single();
      
    if (error) {
      throw error;
    }
    
    return data as VehicleLog;
  }
}
