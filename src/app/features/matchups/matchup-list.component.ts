import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { StatDisplayComponent, StatConfig } from '../../shared/components/stat-display.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner.component';
import { ErrorDisplayComponent } from '../../shared/components/error-display.component';
import { ScheduleItem, Team } from '../../models/espn-fantasy.interfaces';
import { MatchupsStore } from '../../store/matchups.store';
import { TeamsStore } from '../../store/teams.store';

/**
 * Matchup list component for displaying all league matchups
 * Features week filtering, matchup results, and detailed scoring information
 */
@Component({
  selector: 'app-matchup-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    StatDisplayComponent,
    LoadingSpinnerComponent,
    ErrorDisplayComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="matchup-list-container">
      <header class="matchup-list-header">
        <h1>League Matchups</h1>
        <div class="header-actions">
          <button class="btn btn-primary" (click)="refreshData()" [disabled]="isRefreshing()">
            <span *ngIf="!isRefreshing()">🔄 Refresh</span>
            <span *ngIf="isRefreshing()">Refreshing...</span>
          </button>
        </div>
      </header>

      <!-- Loading State -->
      <app-loading-spinner 
        *ngIf="matchupsStore.isLoading()"
        type="circle"
        size="large"
        message="Loading matchups..."
        [showMessage]="true"
        layout="inline">
      </app-loading-spinner>

      <!-- Error State -->
      <app-error-display
        *ngIf="error()"
        [error]="error()"
        [showActions]="true"
        [showRefreshButton]="true"
        (retry)="refreshData()"
        (refresh)="refreshData()">
      </app-error-display>

      <!-- Matchup Content -->
      <div class="matchup-content" *ngIf="!matchupsStore.isLoading() && !error()">
        
        <!-- Week Navigation -->
        <section class="week-navigation">
          <div class="week-selector">
            <label for="weekSelect">Select Week:</label>
            <select id="weekSelect" [(ngModel)]="selectedWeek" (change)="updateSelectedWeek($event)">
              <option value="all">All Weeks</option>
              <option *ngFor="let week of availableWeeks()" [value]="week">
                Week {{ week }}
              </option>
            </select>
          </div>
          
          <div class="week-navigation-buttons">
            <button class="btn btn-secondary btn-sm" 
                    (click)="previousWeek()" 
                    [disabled]="!canGoPreviousWeek()">
              ← Previous
            </button>
            <button class="btn btn-secondary btn-sm" 
                    (click)="nextWeek()" 
                    [disabled]="!canGoNextWeek()">
              Next →
            </button>
            <button class="btn btn-outline btn-sm" 
                    (click)="goToCurrentWeek()">
              Current Week
            </button>
          </div>
        </section>

        <!-- Week Summary Stats -->
        <section class="week-summary" *ngIf="selectedWeek() !== 'all'">
          <h2>Week {{ selectedWeek() }} Summary</h2>
          <div class="summary-stats">
            <app-stat-display 
              [stat]="weekStats()['totalMatchups']"
              size="medium"
              variant="card">
            </app-stat-display>
            
            <app-stat-display 
              [stat]="weekStats()['completedMatchups']"
              size="medium"
              variant="success">
            </app-stat-display>
            
            <app-stat-display 
              [stat]="weekStats()['highestScore']"
              size="medium"
              variant="highlighted">
            </app-stat-display>
            
            <app-stat-display 
              [stat]="weekStats()['averageScore']"
              size="medium"
              variant="card">
            </app-stat-display>
          </div>
        </section>

        <!-- Matchups Grid -->
        <section class="matchups-section">
          <h2 *ngIf="selectedWeek() === 'all'">All Matchups</h2>
          <h2 *ngIf="selectedWeek() !== 'all'">Week {{ selectedWeek() }} Matchups</h2>
          
          <div class="matchups-grid" *ngIf="displayedMatchups().length > 0; else noMatchups">
            <div class="matchup-card" 
                 *ngFor="let matchup of displayedMatchups(); trackBy: trackByMatchup"
                 [class]="getMatchupCardClass(matchup)">
              
              <!-- Matchup Header -->
              <div class="matchup-header">
                <div class="matchup-week">Week {{ matchup.matchupPeriodId }}</div>
                <div class="matchup-status" *ngIf="matchup.winner">
                  <span class="status-indicator completed">✓</span>
                  Completed
                </div>
                <div class="matchup-status" *ngIf="!matchup.winner">
                  <span class="status-indicator in-progress">●</span>
                  In Progress
                </div>
              </div>

              <!-- Teams -->
              <div class="matchup-teams">
                <!-- Away Team -->
                <div class="team away-team" [class.winner]="matchup.winner === 'AWAY'">
                  <div class="team-info">
                    <div class="team-logo">
                      <img [src]="getTeamLogo(matchup.away.teamId)" 
                           [alt]="getTeamName(matchup.away.teamId) + ' logo'"
                           (error)="onImageError($event)" />
                    </div>
                    <div class="team-details">
                      <h3 class="team-name">{{ getTeamName(matchup.away.teamId) }}</h3>
                      <p class="team-record">{{ getTeamRecord(matchup.away.teamId) }}</p>
                    </div>
                  </div>
                  <div class="team-score">
                    <span class="score-value">{{ (matchup.away?.totalPoints || 0) | number:'1.1-1' }}</span>
                    <span class="score-label">points</span>
                  </div>
                </div>

                <!-- VS Separator -->
                <div class="matchup-separator">
                  <div class="vs-text">VS</div>
                  <div class="matchup-result" *ngIf="matchup.winner">
                    <span class="result-text">{{ getMatchupResultText(matchup) }}</span>
                  </div>
                </div>

                <!-- Home Team -->
                <div class="team home-team" [class.winner]="matchup.winner === 'HOME'">
                  <div class="team-info">
                    <div class="team-logo">
                      <img [src]="getTeamLogo(matchup.home.teamId)" 
                           [alt]="getTeamName(matchup.home.teamId) + ' logo'"
                           (error)="onImageError($event)" />
                    </div>
                    <div class="team-details">
                      <h3 class="team-name">{{ getTeamName(matchup.home.teamId) }}</h3>
                      <p class="team-record">{{ getTeamRecord(matchup.home.teamId) }}</p>
                    </div>
                  </div>
                  <div class="team-score">
                    <span class="score-value">{{ (matchup.home?.totalPoints || 0) | number:'1.1-1' }}</span>
                    <span class="score-label">points</span>
                  </div>
                </div>
              </div>

              <!-- Score Breakdown (if available) -->
              <div class="score-breakdown" *ngIf="showScoreBreakdown && getScoreBreakdown(matchup)">
                <h4>Score by Period</h4>
                <div class="breakdown-grid">
                  <div *ngFor="let period of getScoreBreakdown(matchup)" class="period-score">
                    <span class="period-label">{{ period.label }}</span>
                    <span class="away-score">{{ period.awayScore | number:'1.1-1' }}</span>
                    <span class="home-score">{{ period.homeScore | number:'1.1-1' }}</span>
                  </div>
                </div>
              </div>

              <!-- Matchup Actions -->
              <div class="matchup-actions">
                <button class="btn btn-sm btn-primary" (click)="viewMatchupDetails(matchup)">
                  View Details
                </button>
                <button class="btn btn-sm btn-secondary" (click)="compareTeams(matchup)">
                  Compare Teams
                </button>
              </div>
            </div>
          </div>

          <ng-template #noMatchups>
            <div class="no-matchups">
              <p>No matchups found for the selected criteria.</p>
            </div>
          </ng-template>
        </section>

        <!-- League Matchup Trends (All weeks view) -->
        <section class="matchup-trends" *ngIf="selectedWeek() === 'all'">
          <h2>Season Trends</h2>
          <div class="trends-grid">
            <div class="trend-card">
              <h3>Closest Matchups</h3>
              <div class="trend-list">
                <div *ngFor="let matchup of closestMatchups()" class="trend-item">
                  <span class="trend-matchup">
                    {{ getTeamAbbrev(matchup.away.teamId) }} vs {{ getTeamAbbrev(matchup.home.teamId) }}
                  </span>
                  <span class="trend-detail">
                    {{ getPointDifference(matchup) | number:'1.1-1' }} pts (Week {{ matchup.matchupPeriodId }})
                  </span>
                </div>
              </div>
            </div>

            <div class="trend-card">
              <h3>Highest Scoring</h3>
              <div class="trend-list">
                <div *ngFor="let matchup of highestScoringMatchups()" class="trend-item">
                  <span class="trend-matchup">
                    {{ getTeamAbbrev(matchup.away.teamId) }} vs {{ getTeamAbbrev(matchup.home.teamId) }}
                  </span>
                  <span class="trend-detail">
                    {{ getTotalPoints(matchup) | number:'1.1-1' }} pts (Week {{ matchup.matchupPeriodId }})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  `,
  styles: [`
    .matchup-list-container {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }
    
    .matchup-list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border-color, #e0e0e0);
    }
    
    .matchup-list-header h1 {
      margin: 0;
      color: var(--text-primary, #333);
      font-size: 2em;
      font-weight: 700;
    }
    
    .header-actions {
      display: flex;
      gap: 12px;
    }
    
    .btn {
      padding: 8px 16px;
      border: 1px solid;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: transparent;
    }
    
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .btn-primary {
      background: var(--primary-color, #007bff);
      border-color: var(--primary-color, #007bff);
      color: white;
    }
    
    .btn-secondary {
      background: var(--secondary-color, #6c757d);
      border-color: var(--secondary-color, #6c757d);
      color: white;
    }
    
    .btn-outline {
      border-color: var(--primary-color, #007bff);
      color: var(--primary-color, #007bff);
    }
    
    .btn-sm {
      padding: 6px 12px;
      font-size: 0.875em;
    }
    
    /* Week Navigation */
    .week-navigation {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding: 20px;
      background: var(--card-background, #ffffff);
      border: 1px solid var(--card-border, #e0e0e0);
      border-radius: 8px;
    }
    
    .week-selector {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .week-selector label {
      font-weight: 500;
      color: var(--text-primary, #333);
    }
    
    .week-selector select {
      padding: 8px 12px;
      border: 1px solid var(--input-border, #ccc);
      border-radius: 4px;
      font-size: 0.9em;
    }
    
    .week-navigation-buttons {
      display: flex;
      gap: 8px;
    }
    
    /* Week Summary */
    .week-summary {
      margin-bottom: 30px;
    }
    
    .week-summary h2 {
      margin: 0 0 20px 0;
      color: var(--text-primary, #333);
      font-size: 1.5em;
      font-weight: 600;
    }
    
    .summary-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }
    
    /* Matchups Section */
    .matchups-section h2 {
      margin: 0 0 20px 0;
      color: var(--text-primary, #333);
      font-size: 1.5em;
      font-weight: 600;
    }
    
    .matchups-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
      gap: 20px;
    }
    
    .matchup-card {
      background: var(--card-background, #ffffff);
      border: 1px solid var(--card-border, #e0e0e0);
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
    }
    
    .matchup-card:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }
    
    .matchup-card.completed {
      border-left: 4px solid var(--success-color, #28a745);
    }
    
    .matchup-card.in-progress {
      border-left: 4px solid var(--warning-color, #ffc107);
    }
    
    /* Matchup Header */
    .matchup-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-color, #e0e0e0);
    }
    
    .matchup-week {
      font-size: 1.1em;
      font-weight: 600;
      color: var(--primary-color, #007bff);
    }
    
    .matchup-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.9em;
      font-weight: 500;
    }
    
    .status-indicator {
      font-size: 0.8em;
    }
    
    .status-indicator.completed {
      color: var(--success-color, #28a745);
    }
    
    .status-indicator.in-progress {
      color: var(--warning-color, #ffc107);
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    /* Matchup Teams */
    .matchup-teams {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 20px;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .team {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      border-radius: 8px;
      background: var(--team-background, #f8f9fa);
      border: 2px solid transparent;
      transition: all 0.3s ease;
    }
    
    .team.winner {
      background: var(--success-color-light, #d4edda);
      border-color: var(--success-color, #28a745);
    }
    
    .team-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .team-logo {
      width: 40px;
      height: 40px;
      flex-shrink: 0;
    }
    
    .team-logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 4px;
    }
    
    .team-details {
      flex: 1;
    }
    
    .team-name {
      margin: 0 0 4px 0;
      font-size: 1.1em;
      font-weight: 600;
      color: var(--text-primary, #333);
    }
    
    .team-record {
      margin: 0;
      font-size: 0.85em;
      color: var(--text-muted, #888);
    }
    
    .team-score {
      text-align: center;
    }
    
    .score-value {
      display: block;
      font-size: 2em;
      font-weight: 700;
      color: var(--primary-color, #007bff);
      line-height: 1;
    }
    
    .score-label {
      font-size: 0.8em;
      color: var(--text-muted, #888);
      text-transform: uppercase;
    }
    
    /* Matchup Separator */
    .matchup-separator {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    
    .vs-text {
      font-size: 1.2em;
      font-weight: 700;
      color: var(--text-muted, #888);
    }
    
    .matchup-result {
      font-size: 0.8em;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 4px;
      background: var(--success-color, #28a745);
      color: white;
    }
    
    /* Score Breakdown */
    .score-breakdown {
      margin-bottom: 20px;
      padding: 16px;
      background: var(--breakdown-background, #f8f9fa);
      border-radius: 8px;
    }
    
    .score-breakdown h4 {
      margin: 0 0 12px 0;
      font-size: 1em;
      font-weight: 600;
      color: var(--text-primary, #333);
    }
    
    .breakdown-grid {
      display: grid;
      gap: 8px;
    }
    
    .period-score {
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: 12px;
      align-items: center;
      font-size: 0.9em;
    }
    
    .period-label {
      font-weight: 500;
      color: var(--text-primary, #333);
    }
    
    .away-score,
    .home-score {
      font-weight: 600;
      color: var(--primary-color, #007bff);
    }
    
    /* Matchup Actions */
    .matchup-actions {
      display: flex;
      gap: 8px;
      justify-content: center;
    }
    
    /* Matchup Trends */
    .matchup-trends {
      margin-top: 40px;
    }
    
    .matchup-trends h2 {
      margin: 0 0 20px 0;
      color: var(--text-primary, #333);
      font-size: 1.5em;
      font-weight: 600;
    }
    
    .trends-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }
    
    .trend-card {
      background: var(--card-background, #ffffff);
      border: 1px solid var(--card-border, #e0e0e0);
      border-radius: 8px;
      padding: 20px;
    }
    
    .trend-card h3 {
      margin: 0 0 16px 0;
      font-size: 1.2em;
      font-weight: 600;
      color: var(--text-primary, #333);
    }
    
    .trend-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .trend-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid var(--border-color, #e0e0e0);
    }
    
    .trend-item:last-child {
      border-bottom: none;
    }
    
    .trend-matchup {
      font-weight: 600;
      color: var(--text-primary, #333);
    }
    
    .trend-detail {
      font-size: 0.9em;
      color: var(--text-muted, #888);
    }
    
    /* Utility classes */
    .no-matchups {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-muted, #888);
    }
    
    /* Responsive Design */
    @media (max-width: 768px) {
      .matchup-list-container {
        padding: 16px;
      }
      
      .matchup-list-header {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }
      
      .week-navigation {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }
      
      .week-navigation-buttons {
        justify-content: center;
      }
      
      .summary-stats {
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
      }
      
      .matchups-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }
      
      .matchup-teams {
        grid-template-columns: 1fr;
        gap: 16px;
        text-align: center;
      }
      
      .matchup-separator {
        order: -1;
      }
      
      .trends-grid {
        grid-template-columns: 1fr;
      }
    }
    
    @media (max-width: 480px) {
      .summary-stats {
        grid-template-columns: 1fr;
      }
      
      .matchup-actions {
        flex-direction: column;
      }
      
      .trend-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }
    }
  `]
})
export class MatchupListComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly _isRefreshing = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _selectedWeek = signal<number | 'all'>('all');
  private readonly _showScoreBreakdown = signal(false);

  // Inject stores
  protected readonly matchupsStore = inject(MatchupsStore);
  protected readonly teamsStore = inject(TeamsStore);

  // Public signals
  readonly isRefreshing = this._isRefreshing.asReadonly();
  readonly error = computed(() => {
    const err = this.matchupsStore.error();
    return err ? String(err) : undefined;
  });
  readonly showScoreBreakdown = this._showScoreBreakdown.asReadonly();

  // Computed properties
  readonly selectedWeek = computed(() => this._selectedWeek());

  readonly availableWeeks = computed(() => {
    const matchups = this.matchupsStore.matchups();
    if (!matchups) return [];
    const weeks = [...new Set(matchups.map(m => m.matchupPeriodId))];
    return weeks.sort((a, b) => a - b);
  });

  readonly displayedMatchups = computed(() => {
    const matchups = this.matchupsStore.matchups();
    if (!matchups) return [];
    const selectedWeek = this._selectedWeek();
    
    if (selectedWeek === 'all') {
      return matchups.slice().sort((a, b) => b.matchupPeriodId - a.matchupPeriodId);
    }
    
    return matchups
      .filter(m => m.matchupPeriodId === selectedWeek)
      .slice()
      .sort((a, b) => (a.id || 0) - (b.id || 0));
  });

  readonly weekStats = computed((): Record<string, StatConfig> => {
    const selectedWeek = this._selectedWeek();
    if (selectedWeek === 'all') return {};

    const weekMatchups = this.displayedMatchups();
    const completedMatchups = weekMatchups.filter(m => m.winner);
    
    const scores = weekMatchups.flatMap(m => [(m.away?.totalPoints || 0), (m.home?.totalPoints || 0)]);
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    return {
      totalMatchups: {
        label: 'Total Matchups',
        value: weekMatchups.length,
        format: 'number',
        icon: '⚔️'
      },
      completedMatchups: {
        label: 'Completed',
        value: completedMatchups.length,
        format: 'number',
        icon: '✅'
      },
      highestScore: {
        label: 'Highest Score',
        value: highestScore,
        format: 'number',
        decimals: 1,
        icon: '🔥'
      },
      averageScore: {
        label: 'Average Score',
        value: averageScore,
        format: 'number',
        decimals: 1,
        icon: '📊'
      }
    };
  });

  readonly closestMatchups = computed(() => {
    const matchups = this.matchupsStore.matchups();
    if (!matchups) return [];
    return matchups
      .filter(m => m.winner) // Only completed matchups
      .map(m => ({
        ...m,
        pointDifference: Math.abs((m.home?.totalPoints || 0) - (m.away?.totalPoints || 0))
      }))
      .sort((a, b) => a.pointDifference - b.pointDifference)
      .slice(0, 5);
  });

  readonly highestScoringMatchups = computed(() => {
    const matchups = this.matchupsStore.matchups();
    if (!matchups) return [];
    return matchups
      .map(m => ({
        ...m,
        totalPoints: (m.home?.totalPoints || 0) + (m.away?.totalPoints || 0)
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 5);
    
    return matchups;
  });

  ngOnInit(): void {
    this.initializeMatchups();
    this.teamsStore.load();
    
    // Set initial week to current week
    const currentWeek = this.matchupsStore.currentWeek();
    if (currentWeek > 0) {
      this._selectedWeek.set(currentWeek);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async initializeMatchups(): Promise<void> {
    try {
      this._error.set(null);
      const matchups = this.matchupsStore.matchups();
      if (!matchups || matchups.length === 0) {
        await this.matchupsStore.load();
      }
    } catch (error) {
      this._error.set(String(error));
    }
  }

  async refreshData(): Promise<void> {
    this._isRefreshing.set(true);
    this._error.set(null);

    try {
      await this.matchupsStore.load();
    } catch (error) {
      this._error.set(String(error));
    } finally {
      this._isRefreshing.set(false);
    }
  }

  updateSelectedWeek(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    this._selectedWeek.set(value === 'all' ? 'all' : +value);
  }

  previousWeek(): void {
    const current = this._selectedWeek();
    const weeks = this.availableWeeks();
    
    if (current !== 'all' && weeks.length > 0) {
      const currentIndex = weeks.indexOf(current as number);
      if (currentIndex > 0) {
        this._selectedWeek.set(weeks[currentIndex - 1]);
      }
    }
  }

  nextWeek(): void {
    const current = this._selectedWeek();
    const weeks = this.availableWeeks();
    
    if (current !== 'all' && weeks.length > 0) {
      const currentIndex = weeks.indexOf(current as number);
      if (currentIndex < weeks.length - 1) {
        this._selectedWeek.set(weeks[currentIndex + 1]);
      }
    }
  }

  canGoPreviousWeek(): boolean {
    const current = this._selectedWeek();
    const weeks = this.availableWeeks();
    
    if (current === 'all' || weeks.length === 0) return false;
    
    const currentIndex = weeks.indexOf(current as number);
    return currentIndex > 0;
  }

  canGoNextWeek(): boolean {
    const current = this._selectedWeek();
    const weeks = this.availableWeeks();
    
    if (current === 'all' || weeks.length === 0) return false;
    
    const currentIndex = weeks.indexOf(current as number);
    return currentIndex < weeks.length - 1;
  }

  goToCurrentWeek(): void {
    const currentWeek = this.matchupsStore.currentWeek();
    this._selectedWeek.set(currentWeek);
  }

  getTeamName(teamId: number): string {
    const team = this.teamsStore.getTeamById(teamId);
    return team?.name || `Team ${teamId}`;
  }

  getTeamAbbrev(teamId: number): string {
    const team = this.teamsStore.getTeamById(teamId);
    return team?.abbrev || `T${teamId}`;
  }

  getTeamLogo(teamId: number): string {
    const team = this.teamsStore.getTeamById(teamId);
    return team?.logo || '';
  }

  getTeamRecord(teamId: number): string {
    const team = this.teamsStore.getTeamById(teamId);
    if (!team) return '0-0';
    
    const record = team.record.overall;
    return `${record.wins}-${record.losses}${record.ties ? `-${record.ties}` : ''}`;
  }

  getMatchupCardClass(matchup: ScheduleItem): string {
    return matchup.winner ? 'completed' : 'in-progress';
  }

  getMatchupResultText(matchup: ScheduleItem): string {
    if (!matchup.winner) return '';
    
    if (matchup.winner === 'TIE') return 'Tie Game';
    
    const winnerTeamId = matchup.winner === 'HOME' ? matchup.home.teamId : matchup.away.teamId;
    const winnerName = this.getTeamAbbrev(winnerTeamId);
    
    return `${winnerName} Wins`;
  }

  getScoreBreakdown(matchup: ScheduleItem): any[] | null {
    // This would be implemented if we had period-by-period scoring data
    // For now, return null as the interfaces don't include this data
    return null;
  }

  getPointDifference(matchup: ScheduleItem): number {
    return Math.abs((matchup.home?.totalPoints || 0) - (matchup.away?.totalPoints || 0));
  }

  getTotalPoints(matchup: ScheduleItem): number {
    return (matchup.home?.totalPoints || 0) + (matchup.away?.totalPoints || 0);
  }

  viewMatchupDetails(matchup: ScheduleItem): void {
    // Navigate to matchup details page
    console.log('View matchup details:', matchup);
  }

  compareTeams(matchup: ScheduleItem): void {
    // Navigate to team comparison page
    console.log('Compare teams:', matchup.home.teamId, 'vs', matchup.away.teamId);
  }

  trackByMatchup(index: number, matchup: ScheduleItem): string {
    return `${matchup.matchupPeriodId}-${matchup.away.teamId}-${matchup.home.teamId}`;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iNCIgZmlsbD0iI0Y4RjlGQSIvPgo8cGF0aCBkPSJNMjAgMjhDMjQuNDE4MyAyOCAyOCAyNC40MTgzIDI4IDIwQzI4IDE1LjU4MTcgMjQuNDE4MyAxMiAyMCAxMkMxNS41ODE3IDEyIDEyIDE1LjU4MTcgMTIgMjBDMTIgMjQuNDE4MyAxNS41ODE3IDI4IDIwIDI4WiIgZmlsbD0iI0RERERERCIvPgo8L3N2Zz4K';
  }
}