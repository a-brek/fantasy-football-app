import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, forkJoin, throwError } from 'rxjs';
import { map, tap, catchError, shareReplay } from 'rxjs/operators';
import { FantasyFootballService } from '../../services/fantasy-football/fantasy-football.service';
import { CacheService } from './cache.service';
import { ErrorHandlerService } from './error-handler.service';
import {
  League,
  Team,
  ScheduleItem,
  LeagueResponse,
  TeamsResponse,
  RosterResponse,
  MatchupResponse,
  StandingsResponse,
  Player,
  RosterEntry
} from '../../models/espn-fantasy.interfaces';

/**
 * Centralized data management service for Fantasy Football application
 * Provides reactive state management using Angular Signals and observables
 */
@Injectable({
  providedIn: 'root'
})
export class DataService {
  // Loading states using signals
  private readonly _isLoading = signal(false);
  private readonly _isLoadingTeams = signal(false);
  private readonly _isLoadingMatchups = signal(false);
  private readonly _isLoadingStandings = signal(false);
  private readonly _isLoadingRosters = signal(false);

  // Data signals
  private readonly _league = signal<League | null>(null);
  private readonly _teams = signal<Team[]>([]);
  private readonly _matchups = signal<ScheduleItem[]>([]);
  private readonly _rosters = signal<Team[]>([]);
  private readonly _currentWeek = signal<number>(1);
  private readonly _selectedTeam = signal<Team | null>(null);

  // Error signal
  private readonly _error = signal<string | null>(null);

  // Public readonly signals
  readonly isLoading = this._isLoading.asReadonly();
  readonly isLoadingTeams = this._isLoadingTeams.asReadonly();
  readonly isLoadingMatchups = this._isLoadingMatchups.asReadonly();
  readonly isLoadingStandings = this._isLoadingStandings.asReadonly();
  readonly isLoadingRosters = this._isLoadingRosters.asReadonly();
  
  readonly league = this._league.asReadonly();
  readonly teams = this._teams.asReadonly();
  readonly matchups = this._matchups.asReadonly();
  readonly rosters = this._rosters.asReadonly();
  readonly currentWeek = this._currentWeek.asReadonly();
  readonly selectedTeam = this._selectedTeam.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed values
  readonly standings = computed(() => {
    const teams = this._teams();
    return teams
      .slice()
      .sort((a, b) => {
        // Sort by wins (descending), then by points (descending)
        if (a.record.overall.wins !== b.record.overall.wins) {
          return b.record.overall.wins - a.record.overall.wins;
        }
        return b.record.overall.pointsFor - a.record.overall.pointsFor;
      });
  });

  readonly currentWeekMatchups = computed(() => {
    const matchups = this._matchups();
    const currentWeek = this._currentWeek();
    return matchups.filter(matchup => matchup.matchupPeriodId === currentWeek);
  });

  readonly teamStats = computed(() => {
    const teams = this._teams();
    return teams.map(team => ({
      id: team.id,
      name: team.name,
      wins: team.record.overall.wins,
      losses: team.record.overall.losses,
      pointsFor: team.record.overall.pointsFor,
      pointsAgainst: team.record.overall.pointsAgainst,
      winPercentage: team.record.overall.percentage
    }));
  });

  constructor(
    private fantasyService: FantasyFootballService,
    private cacheService: CacheService,
    private errorHandler: ErrorHandlerService
  ) {}

  /**
   * Initialize the data service by loading all essential data
   */
  async initializeData(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await Promise.all([
        this.loadTeams(),
        this.loadMatchups(),
        this.loadStandings(),
        this.loadRosters()
      ]);
    } catch (error) {
      const errorMessage = this.errorHandler.handleError(error);
      this._error.set(errorMessage);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load teams data
   */
  async loadTeams(): Promise<void> {
    this._isLoadingTeams.set(true);
    
    try {
      const cacheKey = 'teams-data';
      let teamsData = this.cacheService.get<TeamsResponse>(cacheKey);
      
      if (!teamsData) {
        teamsData = await this.fantasyService.getTeamsData().toPromise();
        this.cacheService.set(cacheKey, teamsData, 5 * 60 * 1000); // Cache for 5 minutes
      }

      if (teamsData && teamsData.teams) {
        this._teams.set(teamsData.teams);
      }
    } catch (error) {
      this.errorHandler.handleError(error);
    } finally {
      this._isLoadingTeams.set(false);
    }
  }

  /**
   * Load matchups data
   */
  async loadMatchups(): Promise<void> {
    this._isLoadingMatchups.set(true);
    
    try {
      const cacheKey = 'matchups-data';
      let matchupsData = this.cacheService.get<MatchupResponse>(cacheKey);
      
      if (!matchupsData) {
        matchupsData = await this.fantasyService.getMatchups().toPromise();
        this.cacheService.set(cacheKey, matchupsData, 5 * 60 * 1000); // Cache for 5 minutes
      }

      if (matchupsData && matchupsData.schedule) {
        this._matchups.set(matchupsData.schedule);
        
        // Update current week based on latest matchup period
        const latestWeek = Math.max(...matchupsData.schedule.map(m => m.matchupPeriodId));
        this._currentWeek.set(latestWeek);
      }
    } catch (error) {
      this.errorHandler.handleError(error);
    } finally {
      this._isLoadingMatchups.set(false);
    }
  }

  /**
   * Load standings data
   */
  async loadStandings(): Promise<void> {
    this._isLoadingStandings.set(true);
    
    try {
      const cacheKey = 'standings-data';
      let standingsData = this.cacheService.get<StandingsResponse>(cacheKey);
      
      if (!standingsData) {
        standingsData = await this.fantasyService.getStandings().toPromise();
        this.cacheService.set(cacheKey, standingsData, 5 * 60 * 1000); // Cache for 5 minutes
      }

      if (standingsData && standingsData.league) {
        this._league.set(standingsData.league);
        if (standingsData.league.teams) {
          this._teams.set(standingsData.league.teams);
        }
      }
    } catch (error) {
      this.errorHandler.handleError(error);
    } finally {
      this._isLoadingStandings.set(false);
    }
  }

  /**
   * Load rosters data
   */
  async loadRosters(): Promise<void> {
    this._isLoadingRosters.set(true);
    
    try {
      const cacheKey = 'rosters-data';
      let rostersData = this.cacheService.get<RosterResponse>(cacheKey);
      
      if (!rostersData) {
        rostersData = await this.fantasyService.getRosters().toPromise();
        this.cacheService.set(cacheKey, rostersData, 5 * 60 * 1000); // Cache for 5 minutes
      }

      if (rostersData && rostersData.teams) {
        this._rosters.set(rostersData.teams);
      }
    } catch (error) {
      this.errorHandler.handleError(error);
    } finally {
      this._isLoadingRosters.set(false);
    }
  }

  /**
   * Get team by ID
   */
  getTeamById(teamId: number): Team | undefined {
    return this._teams().find(team => team.id === teamId);
  }

  /**
   * Get roster for a specific team
   */
  getTeamRoster(teamId: number): RosterEntry[] {
    const rosterTeam = this._rosters().find(team => team.id === teamId);
    return rosterTeam?.roster?.entries || [];
  }

  /**
   * Get players for a specific team
   */
  getTeamPlayers(teamId: number): Player[] {
    const roster = this.getTeamRoster(teamId);
    return roster.map(entry => entry.playerPoolEntry.player);
  }

  /**
   * Get matchups for a specific team
   */
  getTeamMatchups(teamId: number): ScheduleItem[] {
    return this._matchups().filter(matchup => 
      matchup.home.teamId === teamId || matchup.away.teamId === teamId
    );
  }

  /**
   * Set selected team
   */
  selectTeam(team: Team | null): void {
    this._selectedTeam.set(team);
  }

  /**
   * Set current week
   */
  setCurrentWeek(week: number): void {
    this._currentWeek.set(week);
  }

  /**
   * Refresh all data
   */
  async refreshData(): Promise<void> {
    this.cacheService.clear();
    await this.initializeData();
  }

  /**
   * Clear all data and reset state
   */
  clearData(): void {
    this._league.set(null);
    this._teams.set([]);
    this._matchups.set([]);
    this._rosters.set([]);
    this._selectedTeam.set(null);
    this._error.set(null);
    this.cacheService.clear();
  }

  /**
   * Get league information
   */
  getLeagueInfo(): Observable<League | null> {
    return new BehaviorSubject(this._league()).asObservable();
  }

  /**
   * Get teams as observable
   */
  getTeams(): Observable<Team[]> {
    return new BehaviorSubject(this._teams()).asObservable();
  }

  /**
   * Get matchups as observable
   */
  getMatchups(): Observable<ScheduleItem[]> {
    return new BehaviorSubject(this._matchups()).asObservable();
  }
}