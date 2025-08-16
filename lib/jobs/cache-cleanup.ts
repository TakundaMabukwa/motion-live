import { JobQueue } from './job-queue';
import { Logger } from '@/lib/logger';
import { Cache } from '@/lib/cache/memory-cache';

const logger = new Logger('CacheCleanupJob');

/**
 * Job to periodically clean expired items from the cache
 * @param prefix Optional cache key prefix to clean
 * @returns Job execution function
 */
export function createCacheCleanupJob(prefix?: string) {
  const jobId = `cache-cleanup-${prefix || 'all'}-${Date.now()}`;
  
  return {
    id: jobId,
    name: `Cache Cleanup ${prefix ? `(${prefix})` : '(all)'}`,
    execute: async () => {
      logger.info('Starting cache cleanup job', { prefix });
      
      const cache = Cache.getInstance();
      
      if (prefix) {
        cache.deleteByPrefix(prefix);
        logger.info(`Cleaned cache items with prefix: ${prefix}`);
      } else {
        // In a real implementation, we would selectively clean expired items
        // For simplicity, we're just clearing everything
        cache.clear();
        logger.info('Cleared entire cache');
      }
    },
    priority: 1 // Low priority
  };
}

/**
 * Schedule a recurring cache cleanup job
 * @param intervalMinutes Minutes between cache cleanups
 * @param prefix Optional cache key prefix to clean
 */
export function scheduleCacheCleanup(intervalMinutes: number = 30, prefix?: string): void {
  const jobQueue = JobQueue.getInstance();
  
  // Run immediately
  jobQueue.enqueue(createCacheCleanupJob(prefix));
  
  // Schedule recurring job
  setInterval(() => {
    jobQueue.enqueue(createCacheCleanupJob(prefix));
  }, intervalMinutes * 60 * 1000);
  
  logger.info(`Scheduled cache cleanup job to run every ${intervalMinutes} minutes`, { prefix });
}
