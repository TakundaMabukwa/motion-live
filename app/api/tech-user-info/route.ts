import { NextResponse } from 'next/server';
import { TechnicianService } from '@/lib/services/technician-service';
import { handleApiError } from '@/lib/errors';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/auth/auth-utils';

// Create an instance of the service
const technicianService = new TechnicianService();

/**
 * GET /api/tech-user-info
 * Get information about the authenticated technician user
 */
export async function GET() {
  try {
    // Get authenticated user
    let user;
    try {
      user = await getAuthenticatedUser();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return createUnauthorizedResponse();
    }

    // Use service to get technician and user info
    const result = await technicianService.getTechUserInfoWithRole(user.id);
    
    return NextResponse.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role
      },
      isTechAdmin: result.isAdmin || result.user.tech_admin || false,
      technician: result.technician
    });
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}









