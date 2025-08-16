import { NextRequest, NextResponse } from 'next/server';
import { VehicleService } from '@/lib/services/vehicle-service';
import { safeValidate } from '@/lib/api/validation';
import { CreateVehicleIpSchema } from '@/lib/types/api/vehicle';
import { handleApiError } from '@/lib/errors';

const vehicleService = new VehicleService();

export async function POST(request: NextRequest) {
  try {
    // Authentication check will be handled in the service layer

    const body = await request.json();
    
    // Validate request body
    const validation = safeValidate(body, CreateVehicleIpSchema);
    if (!validation.success) {
      return NextResponse.json({ 
        error: `Validation error: ${validation.error.message}`
      }, { status: 400 });
    }

    // Create the vehicle via service
    const result = await vehicleService.createVehicleIp(validation.data);

    return NextResponse.json(result);
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authentication check will be handled in the service layer

    // Get search parameters
    const { searchParams } = new URL(request.url);
    const registration = searchParams.get('registration') || undefined;
    const accountNumber = searchParams.get('accountNumber') || undefined;

    // Get filtered vehicles via service
    const result = await vehicleService.getVehiclesIp({
      registration,
      accountNumber
    });

    return NextResponse.json(result);
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

