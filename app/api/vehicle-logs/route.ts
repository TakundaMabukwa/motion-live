import { NextRequest, NextResponse } from 'next/server';
import { VehicleLogService } from '@/lib/services/vehicle-log-service';
import { handleApiError } from '@/lib/errors';
import { safeValidateRequest } from '@/lib/validation';
import { CreateVehicleLogSchema, GetVehicleLogsSchema } from '@/lib/validation/schemas/vehicle-log';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/auth/auth-utils';

// Create an instance of the service
const vehicleLogService = new VehicleLogService();

/**
 * POST /api/vehicle-logs
 * Create a new vehicle log
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    let user;
    try {
      user = await getAuthenticatedUser();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { vehicle_registration, status, cost_center, driver_name } = body;

    // For backward compatibility, convert to the new schema format
    const logData = {
      vehicleId: body.vehicleId || 'legacy-id', // Using a placeholder ID for legacy routes
      registrationNumber: vehicle_registration,
      logDate: new Date().toISOString(),
      logType: status,
      odometerReading: body.odometerReading || 0,
      location: cost_center,
      notes: driver_name
    };

    // Validate request body
    const validation = safeValidateRequest(logData, CreateVehicleLogSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    
    // Use service to create the log
    const result = await vehicleLogService.createVehicleLog(logData, user.id);
    
    return NextResponse.json({
      success: true,
      log: result.log
    });
  } catch (error) {
    console.error('Error in vehicle logs POST:', error);
    const { error: errorMessage, status } = handleApiError(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

/**
 * GET /api/vehicle-logs
 * Get vehicle logs
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId');
    const vehicle_registration = searchParams.get('vehicle_registration');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const logType = searchParams.get('logType');

    // For backward compatibility, handle both vehicleId and vehicle_registration
    const effectiveVehicleId = vehicleId || vehicle_registration || '';
    
    // Validate request parameters
    const validation = safeValidateRequest(
      { 
        vehicleId: effectiveVehicleId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        logType: logType || undefined
      }, 
      GetVehicleLogsSchema
    );
    
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    
    // Use service to get the logs
    const logs = await vehicleLogService.getVehicleLogs({
      vehicleId: effectiveVehicleId,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      logType: logType || undefined
    });
    
    return NextResponse.json({
      success: true,
      logs: logs || []
    });
  } catch (error) {
    console.error('Error in vehicle logs GET:', error);
    const { error: errorMessage, status } = handleApiError(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
