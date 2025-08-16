import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Logger } from '@/lib/logger';
import { JobPhotoService } from '@/lib/services/job-photo-service';
import { 
  saveJobPhotosRequestSchema,
  getJobPhotosRequestSchema 
} from '@/lib/types/api/job-photo';
import { 
  BadRequestError, 
  UnauthorizedError,
  handleApiError 
} from '@/lib/errors';

const logger = new Logger('job-photos-api');
const service = new JobPhotoService();

/**
 * Check if user is authenticated
 */
async function getUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

/**
 * GET handler for retrieving job photos
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }
    
    logger.debug('GET job photos request received', { user: user.email });
    
    const searchParams = req.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');
    const jobNumber = searchParams.get('jobNumber');
    
    // Health check endpoint if no parameters provided
    if (!jobId && !jobNumber) {
      const health = await service.checkHealth();
      return NextResponse.json({
        status: health.status,
        message: 'Job photos API health check',
        database: health.supabaseConnection ? 'connected' : 'disconnected',
        storage: health.storageConnection ? 'connected' : 'disconnected',
        timestamp: health.timestamp
      });
    }
    
    // Validate request parameters
    const validatedParams = getJobPhotosRequestSchema.safeParse({
      jobId: jobId || undefined,
      jobNumber: jobNumber || undefined
    });
    
    if (!validatedParams.success) {
      logger.warn('Invalid GET job photos request parameters', { 
        error: validatedParams.error.message 
      });
      return NextResponse.json(
        { error: 'Invalid request parameters', details: validatedParams.error.format() },
        { status: 400 }
      );
    }
    
    // Get photos from service
    const result = await service.getJobPhotos(validatedParams.data);
    
    // Transform the response to match the old format for backward compatibility
    const responseData = {
      photos: {
        before: result.photos.filter(photo => photo.type === 'before'),
        after: result.photos.filter(photo => photo.type === 'after')
      },
      jobId: result.jobId,
      jobNumber: result.jobNumber
    };
    
    logger.info(`Successfully retrieved ${result.photos.length} job photos`, {
      jobId,
      jobNumber,
      photoCount: result.photos.length
    });
    
    return NextResponse.json(responseData);
  } catch (error) {
    return handleApiError(error as Error);
  }
}

/**
 * POST handler for saving job photos
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }
    
    logger.debug('POST job photos request received', { user: user.email });
    
    // Check if it's form data or JSON
    const contentType = req.headers.get('content-type') || '';
    
    let parsedData;
    if (contentType.includes('multipart/form-data')) {
      // For now, we'll only support JSON
      return NextResponse.json(
        { error: 'Multipart form data is not supported yet. Please use JSON format.' },
        { status: 400 }
      );
    } else {
      // Parse JSON data
      parsedData = await req.json();
    }
    
    if (!parsedData.jobId) {
      logger.warn('Missing job ID in photo upload request');
      throw new BadRequestError('Job ID is required');
    }
    
    if (!parsedData.photos || parsedData.photos.length === 0) {
      logger.warn('No photos provided in upload request', { jobId: parsedData.jobId });
      throw new BadRequestError('At least one photo is required');
    }
    
    // Validate the parsed data
    const validatedData = saveJobPhotosRequestSchema.safeParse(parsedData);
    
    if (!validatedData.success) {
      logger.warn('Invalid job photo upload data', { 
        error: validatedData.error.message,
        jobId: parsedData.jobId
      });
      return NextResponse.json(
        { error: 'Invalid request data', details: validatedData.error.format() },
        { status: 400 }
      );
    }
    
    // Save photos using the service
    const result = await service.saveJobPhotos(validatedData.data);
    
    logger.info('Successfully processed job photo upload', { 
      jobId: parsedData.jobId,
      photoCount: result.photos.length
    });
    
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error as Error);
  }
}

/**
 * Health check endpoint
 */
export async function HEAD() {
  try {
    const health = await service.checkHealth();
    return new NextResponse(null, { 
      status: health.status === 'healthy' ? 200 : 503,
      headers: {
        'X-Health-Status': health.status,
        'X-Supabase-Connection': health.supabaseConnection ? 'up' : 'down',
        'X-Storage-Connection': health.storageConnection ? 'up' : 'down'
      }
    });
  } catch (error) {
    logger.error('Health check failed', error as Error);
    return new NextResponse(null, { status: 503 });
  }
}
