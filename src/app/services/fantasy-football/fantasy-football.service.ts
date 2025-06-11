import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FantasyFootballService {
  // Updated base URL to point to your Node.js backend proxy
  private baseUrl = 'http://localhost:3000/api/espn'; // Your backend proxy URL

  constructor(private http: HttpClient) {}

  // Get standings data
  getStandings(): Observable<any> {
    return this.http.get(`${this.baseUrl}?view=mStandings`); // No headers needed, backend proxy handles cookies
  }

  // Get matchups data
  getMatchups(): Observable<any> {
    return this.http.get(`${this.baseUrl}?view=mMatchup`); // Correcting 'mMatchups' to 'mMatchup'
  }

  // Get non-roster team data
  getTeamsData(): Observable<any> {
    return this.http.get(`${this.baseUrl}/current`, {
      params: { leagueId: '532886', year: '2024', view: 'mTeam' }
    });
  }
  
  // Get roster data
  getRosters(): Observable<any> {
    return this.http.get(`${this.baseUrl}?view=mRoster`);
  }

  getCurrentSeasonData(leagueId: string, year: number, view: string) {
    return this.http.get(`${this.baseUrl}/current`, {
      params: { leagueId, year: year.toString(), view }
    });
  }

  getHistoricalData(leagueId: string, years: number[], view: string) {
    const yearsParam = years.join(',');
    return this.http.get(`${this.baseUrl}/history`, {
      params: { leagueId, years: yearsParam, view }
    });
  }

  getAllYearsData(leagueId: string, view: string, startYear: number = 2010) {
    // Call the backend without including startYear as a URL parameter
    return this.http.get(`${this.baseUrl}/allYears`, {
      params: { leagueId, view }
    });
  }
  
  aggregateData(dataArray: any[], field: string, operation: 'average' | 'sum') {
    const total = dataArray.reduce((acc, data) => acc + (data[field] || 0), 0);
    return operation === 'average' ? total / dataArray.length : total;
  }
}
