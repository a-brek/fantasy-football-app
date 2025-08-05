/**
 * Historical Overview Component
 * 
 * Displays a comprehensive overview of league history including season summaries,
 * all-time records, league evolution, and team performance trends.
 * 
 * @version 1.0.0
 * @author Generated with Claude Code
 */

import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HistoricalDataStore } from '../../store/historical-data.store';
import { TeamsStore } from '../../store/teams.store';
import { 
  HistoricalSeason
} from '../../models/espn-fantasy.interfaces';

@Component({
  selector: 'app-historical-overview',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="historical-overview">
      <!-- Header -->
      <div class="overview-header">
        <h1 class="page-title">League History</h1>
        <p class="page-subtitle">
          Explore {{ totalSeasons() }} seasons of fantasy football history
        </p>
      </div>

      <!-- Quick Stats Grid -->
      <div class="quick-stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ totalSeasons() }}</div>
          <div class="stat-label">Total Seasons</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ leagueEvolution()?.totalSeasons || 0 }}</div>
          <div class="stat-label">Years Active</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ oldestSeason() }}</div>
          <div class="stat-label">Founded</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ getCurrentTeamCount() }}</div>
          <div class="stat-label">Current Teams</div>
        </div>
      </div>

      <!-- Historical Data Actions -->
      <div class="historical-actions">
        <button 
          class="btn btn-primary btn-lg"
          (click)="loadFullHistoricalData()"
          [disabled]="isLoading()"
          *ngIf="totalSeasons() < 5">
          <span *ngIf="!isLoading()">📊 Load Complete Historical Data (2010-Present)</span>
          <span *ngIf="isLoading()">⏳ Loading Historical Data...</span>
        </button>
        
        <button 
          class="btn btn-secondary"
          (click)="refreshHistoricalData()"
          [disabled]="isLoading()">
          <span *ngIf="!isLoading()">🔄 Refresh Data</span>
          <span *ngIf="isLoading()">⏳ Refreshing...</span>
        </button>
      </div>

      <!-- Loading States -->
      <div *ngIf="isLoading()" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading historical data...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="hasError()" class="error-container">
        <h3>Unable to Load Historical Data</h3>
        <p>{{ error()?.error }}</p>
        <button class="btn btn-primary" (click)="retryLoad()">
          Retry
        </button>
      </div>

      <!-- Main Content -->
      <div *ngIf="!isLoading() && !hasError()" class="historical-content">
        
        <!-- All-Time Records Section -->
        <section class="records-section">
          <h2 class="section-title">All-Time Records</h2>
          
          <div class="records-grid">
            <!-- Single Game Records -->
            <div class="record-category">
              <h3>Single Game Records</h3>
              <div class="record-list">
                <div class="record-item" *ngFor="let record of getSingleGameRecords()">
                  <div class="record-label">{{ getRecordLabel(record.key) }}</div>
                  <div class="record-details">
                    <span class="record-value">{{ formatRecordValue(record.value, record.key) }}</span>
                    <span class="record-holder">{{ record.teamName }}</span>
                    <span class="record-date">{{ formatRecordDate(record) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Season Records -->
            <div class="record-category">
              <h3>Season Records</h3>
              <div class="record-list">
                <div class="record-item" *ngFor="let record of getSeasonRecords()">
                  <div class="record-label">{{ getRecordLabel(record.key) }}</div>
                  <div class="record-details">
                    <span class="record-value">{{ formatRecordValue(record.value, record.key) }}</span>
                    <span class="record-holder">{{ record.teamName }}</span>
                    <span class="record-date">{{ record.seasonId }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Career Records -->
            <div class="record-category">
              <h3>Career Records</h3>
              <div class="record-list">
                <div class="record-item" *ngFor="let record of getCareerRecords()">
                  <div class="record-label">{{ getRecordLabel(record.key) }}</div>
                  <div class="record-details">
                    <span class="record-value">{{ formatRecordValue(record.value, record.key) }}</span>
                    <span class="record-holder">{{ record.teamName }}</span>
                    <span class="record-note">All-time</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- League Evolution Section -->
        <section class="evolution-section" *ngIf="leagueEvolution()">
          <h2 class="section-title">League Evolution</h2>
          
          <div class="evolution-timeline">
            <div class="timeline-item" *ngFor="let change of getRuleChanges()">
              <div class="timeline-year">{{ change.seasonId }}</div>
              <div class="timeline-content">
                <div class="change-category">{{ change.category | titlecase }}</div>
                <div class="change-description">{{ change.description }}</div>
                <div class="change-impact" [class]="'impact-' + change.impact">
                  {{ change.impact | titlecase }} Impact
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Season Summaries -->
        <section class="seasons-section">
          <h2 class="section-title">Season Summaries</h2>
          
          <div class="seasons-grid">
            <div class="season-card" *ngFor="let season of (showAllSeasons ? availableSeasons() : availableSeasons().slice(0, 6))">
              <div class="season-header">
                <h3>{{ season }} Season</h3>
                <span class="season-status" *ngIf="season === latestSeason()">Current</span>
              </div>
              
              <div class="season-stats">
                <div class="season-stat">
                  <span class="stat-label">Champion</span>
                  <span class="stat-value">{{ getSeasonChampion(season) }}</span>
                </div>
                <div class="season-stat">
                  <span class="stat-label">Runner-up</span>
                  <span class="stat-value">{{ getSeasonRunnerUp(season) }}</span>
                </div>
                <div class="season-stat">
                  <span class="stat-label">Regular Season Leader</span>
                  <span class="stat-value">{{ getRegularSeasonLeader(season) }}</span>
                </div>
              </div>
              
              <div class="season-actions">
                <button 
                  class="btn btn-outline-primary btn-sm"
                  [routerLink]="['/historical/season', season]">
                  View Details
                </button>
              </div>
            </div>
          </div>

          <div class="view-all-seasons" *ngIf="availableSeasons().length > 6 && !showAllSeasons">
            <button class="btn btn-secondary" (click)="viewAllSeasons()">
              View All {{ availableSeasons().length }} Seasons
            </button>
          </div>
          
          <div class="view-all-seasons" *ngIf="showAllSeasons">
            <button class="btn btn-outline-secondary" (click)="showLessSeasons()">
              Show Less
            </button>
          </div>
        </section>

        <!-- Quick Links -->
        <section class="quick-links-section">
          <h2 class="section-title">Explore More</h2>
          
          <div class="quick-links-grid">
            <a class="quick-link-card" [routerLink]="['/historical/records']">
              <div class="link-icon">🏆</div>
              <div class="link-title">All Records</div>
              <div class="link-description">Browse all league records and achievements</div>
            </a>
            
            <a class="quick-link-card" [routerLink]="['/historical/trends']">
              <div class="link-icon">📈</div>
              <div class="link-title">League Trends</div>
              <div class="link-description">Analyze scoring and competitive trends</div>
            </a>
            
            <a class="quick-link-card" [routerLink]="['/historical/teams']">
              <div class="link-icon">👥</div>
              <div class="link-title">Team Histories</div>
              <div class="link-description">Compare team performance over time</div>
            </a>
            
            <a class="quick-link-card" [routerLink]="['/historical/draft']">
              <div class="link-icon">🎯</div>
              <div class="link-title">Draft History</div>
              <div class="link-description">Review past drafts and grades</div>
            </a>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .historical-overview {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .overview-header {
      text-align: center;
      margin-bottom: 3rem;
    }

    .page-title {
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--primary-color, #007bff);
      margin-bottom: 0.5rem;
    }

    .page-subtitle {
      font-size: 1.1rem;
      color: var(--text-muted, #6c757d);
      margin: 0;
    }

    .quick-stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 3rem;
    }

    .stat-card {
      background: var(--card-bg, #fff);
      border: 1px solid var(--border-color, #dee2e6);
      border-radius: 8px;
      padding: 1.5rem;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .stat-value {
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--primary-color, #007bff);
      display: block;
      margin-bottom: 0.5rem;
    }

    .stat-label {
      font-size: 0.9rem;
      color: var(--text-muted, #6c757d);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Historical Actions */
    .historical-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      align-items: center;
      margin-bottom: 3rem;
      padding: 2rem;
      background: var(--card-bg, #fff);
      border: 1px solid var(--border-color, #dee2e6);
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .btn-lg {
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      font-weight: 600;
    }

    .loading-container, .error-container {
      text-align: center;
      padding: 3rem;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid var(--border-color, #dee2e6);
      border-top: 4px solid var(--primary-color, #007bff);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .section-title {
      font-size: 1.8rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
      color: var(--text-primary, #212529);
    }

    .records-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
      margin-bottom: 3rem;
    }

    .record-category {
      background: var(--card-bg, #fff);
      border: 1px solid var(--border-color, #dee2e6);
      border-radius: 8px;
      padding: 1.5rem;
    }

    .record-category h3 {
      font-size: 1.2rem;
      margin-bottom: 1rem;
      color: var(--primary-color, #007bff);
    }

    .record-item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--border-light, #f8f9fa);
    }

    .record-item:last-child {
      border-bottom: none;
    }

    .record-label {
      font-weight: 500;
      color: var(--text-primary, #212529);
      flex: 1;
    }

    .record-details {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      text-align: right;
    }

    .record-value {
      font-weight: 600;
      color: var(--success-color, #28a745);
      font-size: 1.1rem;
    }

    .record-holder {
      font-size: 0.9rem;
      color: var(--text-secondary, #495057);
    }

    .record-date, .record-note {
      font-size: 0.8rem;
      color: var(--text-muted, #6c757d);
    }

    .evolution-timeline {
      position: relative;
      padding: 1rem 0;
    }

    .timeline-item {
      display: flex;
      margin-bottom: 2rem;
      position: relative;
    }

    .timeline-year {
      width: 80px;
      font-weight: 600;
      color: var(--primary-color, #007bff);
      flex-shrink: 0;
    }

    .timeline-content {
      flex: 1;
      padding-left: 2rem;
      border-left: 2px solid var(--border-color, #dee2e6);
      position: relative;
    }

    .timeline-content::before {
      content: '';
      position: absolute;
      left: -6px;
      top: 0;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--primary-color, #007bff);
    }

    .change-category {
      font-weight: 600;
      color: var(--text-primary, #212529);
      margin-bottom: 0.25rem;
    }

    .change-description {
      color: var(--text-secondary, #495057);
      margin-bottom: 0.5rem;
    }

    .change-impact {
      font-size: 0.8rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      display: inline-block;
    }

    .impact-major {
      background: var(--danger-bg, #f8d7da);
      color: var(--danger-color, #721c24);
    }

    .impact-minor {
      background: var(--warning-bg, #fff3cd);
      color: var(--warning-color, #856404);
    }

    .impact-cosmetic {
      background: var(--info-bg, #d1ecf1);
      color: var(--info-color, #0c5460);
    }

    .seasons-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .season-card {
      background: var(--card-bg, #fff);
      border: 1px solid var(--border-color, #dee2e6);
      border-radius: 8px;
      padding: 1.5rem;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .season-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .season-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .season-header h3 {
      margin: 0;
      color: var(--text-primary, #212529);
    }

    .season-status {
      background: var(--success-color, #28a745);
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
    }

    .season-stats {
      margin-bottom: 1rem;
    }

    .season-stat {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .season-stat .stat-label {
      color: var(--text-muted, #6c757d);
      font-size: 0.9rem;
    }

    .season-stat .stat-value {
      font-weight: 500;
      color: var(--text-primary, #212529);
    }

    .quick-links-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
    }

    .quick-link-card {
      background: var(--card-bg, #fff);
      border: 1px solid var(--border-color, #dee2e6);
      border-radius: 8px;
      padding: 1.5rem;
      text-decoration: none;
      color: inherit;
      transition: transform 0.2s, box-shadow 0.2s;
      display: block;
    }

    .quick-link-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      text-decoration: none;
      color: inherit;
    }

    .link-icon {
      font-size: 2rem;
      margin-bottom: 1rem;
    }

    .link-title {
      font-size: 1.2rem;
      font-weight: 600;
      color: var(--primary-color, #007bff);
      margin-bottom: 0.5rem;
    }

    .link-description {
      color: var(--text-muted, #6c757d);
      font-size: 0.9rem;
      line-height: 1.4;
    }

    .btn {
      padding: 0.5rem 1rem;
      border: 1px solid transparent;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
      text-align: center;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: var(--primary-color, #007bff);
      color: white;
    }

    .btn-outline-primary {
      border-color: var(--primary-color, #007bff);
      color: var(--primary-color, #007bff);
      background: transparent;
    }

    .btn-secondary {
      background: var(--secondary-color, #6c757d);
      color: white;
    }

    .btn-outline-secondary {
      border-color: var(--secondary-color, #6c757d);
      color: var(--secondary-color, #6c757d);
      background: transparent;
    }

    .btn-sm {
      padding: 0.375rem 0.75rem;
      font-size: 0.8rem;
    }

    .view-all-seasons {
      text-align: center;
      margin-top: 2rem;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .historical-overview {
        padding: 1rem;
      }

      .page-title {
        font-size: 2rem;
      }

      .quick-stats-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
      }

      .records-grid {
        grid-template-columns: 1fr;
      }

      .timeline-item {
        flex-direction: column;
      }

      .timeline-content {
        padding-left: 0;
        padding-top: 0.5rem;
        border-left: none;
        border-top: 2px solid var(--border-color, #dee2e6);
      }

      .timeline-content::before {
        left: 0;
        top: -6px;
      }
    }
  `]
})
export class HistoricalOverviewComponent implements OnInit {
  
  private readonly historicalStore = inject(HistoricalDataStore);
  private readonly teamsStore = inject(TeamsStore);
  
  // Control how many seasons to show
  protected showAllSeasons = false;

  // Store computed properties
  public readonly isLoading = this.historicalStore.isLoading;
  public readonly hasError = this.historicalStore.hasError;
  public readonly error = this.historicalStore.error;
  public readonly availableSeasons = this.historicalStore.availableSeasons;
  public readonly totalSeasons = this.historicalStore.totalSeasons;
  public readonly latestSeason = this.historicalStore.latestSeason;
  public readonly oldestSeason = this.historicalStore.oldestSeason;
  public readonly allTimeRecords = this.historicalStore.allTimeRecords;
  public readonly leagueEvolution = this.historicalStore.leagueEvolution;

  ngOnInit(): void {
    // Load historical data
    this.historicalStore.load().subscribe({
      error: (error) => console.error('Failed to load historical data:', error)
    });
    
    // Load current teams for reference
    this.teamsStore.load().subscribe({
      error: (error) => console.error('Failed to load teams:', error)
    });
  }

  retryLoad(): void {
    this.historicalStore.retry().subscribe();
  }

  getCurrentTeamCount(): number {
    const evolution = this.leagueEvolution();
    if (!evolution) return 0;
    
    const currentSeason = this.latestSeason();
    return evolution.teamCountHistory[currentSeason] || 10;
  }

  getSingleGameRecords(): Array<{key: string, value: number, teamName: string, seasonId: number, week?: number}> {
    const records = this.allTimeRecords();
    if (!records || !records.singleGameRecords) return [];
    
    const result = [];
    if (records.singleGameRecords.highestScore && records.singleGameRecords.highestScore.teamName !== 'No Data') {
      result.push({ key: 'highestScore', ...records.singleGameRecords.highestScore });
    }
    if (records.singleGameRecords.lowestScore && records.singleGameRecords.lowestScore.teamName !== 'No Data') {
      result.push({ key: 'lowestScore', ...records.singleGameRecords.lowestScore });
    }
    if (records.singleGameRecords.biggestBlowout && records.singleGameRecords.biggestBlowout.teamName !== 'No Data') {
      result.push({ key: 'biggestBlowout', ...records.singleGameRecords.biggestBlowout });
    }
    if (records.singleGameRecords.closestGame && records.singleGameRecords.closestGame.teamName !== 'No Data') {
      result.push({ key: 'closestGame', ...records.singleGameRecords.closestGame });
    }
    return result;
  }

  getSeasonRecords(): Array<{key: string, value: number, teamName: string, seasonId: number}> {
    const records = this.allTimeRecords();
    if (!records || !records.seasonRecords) return [];
    
    const result = [];
    if (records.seasonRecords.mostWins && records.seasonRecords.mostWins.teamName !== 'No Data') {
      result.push({ key: 'mostWins', ...records.seasonRecords.mostWins });
    }
    if (records.seasonRecords.fewestWins && records.seasonRecords.fewestWins.teamName !== 'No Data') {
      result.push({ key: 'fewestWins', ...records.seasonRecords.fewestWins });
    }
    if (records.seasonRecords.mostPoints && records.seasonRecords.mostPoints.teamName !== 'No Data') {
      result.push({ key: 'mostPoints', ...records.seasonRecords.mostPoints });
    }
    if (records.seasonRecords.fewestPoints && records.seasonRecords.fewestPoints.teamName !== 'No Data') {
      result.push({ key: 'fewestPoints', ...records.seasonRecords.fewestPoints });
    }
    return result;
  }

  getCareerRecords(): Array<{key: string, value: number, teamName: string, seasonId: number}> {
    const records = this.allTimeRecords();
    if (!records || !records.careerRecords) return [];
    
    const result = [];
    if (records.careerRecords.mostChampionships && records.careerRecords.mostChampionships.teamName !== 'No Data') {
      result.push({ key: 'mostChampionships', ...records.careerRecords.mostChampionships });
    }
    if (records.careerRecords.mostPlayoffAppearances && records.careerRecords.mostPlayoffAppearances.teamName !== 'No Data') {
      result.push({ key: 'mostPlayoffAppearances', ...records.careerRecords.mostPlayoffAppearances });
    }
    if (records.careerRecords.highestCareerWinPercentage && records.careerRecords.highestCareerWinPercentage.teamName !== 'No Data') {
      result.push({ key: 'highestCareerWinPercentage', ...records.careerRecords.highestCareerWinPercentage });
    }
    if (records.careerRecords.mostCareerPoints && records.careerRecords.mostCareerPoints.teamName !== 'No Data') {
      result.push({ key: 'mostCareerPoints', ...records.careerRecords.mostCareerPoints });
    }
    return result;
  }

  getRuleChanges(): Array<{seasonId: number, category: string, description: string, impact: string}> {
    const evolution = this.leagueEvolution();
    return evolution?.ruleChanges || [];
  }

  getRecordLabel(key: string): string {
    const labels: { [key: string]: string } = {
      highestScore: 'Highest Score',
      lowestScore: 'Lowest Score',
      biggestBlowout: 'Biggest Blowout',
      closestGame: 'Closest Game',
      mostWins: 'Most Wins',
      fewestWins: 'Fewest Wins',
      mostPoints: 'Most Points',
      fewestPoints: 'Fewest Points',
      longestWinStreak: 'Longest Win Streak',
      longestLoseStreak: 'Longest Lose Streak',
      mostChampionships: 'Most Championships',
      mostPlayoffAppearances: 'Most Playoff Appearances',
      highestCareerWinPercentage: 'Highest Win %',
      mostCareerPoints: 'Most Career Points'
    };
    return labels[key] || key;
  }

  formatRecordValue(value: number, key: string): string {
    if (key === 'highestCareerWinPercentage') {
      return `${(value * 100).toFixed(1)}%`;
    }
    if (key.includes('Points') || key.includes('Score')) {
      return value.toFixed(1);
    }
    if (key === 'closestGame') {
      return value.toFixed(1);
    }
    return value.toString();
  }

  formatRecordDate(record: any): string {
    if (record.week) {
      return `Week ${record.week}, ${record.seasonId}`;
    }
    return record.seasonId.toString();
  }

  getSeasonChampion(season: number): string {
    const data = this.historicalStore.data();
    const seasonData = data?.seasonData[season];
    if (!seasonData || !seasonData.finalStandings || seasonData.finalStandings.length === 0) {
      return 'TBD';
    }
    
    const champion = seasonData.finalStandings.find(team => team.finalRank === 1);
    return champion?.teamName || 'TBD';
  }

  getSeasonRunnerUp(season: number): string {
    const data = this.historicalStore.data();
    const seasonData = data?.seasonData[season];
    if (!seasonData || !seasonData.finalStandings || seasonData.finalStandings.length === 0) {
      return 'TBD';
    }
    
    const runnerUp = seasonData.finalStandings.find(team => team.finalRank === 2);
    return runnerUp?.teamName || 'TBD';
  }

  getRegularSeasonLeader(season: number): string {
    const data = this.historicalStore.data();
    const seasonData = data?.seasonData[season];
    if (!seasonData || !seasonData.finalStandings || seasonData.finalStandings.length === 0) {
      return 'TBD';
    }
    
    // Find team with most regular season wins
    const regularSeasonLeader = seasonData.finalStandings.reduce((leader, team) => {
      return team.regularSeasonRecord.wins > leader.regularSeasonRecord.wins ? team : leader;
    }, seasonData.finalStandings[0]); // Provide initial value to avoid empty array error
    
    return regularSeasonLeader?.teamName || 'TBD';
  }

  loadFullHistoricalData(): void {
    console.log('🏈 Loading complete historical data from 2010-present...');
    this.historicalStore.refresh().subscribe({
      next: () => {
        console.log('✅ Historical data loaded successfully');
      },
      error: (error) => {
        console.error('❌ Failed to load historical data:', error);
      }
    });
  }

  refreshHistoricalData(): void {
    console.log('🔄 Refreshing historical data...');
    // Clear cached data to force fresh load
    localStorage.removeItem('fantasy-football-historical-data');
    
    this.historicalStore.refresh().subscribe({
      next: () => {
        console.log('✅ Historical data refreshed successfully');
      },
      error: (error) => {
        console.error('❌ Failed to refresh historical data:', error);
      }
    });
  }

  viewAllSeasons(): void {
    console.log('📅 Viewing all seasons - expanding current view');
    this.showAllSeasons = true;
  }

  showLessSeasons(): void {
    console.log('📅 Showing fewer seasons - collapsing view');
    this.showAllSeasons = false;
  }
}