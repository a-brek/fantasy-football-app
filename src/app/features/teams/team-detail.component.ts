import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, switchMap, of } from 'rxjs';

import { DataService } from '../../core/services/data.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { PlayerCardComponent } from '../../shared/components/player-card.component';
import { StatDisplayComponent, StatConfig } from '../../shared/components/stat-display.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner.component';
import { ErrorDisplayComponent } from '../../shared/components/error-display.component';
import { Team, Player, RosterEntry, ScheduleItem } from '../../models/espn-fantasy.interfaces';

/**
 * Team detail component for displaying comprehensive team information
 * Features roster, matchup history, statistics, and performance metrics
 */
@Component({
  selector: 'app-team-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PlayerCardComponent,
    StatDisplayComponent,
    LoadingSpinnerComponent,
    ErrorDisplayComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="team-detail-container">
      
      <!-- Loading State -->
      <app-loading-spinner 
        *ngIf="isLoading()"
        type="circle"
        size="large"
        message="Loading team details..."
        showMessage="true"
        layout="inline">
      </app-loading-spinner>

      <!-- Error State -->
      <app-error-display
        *ngIf="error()"
        [error]="error()"
        [showActions]="true"
        [showRefreshButton]="true"
        (retry)="loadTeamData()"
        (refresh)="loadTeamData()">
      </app-error-display>

      <!-- Team Detail Content -->
      <div class="team-detail-content" *ngIf="!isLoading() && !error() && team()">
        
        <!-- Team Header -->
        <header class="team-header">
          <div class="team-basic-info">
            <div class="team-logo">
              <img [src]="team()!.logo" [alt]="team()!.name + ' logo'" 
                   (error)="onImageError($event)" />
            </div>
            <div class="team-info">
              <h1>{{ team()!.name }}</h1>
              <p class="team-abbreviation">{{ team()!.abbrev }}</p>
              <p class="team-owners">{{ ownerNames() }}</p>
            </div>
          </div>
          
          <div class="team-actions">
            <button class="btn btn-primary" (click)="goBack()">
              ← Back to Teams
            </button>
            <button class="btn btn-secondary" (click)="viewRoster()">
              View Roster
            </button>
          </div>
        </header>

        <!-- Team Statistics Overview -->
        <section class="team-statistics">
          <h2>Season Statistics</h2>
          <div class="stats-grid">
            <app-stat-display 
              [stat]="teamStats().record"
              size="large"
              variant="highlighted">
            </app-stat-display>
            
            <app-stat-display 
              [stat]="teamStats().winPercentage"
              size="large"
              variant="success">
            </app-stat-display>
            
            <app-stat-display 
              [stat]="teamStats().pointsFor"
              size="large"
              variant="card">
            </app-stat-display>
            
            <app-stat-display 
              [stat]="teamStats().pointsAgainst"
              size="large"
              variant="card">
            </app-stat-display>
          </div>
          
          <div class="stats-secondary">
            <app-stat-display 
              [stat]="teamStats().pointsDifferential"
              size="medium"
              [variant]="teamStats().pointsDifferential.value >= 0 ? 'success' : 'danger'">
            </app-stat-display>
            
            <app-stat-display 
              [stat]="teamStats().avgPointsPerGame"
              size="medium"
              variant="card">
            </app-stat-display>
            
            <app-stat-display 
              [stat]="teamStats().currentStreak"
              size="medium"
              [variant]="getStreakVariant()">
            </app-stat-display>
            
            <app-stat-display 
              [stat]="teamStats().playoffSeed"
              size="medium"
              variant="highlighted">
            </app-stat-display>
          </div>
        </section>

        <!-- Record Breakdown -->
        <section class="record-breakdown">
          <h2>Record Breakdown</h2>
          <div class="record-categories">
            <div class="record-category">
              <h3>Overall</h3>
              <div class="record-stats">
                <app-stat-display [stat]="recordStats().overall.wins" size="small"></app-stat-display>
                <app-stat-display [stat]="recordStats().overall.losses" size="small"></app-stat-display>
                <app-stat-display [stat]="recordStats().overall.ties" size="small" 
                                  *ngIf="recordStats().overall.ties.value > 0"></app-stat-display>
              </div>
            </div>
            
            <div class="record-category">
              <h3>Home Games</h3>
              <div class="record-stats">
                <app-stat-display [stat]="recordStats().home.wins" size="small"></app-stat-display>
                <app-stat-display [stat]="recordStats().home.losses" size="small"></app-stat-display>
              </div>
            </div>
            
            <div class="record-category">
              <h3>Away Games</h3>
              <div class="record-stats">
                <app-stat-display [stat]="recordStats().away.wins" size="small"></app-stat-display>
                <app-stat-display [stat]="recordStats().away.losses" size="small"></app-stat-display>
              </div>
            </div>
            
            <div class="record-category">
              <h3>Division</h3>
              <div class="record-stats">
                <app-stat-display [stat]="recordStats().division.wins" size="small"></app-stat-display>
                <app-stat-display [stat]="recordStats().division.losses" size="small"></app-stat-display>
              </div>
            </div>
          </div>
        </section>

        <!-- Recent Matchups -->
        <section class="recent-matchups">
          <h2>Recent Matchups</h2>
          <div class="matchups-list" *ngIf="recentMatchups().length > 0; else noMatchups">
            <div class="matchup-item" *ngFor="let matchup of recentMatchups()">
              <div class="matchup-week">Week {{ matchup.matchupPeriodId }}</div>
              <div class="matchup-teams">
                <div class="team" [class.current-team]="isCurrentTeam(matchup.away.teamId)">
                  <span class="team-name">{{ getTeamName(matchup.away.teamId) }}</span>
                  <span class="team-score">{{ matchup.away.totalPoints | number:'1.1-1' }}</span>
                </div>
                <div class="vs">vs</div>
                <div class="team" [class.current-team]="isCurrentTeam(matchup.home.teamId)">
                  <span class="team-name">{{ getTeamName(matchup.home.teamId) }}</span>
                  <span class="team-score">{{ matchup.home.totalPoints | number:'1.1-1' }}</span>
                </div>
              </div>
              <div class="matchup-result" [class]="getMatchupResultClass(matchup)">
                {{ getMatchupResult(matchup) }}
              </div>
            </div>
          </div>
          
          <ng-template #noMatchups>
            <div class="no-data">
              <p>No matchup data available.</p>
            </div>
          </ng-template>
        </section>

        <!-- Top Roster Players (if roster data available) -->
        <section class="top-players" *ngIf="topRosterPlayers().length > 0">
          <h2>Top Roster Players</h2>
          <div class="players-grid">
            <app-player-card
              *ngFor="let entry of topRosterPlayers(); trackBy: trackByPlayerId"
              [player]="entry.playerPoolEntry.player"
              [rosterEntry]="entry"
              [showStats]="true"
              [showActions]="false"
              [canMove]="false"
              [canDrop]="false">
            </app-player-card>
          </div>
        </section>

        <!-- Quick Actions -->
        <section class="team-actions-section">
          <h2>Actions</h2>
          <div class="actions-grid">
            <button class="action-btn" (click)="viewRoster()">
              <div class="action-icon">👥</div>
              <div class="action-text">View Full Roster</div>
            </button>
            
            <button class="action-btn" (click)="viewAllMatchups()">
              <div class="action-icon">⚔️</div>
              <div class="action-text">All Matchups</div>
            </button>
            
            <button class="action-btn" (click)="compareTeams()">
              <div class="action-icon">📊</div>
              <div class="action-text">Compare Teams</div>
            </button>
          </div>
        </section>

      </div>

      <!-- Team Not Found -->
      <div class="team-not-found" *ngIf="!isLoading() && !error() && !team()">
        <h2>Team Not Found</h2>
        <p>The requested team could not be found.</p>
        <button class="btn btn-primary" (click)="goBack()">
          ← Back to Teams
        </button>
      </div>

    </div>
  `,
  styles: [`
    .team-detail-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    /* Team Header */
    .team-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding: 24px;
      background: var(--card-background, #ffffff);
      border: 1px solid var(--card-border, #e0e0e0);
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .team-basic-info {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    
    .team-logo {
      width: 80px;
      height: 80px;
      flex-shrink: 0;
    }
    
    .team-logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 8px;
    }
    
    .team-info h1 {
      margin: 0 0 8px 0;
      font-size: 2.5em;
      font-weight: 700;
      color: var(--text-primary, #333);
    }
    
    .team-abbreviation {
      margin: 0 0 8px 0;
      font-size: 1.2em;
      font-weight: 600;
      color: var(--text-secondary, #666);
    }
    
    .team-owners {
      margin: 0;
      font-size: 1em;
      color: var(--text-muted, #888);
    }
    
    .team-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    
    .btn {
      padding: 10px 20px;
      border: 1px solid;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
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
    
    /* Statistics Section */
    .team-statistics {
      margin-bottom: 40px;
    }
    
    .team-statistics h2 {
      margin: 0 0 20px 0;
      font-size: 1.8em;
      font-weight: 600;
      color: var(--text-primary, #333);
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }
    
    .stats-secondary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
    }
    
    /* Record Breakdown */
    .record-breakdown {
      margin-bottom: 40px;
    }
    
    .record-breakdown h2 {
      margin: 0 0 20px 0;
      font-size: 1.8em;
      font-weight: 600;
      color: var(--text-primary, #333);
    }
    
    .record-categories {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }
    
    .record-category {
      background: var(--card-background, #ffffff);
      border: 1px solid var(--card-border, #e0e0e0);
      border-radius: 8px;
      padding: 20px;
    }
    
    .record-category h3 {
      margin: 0 0 16px 0;
      font-size: 1.1em;
      font-weight: 600;
      color: var(--text-primary, #333);
      text-align: center;
      border-bottom: 1px solid var(--border-color, #e0e0e0);
      padding-bottom: 8px;
    }
    
    .record-stats {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }
    
    /* Recent Matchups */
    .recent-matchups {
      margin-bottom: 40px;
    }
    
    .recent-matchups h2 {
      margin: 0 0 20px 0;
      font-size: 1.8em;
      font-weight: 600;
      color: var(--text-primary, #333);
    }
    
    .matchups-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .matchup-item {
      background: var(--card-background, #ffffff);
      border: 1px solid var(--card-border, #e0e0e0);
      border-radius: 8px;
      padding: 20px;
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 20px;
      align-items: center;
    }
    
    .matchup-week {
      font-size: 0.9em;
      font-weight: 600;
      color: var(--text-muted, #888);
      text-transform: uppercase;
    }
    
    .matchup-teams {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
    }
    
    .team {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px 12px;
      border-radius: 6px;
      transition: all 0.2s ease;
    }
    
    .team.current-team {
      background: var(--primary-color-light, #e3f2fd);
      border: 1px solid var(--primary-color, #007bff);
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
    
    .vs {
      font-size: 0.8em;
      font-weight: 600;
      color: var(--text-muted, #888);
    }
    
    .matchup-result {
      font-size: 0.9em;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 4px;
      text-align: center;
      min-width: 60px;
    }
    
    .matchup-result.win {
      background: var(--success-color, #28a745);
      color: white;
    }
    
    .matchup-result.loss {
      background: var(--danger-color, #dc3545);
      color: white;
    }
    
    .matchup-result.tie {
      background: var(--warning-color, #ffc107);
      color: var(--text-primary, #333);
    }
    
    /* Top Players */
    .top-players {
      margin-bottom: 40px;
    }
    
    .top-players h2 {
      margin: 0 0 20px 0;
      font-size: 1.8em;
      font-weight: 600;
      color: var(--text-primary, #333);
    }
    
    .players-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
    }
    
    /* Team Actions Section */
    .team-actions-section h2 {
      margin: 0 0 20px 0;
      font-size: 1.8em;
      font-weight: 600;
      color: var(--text-primary, #333);
    }
    
    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    
    .action-btn {
      background: var(--card-background, #ffffff);
      border: 1px solid var(--card-border, #e0e0e0);
      border-radius: 8px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      text-align: center;
    }
    
    .action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border-color: var(--primary-color, #007bff);
    }
    
    .action-icon {
      font-size: 2em;
    }
    
    .action-text {
      font-weight: 600;
      color: var(--text-primary, #333);
    }
    
    /* Utility classes */
    .no-data {
      text-align: center;
      padding: 40px;
      color: var(--text-muted, #888);
    }
    
    .team-not-found {
      text-align: center;
      padding: 60px 20px;
    }
    
    .team-not-found h2 {
      margin: 0 0 16px 0;
      color: var(--text-primary, #333);
    }
    
    .team-not-found p {
      margin: 0 0 24px 0;
      color: var(--text-muted, #888);
    }
    
    /* Responsive Design */
    @media (max-width: 768px) {
      .team-detail-container {
        padding: 16px;
      }
      
      .team-header {
        flex-direction: column;
        gap: 20px;
        align-items: stretch;
      }
      
      .team-basic-info {
        flex-direction: column;
        text-align: center;
        gap: 16px;
      }
      
      .team-logo {
        align-self: center;
      }
      
      .team-info h1 {
        font-size: 2em;
      }
      
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
      }
      
      .stats-secondary {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
      
      .record-categories {
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
      }
      
      .matchup-item {
        grid-template-columns: 1fr;
        gap: 16px;
        text-align: center;
      }
      
      .players-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }
      
      .actions-grid {
        grid-template-columns: 1fr;
      }
    }
    
    @media (max-width: 480px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }
      
      .stats-secondary {
        grid-template-columns: 1fr;
      }
      
      .record-categories {
        grid-template-columns: 1fr;
      }
      
      .matchup-teams {
        flex-direction: column;
        gap: 12px;
      }
    }
  `]
})
export class TeamDetailComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _team = signal<Team | null>(null);
  private readonly _teamId = signal<number | null>(null);

  // Inject services
  protected readonly dataService = inject(DataService);
  private readonly errorHandler = inject(ErrorHandlerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Public signals
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly team = this._team.asReadonly();

  // Computed properties
  readonly ownerNames = computed(() => {
    const team = this._team();
    const league = this.dataService.league();
    
    if (!team || !league?.members) return 'Unknown Owner';
    
    const names = team.owners.map(ownerId => {
      const member = league.members.find(m => m.id === ownerId);
      return member?.displayName || 'Unknown';
    });
    
    return names.join(', ');
  });

  readonly teamStats = computed((): Record<string, StatConfig> => {
    const team = this._team();
    if (!team) return {};

    const record = team.record.overall;
    const totalGames = record.wins + record.losses + record.ties;
    const avgPointsPerGame = totalGames > 0 ? record.pointsFor / totalGames : 0;
    const pointsDiff = record.pointsFor - record.pointsAgainst;
    
    const streakText = record.streakLength > 0 
      ? `${record.streakType.charAt(0)}${record.streakLength}`
      : 'None';

    return {
      record: {
        label: 'Record',
        value: `${record.wins}-${record.losses}${record.ties ? `-${record.ties}` : ''}`,
        format: 'custom'
      },
      winPercentage: {
        label: 'Win Percentage',
        value: record.percentage,
        format: 'percentage',
        decimals: 1
      },
      pointsFor: {
        label: 'Points For',
        value: record.pointsFor,
        format: 'number',
        decimals: 1
      },
      pointsAgainst: {
        label: 'Points Against',
        value: record.pointsAgainst,
        format: 'number',
        decimals: 1
      },
      pointsDifferential: {
        label: 'Point Differential',
        value: pointsDiff,
        format: 'number',
        decimals: 1,
        prefix: pointsDiff >= 0 ? '+' : ''
      },
      avgPointsPerGame: {
        label: 'Avg Points/Game',
        value: avgPointsPerGame,
        format: 'number',
        decimals: 1
      },
      currentStreak: {
        label: 'Current Streak',
        value: streakText,
        format: 'custom'
      },
      playoffSeed: {
        label: 'Playoff Seed',
        value: team.playoffSeed || 'N/A',
        format: 'custom'
      }
    };
  });

  readonly recordStats = computed(() => {
    const team = this._team();
    if (!team) return {};

    return {
      overall: {
        wins: { label: 'Wins', value: team.record.overall.wins, format: 'number' as const },
        losses: { label: 'Losses', value: team.record.overall.losses, format: 'number' as const },
        ties: { label: 'Ties', value: team.record.overall.ties, format: 'number' as const }
      },
      home: {
        wins: { label: 'Wins', value: team.record.home.wins, format: 'number' as const },
        losses: { label: 'Losses', value: team.record.home.losses, format: 'number' as const }
      },
      away: {
        wins: { label: 'Wins', value: team.record.away.wins, format: 'number' as const },
        losses: { label: 'Losses', value: team.record.away.losses, format: 'number' as const }
      },
      division: {
        wins: { label: 'Wins', value: team.record.division.wins, format: 'number' as const },
        losses: { label: 'Losses', value: team.record.division.losses, format: 'number' as const }
      }
    };
  });

  readonly recentMatchups = computed(() => {
    const teamId = this._teamId();
    if (!teamId) return [];

    const matchups = this.dataService.getTeamMatchups(teamId);
    return matchups
      .slice()
      .sort((a, b) => b.matchupPeriodId - a.matchupPeriodId)
      .slice(0, 5); // Show last 5 matchups
  });

  readonly topRosterPlayers = computed(() => {
    const teamId = this._teamId();
    if (!teamId) return [];

    const roster = this.dataService.getTeamRoster(teamId);
    return roster
      .filter(entry => entry.playerPoolEntry?.player)
      .slice()
      .sort((a, b) => {
        // Sort by applied total (fantasy points) if available
        const aTotal = a.playerPoolEntry.appliedStatTotal || 0;
        const bTotal = b.playerPoolEntry.appliedStatTotal || 0;
        return bTotal - aTotal;
      })
      .slice(0, 6); // Show top 6 players
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(
      takeUntil(this.destroy$),
      switchMap(params => {
        const teamId = params.get('id');
        if (teamId) {
          this._teamId.set(+teamId);
          this.loadTeamData();
        }
        return of(null);
      })
    ).subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadTeamData(): Promise<void> {
    const teamId = this._teamId();
    if (!teamId) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      // Ensure we have team data
      if (this.dataService.teams().length === 0) {
        await this.dataService.initializeData();
      }

      const team = this.dataService.getTeamById(teamId);
      if (team) {
        this._team.set(team);
      } else {
        this._error.set(`Team with ID ${teamId} not found`);
      }
    } catch (error) {
      const errorMessage = this.errorHandler.getUserFriendlyMessage(error);
      this._error.set(errorMessage);
    } finally {
      this._isLoading.set(false);
    }
  }

  getTeamName(teamId: number): string {
    const team = this.dataService.getTeamById(teamId);
    return team?.name || `Team ${teamId}`;
  }

  isCurrentTeam(teamId: number): boolean {
    return teamId === this._teamId();
  }

  getMatchupResult(matchup: ScheduleItem): string {
    const teamId = this._teamId();
    if (!teamId || !matchup.winner) return 'In Progress';

    const isHome = matchup.home.teamId === teamId;
    const isAway = matchup.away.teamId === teamId;

    if (matchup.winner === 'TIE') return 'Tie';
    if ((matchup.winner === 'HOME' && isHome) || (matchup.winner === 'AWAY' && isAway)) {
      return 'Win';
    }
    return 'Loss';
  }

  getMatchupResultClass(matchup: ScheduleItem): string {
    const result = this.getMatchupResult(matchup);
    return result.toLowerCase();
  }

  getStreakVariant(): string {
    const team = this._team();
    if (!team) return 'default';

    const streakType = team.record.overall.streakType;
    switch (streakType) {
      case 'WIN': return 'success';
      case 'LOSS': return 'danger';
      default: return 'warning';
    }
  }

  goBack(): void {
    this.router.navigate(['/teams']);
  }

  viewRoster(): void {
    const teamId = this._teamId();
    if (teamId) {
      this.router.navigate(['/teams', teamId, 'roster']);
    }
  }

  viewAllMatchups(): void {
    this.router.navigate(['/matchups']);
  }

  compareTeams(): void {
    // This would navigate to a team comparison feature
    this.router.navigate(['/teams/compare']);
  }

  trackByPlayerId(index: number, entry: RosterEntry): number {
    return entry.playerId;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiByeD0iOCIgZmlsbD0iI0Y4RjlGQSIvPgo8cGF0aCBkPSJNNDAgNTZDNDkuOTQxMSA1NiA1OCA0Ny45NDExIDU4IDM4QzU4IDI4LjA1ODkgNDkuOTQxMSAyMCA0MCAyMEMzMC4wNTg5IDIwIDIyIDI4LjA1ODkgMjIgMzhDMjIgNDcuOTQxMSAzMC4wNTg5IDU2IDQwIDU2WiIgZmlsbD0iI0RERERERCIvPgo8L3N2Zz4K';
  }
}