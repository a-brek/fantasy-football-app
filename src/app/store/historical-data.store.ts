/**
 * Historical Data Store
 * 
 * Manages historical fantasy football season data including past seasons,
 * performance trends, records, and comparative analysis across multiple seasons.
 * 
 * @version 1.0.0
 * @author Generated with Claude Code
 */

import { Injectable, computed, inject } from '@angular/core';
import { Observable, forkJoin, of, map, catchError } from 'rxjs';
import { BaseStore, StoreConfig } from './base-store';
import { FantasyFootballService } from '../services/fantasy-football/fantasy-football.service';
import { HistoricalDataService } from '../services/historical-data/historical-data.service';
import { 
  HistoricalSeason, 
  HistoricalTeamStanding, 
  SeasonStatistics,
  SeasonHighlight,
  Team,
  League,
  StreakType
} from '../models/espn-fantasy.interfaces';

// =============================================
// TYPES AND INTERFACES
// =============================================

export interface HistoricalData {
  /** Available seasons */
  availableSeasons: number[];
  
  /** Historical season data by year */
  seasonData: { [seasonId: number]: HistoricalSeason };
  
  /** Cross-season team performance */
  teamHistories: { [teamId: number]: TeamHistory };
  
  /** League evolution over time */
  leagueEvolution: LeagueEvolution;
  
  /** All-time records and achievements */
  allTimeRecords: AllTimeRecords;
  
  /** Last updated timestamp */
  lastUpdated: number;
}

export interface TeamHistory {
  /** Team ID */
  teamId: number;
  
  /** Current team name */
  currentName: string;
  
  /** Historical names */
  historicalNames: { [seasonId: number]: string };
  
  /** Season-by-season performance */
  seasonPerformance: { [seasonId: number]: HistoricalTeamStanding };
  
  /** Career statistics */
  careerStats: {
    totalSeasons: number;
    championshipCount: number;
    playoffAppearances: number;
    regularSeasonWins: number;
    regularSeasonLosses: number;
    totalPointsScored: number;
    averagePointsPerSeason: number;
    bestFinish: number;
    worstFinish: number;
    currentStreak: {
      type: 'playoff' | 'championship' | 'basement';
      length: number;
    };
  };
  
  /** Performance trends */
  trends: {
    winPercentageTrend: TrendData[];
    pointsTrend: TrendData[];
    finishTrend: TrendData[];
  };
}

export interface LeagueEvolution {
  /** League formation year */
  foundedYear: number;
  
  /** Number of seasons played */
  totalSeasons: number;
  
  /** Team count changes over time */
  teamCountHistory: { [seasonId: number]: number };
  
  /** Rule changes over time */
  ruleChanges: RuleChange[];
  
  /** Scoring evolution */
  scoringEvolution: { [seasonId: number]: string };
  
  /** Commissioner history */
  commissionerHistory: { [seasonId: number]: string };
}

export interface AllTimeRecords {
  /** Individual game records */
  singleGameRecords: {
    highestScore: HistoricalRecord;
    lowestScore: HistoricalRecord;
    biggestBlowout: HistoricalRecord;
    closestGame: HistoricalRecord;
  };
  
  /** Season records */
  seasonRecords: {
    mostWins: HistoricalRecord;
    fewestWins: HistoricalRecord;
    mostPoints: HistoricalRecord;
    fewestPoints: HistoricalRecord;
    longestWinStreak: HistoricalRecord;
    longestLoseStreak: HistoricalRecord;
  };
  
  /** Career records */
  careerRecords: {
    mostChampionships: HistoricalRecord;
    mostPlayoffAppearances: HistoricalRecord;
    highestCareerWinPercentage: HistoricalRecord;
    mostCareerPoints: HistoricalRecord;
  };
}

export interface HistoricalRecord {
  /** Record holder team ID */
  teamId: number;
  
  /** Team name when record was set */
  teamName: string;
  
  /** Record value */
  value: number;
  
  /** When the record was set */
  seasonId: number;
  
  /** Week (if applicable) */
  week?: number;
  
  /** Additional context */
  context?: string;
  
  /** Whether record still stands */
  isCurrentRecord: boolean;
}

export interface TrendData {
  /** Season ID */
  seasonId: number;
  
  /** Value for that season */
  value: number;
  
  /** Rank among all teams that season */
  rank: number;
}

export interface RuleChange {
  /** Season when change was implemented */
  seasonId: number;
  
  /** Change category */
  category: 'scoring' | 'roster' | 'playoffs' | 'draft' | 'trades' | 'waivers';
  
  /** Description of change */
  description: string;
  
  /** Impact assessment */
  impact: 'major' | 'minor' | 'cosmetic';
}

// =============================================
// HISTORICAL DATA STORE IMPLEMENTATION
// =============================================

@Injectable({
  providedIn: 'root'
})
export class HistoricalDataStore extends BaseStore<HistoricalData> {
  
  private readonly historicalConfig: StoreConfig = {
    cacheTtl: 60 * 60 * 1000, // 1 hour - historical data changes infrequently
    retryAttempts: 2,
    retryDelay: 1000,
    autoRefreshInterval: null, // No auto-refresh for historical data
    persistToLocalStorage: true,
    storageKey: 'fantasy-football-historical-data'
  };

  private readonly fantasyService = inject(FantasyFootballService);
  private readonly historicalService = inject(HistoricalDataService);

  // Computed selectors for easy access
  public readonly availableSeasons = computed(() => 
    this.data()?.availableSeasons.sort((a, b) => b - a) ?? []
  );
  
  public readonly latestSeason = computed(() => 
    Math.max(...(this.availableSeasons() || [new Date().getFullYear()]))
  );
  
  public readonly oldestSeason = computed(() => 
    Math.min(...(this.availableSeasons() || [new Date().getFullYear()]))
  );
  
  public readonly totalSeasons = computed(() => this.availableSeasons().length);
  
  public readonly allTimeRecords = computed(() => this.data()?.allTimeRecords);
  
  public readonly leagueEvolution = computed(() => this.data()?.leagueEvolution);

  constructor() {
    super();
    this.config = this.historicalConfig;
  }

  protected loadData(): Observable<HistoricalData> {
    console.log('🏈 Loading historical data from ESPN API (2010-present)...');
    
    return this.historicalService.getAllHistoricalSeasons().pipe(
      map(seasons => {
        console.log(`✅ Loaded ${seasons.length} historical seasons`);
        
        const availableSeasons = seasons.map(s => s.seasonId);
        const seasonData = seasons.reduce((acc, season) => {
          acc[season.seasonId] = season;
          return acc;
        }, {} as { [seasonId: number]: HistoricalSeason });
        
        return {
          availableSeasons,
          seasonData,
          teamHistories: this.buildTeamHistories(seasons),
          leagueEvolution: this.buildLeagueEvolution(seasons),
          allTimeRecords: this.buildAllTimeRecords(seasons),
          lastUpdated: Date.now()
        };
      }),
      catchError(error => {
        console.error('❌ Failed to load historical data:', error);
        return of(this.createEmptyHistoricalData());
      })
    );
  }

  protected getStoreName(): string {
    return 'HistoricalDataStore';
  }

  // =============================================
  // PUBLIC API METHODS
  // =============================================

  /**
   * Get historical data for a specific season
   */
  public getSeasonData(seasonId: number): Observable<HistoricalSeason | null> {
    const currentData = this.data();
    if (currentData?.seasonData[seasonId]) {
      return of(currentData.seasonData[seasonId]);
    }
    
    // For now, return null - in real implementation would fetch from ESPN API
    return of(null);
  }

  /**
   * Get team history across all seasons
   */
  public getTeamHistory(teamId: number): TeamHistory | null {
    const data = this.data();
    return data?.teamHistories[teamId] ?? null;
  }

  /**
   * Get comparative team performance across seasons
   */
  public getTeamComparison(teamIds: number[]): Observable<{ [teamId: number]: TeamHistory }> {
    const data = this.data();
    if (!data) return of({});
    
    const comparison: { [teamId: number]: TeamHistory } = {};
    teamIds.forEach(teamId => {
      if (data.teamHistories[teamId]) {
        comparison[teamId] = data.teamHistories[teamId];
      }
    });
    
    return of(comparison);
  }

  /**
   * Search for records matching criteria
   */
  public searchRecords(criteria: {
    category?: 'game' | 'season' | 'career';
    type?: string;
    teamId?: number;
    seasonId?: number;
  }): HistoricalRecord[] {
    const data = this.data();
    if (!data) return [];
    
    const allRecords: HistoricalRecord[] = [
      ...Object.values(data.allTimeRecords.singleGameRecords),
      ...Object.values(data.allTimeRecords.seasonRecords),
      ...Object.values(data.allTimeRecords.careerRecords)
    ];
    
    return allRecords.filter(record => {
      if (criteria.teamId && record.teamId !== criteria.teamId) return false;
      if (criteria.seasonId && record.seasonId !== criteria.seasonId) return false;
      return true;
    });
  }

  /**
   * Get season highlights for a specific season
   */
  public getSeasonHighlights(seasonId: number): SeasonHighlight[] {
    const data = this.data();
    const seasonData = data?.seasonData[seasonId];
    return seasonData?.seasonHighlights ?? [];
  }

  /**
   * Get league trends over time
   */
  public getLeagueTrends(): Observable<{
    scoringTrends: TrendData[];
    competitiveTrends: TrendData[];
    participationTrends: TrendData[];
  }> {
    const data = this.data();
    if (!data) return of({ scoringTrends: [], competitiveTrends: [], participationTrends: [] });
    
    const seasons = this.availableSeasons();
    
    const scoringTrends = seasons.map(seasonId => ({
      seasonId,
      value: this.calculateSeasonAverageScore(seasonId),
      rank: 0 // Would calculate rank relative to other leagues
    }));
    
    const competitiveTrends = seasons.map(seasonId => ({
      seasonId,
      value: this.calculateCompetitiveBalance(seasonId),
      rank: 0
    }));
    
    const participationTrends = seasons.map(seasonId => ({
      seasonId,
      value: data.leagueEvolution.teamCountHistory[seasonId] || 0,
      rank: 0
    }));
    
    return of({ scoringTrends, competitiveTrends, participationTrends });
  }

  /**
   * Refresh all historical data
   */
  public refreshHistoricalData(): Observable<HistoricalData> {
    return this.refresh();
  }

  // =============================================
  // PRIVATE HELPER METHODS
  // =============================================


  private createEmptyHistoricalData(): HistoricalData {
    return {
      availableSeasons: [],
      seasonData: {},
      teamHistories: {},
      leagueEvolution: {
        foundedYear: new Date().getFullYear(),
        totalSeasons: 0,
        teamCountHistory: {},
        ruleChanges: [],
        scoringEvolution: {},
        commissionerHistory: {}
      },
      allTimeRecords: {
        singleGameRecords: {} as any,
        seasonRecords: {} as any,
        careerRecords: {} as any
      },
      lastUpdated: Date.now()
    };
  }



  // =============================================
  // HELPER METHODS
  // =============================================

  private calculateSeasonAverageScore(seasonId: number): number {
    const data = this.data();
    const seasonData = data?.seasonData[seasonId];
    if (!seasonData) return 0;
    
    const standings = seasonData.finalStandings;
    if (standings.length === 0) return 0;
    
    const totalPoints = standings.reduce((sum, team) => sum + team.totalPoints, 0);
    const avgSeasonPoints = totalPoints / standings.length;
    return Math.round(avgSeasonPoints / 14); // Assuming 14 games per season
  }

  private calculateCompetitiveBalance(seasonId: number): number {
    const data = this.data();
    const seasonData = data?.seasonData[seasonId];
    if (!seasonData) return 0;
    
    const standings = seasonData.finalStandings;
    if (standings.length === 0) return 0;
    
    // Calculate competitive balance based on win percentage variance
    const winPercentages = standings.map(team => team.regularSeasonRecord.percentage);
    const avgWinPct = winPercentages.reduce((sum, pct) => sum + pct, 0) / winPercentages.length;
    const variance = winPercentages.reduce((sum, pct) => sum + Math.pow(pct - avgWinPct, 2), 0) / winPercentages.length;
    
    // Return inverse of variance (higher = more competitive)
    return Math.max(0, 1 - variance);
  }

  // =============================================
  // HISTORICAL DATA BUILDING METHODS
  // =============================================

  private buildTeamHistories(seasons: HistoricalSeason[]): { [teamId: number]: TeamHistory } {
    const teamHistories: { [teamId: number]: TeamHistory } = {};
    
    // Collect all unique team IDs across all seasons
    const allTeamIds = new Set<number>();
    seasons.forEach(season => {
      season.finalStandings.forEach(standing => {
        allTeamIds.add(standing.teamId);
      });
    });
    
    // Build history for each team
    allTeamIds.forEach(teamId => {
      const teamSeasons = seasons
        .map(season => season.finalStandings.find(s => s.teamId === teamId))
        .filter(Boolean) as HistoricalTeamStanding[];
      
      if (teamSeasons.length === 0) return;
      
      const latestSeason = teamSeasons[teamSeasons.length - 1];
      const championshipCount = teamSeasons.filter(s => s.finalRank === 1).length;
      const playoffAppearances = teamSeasons.filter(s => s.finalRank <= 6).length;
      const totalWins = teamSeasons.reduce((sum, s) => sum + s.regularSeasonRecord.wins, 0);
      const totalLosses = teamSeasons.reduce((sum, s) => sum + s.regularSeasonRecord.losses, 0);
      const totalPoints = teamSeasons.reduce((sum, s) => sum + s.totalPoints, 0);
      
      teamHistories[teamId] = {
        teamId,
        currentName: latestSeason.teamName,
        historicalNames: teamSeasons.reduce((acc, s, idx) => {
          acc[seasons[idx].seasonId] = s.teamName;
          return acc;
        }, {} as { [seasonId: number]: string }),
        seasonPerformance: teamSeasons.reduce((acc, s, idx) => {
          acc[seasons[idx].seasonId] = s;
          return acc;
        }, {} as { [seasonId: number]: HistoricalTeamStanding }),
        careerStats: {
          totalSeasons: teamSeasons.length,
          championshipCount,
          playoffAppearances,
          regularSeasonWins: totalWins,
          regularSeasonLosses: totalLosses,
          totalPointsScored: totalPoints,
          averagePointsPerSeason: totalPoints / teamSeasons.length,
          bestFinish: Math.min(...teamSeasons.map(s => s.finalRank)),
          worstFinish: Math.max(...teamSeasons.map(s => s.finalRank)),
          currentStreak: this.calculateCurrentStreak(teamSeasons)
        },
        trends: {
          winPercentageTrend: teamSeasons.map((s, idx) => ({
            seasonId: seasons[idx].seasonId,
            value: s.regularSeasonRecord.percentage,
            rank: s.finalRank
          })),
          pointsTrend: teamSeasons.map((s, idx) => ({
            seasonId: seasons[idx].seasonId,
            value: s.totalPoints,
            rank: s.finalRank
          })),
          finishTrend: teamSeasons.map((s, idx) => ({
            seasonId: seasons[idx].seasonId,
            value: s.finalRank,
            rank: s.finalRank
          }))
        }
      };
    });
    
    return teamHistories;
  }

  private buildLeagueEvolution(seasons: HistoricalSeason[]): LeagueEvolution {
    const sortedSeasons = [...seasons].sort((a, b) => a.seasonId - b.seasonId);
    
    return {
      foundedYear: sortedSeasons[0]?.seasonId || 2010,
      totalSeasons: seasons.length,
      teamCountHistory: seasons.reduce((acc, season) => {
        acc[season.seasonId] = season.leagueSettings.teamCount;
        return acc;
      }, {} as { [seasonId: number]: number }),
      ruleChanges: this.extractRuleChanges(seasons),
      scoringEvolution: seasons.reduce((acc, season) => {
        acc[season.seasonId] = season.leagueSettings.scoringFormat;
        return acc;
      }, {} as { [seasonId: number]: string }),
      commissionerHistory: seasons.reduce((acc, season) => {
        acc[season.seasonId] = 'Commissioner'; // Would need actual commissioner data
        return acc;
      }, {} as { [seasonId: number]: string })
    };
  }

  private buildAllTimeRecords(seasons: HistoricalSeason[]): AllTimeRecords {
    let highestScore: HistoricalRecord | null = null;
    let lowestScore: HistoricalRecord | null = null;
    let biggestBlowout: HistoricalRecord | null = null;
    let closestGame: HistoricalRecord | null = null;
    let mostWins: HistoricalRecord | null = null;
    let fewestWins: HistoricalRecord | null = null;
    let mostPoints: HistoricalRecord | null = null;
    let fewestPoints: HistoricalRecord | null = null;
    
    // Analyze each season for records
    seasons.forEach(season => {
      season.finalStandings.forEach(standing => {
        // Single game records
        if (!highestScore || standing.highestScore > highestScore.value) {
          highestScore = {
            teamId: standing.teamId,
            teamName: standing.teamName,
            value: standing.highestScore,
            seasonId: season.seasonId,
            isCurrentRecord: true
          };
        }
        
        if (!lowestScore || standing.lowestScore < lowestScore.value) {
          lowestScore = {
            teamId: standing.teamId,
            teamName: standing.teamName,
            value: standing.lowestScore,
            seasonId: season.seasonId,
            isCurrentRecord: true
          };
        }
        
        // Season records
        const wins = standing.regularSeasonRecord.wins;
        if (!mostWins || wins > mostWins.value) {
          mostWins = {
            teamId: standing.teamId,
            teamName: standing.teamName,
            value: wins,
            seasonId: season.seasonId,
            isCurrentRecord: true
          };
        }
        
        if (!fewestWins || wins < fewestWins.value) {
          fewestWins = {
            teamId: standing.teamId,
            teamName: standing.teamName,
            value: wins,
            seasonId: season.seasonId,
            isCurrentRecord: true
          };
        }
        
        const points = standing.totalPoints;
        if (!mostPoints || points > mostPoints.value) {
          mostPoints = {
            teamId: standing.teamId,
            teamName: standing.teamName,
            value: points,
            seasonId: season.seasonId,
            isCurrentRecord: true
          };
        }
        
        if (!fewestPoints || points < fewestPoints.value) {
          fewestPoints = {
            teamId: standing.teamId,
            teamName: standing.teamName,
            value: points,
            seasonId: season.seasonId,
            isCurrentRecord: true
          };
        }
      });
    });
    
    // Return only actual records found - no fallbacks
    const emptyRecord: HistoricalRecord = {
      teamId: 0,
      teamName: 'No Data',
      value: 0,
      seasonId: 0,
      isCurrentRecord: false
    };
    
    return {
      singleGameRecords: {
        highestScore: highestScore || emptyRecord,
        lowestScore: lowestScore || emptyRecord,
        biggestBlowout: biggestBlowout || emptyRecord,
        closestGame: closestGame || emptyRecord
      },
      seasonRecords: {
        mostWins: mostWins || emptyRecord,
        fewestWins: fewestWins || emptyRecord,
        mostPoints: mostPoints || emptyRecord,
        fewestPoints: fewestPoints || emptyRecord,
        longestWinStreak: emptyRecord,
        longestLoseStreak: emptyRecord
      },
      careerRecords: {
        mostChampionships: emptyRecord,
        mostPlayoffAppearances: emptyRecord,
        highestCareerWinPercentage: emptyRecord,
        mostCareerPoints: emptyRecord
      }
    };
  }

  private calculateCurrentStreak(teamSeasons: HistoricalTeamStanding[]): { type: 'playoff' | 'championship' | 'basement'; length: number } {
    if (teamSeasons.length === 0) {
      return { type: 'playoff', length: 0 };
    }
    
    // Sort by season (most recent first)
    const sortedSeasons = [...teamSeasons].sort((a, b) => b.teamId - a.teamId);
    
    // Check for championship streak
    let championshipStreak = 0;
    for (const season of sortedSeasons) {
      if (season.finalRank === 1) {
        championshipStreak++;
      } else {
        break;
      }
    }
    
    if (championshipStreak > 0) {
      return { type: 'championship', length: championshipStreak };
    }
    
    // Check for playoff streak
    let playoffStreak = 0;
    for (const season of sortedSeasons) {
      if (season.finalRank <= 6) {
        playoffStreak++;
      } else {
        break;
      }
    }
    
    if (playoffStreak > 0) {
      return { type: 'playoff', length: playoffStreak };
    }
    
    // Check for basement streak (bottom 3)
    let basementStreak = 0;
    for (const season of sortedSeasons) {
      if (season.finalRank >= 8) {
        basementStreak++;
      } else {
        break;
      }
    }
    
    return { type: 'basement', length: basementStreak };
  }

  private extractRuleChanges(seasons: HistoricalSeason[]): RuleChange[] {
    const ruleChanges: RuleChange[] = [];
    
    // Detect scoring format changes
    let lastScoringFormat = '';
    seasons.forEach(season => {
      if (season.leagueSettings.scoringFormat !== lastScoringFormat && lastScoringFormat !== '') {
        ruleChanges.push({
          seasonId: season.seasonId,
          category: 'scoring',
          description: `Changed scoring format from ${lastScoringFormat} to ${season.leagueSettings.scoringFormat}`,
          impact: 'major'
        });
      }
      lastScoringFormat = season.leagueSettings.scoringFormat;
    });
    
    // Detect team count changes
    let lastTeamCount = 0;
    seasons.forEach(season => {
      if (season.leagueSettings.teamCount !== lastTeamCount && lastTeamCount !== 0) {
        ruleChanges.push({
          seasonId: season.seasonId,
          category: 'roster',
          description: `Changed team count from ${lastTeamCount} to ${season.leagueSettings.teamCount}`,
          impact: 'major'
        });
      }
      lastTeamCount = season.leagueSettings.teamCount;
    });
    
    return ruleChanges;
  }
}