import { NextRequest, NextResponse } from 'next/server';
import { JobCardService } from '@/lib/services/job-card-service';
import { handleApiError } from '@/lib/errors';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/auth/auth-utils';

// Create an instance of the service
const jobCardService = new JobCardService();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate the user
    try {
      await getAuthenticatedUser();
    } catch (error) {
      return createUnauthorizedResponse();
    }

    const { id } = await params;
    
    // Get job card from service
    const jobCard = await jobCardService.getJobCardById(id);

    return NextResponse.json(jobCard);
  } catch (error) {
    console.error('Error in job card GET:', error);
    const { error: errorMessage, status } = handleApiError(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate the user
    try {
      await getAuthenticatedUser();
    } catch (error) {
      return createUnauthorizedResponse();
    }

    const { id } = await params;
    const body = await request.json();

    // Update job card
    const updatedJobCard = await jobCardService.updateJobCard(id, body);

    return NextResponse.json(updatedJobCard);
  } catch (error) {
    console.error('Error in job card PATCH:', error);
    const { error: errorMessage, status } = handleApiError(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

/**
 * DELETE /api/job-cards/[id]
 * Delete a job card
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate the user
    try {
      await getAuthenticatedUser();
    } catch (error) {
      return createUnauthorizedResponse();
    }

    const { id } = await params;
    
    // Delete job card
    await jobCardService.deleteJobCard(id);

    return NextResponse.json({ 
      success: true,
      message: 'Job card deleted successfully'
    });
  } catch (error) {
    console.error('Error in job card DELETE:', error);
    const { error: errorMessage, status } = handleApiError(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
