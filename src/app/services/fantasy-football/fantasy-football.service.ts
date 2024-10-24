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
    return this.http.get(`${this.baseUrl}?view=mTeam`);
  }

  // Get roster data
  getRosters(): Observable<any> {
    return this.http.get(`${this.baseUrl}?view=mRoster`);
  }
}
