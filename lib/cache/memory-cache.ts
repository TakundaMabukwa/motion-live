/**
 * Simple in-memory cache implementation
 * Use for frequently accessed data that doesn't change often
 */
interface CacheItem<T> {
  value: T;
  expiry: number;
}

interface CacheOptions {
  /** Time to live in milliseconds */
  ttl: number;
}

export class Cache {
  private static instance: Cache;
  private cache: Map<string, CacheItem<any>> = new Map();
  private defaultTtl = 5 * 60 * 1000; // 5 minutes default TTL
  
  private constructor() {}
  
  /**
   * Get the singleton cache instance
   */
  public static getInstance(): Cache {
    if (!Cache.instance) {
      Cache.instance = new Cache();
    }
    return Cache.instance;
  }
  
  /**
   * Set a value in the cache
   * @param key Cache key
   * @param value Value to cache
   * @param options Cache options
   */
  public set<T>(key: string, value: T, options?: Partial<CacheOptions>): void {
    const ttl = options?.ttl || this.defaultTtl;
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl
    });
  }
  
  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns The cached value or null if not found or expired
   */
  public get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    // If item doesn't exist or has expired
    if (!item || item.expiry < Date.now()) {
      if (item) {
        // Remove expired item
        this.cache.delete(key);
      }
      return null;
    }
    
    return item.value as T;
  }
  
  /**
   * Get a value from cache or compute it if not available
   * @param key Cache key
   * @param factory Function to compute the value if not in cache
   * @param options Cache options
   * @returns The cached or computed value
   */
  public async getOrSet<T>(
    key: string, 
    factory: () => Promise<T>, 
    options?: Partial<CacheOptions>
  ): Promise<T> {
    const cachedValue = this.get<T>(key);
    
    if (cachedValue !== null) {
      return cachedValue;
    }
    
    const value = await factory();
    this.set(key, value, options);
    
    return value;
  }
  
  /**
   * Delete a value from the cache
   * @param key Cache key
   */
  public delete(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * Delete all keys matching a prefix
   * @param prefix Key prefix
   */
  public deleteByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Clear the entire cache
   */
  public clear(): void {
    this.cache.clear();
  }
}
