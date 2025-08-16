import { LiveVehicleData } from '@/lib/types/api/live-vehicle-data';
import { Logger } from '@/lib/logger';
import { Cache } from '@/lib/cache/memory-cache';

/**
 * Service for handling live vehicle data
 */
export class LiveVehicleDataService {
  private logger: Logger;
  private cache: Cache;
  private readonly LIVE_DATA_API_URL = 'http://64.227.138.235:8000/latest';
  
  constructor() {
    this.logger = new Logger('LiveVehicleDataService');
    this.cache = Cache.getInstance();
  }
  
  /**
   * Get live vehicle data from external API
   * @returns Live vehicle data
   */
  async getLiveVehicleData(): Promise<LiveVehicleData> {
    try {
      this.logger.debug('Getting live vehicle data');
      
      // Use cache for short time to prevent hammering the external API
      const cacheKey = 'live-vehicle-data';
      
      return await this.cache.getOrSet(
        cacheKey,
        async () => {
          this.logger.debug('Cache miss for live vehicle data, fetching from external API');
          
          // Fetch data from external API
          const response = await fetch(this.LIVE_DATA_API_URL, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            throw new Error(`External API error: ${response.status}`);
          }
          
          const data = await response.json();
          
          this.logger.info('Live vehicle data fetched successfully', {
            plate: data.Plate,
            timestamp: data.LocTime
          });
          
          return data as LiveVehicleData;
        },
        { ttl: 10 * 1000 } // Cache for 10 seconds only
      );
    } catch (error) {
      this.logger.error('Error getting live vehicle data', error as Error);
      throw error;
    }
  }
}
