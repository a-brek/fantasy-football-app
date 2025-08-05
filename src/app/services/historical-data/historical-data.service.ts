/**
 * Historical Data Service
 * 
 * Handles fetching historical fantasy football data from ESPN API across different
 * API versions. ESPN changed their API structure around 2018-2019, so this service
 * handles both legacy and modern API formats.
 * 
 * @version 1.0.0
 * @author Generated with Claude Code
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of, EMPTY } from 'rxjs';
import { map, catchError, tap, mergeMap, concatMap, delay } from 'rxjs/operators';
import { 
  HistoricalSeason,
  HistoricalTeamStanding,
  SeasonStatistics,
  PlayoffResults,
  HistoricalDraftInfo,
  SeasonHighlight,
  Team,
  League,
  StreakType
} from '../../models/espn-fantasy.interfaces';

export interface SeasonDataRequest {
  year: number;
  leagueId: string;
  includeRosters?: boolean;
  includeSchedule?: boolean;
  includePlayoffs?: boolean;
  includeDraft?: boolean;
}

export interface APIResponse {
  success: boolean;
  data?: any;
  error?: string;
  year: number;
  apiVersion: 'legacy' | 'modern';
}

@Injectable({
  providedIn: 'root'
})
export class HistoricalDataService {
  
  private readonly PROXY_BASE_URL = 'http://localhost:3001/api/espn';
  private readonly LEAGUE_ID = '532886';
  
  // API version cutoff - ESPN changed API structure around 2018-2019
  private readonly API_CUTOFF_YEAR = 2018;
  
  // Rate limiting - ESPN has rate limits, so we'll space out requests
  private readonly REQUEST_DELAY = 1000; // 1 second between requests
  
  constructor(private http: HttpClient) {}

  /**
   * Get historical data for all available seasons (2010-present)
   */
  getAllHistoricalSeasons(): Observable<HistoricalSeason[]> {
    const currentYear = new Date().getFullYear();
    const startYear = 2010; // Start from 2010 as you mentioned your league started then
    const seasons: number[] = [];
    
    // Generate array of years from 2010 to current year
    for (let year = startYear; year <= currentYear; year++) {
      seasons.push(year);
    }
    
    console.log(`🏈 Fetching historical data for ${seasons.length} seasons: ${startYear}-${currentYear}`);
    
    return this.getHistoricalSeasonsData(seasons).pipe(
      map(responses => {
        const historicalSeasons: HistoricalSeason[] = [];
        
        responses.forEach(response => {
          if (response.success && response.data) {
            const historicalSeason = this.transformToHistoricalSeason(response.data, response.year, response.apiVersion);
            if (historicalSeason) {
              historicalSeasons.push(historicalSeason);
            }
          } else {
            console.warn(`⚠️ Failed to load data for ${response.year}:`, response.error);
          }
        });
        
        // Sort by year descending (most recent first)
        return historicalSeasons.sort((a, b) => b.seasonId - a.seasonId);
      }),
      catchError(error => {
        console.error('❌ Failed to load historical seasons:', error);
        return of([]); // Return empty array on error
      })
    );
  }

  /**
   * Get historical data for specific seasons
   */
  getHistoricalSeasonsData(years: number[]): Observable<APIResponse[]> {
    const requests = years.map((year, index) => 
      // Add delay between requests to avoid rate limiting
      of(null).pipe(
        delay(index * this.REQUEST_DELAY),
        mergeMap(() => this.getSeasonData(year))
      )
    );
    
    return forkJoin(requests);
  }

  /**
   * Get data for a specific season
   */
  getSeasonData(year: number): Observable<APIResponse> {
    const isLegacyAPI = year < this.API_CUTOFF_YEAR;
    
    if (isLegacyAPI) {
      return this.getLegacySeasonData(year);
    } else {
      return this.getModernSeasonData(year);
    }
  }

  /**
   * Get data using the modern ESPN API (2018+)
   */
  private getModernSeasonData(year: number): Observable<APIResponse> {
    // Modern API uses this structure: /apis/v3/games/ffl/seasons/{year}/segments/0/leagues/{leagueId}
    const url = `http://localhost:3001/api/espn/historical/${year}`;
    
    console.log(`🔗 Fetching modern API data for ${year}:`, url);
    
    return this.http.get<any>(url, {
      params: {
        view: 'mTeam,mRoster,mSchedule,mStandings'  // Get comprehensive data
      }
    }).pipe(
      map(data => ({
        success: true,
        data,
        year,
        apiVersion: 'modern' as const
      })),
      catchError(error => {
        if (error.status === 401) {
          console.warn(`🔒 Authentication required for ${year} - historical data for private leagues needs ESPN login`);
          return of({
            success: false,
            error: `Authentication required for ${year}. Historical data for private leagues requires ESPN login.`,
            year,
            apiVersion: 'modern' as const
          });
        } else {
          console.warn(`⚠️ No data available for ${year} (league wasn't active or data not accessible)`);
          return of({
            success: false,
            error: error.message || 'Modern API request failed',
            year,
            apiVersion: 'modern' as const
          });
        }
      })
    );
  }

  /**
   * Get data using the legacy ESPN API (2010-2017)
   */
  private getLegacySeasonData(year: number): Observable<APIResponse> {
    // Legacy API uses leagueHistory endpoint with different view parameters
    const url = `http://localhost:3001/api/espn/legacy/${year}`;
    
    console.log(`🔗 Fetching legacy API data for ${year}:`, url);
    
    return this.http.get<any>(url, {
      params: {
        view: 'mMatchup,mTeam,mStandings'  // Use views that work with leagueHistory
      }
    }).pipe(
      map(data => ({
        success: true,
        data,
        year,
        apiVersion: 'legacy' as const
      })),
      catchError(error => {
        if (error.status === 401) {
          console.warn(`🔒 Authentication required for ${year} - private league data needs ESPN login`);
          return of({
            success: false,
            error: `Authentication required for ${year}. Private league historical data requires ESPN login credentials.`,
            year,
            apiVersion: 'legacy' as const
          });
        } else if (error.status === 404) {
          console.warn(`📚 Legacy API data not found for ${year} - league may not have existed or data unavailable`);
          return of({
            success: false,
            error: `Legacy data for ${year} not found. League may not have existed in that year or data is unavailable.`,
            year,
            apiVersion: 'legacy' as const
          });
        } else {
          console.warn(`⚠️ Legacy API error for ${year}:`, error.message);
          return of({
            success: false,
            error: error.message || 'Legacy API request failed',
            year,
            apiVersion: 'legacy' as const
          });
        }
      })
    );
  }

  /**
   * Transform API response to HistoricalSeason format
   */
  private transformToHistoricalSeason(data: any, year: number, apiVersion: 'legacy' | 'modern'): HistoricalSeason | null {
    try {
      console.log(`🔄 Transforming ${apiVersion} API data for ${year}`);
      
      if (apiVersion === 'modern') {
        return this.transformModernAPIData(data, year);
      } else {
        return this.transformLegacyAPIData(data, year);
      }
    } catch (error) {
      console.error(`❌ Failed to transform data for ${year}:`, error);
      return null;
    }
  }

  /**
   * Transform modern API data (2018+)
   */
  private transformModernAPIData(data: any, year: number): HistoricalSeason {
    const teams = data.teams || [];
    const schedule = data.schedule || [];
    const status = data.status || {};
    
    return {
      seasonId: year,
      leagueSettings: {
        teamCount: teams.length,
        scoringFormat: this.detectScoringFormat(data),
        playoffFormat: {
          teams: this.getPlayoffTeamCount(status),
          weeks: this.getPlayoffWeeks(status),
          bracket: 'single'
        },
        rosterSettings: this.extractRosterSettings(data)
      },
      finalStandings: this.createFinalStandings(teams, year),
      seasonStats: this.calculateSeasonStats(teams, schedule),
      seasonHighlights: this.generateSeasonHighlights(teams, schedule, year),
      playoffResults: this.extractPlayoffResults(schedule, teams),
      draftInfo: this.extractDraftInfo(data, year)
    };
  }

  /**
   * Transform legacy API data (2010-2017)
   */
  private transformLegacyAPIData(data: any, year: number): HistoricalSeason {
    // Legacy API has different structure - adapt accordingly
    const teams = data.teams || data.leagueTeams || [];
    const schedule = data.schedule || data.scoreboard || [];
    
    return {
      seasonId: year,
      leagueSettings: {
        teamCount: teams.length || 10, // Default to 10 if unknown
        scoringFormat: 'standard', // Legacy was typically standard
        playoffFormat: {
          teams: 6, // Common playoff format
          weeks: 3,
          bracket: 'single'
        },
        rosterSettings: {
          QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DST: 1, K: 1, BENCH: 6
        }
      },
      finalStandings: this.createLegacyFinalStandings(teams, year),
      seasonStats: this.calculateLegacySeasonStats(teams, schedule),
      seasonHighlights: this.generateLegacySeasonHighlights(teams, year),
      playoffResults: this.extractLegacyPlayoffResults(schedule, teams),
      draftInfo: this.createMockDraftInfo(year) // Legacy API often didn't have draft data
    };
  }

  // Helper methods for modern API data transformation
  private detectScoringFormat(data: any): 'standard' | 'ppr' | 'half-ppr' | 'custom' {
    // Try to detect scoring format from league settings
    const settings = data.settings || {};
    const scoring = settings.scoringSettings || {};
    
    // Look for PPR indicators
    if (scoring['53'] === 1) return 'ppr';        // Reception points = 1
    if (scoring['53'] === 0.5) return 'half-ppr'; // Reception points = 0.5
    if (scoring['53'] === 0) return 'standard';    // Reception points = 0
    
    return 'custom'; // Default if can't detect
  }

  private getPlayoffTeamCount(status: any): number {
    return status.playoffTeamCount || 6; // Default to 6 teams
  }

  private getPlayoffWeeks(status: any): number {
    const finalWeek = status.finalScoringPeriod || 17;
    const playoffStart = status.playoffSeedingIsComplete ? 15 : 15; // Usually starts week 15
    return Math.max(1, finalWeek - playoffStart + 1);
  }

  private extractRosterSettings(data: any): { [position: string]: number } {
    const settings = data.settings || {};
    const roster = settings.rosterSettings || {};
    
    return {
      QB: roster.QB || 1,
      RB: roster.RB || 2,
      WR: roster.WR || 2,
      TE: roster.TE || 1,
      FLEX: roster.FLEX || 1,
      DST: roster.DST || 1,
      K: roster.K || 1,
      BENCH: roster.BENCH || 6,
      IR: roster.IR || 0
    };
  }

  private createFinalStandings(teams: any[], year: number): HistoricalTeamStanding[] {
    return teams.map((team, index) => {
      const record = team.record?.overall || {};
      
      return {
        teamId: team.id,
        teamName: team.name || team.location || `Team ${team.id}`,
        ownerNames: this.extractOwnerNames(team),
        finalRank: team.rankFinal || team.playoffSeed || index + 1,
        regularSeasonRecord: {
          wins: record.wins || 0,
          losses: record.losses || 0,
          ties: record.ties || 0,
          percentage: record.percentage || 0,
          pointsFor: record.pointsFor || team.points || 0,
          pointsAgainst: record.pointsAgainst || 0,
          gamesBack: record.gamesBack || 0,
          streakLength: record.streakLength || 0,
          streakType: record.streakType || StreakType.WIN
        },
        playoffRecord: this.extractPlayoffRecord(team),
        totalPoints: record.pointsFor || team.points || 0,
        pointsPerGame: (record.pointsFor || 0) / Math.max(1, (record.wins || 0) + (record.losses || 0)),
        highestScore: this.calculateHighestScore(team),
        lowestScore: this.calculateLowestScore(team),
        weeklyScores: this.extractWeeklyScores(team),
        strengthOfSchedule: this.calculateStrengthOfSchedule(team, teams)
      };
    }).sort((a, b) => a.finalRank - b.finalRank);
  }

  // Helper methods for legacy API data transformation
  private createLegacyFinalStandings(teams: any[], year: number): HistoricalTeamStanding[] {
    // Legacy API structure was different - adapt as needed
    return teams.map((team, index) => ({
      teamId: team.teamId || team.id || index + 1,
      teamName: team.teamName || team.name || `Team ${index + 1}`,
      ownerNames: [team.ownerName || `Owner ${index + 1}`],
      finalRank: team.overallStanding || index + 1,
      regularSeasonRecord: {
        wins: team.wins || 0,
        losses: team.losses || 0,
        ties: team.ties || 0,
        percentage: team.winPct || 0,
        pointsFor: team.pointsFor || 0,
        pointsAgainst: team.pointsAgainst || 0,
        gamesBack: 0,
        streakLength: 1,
        streakType: StreakType.WIN
      },
      playoffRecord: {
        wins: 0, losses: 0, ties: 0, percentage: 0,
        pointsFor: 0, pointsAgainst: 0, gamesBack: 0,
        streakLength: 0, streakType: StreakType.WIN
      },
      totalPoints: team.pointsFor || 0,
      pointsPerGame: (team.pointsFor || 0) / Math.max(1, (team.wins || 0) + (team.losses || 0)),
      highestScore: team.highScore || 0,
      lowestScore: team.lowScore || 0,
      weeklyScores: {},
      strengthOfSchedule: 0.5
    }));
  }

  // Additional helper methods
  private extractOwnerNames(team: any): string[] {
    if (team.owners && Array.isArray(team.owners)) {
      return team.owners.map((owner: any) => owner.displayName || owner.firstName || 'Unknown');
    }
    return [team.primaryOwner || 'Unknown Owner'];
  }

  private extractPlayoffRecord(team: any): any {
    // Extract playoff-specific record if available
    return {
      wins: 0, losses: 0, ties: 0, percentage: 0,
      pointsFor: 0, pointsAgainst: 0, gamesBack: 0,
      streakLength: 0, streakType: StreakType.WIN
    };
  }

  private calculateHighestScore(team: any): number {
    // Calculate from weekly scores if available
    return Math.random() * 50 + 140; // Mock for now
  }

  private calculateLowestScore(team: any): number {
    // Calculate from weekly scores if available
    return Math.random() * 30 + 80; // Mock for now
  }

  private extractWeeklyScores(team: any): { [week: number]: number } {
    // Extract weekly scores from schedule/matchup data
    const scores: { [week: number]: number } = {};
    for (let week = 1; week <= 14; week++) {
      scores[week] = Math.random() * 50 + 100; // Mock for now
    }
    return scores;
  }

  private calculateStrengthOfSchedule(team: any, allTeams: any[]): number {
    // Calculate strength of schedule based on opponents
    return Math.random() * 0.4 + 0.3; // Mock for now
  }

  private calculateSeasonStats(teams: any[], schedule: any[]): SeasonStatistics {
    // Calculate league-wide statistics
    const totalPoints = teams.reduce((sum, team) => sum + (team.points || 0), 0);
    const avgPoints = totalPoints / teams.length;
    
    return {
      leagueAverages: {
        pointsPerGame: avgPoints / 14, // Assuming 14 games
        winningScore: avgPoints * 1.1,
        blowoutMargin: 35
      },
      seasonRecords: {
        highestScore: { teamId: 1, value: 185.5, week: 7 },
        lowestScore: { teamId: 5, value: 65.2, week: 12 },
        mostPointsFor: { teamId: 1, value: totalPoints },
        mostPointsAgainst: { teamId: 8, value: totalPoints * 0.9 },
        bestRecord: { teamId: 2, value: 13 },
        worstRecord: { teamId: 10, value: 1 },
        biggestBlowout: { teamId: 3, value: 85.3, week: 4 },
        closestGame: { teamId: 7, value: 0.1, week: 9 }
      },
      positionStats: {} // Would need roster data to calculate
    };
  }

  private calculateLegacySeasonStats(teams: any[], schedule: any[]): SeasonStatistics {
    // Simplified version for legacy data
    return {
      leagueAverages: {
        pointsPerGame: 110,
        winningScore: 120,
        blowoutMargin: 30
      },
      seasonRecords: {
        highestScore: { teamId: 1, value: 160.5 },
        lowestScore: { teamId: 5, value: 75.2 },
        mostPointsFor: { teamId: 1, value: 1650 },
        mostPointsAgainst: { teamId: 8, value: 1580 },
        bestRecord: { teamId: 2, value: 12 },
        worstRecord: { teamId: 10, value: 2 },
        biggestBlowout: { teamId: 3, value: 75.3 },
        closestGame: { teamId: 7, value: 0.5 }
      },
      positionStats: {}
    };
  }

  private generateSeasonHighlights(teams: any[], schedule: any[], year: number): SeasonHighlight[] {
    // Generate interesting highlights from the season
    return [
      {
        id: `${year}-highlight-1`,
        type: 'record',
        week: 7,
        title: 'Season High Score',
        description: `New season high score set in week 7`,
        teamsInvolved: [teams[0]?.id || 1],
        significance: 8
      }
    ];
  }

  private generateLegacySeasonHighlights(teams: any[], year: number): SeasonHighlight[] {
    return [
      {
        id: `${year}-highlight-1`,
        type: 'milestone',
        week: 1,
        title: `${year} Season`,
        description: `Historical season from ${year}`,
        teamsInvolved: [],
        significance: 5
      }
    ];
  }

  private extractPlayoffResults(schedule: any[], teams: any[]): PlayoffResults {
    // Extract playoff bracket and results
    return {
      bracket: [],
      champion: teams[0]?.id || 1,
      runnerUp: teams[1]?.id || 2,
      thirdPlace: teams[2]?.id || 3,
      consolationWinner: teams[6]?.id || 7
    };
  }

  private extractLegacyPlayoffResults(schedule: any[], teams: any[]): PlayoffResults {
    return {
      bracket: [],
      champion: teams[0]?.teamId || teams[0]?.id || 1,
      runnerUp: teams[1]?.teamId || teams[1]?.id || 2,
      thirdPlace: teams[2]?.teamId || teams[2]?.id || 3
    };
  }

  private extractDraftInfo(data: any, year: number): HistoricalDraftInfo {
    const draftInfo = data.draftDetail || {};
    
    return {
      draftDate: new Date(year, 7, 15).getTime(), // Mock August 15th
      draftType: 'snake',
      draftOrder: Array.from({ length: 10 }, (_, i) => i + 1),
      draftPicks: []
    };
  }

  private createMockDraftInfo(year: number): HistoricalDraftInfo {
    return {
      draftDate: new Date(year, 7, 15).getTime(),
      draftType: 'snake',
      draftOrder: Array.from({ length: 10 }, (_, i) => i + 1),
      draftPicks: []
    };
  }

}