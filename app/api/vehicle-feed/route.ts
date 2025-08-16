import { NextRequest, NextResponse } from 'next/server';
import { VehicleFeedService } from '@/lib/services/vehicle-feed-service';
import { handleApiError } from '@/lib/errors';
import { Logger } from '@/lib/logger';

// Create service and logger instances
const vehicleFeedService = new VehicleFeedService();
const logger = new Logger('API:vehicle-feed');

export async function GET(_request: NextRequest) {
  try {
    logger.debug('Processing GET request');
    
    // Authenticate the user
    const supabase = await (await import('@/lib/supabase/server')).createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      logger.warn('Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }
    
    // Get vehicle feed data from service
    const data = await vehicleFeedService.getVehicleFeedData();
    
    logger.info('Returning vehicle feed data');
    
    return NextResponse.json(data);
  } catch (error) {
    logger.error('Vehicle feed proxy error:', error as Error);
    const { error: errorMessage, status } = handleApiError(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}