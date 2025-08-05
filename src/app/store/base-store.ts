/**
 * Base Store Utilities
 * 
 * Provides common functionality and patterns for all fantasy football stores.
 * Includes loading states, error handling, caching, and persistence utilities.
 * 
 * @version 1.0.0
 * @author Generated with Claude Code
 */

import { Injectable, inject, computed, signal, effect } from '@angular/core';
import { Observable, BehaviorSubject, timer, EMPTY, of } from 'rxjs';
import { catchError, finalize, tap, switchMap, retryWhen, delay, take } from 'rxjs/operators';

// =============================================
// TYPES AND INTERFACES
// =============================================

export interface LoadingState {
  isLoading: boolean;
  isRefreshing: boolean;
  hasLoaded: boolean;
  lastLoadTime: number | null;
  lastRefreshTime: number | null;
}

export interface ErrorState {
  error: string | null;
  lastError: string | null;
  errorCount: number;
  lastErrorTime: number | null;
}

export interface CacheState {
  lastUpdated: number | null;
  isStale: boolean;
  ttl: number; // Time to live in milliseconds
}

export interface StoreState<T> {
  data: T | null;
  loading: LoadingState;
  error: ErrorState;
  cache: CacheState;
}

export interface StoreConfig {
  cacheTtl: number; // Cache time-to-live in milliseconds
  retryAttempts: number;
  retryDelay: number;
  autoRefreshInterval: number | null; // Auto-refresh interval in milliseconds
  persistToLocalStorage: boolean;
  storageKey?: string;
}

export interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
  customDimensions?: { [key: string]: any };
}

// =============================================
// BASE STORE CLASS
// =============================================

@Injectable()
export abstract class BaseStore<T> {
  // Default configuration
  protected readonly defaultConfig: StoreConfig = {
    cacheTtl: 5 * 60 * 1000, // 5 minutes
    retryAttempts: 3,
    retryDelay: 1000,
    autoRefreshInterval: null,
    persistToLocalStorage: false
  };

  // Configuration
  protected config: StoreConfig;

  // Core signals
  protected readonly _data = signal<T | null>(null);
  protected readonly _loading = signal<LoadingState>({
    isLoading: false,
    isRefreshing: false,
    hasLoaded: false,
    lastLoadTime: null,
    lastRefreshTime: null
  });
  protected readonly _error = signal<ErrorState>({
    error: null,
    lastError: null,
    errorCount: 0,
    lastErrorTime: null
  });
  protected readonly _cache = signal<CacheState>({
    lastUpdated: null,
    isStale: false,
    ttl: this.defaultConfig.cacheTtl
  });

  // Public readonly signals
  public readonly data = this._data.asReadonly();
  public readonly loading = this._loading.asReadonly();
  public readonly error = this._error.asReadonly();
  public readonly cache = this._cache.asReadonly();

  // Computed properties
  public readonly isLoading = computed(() => this._loading().isLoading);
  public readonly isRefreshing = computed(() => this._loading().isRefreshing);
  public readonly hasLoaded = computed(() => this._loading().hasLoaded);
  public readonly hasError = computed(() => !!this._error().error);
  public readonly isStale = computed(() => {
    const cache = this._cache();
    if (!cache.lastUpdated) return true;
    return Date.now() - cache.lastUpdated > cache.ttl;
  });
  public readonly needsRefresh = computed(() => this.isStale() && this.hasLoaded());

  // State history for debugging
  private _stateHistory: Array<{ timestamp: number; state: Partial<StoreState<T>> }> = [];
  protected readonly maxHistoryEntries = 50;

  // Auto-refresh timer
  private refreshTimer: any = null;

  constructor(config?: Partial<StoreConfig>) {
    this.config = { ...this.defaultConfig, ...config };
    
    // Initialize cache TTL
    this._cache.update(cache => ({ ...cache, ttl: this.config.cacheTtl }));

    // Set up auto-refresh if configured
    if (this.config.autoRefreshInterval) {
      this.setupAutoRefresh();
    }

    // Set up persistence effect if configured
    if (this.config.persistToLocalStorage && this.config.storageKey) {
      this.setupPersistence();
    }

    // Set up state history tracking
    this.setupStateHistory();
  }

  // =============================================
  // ABSTRACT METHODS
  // =============================================

  protected abstract loadData(): Observable<T>;
  protected abstract getStoreName(): string;

  // =============================================
  // PUBLIC API METHODS
  // =============================================

  /**
   * Load data if not already loaded or if stale
   */
  public load(): Observable<T> {
    if (this.isLoading()) {
      return EMPTY; // Don't start another load if already loading
    }

    return this.performLoad(false);
  }

  /**
   * Force refresh data regardless of cache state
   */
  public refresh(): Observable<T> {
    return this.performLoad(true);
  }

  /**
   * Reset store to initial state
   */
  public reset(): void {
    this.clearError();
    this._data.set(null);
    this._loading.set({
      isLoading: false,
      isRefreshing: false,
      hasLoaded: false,
      lastLoadTime: null,
      lastRefreshTime: null
    });
    this._cache.set({
      lastUpdated: null,
      isStale: false,
      ttl: this.config.cacheTtl
    });

    this.trackAnalytics('reset', 'store');
  }

  /**
   * Clear current error state
   */
  public clearError(): void {
    this._error.update(error => ({
      ...error,
      error: null
    }));
  }

  /**
   * Retry last failed operation
   */
  public retry(): Observable<T> {
    this.clearError();
    return this.refresh();
  }

  /**
   * Update data optimistically (for immediate UI updates)
   */
  public updateOptimistically(updater: (current: T | null) => T | null): void {
    const currentData = this._data();
    const updatedData = updater(currentData);
    this._data.set(updatedData);

    this.trackAnalytics('optimistic_update', 'store');
  }

  /**
   * Get current state snapshot
   */
  public getState(): StoreState<T> {
    return {
      data: this._data(),
      loading: this._loading(),
      error: this._error(),
      cache: this._cache()
    };
  }

  /**
   * Get state history for debugging
   */
  public getStateHistory(): Array<{ timestamp: number; state: Partial<StoreState<T>> }> {
    return [...this._stateHistory];
  }

  // =============================================
  // PROTECTED HELPER METHODS
  // =============================================

  protected performLoad(isRefresh: boolean): Observable<T> {
    const now = Date.now();

    // Update loading state
    this._loading.update(loading => ({
      ...loading,
      isLoading: !isRefresh,
      isRefreshing: isRefresh
    }));

    this.clearError();

    return this.loadData().pipe(
      retryWhen(errors => 
        errors.pipe(
          switchMap((error, index) => {
            if (index >= this.config.retryAttempts) {
              throw error;
            }
            return timer(this.config.retryDelay * (index + 1));
          }),
          take(this.config.retryAttempts)
        )
      ),
      tap(data => {
        // Update data and cache
        this._data.set(data);
        this._cache.update(cache => ({
          ...cache,
          lastUpdated: now,
          isStale: false
        }));

        // Update loading state
        this._loading.update(loading => ({
          ...loading,
          hasLoaded: true,
          [isRefresh ? 'lastRefreshTime' : 'lastLoadTime']: now
        }));

        this.trackAnalytics(isRefresh ? 'refresh' : 'load', 'store', this.getStoreName());
      }),
      catchError(error => {
        this.handleError(error);
        throw error;
      }),
      finalize(() => {
        this._loading.update(loading => ({
          ...loading,
          isLoading: false,
          isRefreshing: false
        }));
      })
    );
  }

  protected handleError(error: any): void {
    const errorMessage = this.extractErrorMessage(error);
    const now = Date.now();

    this._error.update(errorState => ({
      ...errorState,
      error: errorMessage,
      lastError: errorMessage,
      errorCount: errorState.errorCount + 1,
      lastErrorTime: now
    }));

    this.trackAnalytics('error', 'store', errorMessage);
  }

  protected extractErrorMessage(error: any): string {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.error?.message) return error.error.message;
    return 'An unknown error occurred';
  }

  protected setupAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    if (this.config.autoRefreshInterval) {
      this.refreshTimer = setInterval(() => {
        if (this.hasLoaded() && this.isStale() && !this.isLoading()) {
          this.refresh().subscribe({
            error: () => {} // Ignore errors for auto-refresh
          });
        }
      }, this.config.autoRefreshInterval);
    }
  }

  protected setupPersistence(): void {
    if (!this.config.storageKey) return;

    // Load from storage on init
    this.loadFromStorage();

    // Save to storage when data changes
    effect(() => {
      const data = this._data();
      if (data && this.config.storageKey) {
        this.saveToStorage(data);
      }
    });
  }

  protected loadFromStorage(): void {
    if (!this.config.storageKey) return;

    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const parsedData = JSON.parse(stored);
        this._data.set(parsedData);
        
        // Mark as loaded from cache but potentially stale
        this._loading.update(loading => ({ ...loading, hasLoaded: true }));
        this._cache.update(cache => ({ 
          ...cache, 
          lastUpdated: Date.now(),
          isStale: true // Consider cached data as stale initially
        }));
      }
    } catch (error) {
      console.warn(`Failed to load ${this.getStoreName()} from storage:`, error);
    }
  }

  protected saveToStorage(data: T): void {
    if (!this.config.storageKey) return;

    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn(`Failed to save ${this.getStoreName()} to storage:`, error);
    }
  }

  protected setupStateHistory(): void {
    // Track state changes for debugging
    effect(() => {
      const state = this.getState();
      this._stateHistory.push({
        timestamp: Date.now(),
        state
      });

      // Keep only recent entries
      if (this._stateHistory.length > this.maxHistoryEntries) {
        this._stateHistory = this._stateHistory.slice(-this.maxHistoryEntries);
      }
    });
  }

  protected trackAnalytics(action: string, category: string, label?: string, value?: number): void {
    const event: AnalyticsEvent = {
      action,
      category,
      label,
      value,
      customDimensions: {
        storeName: this.getStoreName(),
        timestamp: Date.now()
      }
    };

    // In a real app, you would send this to your analytics service
    // For now, we'll just log it in development mode
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('Analytics Event:', event);
    }
  }

  /**
   * Clean up resources when store is destroyed
   */
  public destroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Create a computed signal that derives data from another signal
 */
export function createSelector<T, R>(
  source: () => T,
  selector: (data: T) => R
) {
  return computed(() => {
    const data = source();
    return data ? selector(data) : null;
  });
}

/**
 * Create a computed signal that filters an array from another signal
 */
export function createArrayFilter<T>(
  source: () => T[] | null,
  predicate: (item: T) => boolean
) {
  return computed(() => {
    const data = source();
    return data ? data.filter(predicate) : [];
  });
}

/**
 * Create a computed signal that sorts an array from another signal
 */
export function createArraySort<T>(
  source: () => T[] | null,
  compareFn: (a: T, b: T) => number
) {
  return computed(() => {
    const data = source();
    return data ? [...data].sort(compareFn) : [];
  });
}

/**
 * Debounce utility for preventing excessive API calls
 */
export function debounce(func: Function, delay: number) {
  let timeoutId: any;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
}

/**
 * Create a derived store that depends on multiple parent stores
 */
export function createDerivedStore<T1, T2, R>(
  store1: { data: () => T1 | null },
  store2: { data: () => T2 | null },
  combiner: (data1: T1 | null, data2: T2 | null) => R | null
) {
  return computed(() => combiner(store1.data(), store2.data()));
}