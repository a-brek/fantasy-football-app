/**
 * Matchups Store
 * 
 * Manages matchup and schedule data including current week matchups, historical games,
 * head-to-head records, and playoff scheduling.
 * 
 * @version 1.0.0
 * @author Generated with Claude Code
 */

import { Injectable, computed, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { BaseStore, StoreConfig, createSelector, createArrayFilter, createArraySort } from './base-store';
import { FantasyFootballService } from '../services/fantasy-football/fantasy-football.service';
import { ScheduleItem, MatchupResponse, MatchupWinner, ScheduleTeam } from '../models/espn-fantasy.interfaces';

// =============================================
// TYPES AND INTERFACES
// =============================================

export interface MatchupsState {
  schedule: ScheduleItem[];
  selectedWeek: number;
  selectedMatchupId: number | null;
  viewMode: 'current' | 'all' | 'playoffs';
  lastUpdatedWeek: number | null;
}

export interface EnhancedMatchup extends ScheduleItem {
  weekNumber: number;
  isCompleted: boolean;
  isCurrentWeek: boolean;
  isPlayoffGame: boolean;
  scoreDifference: number;
  isCloseGame: boolean;
  gameType: 'regular' | 'playoff' | 'championship';
  predictedWinner: 'home' | 'away' | 'toss-up';
  homeTeamName?: string;
  awayTeamName?: string;
}

export interface WeeklyMatchups {
  week: number;
  matchups: EnhancedMatchup[];
  isPlayoffWeek: boolean;
  weekType: 'regular' | 'wildcard' | 'semifinals' | 'championship';
}

export interface HeadToHeadRecord {
  team1Id: number;
  team2Id: number;
  team1Wins: number;
  team2Wins: number;
  ties: number;
  totalGames: number;
  averageScoreDifference: number;
  lastMeetingWeek?: number;
  lastMeetingWinner?: MatchupWinner;
}

// =============================================
// MATCHUPS STORE IMPLEMENTATION
// =============================================

@Injectable({
  providedIn: 'root'
})
export class MatchupsStore extends BaseStore<MatchupsState> {
  
  private readonly fantasyService = inject(FantasyFootballService);
  
  // Configuration for matchups store
  private readonly matchupsConfig: StoreConfig = {
    cacheTtl: 2 * 60 * 1000, // 2 minutes (frequent updates for live scores)
    retryAttempts: 3,
    retryDelay: 500,
    autoRefreshInterval: null, // Manual refresh for matchups
    persistToLocalStorage: true,
    storageKey: 'fantasy-football-matchups-state'
  };

  // Computed selectors for easy access
  public readonly schedule = createSelector(
    this.data,
    (state) => state?.schedule ?? []
  );
  
  public readonly selectedWeek = createSelector(
    this.data,
    (state) => state?.selectedWeek ?? this.getCurrentWeek()
  );
  
  public readonly selectedMatchupId = createSelector(
    this.data,
    (state) => state?.selectedMatchupId
  );

  public readonly viewMode = createSelector(
    this.data,
    (state) => state?.viewMode ?? 'current'
  );

  // Enhanced matchups with additional metadata
  public readonly enhancedMatchups = computed(() => {
    const schedule = this.schedule();
    if (!schedule) return [];
    return schedule.map((matchup, index) => {
      // Safely get points with fallbacks
      const homePoints = matchup.home?.totalPoints || 0;
      const awayPoints = matchup.away?.totalPoints || 0;
      const scoreDiff = Math.abs(homePoints - awayPoints);
      
      const enhanced: EnhancedMatchup = {
        ...matchup,
        weekNumber: matchup.matchupPeriodId,
        isCompleted: !!matchup.winner,
        isCurrentWeek: matchup.matchupPeriodId === this.getCurrentWeek(),
        isPlayoffGame: matchup.matchupPeriodId > 14,
        scoreDifference: scoreDiff,
        isCloseGame: scoreDiff < 10,
        gameType: this.getGameType(matchup.matchupPeriodId),
        predictedWinner: this.predictWinner(matchup)
      };
      return enhanced;
    });
  });

  // Current week matchups
  public readonly currentWeekMatchups = computed(() => {
    const currentWeek = this.selectedWeek();
    const enhanced = this.enhancedMatchups();
    return enhanced.filter(matchup => matchup.matchupPeriodId === currentWeek);
  });

  // Matchups grouped by week
  public readonly matchupsByWeek = computed(() => {
    const enhanced = this.enhancedMatchups();
    const weekMap = new Map<number, EnhancedMatchup[]>();
    
    enhanced.forEach(matchup => {
      const week = matchup.matchupPeriodId;
      if (!weekMap.has(week)) {
        weekMap.set(week, []);
      }
      weekMap.get(week)!.push(matchup);
    });

    const weeklyMatchups: WeeklyMatchups[] = [];
    weekMap.forEach((matchups, week) => {
      weeklyMatchups.push({
        week,
        matchups: matchups.sort((a, b) => (a.id || 0) - (b.id || 0)),
        isPlayoffWeek: week > 14,
        weekType: this.getWeekType(week)
      });
    });

    return weeklyMatchups.sort((a, b) => a.week - b.week);
  });

  // Completed matchups
  public readonly completedMatchups = createArrayFilter(
    this.enhancedMatchups,
    (matchup) => matchup.isCompleted
  );

  // Ongoing matchups (current week, not completed)
  public readonly ongoingMatchups = computed(() => {
    const currentWeek = this.getCurrentWeek();
    const enhanced = this.enhancedMatchups();
    return enhanced.filter(matchup => 
      matchup.matchupPeriodId === currentWeek && !matchup.isCompleted
    );
  });

  // Playoff matchups
  public readonly playoffMatchups = createArrayFilter(
    this.enhancedMatchups,
    (matchup) => matchup.isPlayoffGame
  );

  // Close games (within 10 points)
  public readonly closeGames = createArrayFilter(
    this.completedMatchups,
    (matchup) => matchup.isCloseGame
  );

  // Main computed properties expected by components
  public readonly matchups = computed(() => this.schedule());
  public readonly currentWeek = computed(() => this.getCurrentWeek());

  // High scoring games
  public readonly highScoringGames = createArraySort(
    this.completedMatchups,
    (a, b) => ((b.home?.totalPoints || 0) + (b.away?.totalPoints || 0)) - ((a.home?.totalPoints || 0) + (a.away?.totalPoints || 0))
  );

  // Selected matchup
  public readonly selectedMatchup = computed(() => {
    const matchups = this.enhancedMatchups();
    const selectedId = this.selectedMatchupId();
    return selectedId ? matchups.find(m => m.id === selectedId) || null : null;
  });

  constructor() {
    super();
    this.config = this.matchupsConfig;
  }

  protected loadData(): Observable<MatchupsState> {
    return this.fantasyService.getMatchups().pipe(
      map((response: MatchupResponse) => ({
        schedule: response.schedule || [],
        selectedWeek: this.getCurrentWeek(),
        selectedMatchupId: null,
        viewMode: 'current' as const,
        lastUpdatedWeek: this.getCurrentWeek()
      })),
      tap(state => {
        this.trackAnalytics('matchups_loaded', 'data', undefined, state.schedule.length);
      })
    );
  }

  protected getStoreName(): string {
    return 'MatchupsStore';
  }

  // =============================================
  // PUBLIC METHODS
  // =============================================

  /**
   * Select a specific week to view
   */
  public selectWeek(week: number): void {
    const currentState = this.data();
    if (currentState) {
      this._data.set({
        ...currentState,
        selectedWeek: week
      });
      
      this.trackAnalytics('week_selected', 'interaction', week.toString());
    }
  }

  /**
   * Select a specific matchup
   */
  public selectMatchup(matchupId: number): void {
    const currentState = this.data();
    if (currentState) {
      this._data.set({
        ...currentState,
        selectedMatchupId: matchupId
      });
      
      this.trackAnalytics('matchup_selected', 'interaction', matchupId.toString());
    }
  }

  /**
   * Set view mode
   */
  public setViewMode(mode: 'current' | 'all' | 'playoffs'): void {
    const currentState = this.data();
    if (currentState) {
      this._data.set({
        ...currentState,
        viewMode: mode
      });
      
      this.trackAnalytics('view_mode_set', 'filter', mode);
    }
  }

  /**
   * Get matchups for a specific week
   */
  public getMatchupsForWeek(week: number): EnhancedMatchup[] {
    const enhanced = this.enhancedMatchups();
    return enhanced.filter(matchup => matchup.matchupPeriodId === week);
  }

  /**
   * Get head-to-head record between two teams
   */
  public getHeadToHeadRecord(team1Id: number, team2Id: number): HeadToHeadRecord {
    const schedule = this.schedule();
    if (!schedule) return { team1Id, team2Id, team1Wins: 0, team2Wins: 0, ties: 0, totalGames: 0, averageScoreDifference: 0 };
    const matchups = schedule.filter(matchup => 
      (matchup.home.teamId === team1Id && matchup.away.teamId === team2Id) ||
      (matchup.home.teamId === team2Id && matchup.away.teamId === team1Id)
    );

    let team1Wins = 0;
    let team2Wins = 0;
    let ties = 0;
    let totalScoreDifference = 0;
    let lastMeetingWeek: number | undefined;
    let lastMeetingWinner: MatchupWinner | undefined;

    matchups.forEach(matchup => {
      if (matchup.winner) {
        const isTeam1Home = matchup.home.teamId === team1Id;
        
        if (matchup.winner === MatchupWinner.HOME) {
          if (isTeam1Home) team1Wins++;
          else team2Wins++;
        } else if (matchup.winner === MatchupWinner.AWAY) {
          if (isTeam1Home) team2Wins++;
          else team1Wins++;
        } else {
          ties++;
        }

        totalScoreDifference += Math.abs((matchup.home?.totalPoints || 0) - (matchup.away?.totalPoints || 0));
        
        if (!lastMeetingWeek || matchup.matchupPeriodId > lastMeetingWeek) {
          lastMeetingWeek = matchup.matchupPeriodId;
          lastMeetingWinner = matchup.winner;
        }
      }
    });

    return {
      team1Id,
      team2Id,
      team1Wins,
      team2Wins,
      ties,
      totalGames: matchups.length,
      averageScoreDifference: matchups.length > 0 ? totalScoreDifference / matchups.length : 0,
      lastMeetingWeek,
      lastMeetingWinner
    };
  }

  /**
   * Get team's upcoming matchups
   */
  public getUpcomingMatchups(teamId: number, weeks: number = 3): EnhancedMatchup[] {
    const currentWeek = this.getCurrentWeek();
    const enhanced = this.enhancedMatchups();
    
    return enhanced.filter(matchup => 
      (matchup.home.teamId === teamId || matchup.away.teamId === teamId) &&
      matchup.matchupPeriodId >= currentWeek &&
      matchup.matchupPeriodId < currentWeek + weeks
    );
  }

  // =============================================
  // PRIVATE HELPER METHODS
  // =============================================

  private getCurrentWeek(): number {
    // Simple logic to determine current NFL week
    const now = new Date();
    const seasonStart = new Date(now.getFullYear(), 8, 1); // September 1st
    const diffTime = Math.abs(now.getTime() - seasonStart.getTime());
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    return Math.min(Math.max(diffWeeks, 1), 17);
  }

  private getGameType(week: number): 'regular' | 'playoff' | 'championship' {
    if (week <= 14) return 'regular';
    if (week === 17) return 'championship';
    return 'playoff';
  }

  private getWeekType(week: number): 'regular' | 'wildcard' | 'semifinals' | 'championship' {
    if (week <= 14) return 'regular';
    if (week === 15) return 'wildcard';
    if (week === 16) return 'semifinals';
    return 'championship';
  }

  private predictWinner(matchup: ScheduleItem): 'home' | 'away' | 'toss-up' {
    // Simple prediction based on current total points (if available)
    const homePoints = matchup.home?.totalPoints || 0;
    const awayPoints = matchup.away?.totalPoints || 0;
    
    if (homePoints === 0 && awayPoints === 0) {
      return 'toss-up'; // Game hasn't started
    }
    
    const scoreDiff = Math.abs(homePoints - awayPoints);
    if (scoreDiff < 5) return 'toss-up';
    
    return homePoints > awayPoints ? 'home' : 'away';
  }
}