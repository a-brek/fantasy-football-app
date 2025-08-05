/**
 * Players Store
 * 
 * Manages player and roster data including player statistics, availability,
 * roster positions, and player performance metrics across the league.
 * 
 * @version 1.0.0
 * @author Generated with Claude Code
 */

import { Injectable, computed, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { BaseStore, StoreConfig, createSelector, createArrayFilter, createArraySort } from './base-store';
import { FantasyFootballService } from '../services/fantasy-football/fantasy-football.service';
import { Team, RosterResponse, Player, RosterEntry, PlayerPosition, InjuryStatus } from '../models/espn-fantasy.interfaces';

// =============================================
// TYPES AND INTERFACES
// =============================================

export interface PlayersState {
  rosters: Team[];
  selectedPlayerId: number | null;
  selectedTeamId: number | null;
  positionFilter: PlayerPosition | null;
  availabilityFilter: 'all' | 'available' | 'rostered' | 'injured';
  lastUpdatedWeek: number | null;
}

export interface PlayerWithMetrics {
  player: Player;
  rosterEntry: RosterEntry;
  teamId: number;
  teamName: string;
  isStarter: boolean;
  projectedPoints: number;
  seasonPoints: number;
  averagePoints: number;
  positionRank: number;
  tier: 'elite' | 'good' | 'average' | 'poor';
}

export interface PositionGroup {
  position: PlayerPosition;
  positionName: string;
  players: PlayerWithMetrics[];
  averagePoints: number;
  topPerformer: PlayerWithMetrics | null;
}

// =============================================
// PLAYERS STORE IMPLEMENTATION
// =============================================

@Injectable({
  providedIn: 'root'
})
export class PlayersStore extends BaseStore<PlayersState> {
  
  private readonly fantasyService = inject(FantasyFootballService);
  
  // Configuration for players store
  private readonly playersConfig: StoreConfig = {
    cacheTtl: 5 * 60 * 1000, // 5 minutes (more frequent updates for active players)
    retryAttempts: 3,
    retryDelay: 1000,
    autoRefreshInterval: null, // Manual refresh for roster data
    persistToLocalStorage: true,
    storageKey: 'fantasy-football-players-state'
  };

  // Computed selectors for easy access
  public readonly rosters = createSelector(
    this.data,
    (state) => state?.rosters ?? []
  );
  
  public readonly selectedPlayerId = createSelector(
    this.data,
    (state) => state?.selectedPlayerId
  );
  
  public readonly selectedTeamId = createSelector(
    this.data,
    (state) => state?.selectedTeamId
  );

  public readonly positionFilter = createSelector(
    this.data,
    (state) => state?.positionFilter
  );

  public readonly availabilityFilter = createSelector(
    this.data,
    (state) => state?.availabilityFilter ?? 'all'
  );

  // All players with enhanced metrics
  public readonly allPlayersWithMetrics = computed(() => {
    const rosters = this.rosters();
    if (!rosters) return [];
    const players: PlayerWithMetrics[] = [];
    
    rosters.forEach(team => {
      if (team.roster?.entries) {
        team.roster.entries.forEach(entry => {
          const playerMetrics: PlayerWithMetrics = {
            player: entry.playerPoolEntry.player,
            rosterEntry: entry,
            teamId: team.id,
            teamName: team.name,
            isStarter: this.isStartingPosition(entry.lineupSlotId),
            projectedPoints: this.calculateProjectedPoints(entry),
            seasonPoints: this.calculateSeasonPoints(entry),
            averagePoints: this.calculateAveragePoints(entry),
            positionRank: 0, // Will be calculated after sorting
            tier: this.calculatePlayerTier(entry)
          };
          players.push(playerMetrics);
        });
      }
    });

    // Calculate position ranks
    const positionGroups = new Map<number, PlayerWithMetrics[]>();
    players.forEach(player => {
      const pos = player.player.defaultPositionId;
      if (!positionGroups.has(pos)) {
        positionGroups.set(pos, []);
      }
      positionGroups.get(pos)!.push(player);
    });

    positionGroups.forEach(groupPlayers => {
      groupPlayers.sort((a, b) => b.seasonPoints - a.seasonPoints);
      groupPlayers.forEach((player, index) => {
        player.positionRank = index + 1;
      });
    });

    return players;
  });

  // Selected player
  public readonly selectedPlayer = computed(() => {
    const players = this.allPlayersWithMetrics();
    const selectedId = this.selectedPlayerId();
    return selectedId ? players.find(p => p.player.id === selectedId) || null : null;
  });

  // Filtered players based on current filters
  public readonly filteredPlayers = computed(() => {
    let players = this.allPlayersWithMetrics();
    const posFilter = this.positionFilter();
    const availFilter = this.availabilityFilter();

    // Apply position filter
    if (posFilter !== null) {
      players = players.filter(p => p.player.defaultPositionId === posFilter);
    }

    // Apply availability filter
    switch (availFilter) {
      case 'available':
        players = players.filter(p => p.rosterEntry.status === 'AVAILABLE');
        break;
      case 'rostered':
        players = players.filter(p => p.rosterEntry.status !== 'AVAILABLE');
        break;
      case 'injured':
        players = players.filter(p => p.player.injured || p.player.injuryStatus !== InjuryStatus.ACTIVE);
        break;
    }

    return players;
  });

  // Players grouped by position
  public readonly playersByPosition = computed(() => {
    const players = this.filteredPlayers();
    const positionMap = new Map<PlayerPosition, PlayerWithMetrics[]>();
    
    players.forEach(player => {
      const pos = player.player.defaultPositionId as PlayerPosition;
      if (!positionMap.has(pos)) {
        positionMap.set(pos, []);
      }
      positionMap.get(pos)!.push(player);
    });

    const positionGroups: PositionGroup[] = [];
    positionMap.forEach((groupPlayers, position) => {
      const sortedPlayers = groupPlayers.sort((a, b) => b.seasonPoints - a.seasonPoints);
      const avgPoints = groupPlayers.reduce((sum, p) => sum + p.averagePoints, 0) / groupPlayers.length;
      
      positionGroups.push({
        position,
        positionName: this.getPositionName(position),
        players: sortedPlayers,
        averagePoints: avgPoints,
        topPerformer: sortedPlayers[0] || null
      });
    });

    return positionGroups.sort((a, b) => this.getPositionSortOrder(a.position) - this.getPositionSortOrder(b.position));
  });

  // Starting lineups for all teams
  public readonly startingLineups = computed(() => {
    const rosters = this.rosters();
    if (!rosters) return [];
    return rosters.map(team => ({
      team,
      starters: team.roster?.entries?.filter(entry => this.isStartingPosition(entry.lineupSlotId)) || []
    }));
  });

  // Injured players
  public readonly injuredPlayers = createArrayFilter(
    this.allPlayersWithMetrics,
    (player) => player.player.injured || player.player.injuryStatus !== InjuryStatus.ACTIVE
  );

  // Top performers
  public readonly topPerformers = createArraySort(
    this.allPlayersWithMetrics,
    (a, b) => b.seasonPoints - a.seasonPoints
  );

  constructor() {
    super();
    this.config = this.playersConfig;
  }

  protected loadData(): Observable<PlayersState> {
    return this.fantasyService.getRosters().pipe(
      map((response: RosterResponse) => ({
        rosters: response.teams || [],
        selectedPlayerId: null,
        selectedTeamId: null,
        positionFilter: null,
        availabilityFilter: 'all' as const,
        lastUpdatedWeek: null
      })),
      tap(state => {
        const totalPlayers = state.rosters.reduce((sum, team) => sum + (team.roster?.entries?.length || 0), 0);
        this.trackAnalytics('players_loaded', 'data', undefined, totalPlayers);
      })
    );
  }

  protected getStoreName(): string {
    return 'PlayersStore';
  }

  // =============================================
  // PUBLIC METHODS
  // =============================================

  /**
   * Select a specific player
   */
  public selectPlayer(playerId: number): void {
    const currentState = this.data();
    if (currentState) {
      this._data.set({
        ...currentState,
        selectedPlayerId: playerId
      });
      
      this.trackAnalytics('player_selected', 'interaction', playerId.toString());
    }
  }

  /**
   * Select a team to view their roster
   */
  public selectTeam(teamId: number): void {
    const currentState = this.data();
    if (currentState) {
      this._data.set({
        ...currentState,
        selectedTeamId: teamId
      });
      
      this.trackAnalytics('team_roster_selected', 'interaction', teamId.toString());
    }
  }

  /**
   * Set position filter
   */
  public setPositionFilter(position: PlayerPosition | null): void {
    const currentState = this.data();
    if (currentState) {
      this._data.set({
        ...currentState,
        positionFilter: position
      });
      
      this.trackAnalytics('position_filter_set', 'filter', position?.toString());
    }
  }

  /**
   * Set availability filter
   */
  public setAvailabilityFilter(filter: 'all' | 'available' | 'rostered' | 'injured'): void {
    const currentState = this.data();
    if (currentState) {
      this._data.set({
        ...currentState,
        availabilityFilter: filter
      });
      
      this.trackAnalytics('availability_filter_set', 'filter', filter);
    }
  }

  /**
   * Clear all filters
   */
  public clearFilters(): void {
    const currentState = this.data();
    if (currentState) {
      this._data.set({
        ...currentState,
        positionFilter: null,
        availabilityFilter: 'all'
      });
    }
  }

  /**
   * Get team roster by team ID
   */
  public getTeamRoster(teamId: number): RosterEntry[] {
    const rosters = this.rosters();
    if (!rosters) return [];
    const team = rosters.find(t => t.id === teamId);
    return team?.roster?.entries || [];
  }

  /**
   * Get players by position
   */
  public getPlayersByPosition(position: PlayerPosition): PlayerWithMetrics[] {
    const players = this.allPlayersWithMetrics();
    return players.filter(p => p.player.defaultPositionId === position);
  }

  // =============================================
  // PRIVATE HELPER METHODS
  // =============================================

  private isStartingPosition(lineupSlotId: number): boolean {
    // Starting positions are typically 0-15, bench is usually 20+
    return lineupSlotId < 20;
  }

  private calculateProjectedPoints(entry: RosterEntry): number {
    // Would need projected stats from API
    // For now, return a placeholder based on recent performance
    return this.calculateSeasonPoints(entry) * 1.1; // 10% optimistic projection
  }

  private calculateSeasonPoints(entry: RosterEntry): number {
    // Sum up all applied stats for the season
    return entry.playerPoolEntry.appliedStatTotal || 0;
  }

  private calculateAveragePoints(entry: RosterEntry): number {
    const seasonPoints = this.calculateSeasonPoints(entry);
    // Assume current week for average calculation
    const gamesPlayed = Math.max(1, 8); // Placeholder for current week
    return seasonPoints / gamesPlayed;
  }

  private calculatePlayerTier(entry: RosterEntry): 'elite' | 'good' | 'average' | 'poor' {
    const points = this.calculateSeasonPoints(entry);
    const position = entry.playerPoolEntry.player.defaultPositionId;
    
    // Simple tier calculation based on points (would be better with position-specific thresholds)
    if (points > 150) return 'elite';
    if (points > 100) return 'good';
    if (points > 50) return 'average';
    return 'poor';
  }

  private getPositionName(position: PlayerPosition): string {
    const positionNames: { [key in PlayerPosition]: string } = {
      [PlayerPosition.QB]: 'Quarterback',
      [PlayerPosition.RB]: 'Running Back',
      [PlayerPosition.WR]: 'Wide Receiver',
      [PlayerPosition.TE]: 'Tight End',
      [PlayerPosition.K]: 'Kicker',
      [PlayerPosition.DST]: 'Defense/ST',
      [PlayerPosition.FLEX]: 'Flex',
      [PlayerPosition.BENCH]: 'Bench',
      [PlayerPosition.IR]: 'Injured Reserve'
    };
    return positionNames[position] || 'Unknown';
  }

  private getPositionSortOrder(position: PlayerPosition): number {
    const sortOrder: { [key in PlayerPosition]: number } = {
      [PlayerPosition.QB]: 1,
      [PlayerPosition.RB]: 2,
      [PlayerPosition.WR]: 3,
      [PlayerPosition.TE]: 4,
      [PlayerPosition.FLEX]: 5,
      [PlayerPosition.K]: 6,
      [PlayerPosition.DST]: 7,
      [PlayerPosition.BENCH]: 8,
      [PlayerPosition.IR]: 9
    };
    return sortOrder[position] || 99;
  }
}