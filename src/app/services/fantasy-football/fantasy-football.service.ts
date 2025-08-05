import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  League, 
  Team, 
  ScheduleItem, 
  LeagueResponse, 
  TeamsResponse, 
  RosterResponse, 
  MatchupResponse, 
  StandingsResponse,
  ESPNApiQueryParams 
} from '../../models/espn-fantasy.interfaces';

@Injectable({
  providedIn: 'root',
})
export class FantasyFootballService {
  // Updated base URL to point to your Node.js backend proxy
  private baseUrl = 'http://localhost:3001/api/espn'; // Your backend proxy URL

  constructor(private http: HttpClient) {}

  // Get standings data
  getStandings(): Observable<StandingsResponse> {
    return this.http.get<StandingsResponse>(`${this.baseUrl}?view=mStandings`);
  }

  // Get matchups data
  getMatchups(): Observable<MatchupResponse> {
    return this.http.get<MatchupResponse>(`${this.baseUrl}?view=mMatchup`);
  }

  // Get non-roster team data
  getTeamsData(): Observable<TeamsResponse> {
    return this.http.get<TeamsResponse>(`${this.baseUrl}/current`, {
      params: { leagueId: '532886', year: '2024', view: 'mTeam' }
    });
  }
  
  // Get roster data
  getRosters(): Observable<RosterResponse> {
    return this.http.get<RosterResponse>(`${this.baseUrl}?view=mRoster`);
  }

  getCurrentSeasonData(leagueId: string, year: number, view: string): Observable<LeagueResponse> {
    return this.http.get<LeagueResponse>(`${this.baseUrl}/current`, {
      params: { leagueId, year: year.toString(), view }
    });
  }

  getHistoricalData(leagueId: string, years: number[], view: string): Observable<LeagueResponse[]> {
    const yearsParam = years.join(',');
    return this.http.get<LeagueResponse[]>(`${this.baseUrl}/history`, {
      params: { leagueId, years: yearsParam, view }
    });
  }

  getAllYearsData(leagueId: string, view: string, startYear: number = 2010): Observable<LeagueResponse[]> {
    return this.http.get<LeagueResponse[]>(`${this.baseUrl}/allYears`, {
      params: { leagueId, view }
    });
  }
  
  aggregateData(dataArray: any[], field: string, operation: 'average' | 'sum') {
    const total = dataArray.reduce((acc, data) => acc + (data[field] || 0), 0);
    return operation === 'average' ? total / dataArray.length : total;
  }
}
