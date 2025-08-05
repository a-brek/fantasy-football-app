import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil, catchError, of } from 'rxjs';

import { DataService } from '../../core/services/data.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { TeamCardComponent } from '../../shared/components/team-card.component';
import { StatDisplayComponent, StatConfig } from '../../shared/components/stat-display.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner.component';
import { ErrorDisplayComponent } from '../../shared/components/error-display.component';
import { Team, ScheduleItem } from '../../models/espn-fantasy.interfaces';

/**
 * Dashboard component providing overview of fantasy football league
 * Features team standings, current week matchups, league stats, and recent activity
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TeamCardComponent,
    StatDisplayComponent,
    LoadingSpinnerComponent,
    ErrorDisplayComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dashboard-container">
      <header class="dashboard-header">
        <h1>Fantasy Football Dashboard</h1>
        <div class="dashboard-actions">
          <button class="btn btn-primary" (click)="refreshData()" [disabled]="isRefreshing()">
            <span *ngIf="!isRefreshing()">🔄 Refresh</span>
            <span *ngIf="isRefreshing()">Refreshing...</span>
          </button>
        </div>
      </header>

      <!-- Loading State -->
      <app-loading-spinner 
        *ngIf="dataService.isLoading()"
        type="circle"
        size="large"
        message="Loading dashboard data..."
        showMessage="true"
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

      <!-- Dashboard Content -->
      <div class="dashboard-content" *ngIf="!dataService.isLoading() && !error()">
        
        <!-- League Overview Stats -->
        <section class="league-overview">
          <h2>League Overview</h2>
          <div class="stats-grid">
            <app-stat-display 
              [stat]="leagueStatsConfig().totalTeams"
              size="medium"
              variant="card">
            </app-stat-display>
            
            <app-stat-display 
              [stat]="leagueStatsConfig().currentWeek"
              size="medium"
              variant="highlighted">
            </app-stat-display>
            
            <app-stat-display 
              [stat]="leagueStatsConfig().avgPointsPerTeam"
              size="medium"
              variant="card">
            </app-stat-display>
            
            <app-stat-display 
              [stat]="leagueStatsConfig().totalPointsScored"
              size="medium"
              variant="card">
            </app-stat-display>
          </div>
        </section>

        <!-- Current Week Matchups -->
        <section class="current-matchups">
          <h2>Week {{ dataService.currentWeek() }} Matchups</h2>
          <div class="matchups-grid" *ngIf="currentMatchups().length > 0; else noMatchups">
            <div class="matchup-card" *ngFor="let matchup of currentMatchups()">
              <div class="matchup-teams">
                <div class="team away-team">
                  <div class="team-info">
                    <span class="team-name">{{ getTeamName(matchup.away.teamId) }}</span>
                    <span class="team-score">{{ matchup.away.totalPoints | number:'1.1-1' }}</span>
                  </div>
                </div>
                <div class="matchup-vs">VS</div>
                <div class="team home-team">
                  <div class="team-info">
                    <span class="team-name">{{ getTeamName(matchup.home.teamId) }}</span>
                    <span class="team-score">{{ matchup.home.totalPoints | number:'1.1-1' }}</span>
                  </div>
                </div>
              </div>
              <div class="matchup-status" *ngIf="matchup.winner">
                Winner: {{ getWinnerName(matchup) }}
              </div>
            </div>
          </div>
          
          <ng-template #noMatchups>
            <div class="no-data">
              <p>No matchups available for the current week.</p>
            </div>
          </ng-template>
        </section>

        <!-- Top Performers -->
        <section class="top-performers">
          <h2>League Standings (Top 6)</h2>
          <div class="standings-preview">
            <div class="team-row" *ngFor="let team of topTeams(); let i = index">
              <div class="rank">{{ i + 1 }}</div>
              <div class="team-info">
                <span class="team-name">{{ team.name }}</span>
                <span class="team-record">{{ getTeamRecord(team) }}</span>
              </div>
              <div class="team-points">{{ team.record.overall.pointsFor | number:'1.1-1' }} pts</div>
            </div>
          </div>
          <div class="standings-link">
            <a routerLink="/standings" class="btn btn-outline">View Full Standings</a>
          </div>
        </section>

        <!-- Quick Actions -->
        <section class="quick-actions">
          <h2>Quick Actions</h2>
          <div class="actions-grid">
            <a routerLink="/teams" class="action-card">
              <div class="action-icon">👥</div>
              <div class="action-title">Teams</div>
              <div class="action-description">View all teams and rosters</div>
            </a>
            
            <a routerLink="/matchups" class="action-card">
              <div class="action-icon">⚔️</div>
              <div class="action-title">Matchups</div>
              <div class="action-description">See all weekly matchups</div>
            </a>
            
            <a routerLink="/players" class="action-card">
              <div class="action-icon">🏈</div>
              <div class="action-title">Players</div>
              <div class="action-description">Browse player statistics</div>
            </a>
            
            <a routerLink="/standings" class="action-card">
              <div class="action-icon">🏆</div>
              <div class="action-title">Standings</div>
              <div class="action-description">Check league standings</div>
            </a>
          </div>
        </section>

      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border-color, #e0e0e0);
    }
    
    .dashboard-header h1 {
      margin: 0;
      color: var(--text-primary, #333);
      font-size: 2em;
      font-weight: 700;
    }
    
    .dashboard-actions {
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
    
    .btn-primary:hover:not(:disabled) {
      background: var(--primary-color-dark, #0056b3);
    }
    
    .btn-outline {
      background: transparent;
      border-color: var(--primary-color, #007bff);
      color: var(--primary-color, #007bff);
    }
    
    .btn-outline:hover {
      background: var(--primary-color, #007bff);
      color: white;
    }
    
    .dashboard-content > section {
      margin-bottom: 40px;
    }
    
    .dashboard-content h2 {
      margin: 0 0 20px 0;
      color: var(--text-primary, #333);
      font-size: 1.5em;
      font-weight: 600;
    }
    
    /* League Overview */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }
    
    /* Current Matchups */
    .matchups-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }
    
    .matchup-card {
      background: var(--card-background, #ffffff);
      border: 1px solid var(--card-border, #e0e0e0);
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .matchup-teams {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    
    .team {
      flex: 1;
      text-align: center;
    }
    
    .team-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .team-name {
      font-weight: 600;
      color: var(--text-primary, #333);
    }
    
    .team-score {
      font-size: 1.2em;
      font-weight: 700;
      color: var(--primary-color, #007bff);
    }
    
    .matchup-vs {
      font-size: 0.8em;
      font-weight: 600;
      color: var(--text-muted, #888);
      margin: 0 16px;
    }
    
    .matchup-status {
      text-align: center;
      font-size: 0.9em;
      font-weight: 500;
      color: var(--success-color, #28a745);
    }
    
    /* Top Performers */
    .standings-preview {
      background: var(--card-background, #ffffff);
      border: 1px solid var(--card-border, #e0e0e0);
      border-radius: 8px;
      overflow: hidden;
    }
    
    .team-row {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-color, #e0e0e0);
    }
    
    .team-row:last-child {
      border-bottom: none;
    }
    
    .team-row:nth-child(even) {
      background: var(--row-background, #f8f9fa);
    }
    
    .rank {
      width: 40px;
      font-weight: 700;
      font-size: 1.1em;
      color: var(--primary-color, #007bff);
    }
    
    .team-row .team-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .team-row .team-name {
      font-weight: 600;
      color: var(--text-primary, #333);
    }
    
    .team-record {
      font-size: 0.85em;
      color: var(--text-muted, #888);
    }
    
    .team-points {
      font-weight: 600;
      color: var(--text-primary, #333);
    }
    
    .standings-link {
      margin-top: 16px;
      text-align: center;
    }
    
    /* Quick Actions */
    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }
    
    .action-card {
      background: var(--card-background, #ffffff);
      border: 1px solid var(--card-border, #e0e0e0);
      border-radius: 8px;
      padding: 24px;
      text-decoration: none;
      color: var(--text-primary, #333);
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .action-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border-color: var(--primary-color, #007bff);
    }
    
    .action-icon {
      font-size: 2em;
      margin-bottom: 12px;
    }
    
    .action-title {
      font-size: 1.1em;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--text-primary, #333);
    }
    
    .action-description {
      font-size: 0.9em;
      color: var(--text-muted, #888);
      line-height: 1.4;
    }
    
    .no-data {
      text-align: center;
      padding: 40px;
      color: var(--text-muted, #888);
    }
    
    /* Responsive Design */
    @media (max-width: 768px) {
      .dashboard-container {
        padding: 16px;
      }
      
      .dashboard-header {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }
      
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
      }
      
      .matchups-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }
      
      .actions-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
      }
      
      .matchup-teams {
        flex-direction: column;
        gap: 16px;
      }
      
      .matchup-vs {
        margin: 8px 0;
      }
    }
    
    @media (max-width: 480px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }
      
      .actions-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly _isRefreshing = signal(false);
  private readonly _error = signal<string | null>(null);

  // Inject services
  protected readonly dataService = inject(DataService);
  private readonly errorHandler = inject(ErrorHandlerService);

  // Public signals
  readonly isRefreshing = this._isRefreshing.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed properties
  readonly currentMatchups = computed(() => {
    return this.dataService.currentWeekMatchups();
  });

  readonly topTeams = computed(() => {
    return this.dataService.standings().slice(0, 6);
  });

  readonly leagueStatsConfig = computed((): Record<string, StatConfig> => {
    const teams = this.dataService.teams();
    const league = this.dataService.league();
    
    const totalPoints = teams.reduce((sum, team) => sum + team.record.overall.pointsFor, 0);
    const avgPoints = teams.length > 0 ? totalPoints / teams.length : 0;

    return {
      totalTeams: {
        label: 'Total Teams',
        value: teams.length,
        format: 'number',
        icon: '👥'
      },
      currentWeek: {
        label: 'Current Week',
        value: this.dataService.currentWeek(),
        format: 'number',
        icon: '📅'
      },
      avgPointsPerTeam: {
        label: 'Avg Points/Team',
        value: avgPoints,
        format: 'number',
        decimals: 1,
        icon: '📊'
      },
      totalPointsScored: {
        label: 'Total Points',
        value: totalPoints,
        format: 'number',
        decimals: 0,
        icon: '🏈'
      }
    };
  });

  ngOnInit(): void {
    this.initializeDashboard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async initializeDashboard(): Promise<void> {
    try {
      this._error.set(null);
      await this.dataService.initializeData();
    } catch (error) {
      const errorMessage = this.errorHandler.getUserFriendlyMessage(error);
      this._error.set(errorMessage);
    }
  }

  async refreshData(): Promise<void> {
    this._isRefreshing.set(true);
    this._error.set(null);

    try {
      await this.dataService.refreshData();
    } catch (error) {
      const errorMessage = this.errorHandler.getUserFriendlyMessage(error);
      this._error.set(errorMessage);
    } finally {
      this._isRefreshing.set(false);
    }
  }

  getTeamName(teamId: number): string {
    const team = this.dataService.getTeamById(teamId);
    return team?.name || `Team ${teamId}`;
  }

  getTeamRecord(team: Team): string {
    const record = team.record.overall;
    return `${record.wins}-${record.losses}${record.ties ? `-${record.ties}` : ''}`;
  }

  getWinnerName(matchup: ScheduleItem): string {
    if (!matchup.winner) return '';
    
    if (matchup.winner === 'HOME') {
      return this.getTeamName(matchup.home.teamId);
    } else if (matchup.winner === 'AWAY') {
      return this.getTeamName(matchup.away.teamId);
    }
    
    return 'Tie';
  }
}