import { NextRequest, NextResponse } from 'next/server';
import { LiveVehicleDataService } from '@/lib/services/live-vehicle-data-service';
import { handleApiError } from '@/lib/errors';
import { Logger } from '@/lib/logger';

// Create service and logger instances
const liveVehicleDataService = new LiveVehicleDataService();
const logger = new Logger('API:live-vehicle-data');

export async function GET(_request: NextRequest) {
  try {
    logger.debug('Processing GET request');
    
    // Get live vehicle data from service
    const liveData = await liveVehicleDataService.getLiveVehicleData();
    
    logger.info('Returning live vehicle data', { 
      plate: liveData.Plate,
      timestamp: liveData.LocTime
    });
    
    return NextResponse.json({
      success: true,
      liveData
    });
  } catch (error) {
    logger.error('Error in live vehicle data GET:', error as Error);
    const { error: errorMessage, status } = handleApiError(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
