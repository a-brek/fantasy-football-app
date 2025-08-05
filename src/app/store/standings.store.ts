/**
 * Standings Store
 * 
 * Manages league standings data including overall rankings, division standings,
 * playoff scenarios, and team performance metrics.
 * 
 * @version 1.0.0
 * @author Generated with Claude Code
 */

import { Injectable, computed, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, tap, switchMap } from 'rxjs/operators';
import { BaseStore, StoreConfig, createSelector, createArrayFilter, createArraySort } from './base-store';
import { FantasyFootballService } from '../services/fantasy-football/fantasy-football.service';
import { TeamsStore } from './teams.store';
import { League, StandingsResponse, Team, RecordDetail, StreakType } from '../models/espn-fantasy.interfaces';

// =============================================
// TYPES AND INTERFACES
// =============================================

export interface StandingsState {
  league: League | null;
  sortBy: StandingSortOption;
  viewMode: 'overall' | 'division' | 'playoff';
  showProjections: boolean;
  lastUpdatedWeek: number | null;
}

export type StandingSortOption = 
  | 'record' 
  | 'pointsFor' 
  | 'pointsAgainst' 
  | 'pointsDifferential' 
  | 'winPercentage'
  | 'gamesBack';

export interface StandingEntry {
  team: Team;
  rank: number;
  divisionRank: number;
  record: RecordDetail;
  winPercentage: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsDifferential: number;
  averagePointsFor: number;
  averagePointsAgainst: number;
  gamesBack: number;
  playoffPosition: PlayoffPosition;
  clinchingScenario: string | null;
  eliminationScenario: string | null;
  strengthOfSchedule: number;
  remainingGames: number;
}

export interface DivisionStanding {
  divisionId: number;
  divisionName: string;
  teams: StandingEntry[];
  divisionLeader: StandingEntry;
  clinched: boolean;
}

export interface PlayoffPicture {
  playoffTeams: StandingEntry[];
  bubbleTeams: StandingEntry[];
  eliminatedTeams: StandingEntry[];
  wildCardRace: StandingEntry[];
  clinchingScenarios: ClinchingScenario[];
}

export interface ClinchingScenario {
  teamId: number;
  teamName: string;
  scenarioType: 'clinch-division' | 'clinch-playoff' | 'elimination';
  description: string;
  gamesNeeded: number;
}

export type PlayoffPosition = 
  | 'first-round-bye'
  | 'division-winner' 
  | 'wild-card'
  | 'bubble'
  | 'eliminated'
  | 'unknown';

// =============================================
// STANDINGS STORE IMPLEMENTATION
// =============================================

@Injectable({
  providedIn: 'root'
})
export class StandingsStore extends BaseStore<StandingsState> {
  
  private readonly fantasyService = inject(FantasyFootballService);
  private readonly teamsStore = inject(TeamsStore);
  
  // Configuration for standings store
  private readonly standingsConfig: StoreConfig = {
    cacheTtl: 10 * 60 * 1000, // 10 minutes
    retryAttempts: 3,
    retryDelay: 1000,
    autoRefreshInterval: null, // Manual refresh for standings
    persistToLocalStorage: true,
    storageKey: 'fantasy-football-standings-state'
  };

  // Computed selectors for easy access
  public readonly league = createSelector(
    this.data,
    (state) => state?.league
  );
  
  public readonly teams = computed(() => {
    const league = this.league();
    return league?.teams ?? [];
  });

  public readonly sortBy = createSelector(
    this.data,
    (state) => state?.sortBy ?? 'record'
  );

  public readonly viewMode = createSelector(
    this.data,
    (state) => state?.viewMode ?? 'overall'
  );

  public readonly showProjections = createSelector(
    this.data,
    (state) => state?.showProjections ?? false
  );

  // Enhanced standings with calculated metrics
  public readonly standingsEntries = computed(() => {
    const teams = this.teams();
    const entries: StandingEntry[] = teams.map(team => {
      const record = team.record.overall;
      const totalGames = record.wins + record.losses + record.ties;
      const winPct = totalGames > 0 ? (record.wins + record.ties * 0.5) / totalGames : 0;
      
      return {
        team,
        rank: team.rankFinal || team.rankCalculatedFinal || 0,
        divisionRank: this.calculateDivisionRank(team, teams),
        record,
        winPercentage: winPct,
        pointsFor: record.pointsFor,
        pointsAgainst: record.pointsAgainst,
        pointsDifferential: record.pointsFor - record.pointsAgainst,
        averagePointsFor: totalGames > 0 ? record.pointsFor / totalGames : 0,
        averagePointsAgainst: totalGames > 0 ? record.pointsAgainst / totalGames : 0,
        gamesBack: record.gamesBack,
        playoffPosition: this.determinePlayoffPosition(team),
        clinchingScenario: this.getClinchingScenario(team, teams),
        eliminationScenario: this.getEliminationScenario(team, teams),
        strengthOfSchedule: 0, // Would need opponent data to calculate
        remainingGames: this.calculateRemainingGames(totalGames)
      };
    });

    const sortBy = this.sortBy();
    return this.sortStandings(entries, sortBy || 'record');
  });

  // Division standings
  public readonly divisionStandings = computed(() => {
    const entries = this.standingsEntries();
    const divisions = new Map<number, StandingEntry[]>();
    
    entries.forEach(entry => {
      const divId = entry.team.divisionId;
      if (!divisions.has(divId)) {
        divisions.set(divId, []);
      }
      divisions.get(divId)!.push(entry);
    });

    const divisionStandings: DivisionStanding[] = [];
    divisions.forEach((divTeams, divisionId) => {
      const sortedTeams = this.sortStandings(divTeams, 'record');
      const leader = sortedTeams[0];
      
      divisionStandings.push({
        divisionId,
        divisionName: `Division ${divisionId}`,
        teams: sortedTeams,
        divisionLeader: leader,
        clinched: this.isDivisionClinched(leader, sortedTeams)
      });
    });

    return divisionStandings.sort((a, b) => a.divisionId - b.divisionId);
  });

  // Playoff picture
  public readonly playoffPicture = computed(() => {
    const entries = this.standingsEntries();
    const sortedByRecord = this.sortStandings([...entries], 'record');
    
    const playoffTeams = sortedByRecord.filter(entry => 
      entry.playoffPosition === 'first-round-bye' || 
      entry.playoffPosition === 'division-winner' || 
      entry.playoffPosition === 'wild-card'
    );
    
    const bubbleTeams = sortedByRecord.filter(entry => 
      entry.playoffPosition === 'bubble'
    );
    
    const eliminatedTeams = sortedByRecord.filter(entry => 
      entry.playoffPosition === 'eliminated'
    );

    const wildCardRace = sortedByRecord.filter((entry, index) => 
      index >= 4 && index <= 8 // Typically positions 5-8 in wild card race
    );

    const clinchingScenarios = this.generateClinchingScenarios(entries);

    const picture: PlayoffPicture = {
      playoffTeams,
      bubbleTeams,
      eliminatedTeams,
      wildCardRace,
      clinchingScenarios
    };

    return picture;
  });

  // Filtered standings based on view mode
  public readonly filteredStandings = computed(() => {
    const mode = this.viewMode();
    const entries = this.standingsEntries();
    
    switch (mode) {
      case 'division':
        return this.divisionStandings();
      case 'playoff':
        const picture = this.playoffPicture();
        return [...picture.playoffTeams, ...picture.bubbleTeams];
      default:
        return entries;
    }
  });

  // Top performers by category
  public readonly topScorers = createArraySort(
    this.standingsEntries,
    (a, b) => b.pointsFor - a.pointsFor
  );

  public readonly bestDefenses = createArraySort(
    this.standingsEntries,
    (a, b) => a.pointsAgainst - b.pointsAgainst
  );

  public readonly mostConsistent = createArraySort(
    this.standingsEntries,
    (a, b) => b.averagePointsFor - a.averagePointsFor
  );

  // Main computed properties expected by components
  public readonly standings = computed(() => this.teams());

  constructor() {
    super();
    this.config = this.standingsConfig;
  }

  protected loadData(): Observable<StandingsState> {
    // First ensure teams are loaded, then create standings from that data
    return this.teamsStore.load().pipe(
      switchMap(() => {
        const teams = this.teamsStore.teams();
        const league: League = {
          draftDetail: {} as any,
          gameId: 1,
          id: 532886,
          members: [],
          scoringPeriodId: 1,
          seasonId: 2024,
          segmentId: 0,
          status: {
            activatedDate: Date.now(),
            createdAsLeagueType: 0,
            currentLeagueType: 0,
            currentMatchupPeriod: 17,
            finalScoringPeriod: 17,
            firstScoringPeriod: 1,
            isActive: true,
            isExpired: false,
            isFull: true,
            isPlayoffMatchupEdited: false,
            isToBeDeleted: false,
            isViewable: true,
            isWaiverOrderEdited: false,
            latestScoringPeriod: 17,
            previousSeasons: [],
            standingsUpdateDate: Date.now(),
            teamsJoined: 10,
            transactionScoringPeriod: 17,
            waiverLastExecutionDate: Date.now(),
            waiverProcessStatus: {}
          },
          teams: teams || []
        };
        
        return new Observable<StandingsState>(observer => {
          observer.next({
            league,
            sortBy: 'record' as const,
            viewMode: 'overall' as const,
            showProjections: false,
            lastUpdatedWeek: null
          });
          observer.complete();
        });
      }),
      tap(state => {
        const teamCount = state.league?.teams?.length || 0;
        console.log(`📊 Standings loaded with ${teamCount} teams`);
        this.trackAnalytics('standings_loaded', 'data', undefined, teamCount);
      })
    );
  }

  protected getStoreName(): string {
    return 'StandingsStore';
  }

  // =============================================
  // PUBLIC METHODS
  // =============================================

  /**
   * Change sorting criteria
   */
  public setSortBy(sortBy: StandingSortOption): void {
    const currentState = this.data();
    if (currentState) {
      this._data.set({
        ...currentState,
        sortBy
      });
      
      this.trackAnalytics('standings_sort_changed', 'interaction', sortBy);
    }
  }

  /**
   * Change view mode
   */
  public setViewMode(viewMode: 'overall' | 'division' | 'playoff'): void {
    const currentState = this.data();
    if (currentState) {
      this._data.set({
        ...currentState,
        viewMode
      });
      
      this.trackAnalytics('standings_view_changed', 'interaction', viewMode);
    }
  }

  /**
   * Toggle projections display
   */
  public toggleProjections(): void {
    const currentState = this.data();
    if (currentState) {
      this._data.set({
        ...currentState,
        showProjections: !currentState.showProjections
      });
      
      this.trackAnalytics('projections_toggled', 'interaction');
    }
  }

  /**
   * Get team's standing entry
   */
  public getTeamStanding(teamId: number): StandingEntry | null {
    const entries = this.standingsEntries();
    return entries.find(entry => entry.team.id === teamId) || null;
  }

  // =============================================
  // PRIVATE HELPER METHODS
  // =============================================

  private sortStandings(entries: StandingEntry[], sortBy: StandingSortOption): StandingEntry[] {
    return [...entries].sort((a, b) => {
      switch (sortBy) {
        case 'record':
          if (a.winPercentage !== b.winPercentage) {
            return b.winPercentage - a.winPercentage;
          }
          return b.pointsFor - a.pointsFor; // Tiebreaker: points for
        case 'pointsFor':
          return b.pointsFor - a.pointsFor;
        case 'pointsAgainst':
          return a.pointsAgainst - b.pointsAgainst; // Lower is better
        case 'pointsDifferential':
          return b.pointsDifferential - a.pointsDifferential;
        case 'winPercentage':
          return b.winPercentage - a.winPercentage;
        case 'gamesBack':
          return a.gamesBack - b.gamesBack; // Lower is better
        default:
          return 0;
      }
    });
  }

  private calculateDivisionRank(team: Team, allTeams: Team[]): number {
    const divisionTeams = allTeams.filter(t => t.divisionId === team.divisionId);
    divisionTeams.sort((a, b) => {
      const aRecord = a.record.overall;
      const bRecord = b.record.overall;
      const aWinPct = (aRecord.wins + aRecord.ties * 0.5) / (aRecord.wins + aRecord.losses + aRecord.ties);
      const bWinPct = (bRecord.wins + bRecord.ties * 0.5) / (bRecord.wins + bRecord.losses + bRecord.ties);
      
      if (aWinPct !== bWinPct) return bWinPct - aWinPct;
      return bRecord.pointsFor - aRecord.pointsFor;
    });
    
    return divisionTeams.findIndex(t => t.id === team.id) + 1;
  }

  private determinePlayoffPosition(team: Team): PlayoffPosition {
    const seed = team.playoffSeed;
    if (seed === 0) return 'eliminated';
    if (seed === 1 || seed === 2) return 'first-round-bye';
    if (seed <= 4) return 'division-winner';
    if (seed <= 6) return 'wild-card';
    if (seed <= 8) return 'bubble';
    return 'unknown';
  }

  private getClinchingScenario(team: Team, allTeams: Team[]): string | null {
    // Simplified logic - in reality would need more complex playoff math
    const position = this.determinePlayoffPosition(team);
    if (position === 'first-round-bye') {
      return 'Clinched first-round bye';
    }
    if (position === 'division-winner') {
      return 'Clinched division title';
    }
    if (position === 'wild-card') {
      return 'Clinched playoff spot';
    }
    return null;
  }

  private getEliminationScenario(team: Team, allTeams: Team[]): string | null {
    const position = this.determinePlayoffPosition(team);
    if (position === 'eliminated') {
      return 'Eliminated from playoff contention';
    }
    return null;
  }

  private isDivisionClinched(leader: StandingEntry, divisionTeams: StandingEntry[]): boolean {
    // Simple check - would need more sophisticated logic for real scenarios
    if (divisionTeams.length < 2) return true;
    const secondPlace = divisionTeams[1];
    const gamesAhead = leader.record.wins - secondPlace.record.wins;
    const remainingGames = leader.remainingGames;
    return gamesAhead > remainingGames;
  }

  private calculateRemainingGames(totalGamesPlayed: number): number {
    const regularSeasonGames = 14; // Typical fantasy regular season
    return Math.max(0, regularSeasonGames - totalGamesPlayed);
  }

  private generateClinchingScenarios(entries: StandingEntry[]): ClinchingScenario[] {
    const scenarios: ClinchingScenario[] = [];
    
    entries.forEach(entry => {
      const clinching = entry.clinchingScenario;
      const elimination = entry.eliminationScenario;
      
      if (clinching) {
        scenarios.push({
          teamId: entry.team.id,
          teamName: entry.team.name,
          scenarioType: clinching.includes('division') ? 'clinch-division' : 'clinch-playoff',
          description: clinching,
          gamesNeeded: entry.remainingGames
        });
      }
      
      if (elimination) {
        scenarios.push({
          teamId: entry.team.id,
          teamName: entry.team.name,
          scenarioType: 'elimination',
          description: elimination,
          gamesNeeded: 0
        });
      }
    });
    
    return scenarios;
  }
}