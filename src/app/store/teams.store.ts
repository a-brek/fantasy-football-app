/**
 * Teams Store
 * 
 * Manages team data including current season teams, historical data, and team details.
 * Handles team-specific operations like filtering by division, sorting by rankings,
 * and caching team performance metrics.
 * 
 * @version 1.0.0
 * @author Generated with Claude Code
 */

import { Injectable, computed, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { BaseStore, StoreConfig, createSelector, createArrayFilter, createArraySort } from './base-store';
import { FantasyFootballService } from '../services/fantasy-football/fantasy-football.service';
import { Team, TeamsResponse } from '../models/espn-fantasy.interfaces';

// =============================================
// TYPES AND INTERFACES
// =============================================

export interface TeamsState {
  teams: Team[];
  selectedTeamId: number | null;
  lastUpdatedWeek: number | null;
}

export interface TeamWithStats extends Team {
  winPercentage: number;
  averagePointsFor: number;
  averagePointsAgainst: number;
  pointsDifferential: number;
  rank: number;
  divisionRank: number;
  isPlayoffBound: boolean;
}

// =============================================
// TEAMS STORE IMPLEMENTATION
// =============================================

@Injectable({
  providedIn: 'root'
})
export class TeamsStore extends BaseStore<TeamsState> {
  
  private readonly fantasyService = inject(FantasyFootballService);
  
  // Configuration for teams store
  private readonly teamsConfig: StoreConfig = {
    cacheTtl: 10 * 60 * 1000, // 10 minutes
    retryAttempts: 3,
    retryDelay: 1000,
    autoRefreshInterval: null, // Manual refresh for teams
    persistToLocalStorage: true,
    storageKey: 'fantasy-football-teams-state'
  };

  // Computed selectors for easy access
  public readonly teams = createSelector(
    this.data,
    (state) => state?.teams ?? []
  );
  
  public readonly selectedTeamId = createSelector(
    this.data,
    (state) => state?.selectedTeamId
  );
  
  public readonly selectedTeam = computed(() => {
    const teams = this.teams();
    const selectedId = this.selectedTeamId();
    if (!teams || !selectedId) return null;
    return teams.find(team => team.id === selectedId) || null;
  });

  // Enhanced team data with calculated stats
  public readonly teamsWithStats = computed(() => {
    const teams = this.teams();
    if (!teams) return [];
    return teams.map(team => ({
      ...team,
      winPercentage: this.calculateWinPercentage(team),
      averagePointsFor: this.calculateAveragePointsFor(team),
      averagePointsAgainst: this.calculateAveragePointsAgainst(team),
      pointsDifferential: team.record.overall.pointsFor - team.record.overall.pointsAgainst,
      rank: team.rankFinal || team.rankCalculatedFinal || 0,
      divisionRank: this.calculateDivisionRank(team, teams),
      isPlayoffBound: this.isTeamPlayoffBound(team)
    }));
  });

  // Filtering utilities
  public readonly playoffTeams = createArrayFilter(
    this.teamsWithStats,
    (team) => team.isPlayoffBound
  );

  public readonly activeTeams = createArrayFilter(
    this.teams,
    (team) => team.isActive
  );

  // Sorting utilities
  public readonly teamsByWinPercentage = createArraySort(
    this.teamsWithStats,
    (a, b) => b.winPercentage - a.winPercentage
  );

  public readonly teamsByPointsFor = createArraySort(
    this.teamsWithStats,
    (a, b) => b.averagePointsFor - a.averagePointsFor
  );

  constructor() {
    super();
    this.config = this.teamsConfig;
  }

  protected loadData(): Observable<TeamsState> {
    return this.fantasyService.getTeamsData().pipe(
      map((response: TeamsResponse) => ({
        teams: response.teams || [],
        selectedTeamId: null,
        lastUpdatedWeek: null
      })),
      tap(state => {
        this.trackAnalytics('teams_loaded', 'data', undefined, state.teams.length);
      })
    );
  }

  protected getStoreName(): string {
    return 'TeamsStore';
  }

  // =============================================
  // PUBLIC METHODS
  // =============================================

  /**
   * Select a specific team
   */
  public selectTeam(teamId: number): void {
    const currentState = this.data();
    if (currentState) {
      this._data.set({
        ...currentState,
        selectedTeamId: teamId
      });
      
      this.trackAnalytics('team_selected', 'interaction', teamId.toString());
    }
  }

  /**
   * Clear team selection
   */
  public clearSelection(): void {
    const currentState = this.data();
    if (currentState) {
      this._data.set({
        ...currentState,
        selectedTeamId: null
      });
    }
  }

  /**
   * Get team by ID
   */
  public getTeamById(teamId: number): Team | null {
    const teams = this.teams();
    if (!teams) return null;
    return teams.find(team => team.id === teamId) || null;
  }

  /**
   * Get teams by owner
   */
  public getTeamsByOwner(ownerId: string): Team[] {
    const teams = this.teams();
    if (!teams) return [];
    return teams.filter(team => team.owners.includes(ownerId));
  }

  /**
   * Get teams in division
   */
  public getTeamsInDivision(divisionId: number): Team[] {
    const teams = this.teams();
    if (!teams) return [];
    return teams.filter(team => team.divisionId === divisionId);
  }

  // =============================================
  // PRIVATE HELPER METHODS
  // =============================================

  private calculateWinPercentage(team: Team): number {
    const record = team.record.overall;
    const totalGames = record.wins + record.losses + record.ties;
    if (totalGames === 0) return 0;
    return (record.wins + (record.ties * 0.5)) / totalGames;
  }

  private calculateAveragePointsFor(team: Team): number {
    const record = team.record.overall;
    const totalGames = record.wins + record.losses + record.ties;
    if (totalGames === 0) return 0;
    return record.pointsFor / totalGames;
  }

  private calculateAveragePointsAgainst(team: Team): number {
    const record = team.record.overall;
    const totalGames = record.wins + record.losses + record.ties;
    if (totalGames === 0) return 0;
    return record.pointsAgainst / totalGames;
  }

  private calculateDivisionRank(team: Team, allTeams: Team[]): number {
    const divisionTeams = allTeams.filter(t => t.divisionId === team.divisionId);
    divisionTeams.sort((a, b) => {
      const aWinPct = this.calculateWinPercentage(a);
      const bWinPct = this.calculateWinPercentage(b);
      if (aWinPct !== bWinPct) return bWinPct - aWinPct;
      return b.record.overall.pointsFor - a.record.overall.pointsFor;
    });
    
    return divisionTeams.findIndex(t => t.id === team.id) + 1;
  }

  private isTeamPlayoffBound(team: Team): boolean {
    return team.playoffSeed > 0 && team.playoffSeed <= 6;
  }
}