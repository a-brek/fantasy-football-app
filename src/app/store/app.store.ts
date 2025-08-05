/**
 * Global Application Store
 * 
 * Manages global application state including current season, selected week,
 * user preferences, navigation state, and cross-cutting concerns.
 * 
 * @version 1.0.0
 * @author Generated with Claude Code
 */

import { Injectable, computed, signal, effect } from '@angular/core';
import { Observable, of } from 'rxjs';
import { BaseStore, StoreConfig } from './base-store';

// =============================================
// TYPES AND INTERFACES
// =============================================

export interface AppState {
  // Season and timing
  currentSeason: number;
  selectedWeek: number;
  availableWeeks: number[];
  isPlayoffs: boolean;
  currentScoringPeriod: number;
  
  // League context
  selectedLeagueId: string | null;
  availableLeagues: LeagueOption[];
  
  // Navigation and UI
  currentView: AppView;
  previousView: AppView | null;
  sidebarExpanded: boolean;
  mobileMenuOpen: boolean;
  
  // User preferences
  theme: 'light' | 'dark' | 'auto';
  autoRefresh: boolean;
  refreshInterval: number;
  notifications: boolean;
  
  // Real-time features
  lastDataSync: number | null;
  pendingChanges: PendingChange[];
  
  // Analytics and tracking
  sessionId: string;
  pageViews: { [route: string]: number };
  userActions: UserAction[];
}

export interface LeagueOption {
  id: string;
  name: string;
  season: number;
  isActive: boolean;
}

export type AppView = 
  | 'dashboard' 
  | 'standings' 
  | 'matchups' 
  | 'roster' 
  | 'players' 
  | 'team-details' 
  | 'league-settings' 
  | 'historical';

export interface PendingChange {
  id: string;
  type: 'roster' | 'trade' | 'waiver' | 'setting';
  description: string;
  timestamp: number;
  data: any;
}

export interface UserAction {
  id: string;
  action: string;
  route: string;
  timestamp: number;
  metadata?: any;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    handler: () => void;
  };
}

// =============================================
// APP STORE IMPLEMENTATION
// =============================================

@Injectable({
  providedIn: 'root'
})
export class AppStore extends BaseStore<AppState> {
  
  // Configuration for app store
  private readonly appConfig: StoreConfig = {
    cacheTtl: 60 * 60 * 1000, // 1 hour
    retryAttempts: 2,
    retryDelay: 500,
    autoRefreshInterval: null,
    persistToLocalStorage: true,
    storageKey: 'fantasy-football-app-state'
  };

  // Additional signals for app-specific state
  private readonly _toasts = signal<Toast[]>([]);
  private readonly _undoStack = signal<any[]>([]);
  private readonly _redoStack = signal<any[]>([]);

  // Public readonly signals for UI state
  public readonly toasts = this._toasts.asReadonly();
  public readonly canUndo = computed(() => this._undoStack().length > 0);
  public readonly canRedo = computed(() => this._redoStack().length > 0);

  // Computed selectors for common UI needs
  public readonly currentSeason = computed(() => this.data()?.currentSeason ?? new Date().getFullYear());
  public readonly selectedWeek = computed(() => this.data()?.selectedWeek ?? 1);
  public readonly selectedLeagueId = computed(() => this.data()?.selectedLeagueId);
  public readonly currentView = computed(() => this.data()?.currentView ?? 'dashboard');
  public readonly theme = computed(() => this.data()?.theme ?? 'auto');
  public readonly autoRefresh = computed(() => this.data()?.autoRefresh ?? false);
  public readonly sidebarExpanded = computed(() => this.data()?.sidebarExpanded ?? true);
  public readonly mobileMenuOpen = computed(() => this.data()?.mobileMenuOpen ?? false);
  public readonly isPlayoffs = computed(() => this.data()?.isPlayoffs ?? false);
  public readonly hasPendingChanges = computed(() => (this.data()?.pendingChanges?.length ?? 0) > 0);

  // Derived state
  public readonly isDarkMode = computed(() => {
    const theme = this.theme();
    if (theme === 'auto') {
      return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return theme === 'dark';
  });

  public readonly availableWeeks = computed(() => {
    const state = this.data();
    if (!state) return [];
    
    const currentWeek = state.selectedWeek;
    const isPlayoffs = state.isPlayoffs;
    const maxWeek = isPlayoffs ? 17 : 14; // Regular season: 1-14, Playoffs: 15-17
    
    return Array.from({ length: maxWeek }, (_, i) => i + 1);
  });

  constructor() {
    super();
    this.config = this.appConfig;
    
    // Initialize default state if none exists
    if (!this.data()) {
      this.initializeDefaultState();
    }

    // Set up theme change effects
    this.setupThemeEffects();
    
    // Set up session tracking
    this.setupSessionTracking();
  }

  protected loadData(): Observable<AppState> {
    // App state is typically managed locally, not loaded from API
    // Return current state or default state
    const currentState = this.data();
    if (currentState) {
      return of(currentState);
    }
    
    return of(this.createDefaultState());
  }

  protected getStoreName(): string {
    return 'AppStore';
  }

  // =============================================
  // PUBLIC STATE MANAGEMENT METHODS
  // =============================================

  /**
   * Update the selected season
   */
  public setSeason(season: number): void {
    this.updateState(state => ({
      ...state,
      currentSeason: season,
      selectedWeek: 1 // Reset to week 1 when changing seasons
    }));
    
    this.trackUserAction('set_season', { season });
  }

  /**
   * Update the selected week
   */
  public setWeek(week: number): void {
    this.updateState(state => ({
      ...state,
      selectedWeek: week
    }));
    
    this.trackUserAction('set_week', { week });
  }

  /**
   * Update the selected league
   */
  public setLeague(leagueId: string): void {
    this.updateState(state => ({
      ...state,
      selectedLeagueId: leagueId
    }));
    
    this.trackUserAction('set_league', { leagueId });
  }

  /**
   * Navigate to a different view
   */
  public navigateToView(view: AppView): void {
    const currentView = this.currentView();
    
    this.updateState(state => ({
      ...state,
      currentView: view,
      previousView: currentView,
      mobileMenuOpen: false // Close mobile menu on navigation
    }));
    
    this.trackPageView(view);
    this.trackUserAction('navigate', { from: currentView, to: view });
  }

  /**
   * Go back to previous view
   */
  public goBack(): void {
    const state = this.data();
    if (state?.previousView) {
      this.navigateToView(state.previousView);
    }
  }

  /**
   * Toggle sidebar expansion
   */
  public toggleSidebar(): void {
    this.updateState(state => ({
      ...state,
      sidebarExpanded: !state.sidebarExpanded
    }));
    
    this.trackUserAction('toggle_sidebar');
  }

  /**
   * Toggle mobile menu
   */
  public toggleMobileMenu(): void {
    this.updateState(state => ({
      ...state,
      mobileMenuOpen: !state.mobileMenuOpen
    }));
    
    this.trackUserAction('toggle_mobile_menu');
  }

  /**
   * Update user preferences
   */
  public updatePreferences(preferences: Partial<Pick<AppState, 'theme' | 'autoRefresh' | 'refreshInterval' | 'notifications'>>): void {
    this.updateState(state => ({
      ...state,
      ...preferences
    }));
    
    this.trackUserAction('update_preferences', preferences);
  }

  /**
   * Add a pending change to track optimistic updates
   */
  public addPendingChange(change: Omit<PendingChange, 'id' | 'timestamp'>): void {
    const newChange: PendingChange = {
      id: this.generateId(),
      timestamp: Date.now(),
      ...change
    };
    
    this.updateState(state => ({
      ...state,
      pendingChanges: [...state.pendingChanges, newChange]
    }));
  }

  /**
   * Remove a pending change (when confirmed or rejected)
   */
  public removePendingChange(changeId: string): void {
    this.updateState(state => ({
      ...state,
      pendingChanges: state.pendingChanges.filter(change => change.id !== changeId)
    }));
  }

  /**
   * Clear all pending changes
   */
  public clearPendingChanges(): void {
    this.updateState(state => ({
      ...state,
      pendingChanges: []
    }));
  }

  // =============================================
  // TOAST MANAGEMENT
  // =============================================

  /**
   * Show a toast notification
   */
  public showToast(toast: Omit<Toast, 'id'>): string {
    const newToast: Toast = {
      id: this.generateId(),
      duration: 5000, // Default 5 seconds
      ...toast
    };
    
    this._toasts.update(toasts => [...toasts, newToast]);
    
    // Auto-remove toast after duration (unless persistent)
    if (!newToast.persistent && newToast.duration) {
      setTimeout(() => {
        this.removeToast(newToast.id);
      }, newToast.duration);
    }
    
    return newToast.id;
  }

  /**
   * Remove a toast notification
   */
  public removeToast(toastId: string): void {
    this._toasts.update(toasts => toasts.filter(toast => toast.id !== toastId));
  }

  /**
   * Clear all toast notifications
   */
  public clearToasts(): void {
    this._toasts.set([]);
  }

  /**
   * Convenience methods for different toast types
   */
  public showSuccess(title: string, message: string): string {
    return this.showToast({ type: 'success', title, message });
  }

  public showError(title: string, message: string): string {
    return this.showToast({ type: 'error', title, message, persistent: true });
  }

  public showWarning(title: string, message: string): string {
    return this.showToast({ type: 'warning', title, message });
  }

  public showInfo(title: string, message: string): string {
    return this.showToast({ type: 'info', title, message });
  }

  // =============================================
  // UNDO/REDO FUNCTIONALITY
  // =============================================

  /**
   * Save current state to undo stack
   */
  public saveStateForUndo(): void {
    const currentState = this.data();
    if (currentState) {
      this._undoStack.update(stack => [...stack.slice(-9), currentState]); // Keep last 10 states
      this._redoStack.set([]); // Clear redo stack when new action is performed
    }
  }

  /**
   * Undo last action
   */
  public undo(): void {
    const undoStack = this._undoStack();
    const currentState = this.data();
    
    if (undoStack.length > 0 && currentState) {
      const previousState = undoStack[undoStack.length - 1];
      
      // Move current state to redo stack
      this._redoStack.update(stack => [...stack, currentState]);
      
      // Remove last state from undo stack
      this._undoStack.update(stack => stack.slice(0, -1));
      
      // Apply previous state
      this._data.set(previousState);
      
      this.trackUserAction('undo');
    }
  }

  /**
   * Redo last undone action
   */
  public redo(): void {
    const redoStack = this._redoStack();
    const currentState = this.data();
    
    if (redoStack.length > 0 && currentState) {
      const nextState = redoStack[redoStack.length - 1];
      
      // Move current state to undo stack
      this._undoStack.update(stack => [...stack, currentState]);
      
      // Remove last state from redo stack
      this._redoStack.update(stack => stack.slice(0, -1));
      
      // Apply next state
      this._data.set(nextState);
      
      this.trackUserAction('redo');
    }
  }

  // =============================================
  // PRIVATE HELPER METHODS
  // =============================================

  private initializeDefaultState(): void {
    const defaultState = this.createDefaultState();
    this._data.set(defaultState);
  }

  private createDefaultState(): AppState {
    return {
      // Season and timing
      currentSeason: new Date().getFullYear(),
      selectedWeek: this.getCurrentWeek(),
      availableWeeks: Array.from({ length: 17 }, (_, i) => i + 1),
      isPlayoffs: false,
      currentScoringPeriod: 1,
      
      // League context
      selectedLeagueId: null,
      availableLeagues: [],
      
      // Navigation and UI
      currentView: 'dashboard',
      previousView: null,
      sidebarExpanded: true,
      mobileMenuOpen: false,
      
      // User preferences
      theme: 'auto',
      autoRefresh: false,
      refreshInterval: 30000, // 30 seconds
      notifications: true,
      
      // Real-time features
      lastDataSync: null,
      pendingChanges: [],
      
      // Analytics and tracking
      sessionId: this.generateSessionId(),
      pageViews: {},
      userActions: []
    };
  }

  private getCurrentWeek(): number {
    // Simple logic to determine current NFL week
    // In a real app, you'd get this from the API
    const now = new Date();
    const seasonStart = new Date(now.getFullYear(), 8, 1); // September 1st
    const diffTime = Math.abs(now.getTime() - seasonStart.getTime());
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    return Math.min(Math.max(diffWeeks, 1), 17);
  }

  private updateState(updater: (state: AppState) => AppState): void {
    const currentState = this.data();
    if (currentState) {
      const updatedState = updater(currentState);
      this._data.set(updatedState);
    }
  }

  private setupThemeEffects(): void {
    // Apply theme changes to document
    effect(() => {
      const isDark = this.isDarkMode();
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', isDark);
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      }
    });
  }

  private setupSessionTracking(): void {
    // Track data sync
    this.updateState(state => ({
      ...state,
      lastDataSync: Date.now()
    }));
  }

  private trackPageView(route: string): void {
    this.updateState(state => ({
      ...state,
      pageViews: {
        ...state.pageViews,
        [route]: (state.pageViews[route] || 0) + 1
      }
    }));
  }

  private trackUserAction(action: string, metadata?: any): void {
    const userAction: UserAction = {
      id: this.generateId(),
      action,
      route: this.currentView(),
      timestamp: Date.now(),
      metadata
    };

    this.updateState(state => ({
      ...state,
      userActions: [...state.userActions.slice(-99), userAction] // Keep last 100 actions
    }));

    // Track analytics
    this.trackAnalytics(action, 'user_action', this.currentView(), 1);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}