import { NextRequest, NextResponse } from 'next/server';
import { VehicleService } from '@/lib/services/vehicle-service';
import { handleApiError } from '@/lib/errors';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/auth/auth-utils';

// Create an instance of the service
const vehicleService = new VehicleService();

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    try {
      await getAuthenticatedUser();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return createUnauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const accountNumber = searchParams.get('account_number');

    if (!accountNumber) {
      return NextResponse.json({ error: 'Account number is required' }, { status: 400 });
    }

    // Use service to get vehicles by account
    const result = await vehicleService.getVehiclesByAccount(accountNumber);

    return NextResponse.json(result);
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    try {
      await getAuthenticatedUser();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { accountNumber } = body;

    if (!accountNumber) {
      return NextResponse.json({ error: 'Account number is required' }, { status: 400 });
    }

    // Use service to create test vehicles
    const result = await vehicleService.createTestVehicles(accountNumber);

    return NextResponse.json(result);
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
} 