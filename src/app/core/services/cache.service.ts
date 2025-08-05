import { Injectable } from '@angular/core';

/**
 * Cache entry interface for storing cached data with expiration
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

/**
 * Cache service for storing and retrieving API responses
 * Provides memory-based caching with configurable expiration times
 */
@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_CACHE_TIME = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Clean up expired entries every 30 seconds
    setInterval(() => this.cleanupExpiredEntries(), 30 * 1000);
  }

  /**
   * Store data in cache with optional expiration time
   * @param key - Cache key
   * @param data - Data to cache
   * @param expiresIn - Expiration time in milliseconds (default: 5 minutes)
   */
  set<T>(key: string, data: T, expiresIn: number = this.DEFAULT_CACHE_TIME): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresIn
    };
    
    this.cache.set(key, entry);
  }

  /**
   * Retrieve data from cache
   * @param key - Cache key
   * @returns Cached data or null if not found or expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Check if an entry exists in cache (regardless of expiration)
   * @param key - Cache key
   * @returns True if key exists
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Check if an entry exists and is not expired
   * @param key - Cache key
   * @returns True if key exists and is valid
   */
  hasValid(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? !this.isExpired(entry) : false;
  }

  /**
   * Remove a specific entry from cache
   * @param key - Cache key to remove
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get all cache keys
   * @returns Array of all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size (number of entries)
   * @returns Number of cached entries
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   * @returns Object containing cache statistics
   */
  getStats(): {
    totalEntries: number;
    validEntries: number;
    expiredEntries: number;
    memoryUsage: string;
  } {
    const totalEntries = this.cache.size;
    let validEntries = 0;
    let expiredEntries = 0;

    this.cache.forEach(entry => {
      if (this.isExpired(entry)) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    });

    return {
      totalEntries,
      validEntries,
      expiredEntries,
      memoryUsage: this.getMemoryUsage()
    };
  }

  /**
   * Get or set cached data with a factory function
   * @param key - Cache key
   * @param factory - Function to generate data if not cached
   * @param expiresIn - Expiration time in milliseconds
   * @returns Cached data or newly generated data
   */
  getOrSet<T>(
    key: string, 
    factory: () => T | Promise<T>, 
    expiresIn: number = this.DEFAULT_CACHE_TIME
  ): T | Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    const result = factory();
    
    if (result instanceof Promise) {
      return result.then(data => {
        this.set(key, data, expiresIn);
        return data;
      });
    } else {
      this.set(key, result, expiresIn);
      return result;
    }
  }

  /**
   * Set multiple cache entries at once
   * @param entries - Object with key-value pairs to cache
   * @param expiresIn - Expiration time in milliseconds
   */
  setMultiple<T>(
    entries: Record<string, T>, 
    expiresIn: number = this.DEFAULT_CACHE_TIME
  ): void {
    Object.entries(entries).forEach(([key, value]) => {
      this.set(key, value, expiresIn);
    });
  }

  /**
   * Get multiple cache entries at once
   * @param keys - Array of cache keys
   * @returns Object with key-value pairs (null for missing/expired entries)
   */
  getMultiple<T>(keys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {};
    
    keys.forEach(key => {
      result[key] = this.get<T>(key);
    });

    return result;
  }

  /**
   * Update expiration time for an existing cache entry
   * @param key - Cache key
   * @param expiresIn - New expiration time in milliseconds
   * @returns True if entry was updated, false if not found
   */
  updateExpiration(key: string, expiresIn: number): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    entry.expiresIn = expiresIn;
    entry.timestamp = Date.now();
    this.cache.set(key, entry);
    
    return true;
  }

  /**
   * Get remaining time to live for a cache entry
   * @param key - Cache key
   * @returns Remaining TTL in milliseconds, or -1 if not found/expired
   */
  getTTL(key: string): number {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return -1;
    }

    const remaining = (entry.timestamp + entry.expiresIn) - Date.now();
    return remaining > 0 ? remaining : -1;
  }

  /**
   * Check if a cache entry is expired
   * @param entry - Cache entry to check
   * @returns True if expired
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() > (entry.timestamp + entry.expiresIn);
  }

  /**
   * Clean up all expired entries
   */
  private cleanupExpiredEntries(): void {
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (this.isExpired(entry)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Get estimated memory usage (simple calculation)
   * @returns Memory usage as a formatted string
   */
  private getMemoryUsage(): string {
    const sampleSize = Math.min(10, this.cache.size);
    let totalSize = 0;
    let count = 0;

    for (const [key, entry] of this.cache) {
      if (count >= sampleSize) break;
      
      try {
        const size = JSON.stringify({ key, entry }).length * 2; // Rough estimate
        totalSize += size;
        count++;
      } catch {
        // Ignore circular references or other serialization issues
      }
    }

    if (count === 0) return '0 B';

    const averageSize = totalSize / count;
    const estimatedTotal = averageSize * this.cache.size;

    const units = ['B', 'KB', 'MB', 'GB'];
    let size = estimatedTotal;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}