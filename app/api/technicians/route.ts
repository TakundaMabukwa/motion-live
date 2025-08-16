import { NextResponse } from 'next/server';
import { TechnicianService } from '@/lib/services/technician-service';
import { handleApiError } from '@/lib/errors';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/auth/auth-utils';

// Create an instance of the service
const technicianService = new TechnicianService();

/**
 * GET /api/technicians
 * Get all technicians
 */
export async function GET() {
  try {
    // Get authenticated user
    try {
      await getAuthenticatedUser();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return createUnauthorizedResponse();
    }
    
    // Use service to get all technicians
    const technicians = await technicianService.getAllTechnicians();
    
    // Transform the data to match the expected format
    const transformedTechnicians = technicians.map(tech => ({
      id: tech.id,
      name: tech.name,
      email: tech.email,
      admin: tech.is_admin || false,
      color_code: tech.color
    }));
    
    return NextResponse.json({ technicians: transformedTechnicians });
  } catch (error) {
    console.error('Error in technicians GET:', error);
    const { error: errorMessage, status } = handleApiError(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
