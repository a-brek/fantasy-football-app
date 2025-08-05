import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { DataService } from '../../core/services/data.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { TeamCardComponent } from '../../shared/components/team-card.component';
import { StatDisplayComponent, StatConfig } from '../../shared/components/stat-display.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner.component';
import { ErrorDisplayComponent } from '../../shared/components/error-display.component';
import { Team } from '../../models/espn-fantasy.interfaces';

/**
 * Team list component for displaying all teams in the league
 * Features filtering, sorting, and detailed team information
 */
@Component({
  selector: 'app-team-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    TeamCardComponent,
    StatDisplayComponent,
    LoadingSpinnerComponent,
    ErrorDisplayComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="team-list-container">
      <header class="team-list-header">
        <h1>League Teams</h1>
        <div class="header-actions">
          <button class="btn btn-primary" (click)="refreshData()" [disabled]="isRefreshing()">
            <span *ngIf="!isRefreshing()">🔄 Refresh</span>
            <span *ngIf="isRefreshing()">Refreshing...</span>
          </button>
        </div>
      </header>

      <!-- Loading State -->
      <app-loading-spinner 
        *ngIf="dataService.isLoadingTeams()"
        type="circle"
        size="large"
        message="Loading teams..."
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

      <!-- Team List Content -->
      <div class="team-list-content" *ngIf="!dataService.isLoadingTeams() && !error()">
        
        <!-- Filters and Controls -->
        <section class="team-controls">
          <div class="search-filter">
            <input
              type="text"
              class="search-input"
              placeholder="Search teams..."
              [(ngModel)]="searchTerm"
              (input)="updateSearchTerm($event)">
          </div>
          
          <div class="sort-filter">
            <label for="sortBy">Sort by:</label>
            <select id="sortBy" [(ngModel)]="sortBy" (change)="updateSortBy($event)">
              <option value="wins">Wins</option>
              <option value="losses">Losses</option>
              <option value="pointsFor">Points For</option>
              <option value="pointsAgainst">Points Against</option>
              <option value="name">Team Name</option>
            </select>
          </div>
          
          <div class="sort-direction">
            <button 
              class="btn btn-secondary btn-sm"
              (click)="toggleSortDirection()"
              [title]="sortDirection() === 'asc' ? 'Sort Descending' : 'Sort Ascending'">
              {{ sortDirection() === 'asc' ? '↑' : '↓' }}
            </button>
          </div>
          
          <div class="view-toggle">
            <button 
              class="btn btn-secondary btn-sm"
              [class.active]="viewMode() === 'grid'"
              (click)="setViewMode('grid')">
              Grid
            </button>
            <button 
              class="btn btn-secondary btn-sm"
              [class.active]="viewMode() === 'list'"
              (click)="setViewMode('list')">
              List
            </button>
          </div>
        </section>

        <!-- League Summary Stats -->
        <section class="league-summary">
          <div class="summary-stats">
            <app-stat-display 
              [stat]="summaryStats().totalTeams"
              size="small"
              variant="card">
            </app-stat-display>
            
            <app-stat-display 
              [stat]="summaryStats().avgWins"
              size="small"
              variant="card">
            </app-stat-display>
            
            <app-stat-display 
              [stat]="summaryStats().highestScore"
              size="small"
              variant="highlighted">
            </app-stat-display>
            
            <app-stat-display 
              [stat]="summaryStats().lowestScore"
              size="small"
              variant="card">
            </app-stat-display>
          </div>
        </section>

        <!-- Teams Display -->
        <section class="teams-section">
          <div class="teams-container" [class]="viewMode()">
            <div class="no-teams" *ngIf="filteredTeams().length === 0">
              <p>No teams found matching your search criteria.</p>
            </div>
            
            <app-team-card
              *ngFor="let team of filteredTeams(); trackBy: trackByTeamId"
              [team]="team"
              [isSelected]="selectedTeam()?.id === team.id"
              [owners]="ownerMap()"
              [showActions]="true"
              [showRosterButton]="true"
              (teamClick)="selectTeam(team)"
              (viewDetails)="viewTeamDetails(team)"
              (viewRoster)="viewTeamRoster(team)">
            </app-team-card>
          </div>
        </section>

        <!-- Team Comparison (when team is selected) -->
        <section class="team-comparison" *ngIf="selectedTeam()">
          <h3>{{ selectedTeam()?.name }} Details</h3>
          <div class="comparison-stats">
            <div class="stat-group">
              <h4>Record</h4>
              <div class="stats-row">
                <app-stat-display 
                  [stat]="selectedTeamStats().wins"
                  size="small">
                </app-stat-display>
                <app-stat-display 
                  [stat]="selectedTeamStats().losses"
                  size="small">
                </app-stat-display>
                <app-stat-display 
                  [stat]="selectedTeamStats().ties"
                  size="small"
                  *ngIf="selectedTeamStats().ties.value > 0">
                </app-stat-display>
              </div>
            </div>
            
            <div class="stat-group">
              <h4>Scoring</h4>
              <div class="stats-row">
                <app-stat-display 
                  [stat]="selectedTeamStats().pointsFor"
                  size="small"
                  variant="success">
                </app-stat-display>
                <app-stat-display 
                  [stat]="selectedTeamStats().pointsAgainst"
                  size="small"
                  variant="warning">
                </app-stat-display>
                <app-stat-display 
                  [stat]="selectedTeamStats().pointsDiff"
                  size="small"
                  [variant]="selectedTeamStats().pointsDiff.value >= 0 ? 'success' : 'danger'">
                </app-stat-display>
              </div>
            </div>
            
            <div class="stat-group">
              <h4>Performance</h4>
              <div class="stats-row">
                <app-stat-display 
                  [stat]="selectedTeamStats().winPercentage"
                  size="small"
                  variant="highlighted">
                </app-stat-display>
                <app-stat-display 
                  [stat]="selectedTeamStats().avgPointsPerGame"
                  size="small">
                </app-stat-display>
              </div>
            </div>
          </div>
          
          <div class="team-actions">
            <button class="btn btn-primary" (click)="viewTeamDetails(selectedTeam()!)">
              View Full Details
            </button>
            <button class="btn btn-secondary" (click)="viewTeamRoster(selectedTeam()!)">
              View Roster
            </button>
            <button class="btn btn-outline" (click)="clearSelection()">
              Clear Selection
            </button>
          </div>
        </section>

      </div>
    </div>
  `,
  styles: [`
    .team-list-container {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }
    
    .team-list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border-color, #e0e0e0);
    }
    
    .team-list-header h1 {
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
    
    .btn-secondary.active {
      background: var(--primary-color, #007bff);
      border-color: var(--primary-color, #007bff);
    }
    
    .btn-outline {
      border-color: var(--primary-color, #007bff);
      color: var(--primary-color, #007bff);
    }
    
    .btn-outline:hover {
      background: var(--primary-color, #007bff);
      color: white;
    }
    
    .btn-sm {
      padding: 4px 8px;
      font-size: 0.875em;
    }
    
    /* Team Controls */
    .team-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: center;
      margin-bottom: 30px;
      padding: 20px;
      background: var(--card-background, #ffffff);
      border: 1px solid var(--card-border, #e0e0e0);
      border-radius: 8px;
    }
    
    .search-filter {
      flex: 1;
      min-width: 200px;
    }
    
    .search-input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--input-border, #ccc);
      border-radius: 4px;
      font-size: 0.9em;
    }
    
    .sort-filter {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .sort-filter label {
      font-size: 0.9em;
      font-weight: 500;
      color: var(--text-primary, #333);
    }
    
    .sort-filter select {
      padding: 6px 10px;
      border: 1px solid var(--input-border, #ccc);
      border-radius: 4px;
      font-size: 0.9em;
    }
    
    .view-toggle {
      display: flex;
      gap: 4px;
    }
    
    /* League Summary */
    .league-summary {
      margin-bottom: 30px;
    }
    
    .summary-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
    }
    
    /* Teams Display */
    .teams-container.grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
    }
    
    .teams-container.list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .no-teams {
      text-align: center;
      padding: 40px;
      color: var(--text-muted, #888);
      grid-column: 1 / -1;
    }
    
    /* Team Comparison */
    .team-comparison {
      margin-top: 40px;
      padding: 24px;
      background: var(--card-background, #ffffff);
      border: 1px solid var(--card-border, #e0e0e0);
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .team-comparison h3 {
      margin: 0 0 20px 0;
      color: var(--text-primary, #333);
      font-size: 1.4em;
      font-weight: 600;
    }
    
    .comparison-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
      margin-bottom: 24px;
    }
    
    .stat-group h4 {
      margin: 0 0 12px 0;
      color: var(--text-primary, #333);
      font-size: 1.1em;
      font-weight: 600;
    }
    
    .stats-row {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    
    .team-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: center;
    }
    
    /* Responsive Design */
    @media (max-width: 768px) {
      .team-list-container {
        padding: 16px;
      }
      
      .team-list-header {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }
      
      .team-controls {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
      }
      
      .search-filter {
        min-width: auto;
      }
      
      .sort-filter {
        justify-content: space-between;
      }
      
      .teams-container.grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }
      
      .summary-stats {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
      
      .comparison-stats {
        grid-template-columns: 1fr;
        gap: 16px;
      }
      
      .team-actions {
        flex-direction: column;
      }
    }
    
    @media (max-width: 480px) {
      .summary-stats {
        grid-template-columns: 1fr;
      }
      
      .stats-row {
        justify-content: center;
      }
    }
  `]
})
export class TeamListComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly _isRefreshing = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _searchTerm = signal('');
  private readonly _sortBy = signal<'wins' | 'losses' | 'pointsFor' | 'pointsAgainst' | 'name'>('wins');
  private readonly _sortDirection = signal<'asc' | 'desc'>('desc');
  private readonly _viewMode = signal<'grid' | 'list'>('grid');
  private readonly _selectedTeam = signal<Team | null>(null);

  // Inject services
  protected readonly dataService = inject(DataService);
  private readonly errorHandler = inject(ErrorHandlerService);
  private readonly router = inject(Router);

  // Public signals
  readonly isRefreshing = this._isRefreshing.asReadonly();
  readonly error = this._error.asReadonly();
  readonly searchTerm = this._searchTerm.asReadonly();
  readonly sortBy = this._sortBy.asReadonly();
  readonly sortDirection = this._sortDirection.asReadonly();
  readonly viewMode = this._viewMode.asReadonly();
  readonly selectedTeam = this._selectedTeam.asReadonly();

  // Computed properties
  readonly filteredTeams = computed(() => {
    let teams = this.dataService.teams();
    const search = this._searchTerm().toLowerCase();
    const sortBy = this._sortBy();
    const sortDir = this._sortDirection();

    // Filter by search term
    if (search) {
      teams = teams.filter(team => 
        team.name.toLowerCase().includes(search) ||
        team.abbrev.toLowerCase().includes(search)
      );
    }

    // Sort teams
    teams = teams.slice().sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'wins':
          aValue = a.record.overall.wins;
          bValue = b.record.overall.wins;
          break;
        case 'losses':
          aValue = a.record.overall.losses;
          bValue = b.record.overall.losses;
          break;
        case 'pointsFor':
          aValue = a.record.overall.pointsFor;
          bValue = b.record.overall.pointsFor;
          break;
        case 'pointsAgainst':
          aValue = a.record.overall.pointsAgainst;
          bValue = b.record.overall.pointsAgainst;
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        default:
          return 0;
      }

      if (sortDir === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    return teams;
  });

  readonly ownerMap = computed(() => {
    const league = this.dataService.league();
    const ownerMap: { [key: string]: string } = {};
    
    if (league?.members) {
      league.members.forEach(member => {
        ownerMap[member.id] = member.displayName;
      });
    }
    
    return ownerMap;
  });

  readonly summaryStats = computed((): Record<string, StatConfig> => {
    const teams = this.dataService.teams();
    
    if (teams.length === 0) {
      return {
        totalTeams: { label: 'Total Teams', value: 0 },
        avgWins: { label: 'Avg Wins', value: 0 },
        highestScore: { label: 'Highest Score', value: 0 },
        lowestScore: { label: 'Lowest Score', value: 0 }
      };
    }

    const totalWins = teams.reduce((sum, team) => sum + team.record.overall.wins, 0);
    const avgWins = totalWins / teams.length;
    
    const pointsFor = teams.map(team => team.record.overall.pointsFor);
    const highestScore = Math.max(...pointsFor);
    const lowestScore = Math.min(...pointsFor);

    return {
      totalTeams: {
        label: 'Total Teams',
        value: teams.length,
        format: 'number',
        icon: '👥'
      },
      avgWins: {
        label: 'Avg Wins',
        value: avgWins,
        format: 'number',
        decimals: 1,
        icon: '🏆'
      },
      highestScore: {
        label: 'Highest Score',
        value: highestScore,
        format: 'number',
        decimals: 1,
        icon: '🔥'
      },
      lowestScore: {
        label: 'Lowest Score',
        value: lowestScore,
        format: 'number',
        decimals: 1,
        icon: '❄️'
      }
    };
  });

  readonly selectedTeamStats = computed((): Record<string, StatConfig> => {
    const team = this._selectedTeam();
    if (!team) return {};

    const record = team.record.overall;
    const totalGames = record.wins + record.losses + record.ties;
    const pointsDiff = record.pointsFor - record.pointsAgainst;
    const avgPointsPerGame = totalGames > 0 ? record.pointsFor / totalGames : 0;

    return {
      wins: {
        label: 'Wins',
        value: record.wins,
        format: 'number',
        color: 'var(--success-color, #28a745)'
      },
      losses: {
        label: 'Losses',
        value: record.losses,
        format: 'number',
        color: 'var(--danger-color, #dc3545)'
      },
      ties: {
        label: 'Ties',
        value: record.ties,
        format: 'number',
        color: 'var(--warning-color, #ffc107)'
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
      pointsDiff: {
        label: 'Point Diff',
        value: pointsDiff,
        format: 'number',
        decimals: 1,
        prefix: pointsDiff >= 0 ? '+' : ''
      },
      winPercentage: {
        label: 'Win %',
        value: record.percentage,
        format: 'percentage',
        decimals: 1
      },
      avgPointsPerGame: {
        label: 'Avg/Game',
        value: avgPointsPerGame,
        format: 'number',
        decimals: 1
      }
    };
  });

  ngOnInit(): void {
    this.initializeTeamList();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async initializeTeamList(): Promise<void> {
    try {
      this._error.set(null);
      if (this.dataService.teams().length === 0) {
        await this.dataService.loadTeams();
      }
    } catch (error) {
      const errorMessage = this.errorHandler.getUserFriendlyMessage(error);
      this._error.set(errorMessage);
    }
  }

  async refreshData(): Promise<void> {
    this._isRefreshing.set(true);
    this._error.set(null);

    try {
      await this.dataService.loadTeams();
    } catch (error) {
      const errorMessage = this.errorHandler.getUserFriendlyMessage(error);
      this._error.set(errorMessage);
    } finally {
      this._isRefreshing.set(false);
    }
  }

  updateSearchTerm(event: Event): void {
    const target = event.target as HTMLInputElement;
    this._searchTerm.set(target.value);
  }

  updateSortBy(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this._sortBy.set(target.value as any);
  }

  toggleSortDirection(): void {
    const current = this._sortDirection();
    this._sortDirection.set(current === 'asc' ? 'desc' : 'asc');
  }

  setViewMode(mode: 'grid' | 'list'): void {
    this._viewMode.set(mode);
  }

  selectTeam(team: Team): void {
    const current = this._selectedTeam();
    this._selectedTeam.set(current?.id === team.id ? null : team);
  }

  clearSelection(): void {
    this._selectedTeam.set(null);
  }

  viewTeamDetails(team: Team): void {
    this.router.navigate(['/teams', team.id]);
  }

  viewTeamRoster(team: Team): void {
    this.router.navigate(['/teams', team.id, 'roster']);
  }

  trackByTeamId(index: number, team: Team): number {
    return team.id;
  }
}