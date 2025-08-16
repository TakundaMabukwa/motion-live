import { Logger } from '@/lib/logger';
import { Cache } from '@/lib/cache/memory-cache';

/**
 * Service for handling vehicle feed data
 */
export class VehicleFeedService {
  private logger: Logger;
  private cache: Cache;
  private readonly VEHICLE_FEED_API_URL = 'http://64.227.138.235:8000/latest';
  
  constructor() {
    this.logger = new Logger('VehicleFeedService');
    this.cache = Cache.getInstance();
  }
  
  /**
   * Get vehicle feed data from external API
   * @returns Vehicle feed data
   */
  async getVehicleFeedData(): Promise<any> {
    try {
      this.logger.debug('Getting vehicle feed data');
      
      // Use cache for short time to prevent hammering the external API
      const cacheKey = 'vehicle-feed-data';
      
      return await this.cache.getOrSet(
        cacheKey,
        async () => {
          this.logger.debug('Cache miss for vehicle feed data, fetching from external API');
          
          // Fetch data from external API
          const response = await fetch(this.VEHICLE_FEED_API_URL, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            throw new Error(`External API error: ${response.status}`);
          }
          
          const data = await response.json();
          
          this.logger.info('Vehicle feed data fetched successfully');
          
          return data;
        },
        { ttl: 10 * 1000 } // Cache for 10 seconds only
      );
    } catch (error) {
      this.logger.error('Error getting vehicle feed data', error as Error);
      throw error;
    }
  }
}
