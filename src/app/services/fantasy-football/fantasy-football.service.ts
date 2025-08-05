import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { 
  League, 
  Team, 
  ScheduleItem, 
  LeagueResponse, 
  TeamsResponse, 
  RosterResponse, 
  MatchupResponse, 
  StandingsResponse,
  ESPNApiQueryParams,
  StreakType 
} from '../../models/espn-fantasy.interfaces';

@Injectable({
  providedIn: 'root',
})
export class FantasyFootballService {
  // Local Node.js proxy server (run with: node server.js)
  private readonly PROXY_BASE_URL = 'http://localhost:3001/api/espn';
  private readonly LEAGUE_ID = '532886'; // Your league ID  
  private readonly SEASON_ID = '2024'; // Current season
  
  constructor(private http: HttpClient) {}

  private buildApiUrl(view?: string): string {
    return view ? `${this.PROXY_BASE_URL}?view=${view}` : this.PROXY_BASE_URL;
  }

  private callESPNApi<T>(url: string): Observable<T> {
    console.log('🏈 Calling ESPN API via proxy:', url);
    
    return this.http.get<T>(url).pipe(
      tap((response: any) => {
        console.log('✅ ESPN API Response received:', response);
      }),
      catchError(error => {
        console.error('❌ ESPN API call failed:', error);
        
        if (error.status === 0) {
          console.error('🔌 Network error - Make sure the proxy server is running:');
          console.error('📋 Run: cd fantasy-football && node server.js');
        } else if (error.status >= 400) {
          console.error('🚫 ESPN API returned error:', error.status, error.message);
        }
        
        throw error; // Let the store handle the error with proper UI feedback
      })
    );
  }

  // Get standings data
  getStandings(): Observable<StandingsResponse> {
    const url = this.buildApiUrl('mStandings');
    return this.callESPNApi<any>(url).pipe(
      tap(rawData => {
        console.log('🔍 Raw ESPN Standings Data:', rawData);
        if (rawData.teams) {
          console.log('📊 Sample team data:', rawData.teams[0]);
        }
      }),
      map(rawData => this.transformStandingsData(rawData))
    );
  }

  // Get matchups data
  getMatchups(): Observable<MatchupResponse> {
    const url = this.buildApiUrl('mMatchup');
    return this.callESPNApi<any>(url).pipe(
      tap(rawData => {
        console.log('🔍 Raw ESPN Matchups Data:', rawData);
        if (rawData.schedule) {
          console.log('🏈 Sample matchup data:', rawData.schedule[0]);
        }
      }),
      map(rawData => this.transformMatchupsData(rawData))
    );
  }

  // Get teams data
  getTeamsData(): Observable<TeamsResponse> {
    const url = this.buildApiUrl('mTeam');
    return this.callESPNApi<any>(url).pipe(
      tap(rawData => {
        console.log('🔍 Raw ESPN Teams Data:', rawData);
        if (rawData.teams) {
          console.log('👥 Sample team data:', rawData.teams[0]);
        }
        if (rawData.status) {
          console.log('📅 League status:', rawData.status);
        }
      }),
      map(rawData => this.transformTeamsData(rawData))
    );
  }

  // Get current week/season info from ESPN API
  getCurrentWeekInfo(): Observable<{currentWeek: number, finalWeek: number, isSeasonComplete: boolean}> {
    const url = this.buildApiUrl('mTeam'); // mTeam has status info
    return this.callESPNApi<any>(url).pipe(
      tap(rawData => {
        console.log('📅 ESPN Season Status:', rawData.status);
      }),
      map(rawData => {
        const status = rawData.status || {};
        const currentWeek = status.currentMatchupPeriod || 1;
        const finalWeek = status.finalScoringPeriod || 17;
        const isSeasonComplete = currentWeek >= finalWeek;
        
        console.log(`📊 Season Info: Week ${currentWeek}/${finalWeek}, Complete: ${isSeasonComplete}`);
        
        return {
          currentWeek,
          finalWeek, 
          isSeasonComplete
        };
      })
    );
  }
  
  // Get roster data
  getRosters(): Observable<RosterResponse> {
    const url = this.buildApiUrl('mRoster');
    return this.callESPNApi<League>(url).pipe(
      map(league => ({ 
        teams: league.teams || [],
        status: 'success'
      } as RosterResponse))
    );
  }

  getCurrentSeasonData(leagueId: string, year: number, view: string): Observable<LeagueResponse> {
    const url = `http://localhost:3001/api/espn?view=${view}`;
    return this.callESPNApi<League>(url).pipe(
      map(league => ({ league, status: 'success' } as LeagueResponse))
    );
  }

  getHistoricalData(leagueId: string, years: number[], view: string): Observable<LeagueResponse[]> {
    // ESPN API doesn't support multiple years in one call, so we'll call each year separately
    const requests = years.map(year => this.getCurrentSeasonData(leagueId, year, view));
    // For simplicity, return empty array for now - this would need proper implementation
    return new Observable(observer => {
      observer.next([]);
      observer.complete();
    });
  }

  getAllYearsData(leagueId: string, view: string, startYear: number = 2010): Observable<LeagueResponse[]> {
    // Similar to above - would need proper implementation for production
    return new Observable(observer => {
      observer.next([]);
      observer.complete();
    });
  }
  
  // Data transformation methods to convert ESPN API format to our interfaces
  private transformStandingsData(rawData: any): StandingsResponse {
    const transformedTeams = rawData.teams?.map((espnTeam: any) => this.transformTeam(espnTeam)) || [];
    
    return {
      league: {
        ...rawData,
        teams: transformedTeams
      },
      status: 'success'
    };
  }

  private transformTeamsData(rawData: any): TeamsResponse {
    const transformedTeams = rawData.teams?.map((espnTeam: any) => this.transformTeam(espnTeam)) || [];
    
    return {
      teams: transformedTeams,
      status: 'success'
    };
  }

  private transformMatchupsData(rawData: any): MatchupResponse {
    const transformedSchedule = rawData.schedule?.map((espnMatchup: any) => this.transformMatchup(espnMatchup)) || [];
    
    return {
      schedule: transformedSchedule,
      league: rawData,
      status: 'success'
    };
  }

  private transformTeam(espnTeam: any): Team {
    console.log('🔄 Transforming ESPN team:', espnTeam);
    
    // ESPN team structure might have different property names
    const record = espnTeam.record || {};
    const overall = record.overall || {};
    
    return {
      id: espnTeam.id || 0,
      name: espnTeam.name || espnTeam.location || `Team ${espnTeam.id || 'Unknown'}`,
      abbrev: espnTeam.abbrev || espnTeam.name?.substring(0, 3).toUpperCase() || 'TM',
      owners: espnTeam.owners || [],
      logo: espnTeam.logo || '',
      logoType: espnTeam.logoType || 'NONE',
      isActive: espnTeam.isActive !== false,
      currentProjectedRank: espnTeam.currentProjectedRank || 0,
      divisionId: espnTeam.divisionId || 0,
      draftDayProjectedRank: espnTeam.draftDayProjectedRank || 0,
      playoffSeed: espnTeam.playoffSeed || 0,
      points: espnTeam.points || overall.pointsFor || 0,
      pointsAdjusted: espnTeam.pointsAdjusted || 0,
      pointsDelta: espnTeam.pointsDelta || 0,
      primaryOwner: espnTeam.primaryOwner || '',
      rankCalculatedFinal: espnTeam.rankCalculatedFinal || 0,
      rankFinal: espnTeam.rankFinal || 0,
      transactionCounter: espnTeam.transactionCounter || {
        acquisitionBudgetSpent: 0,
        acquisitions: 0,
        drops: 0,
        matchupAcquisitionTotals: {},
        misc: 0,
        moveToActive: 0,
        moveToIR: 0,
        paid: 0,
        teamCharges: 0,
        trades: 0
      },
      valuesByStat: espnTeam.valuesByStat || {},
      waiverRank: espnTeam.waiverRank || 0,
      record: {
        overall: {
          wins: overall.wins || 0,
          losses: overall.losses || 0,
          ties: overall.ties || 0,
          pointsFor: overall.pointsFor || espnTeam.points || 0,
          pointsAgainst: overall.pointsAgainst || 0,
          percentage: overall.percentage || (overall.wins || 0) / Math.max(1, (overall.wins || 0) + (overall.losses || 0)),
          gamesBack: overall.gamesBack || 0,
          streakLength: overall.streakLength || 0,
          streakType: overall.streakType || StreakType.WIN
        },
        home: record.home || {
          wins: Math.floor((overall.wins || 0) / 2),
          losses: Math.floor((overall.losses || 0) / 2),
          ties: 0,
          pointsFor: Math.floor((overall.pointsFor || 0) / 2),
          pointsAgainst: Math.floor((overall.pointsAgainst || 0) / 2),
          percentage: overall.percentage || 0,
          gamesBack: 0,
          streakLength: 1,
          streakType: StreakType.WIN
        },
        away: record.away || {
          wins: Math.ceil((overall.wins || 0) / 2),
          losses: Math.ceil((overall.losses || 0) / 2),
          ties: 0,
          pointsFor: Math.ceil((overall.pointsFor || 0) / 2),
          pointsAgainst: Math.ceil((overall.pointsAgainst || 0) / 2),
          percentage: overall.percentage || 0,
          gamesBack: 0,
          streakLength: 1,
          streakType: StreakType.LOSS
        },
        division: record.division || {
          wins: overall.wins || 0,
          losses: overall.losses || 0,
          ties: overall.ties || 0,
          pointsFor: overall.pointsFor || 0,
          pointsAgainst: overall.pointsAgainst || 0,
          percentage: overall.percentage || 0,
          gamesBack: 0,
          streakLength: 1,
          streakType: StreakType.WIN
        }
      }
    };
  }

  private transformMatchup(espnMatchup: any): ScheduleItem {
    console.log('🔄 Transforming ESPN matchup:', espnMatchup);
    
    return {
      id: espnMatchup.id || 0,
      matchupPeriodId: espnMatchup.matchupPeriodId || 1,
      home: {
        teamId: espnMatchup.home?.teamId || 0,
        totalPoints: espnMatchup.home?.totalPoints || 0,
        gamesPlayed: espnMatchup.home?.gamesPlayed || 1
      },
      away: {
        teamId: espnMatchup.away?.teamId || 0,
        totalPoints: espnMatchup.away?.totalPoints || 0,
        gamesPlayed: espnMatchup.away?.gamesPlayed || 1
      },
      winner: espnMatchup.winner || undefined
    };
  }

  aggregateData(dataArray: any[], field: string, operation: 'average' | 'sum') {
    const total = dataArray.reduce((acc, data) => acc + (data[field] || 0), 0);
    return operation === 'average' ? total / dataArray.length : total;
  }
}
