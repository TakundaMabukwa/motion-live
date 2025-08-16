import { NextRequest, NextResponse } from 'next/server';
import { VehicleService } from '@/lib/services/vehicle-service';
import { handleApiError } from '@/lib/errors';
import { safeValidateRequest } from '@/lib/validation';
import { SearchVehicleSchema } from '@/lib/validation/schemas/vehicle';

// Create an instance of the service
const vehicleService = new VehicleService();

/**
 * GET /api/vehicles/search
 * Search for a vehicle by VIN or registration number
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vin = searchParams.get('vin');
    const registration = searchParams.get('registration');
    
    // Validate request parameters
    const validation = safeValidateRequest(
      { vin, registration }, 
      SearchVehicleSchema
    );
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }
    
    // Use service to handle business logic
    const result = await vehicleService.searchVehicle({
      vin: vin || undefined,
      registration: registration || undefined
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error searching for vehicle:', error);
    const { error: errorMessage, status } = handleApiError(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
