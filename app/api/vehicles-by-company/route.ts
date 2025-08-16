import { NextRequest, NextResponse } from 'next/server';
import { VehicleService } from '@/lib/services/vehicle-service';
import { handleApiError } from '@/lib/errors';
import { safeValidateRequest } from '@/lib/validation';
import { VehiclesByCompanySchema } from '@/lib/validation/schemas/vehicle';
import { Logger } from '@/lib/logger';

// Create an instance of the service and logger
const vehicleService = new VehicleService();
const logger = new Logger('API:vehicles-by-company');

/**
 * GET /api/vehicles-by-company
 * Get vehicles by company name or account number
 */
export async function GET(request: NextRequest) {
  try {
    logger.debug('Processing GET request');
    
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const accountNumber = searchParams.get('accountNumber');

    // Validate that at least one parameter is provided
    if (!company && !accountNumber) {
      logger.warn('Request missing required parameters');
      return NextResponse.json(
        { error: 'Company name or account number is required' }, 
        { status: 400 }
      );
    }

    logger.info('Fetching vehicles for:', { company, accountNumber });

    let vehicles;
    if (accountNumber) {
      // Use account number as company to simplify the logic
      vehicles = await vehicleService.getVehiclesByCompany(accountNumber);
    } else if (company) {
      // Validate company parameter
      const validation = safeValidateRequest({ company }, VehiclesByCompanySchema);
      if (!validation.success) {
        logger.warn('Invalid company parameter', { error: validation.error });
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
      
      // Use service to get vehicles by company
      vehicles = await vehicleService.getVehiclesByCompany(company);
    }

    logger.info('Found vehicles:', { count: vehicles?.length || 0 });

    // Transform the data to match expected format with group_name as plate
    const transformedVehicles = vehicles?.map(vehicle => ({
      id: vehicle.id,
      plate_number: vehicle.group_name || vehicle.new_registration || 'Unknown',
      vehicle_make: vehicle.beame_1 || '',
      vehicle_model: vehicle.beame_2 || '',
      vehicle_year: vehicle.beame_3 || '',
      ip_address: vehicle.ip_address || '',
      company: vehicle.company || '',
      comment: vehicle.comment || '',
      products: vehicle.products || [],
      active: vehicle.active,
      group_name: vehicle.group_name,
      new_account_number: vehicle.new_account_number,
      // Add additional fields for compatibility
      make: vehicle.beame_1 || '',
      model: vehicle.beame_2 || '',
      year: vehicle.beame_3 || '',
      vin_number: vehicle.group_name || vehicle.new_registration || 'Unknown',
      registration_number: vehicle.group_name || vehicle.new_registration || 'Unknown',
      registration: vehicle.group_name || vehicle.new_registration || 'Unknown'
    })) || [];

    return NextResponse.json({
      success: true,
      vehicles: transformedVehicles,
      count: transformedVehicles.length
    });
  } catch (error) {
    logger.error('Error in vehicles by company GET:', error as Error);
    const { error: errorMessage, status } = handleApiError(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
