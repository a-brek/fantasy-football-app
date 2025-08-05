import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { StubService, StubErrorHandler } from '../../stub.service';
import { PlayerCardComponent } from '../../shared/components/player-card.component';
import { StatDisplayComponent, StatConfig } from '../../shared/components/stat-display.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner.component';
import { ErrorDisplayComponent } from '../../shared/components/error-display.component';
import { Player, RosterEntry, PlayerPosition, Team } from '../../models/espn-fantasy.interfaces';

/**
 * Player list component for displaying all players across the league
 * Features filtering by position, team, status, and detailed player information
 */
@Component({
  selector: 'app-player-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    PlayerCardComponent,
    StatDisplayComponent,
    LoadingSpinnerComponent,
    ErrorDisplayComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="player-list-container">
      <header class="player-list-header">
        <h1>League Players</h1>
        <div class="header-actions">
          <button class="btn btn-primary" (click)="refreshData()" [disabled]="isRefreshing()">
            <span *ngIf="!isRefreshing()">🔄 Refresh</span>
            <span *ngIf="isRefreshing()">Refreshing...</span>
          </button>
        </div>
      </header>

      <!-- Loading State -->
      <app-loading-spinner 
        *ngIf="dataService.isLoadingRosters()"
        type="circle"
        size="large"
        message="Loading player data..."
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

      <!-- Player List Content -->
      <div class="player-list-content" *ngIf="!dataService.isLoadingRosters() && !error()">
        
        <!-- Filters and Controls -->
        <section class="player-controls">
          <div class="filter-row">
            <!-- Search -->
            <div class="search-filter">
              <input
                type="text"
                class="search-input"
                placeholder="Search players..."
                [(ngModel)]="searchTerm"
                (input)="updateSearchTerm($event)">
            </div>
            
            <!-- Position Filter -->
            <div class="position-filter">
              <label for="positionFilter">Position:</label>
              <select id="positionFilter" [(ngModel)]="selectedPosition" (change)="updatePositionFilter($event)">
                <option value="all">All Positions</option>
                <option value="QB">QB</option>
                <option value="RB">RB</option>
                <option value="WR">WR</option>
                <option value="TE">TE</option>
                <option value="K">K</option>
                <option value="DST">D/ST</option>
              </select>
            </div>
            
            <!-- Team Filter -->
            <div class="team-filter">
              <label for="teamFilter">Team:</label>
              <select id="teamFilter" [(ngModel)]="selectedTeam" (change)="updateTeamFilter($event)">
                <option value="all">All Teams</option>
                <option *ngFor="let team of availableTeams()" [value]="team.id">
                  {{ team.name }}
                </option>
              </select>
            </div>
            
            <!-- Status Filter -->
            <div class="status-filter">
              <label for="statusFilter">Status:</label>
              <select id="statusFilter" [(ngModel)]="selectedStatus" (change)="updateStatusFilter($event)">
                <option value="all">All Players</option>
                <option value="starter">Starters</option>
                <option value="bench">Bench</option>
                <option value="injured">Injured</option>
              </select>
            </div>
          </div>
          
          <div class="control-row">
            <!-- Sort Options -->
            <div class="sort-options">
              <label for="sortBy">Sort by:</label>
              <select id="sortBy" [(ngModel)]="sortBy" (change)="updateSortBy($event)">
                <option value="name">Player Name</option>
                <option value="position">Position</option>
                <option value="team">Team</option>
                <option value="points">Fantasy Points</option>
                <option value="ownership">Ownership %</option>
              </select>
              <button class="btn btn-sm btn-secondary" (click)="toggleSortDirection()">
                {{ sortDirection() === 'asc' ? '↑' : '↓' }}
              </button>
            </div>
            
            <!-- View Options -->
            <div class="view-options">
              <button 
                class="btn btn-sm btn-secondary"
                [class.active]="viewMode() === 'grid'"
                (click)="setViewMode('grid')">
                Grid
              </button>
              <button 
                class="btn btn-sm btn-secondary"
                [class.active]="viewMode() === 'list'"
                (click)="setViewMode('list')">
                List
              </button>
            </div>
            
            <!-- Clear Filters -->
            <button class="btn btn-sm btn-outline" (click)="clearFilters()">
              Clear Filters
            </button>
          </div>
        </section>

        <!-- Player Summary Stats -->
        <section class="player-summary">
          <div class="summary-stats">
            <app-stat-display 
              [stat]="playerStats().totalPlayers"
              size="medium"
              variant="card">
            </app-stat-display>
            
            <app-stat-display 
              [stat]="playerStats().filteredPlayers"
              size="medium"
              variant="highlighted">
            </app-stat-display>
            
            <app-stat-display 
              [stat]="playerStats().avgFantasyPoints"
              size="medium"
              variant="card">
            </app-stat-display>
            
            <app-stat-display 
              [stat]="playerStats().injuredPlayers"
              size="medium"
              variant="warning">
            </app-stat-display>
          </div>
        </section>

        <!-- Position Breakdown (if no position filter) -->
        <section class="position-breakdown" *ngIf="selectedPosition === 'all'">
          <h2>Position Breakdown</h2>
          <div class="position-stats">
            <div *ngFor="let position of positionBreakdown()" class="position-stat">
              <app-stat-display 
                [stat]="position.stat"
                size="small"
                variant="card">
              </app-stat-display>
            </div>
          </div>
        </section>

        <!-- Players Display -->
        <section class="players-section">
          <div class="section-header">
            <h2>Players</h2>
            <div class="results-info">
              Showing {{ filteredPlayers().length }} of {{ allPlayers().length }} players
            </div>
          </div>
          
          <div class="players-container" [class]="viewMode()">
            <div class="no-players" *ngIf="filteredPlayers().length === 0">
              <p>No players found matching your search criteria.</p>
              <button class="btn btn-primary" (click)="clearFilters()">Clear Filters</button>
            </div>
            
            <app-player-card
              *ngFor="let playerData of paginatedPlayers(); trackBy: trackByPlayer"
              [player]="playerData.player"
              [rosterEntry]="playerData.rosterEntry"
              [proTeamName]="getProTeamName(playerData.player.proTeamId)"
              [showStats]="true"
              [showOwnership]="showOwnership"
              [showProjection]="false"
              [showActions]="false"
              [canMove]="false"
              [canDrop]="false"
              (playerClick)="selectPlayer(playerData.player)">
            </app-player-card>
          </div>
          
          <!-- Pagination -->
          <div class="pagination" *ngIf="totalPages() > 1">
            <button class="btn btn-sm btn-secondary" 
                    (click)="previousPage()" 
                    [disabled]="currentPage() === 1">
              ← Previous
            </button>
            
            <div class="page-info">
              Page {{ currentPage() }} of {{ totalPages() }}
            </div>
            
            <button class="btn btn-sm btn-secondary" 
                    (click)="nextPage()" 
                    [disabled]="currentPage() === totalPages()">
              Next →
            </button>
            
            <div class="page-size-selector">
              <label for="pageSize">Show:</label>
              <select id="pageSize" [(ngModel)]="pageSize" (change)="updatePageSize($event)">
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
        </section>

        <!-- Selected Player Details -->
        <section class="player-details" *ngIf="selectedPlayer()">
          <h2>{{ selectedPlayer()!.fullName }} - Details</h2>
          
          <div class="player-detail-grid">
            <div class="player-info-card">
              <h3>Basic Information</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">Position:</span>
                  <span class="value">{{ getPositionName(selectedPlayer()!.defaultPositionId) }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Pro Team:</span>
                  <span class="value">{{ getProTeamName(selectedPlayer()!.proTeamId) }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Fantasy Team:</span>
                  <span class="value">{{ getFantasyTeamName(selectedPlayer()!) }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Status:</span>
                  <span class="value" [class]="getPlayerStatusClass(selectedPlayer()!)">
                    {{ getPlayerStatus(selectedPlayer()!) }}
                  </span>
                </div>
              </div>
            </div>
            
            <div class="ownership-card" *ngIf="selectedPlayer()!.ownership">
              <h3>Ownership</h3>
              <div class="ownership-stats">
                <app-stat-display 
                  [stat]="selectedPlayerStats().ownership"
                  size="small"
                  variant="card">
                </app-stat-display>
                <app-stat-display 
                  [stat]="selectedPlayerStats().started"
                  size="small"
                  variant="highlighted">
                </app-stat-display>
              </div>
            </div>
          </div>
          
          <div class="player-actions">
            <button class="btn btn-primary" (click)="viewPlayerDetails(selectedPlayer()!)">
              View Full Details
            </button>
            <button class="btn btn-secondary" (click)="clearPlayerSelection()">
              Close Details
            </button>
          </div>
        </section>

      </div>
    </div>
  `,
  styles: [`
    .player-list-container {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }
    
    .player-list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border-color, #e0e0e0);
    }
    
    .player-list-header h1 {
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
      padding: 6px 12px;
      font-size: 0.875em;
    }
    
    /* Player Controls */
    .player-controls {
      background: var(--card-background, #ffffff);
      border: 1px solid var(--card-border, #e0e0e0);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }
    
    .filter-row {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    
    .control-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    
    .search-filter input,
    .position-filter select,
    .team-filter select,
    .status-filter select,
    .sort-options select {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--input-border, #ccc);
      border-radius: 4px;
      font-size: 0.9em;
    }
    
    .search-filter {
      display: flex;
      flex-direction: column;
    }
    
    .position-filter,
    .team-filter,
    .status-filter {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    
    .position-filter label,
    .team-filter label,
    .status-filter label {
      font-size: 0.85em;
      font-weight: 500;
      color: var(--text-primary, #333);
    }
    
    .sort-options {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .sort-options label {
      font-size: 0.9em;
      font-weight: 500;
      color: var(--text-primary, #333);
    }
    
    .view-options {
      display: flex;
      gap: 4px;
    }
    
    /* Player Summary */
    .player-summary {
      margin-bottom: 30px;
    }
    
    .summary-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }
    
    /* Position Breakdown */
    .position-breakdown {
      margin-bottom: 30px;
    }
    
    .position-breakdown h2 {
      margin: 0 0 20px 0;
      color: var(--text-primary, #333);
      font-size: 1.5em;
      font-weight: 600;
    }
    
    .position-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 16px;
    }
    
    /* Players Section */
    .players-section {
      margin-bottom: 40px;
    }
    
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .section-header h2 {
      margin: 0;
      color: var(--text-primary, #333);
      font-size: 1.5em;
      font-weight: 600;
    }
    
    .results-info {
      font-size: 0.9em;
      color: var(--text-muted, #888);
      font-weight: 500;
    }
    
    .players-container.grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 16px;
    }
    
    .players-container.list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .no-players {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-muted, #888);
      grid-column: 1 / -1;
    }
    
    .no-players p {
      margin: 0 0 20px 0;
      font-size: 1.1em;
    }
    
    /* Pagination */
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      margin-top: 30px;
      padding: 20px;
      background: var(--card-background, #ffffff);
      border: 1px solid var(--card-border, #e0e0e0);
      border-radius: 8px;
    }
    
    .page-info {
      font-weight: 500;
      color: var(--text-primary, #333);
    }
    
    .page-size-selector {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .page-size-selector label {
      font-size: 0.9em;
      font-weight: 500;
      color: var(--text-primary, #333);
    }
    
    .page-size-selector select {
      padding: 4px 8px;
      border: 1px solid var(--input-border, #ccc);
      border-radius: 4px;
      font-size: 0.9em;
    }
    
    /* Player Details */
    .player-details {
      background: var(--card-background, #ffffff);
      border: 1px solid var(--card-border, #e0e0e0);
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .player-details h2 {
      margin: 0 0 20px 0;
      color: var(--text-primary, #333);
      font-size: 1.4em;
      font-weight: 600;
    }
    
    .player-detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
      margin-bottom: 24px;
    }
    
    .player-info-card,
    .ownership-card {
      background: var(--info-card-background, #f8f9fa);
      border: 1px solid var(--info-card-border, #e9ecef);
      border-radius: 6px;
      padding: 16px;
    }
    
    .player-info-card h3,
    .ownership-card h3 {
      margin: 0 0 12px 0;
      color: var(--text-primary, #333);
      font-size: 1.1em;
      font-weight: 600;
    }
    
    .info-grid {
      display: grid;
      gap: 8px;
    }
    
    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
    }
    
    .info-item .label {
      font-size: 0.9em;
      color: var(--text-muted, #888);
      font-weight: 500;
    }
    
    .info-item .value {
      font-size: 0.9em;
      color: var(--text-primary, #333);
      font-weight: 600;
    }
    
    .info-item .value.injured {
      color: var(--danger-color, #dc3545);
    }
    
    .info-item .value.starter {
      color: var(--success-color, #28a745);
    }
    
    .info-item .value.bench {
      color: var(--warning-color, #ffc107);
    }
    
    .ownership-stats {
      display: flex;
      gap: 16px;
      justify-content: center;
    }
    
    .player-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    
    /* Responsive Design */
    @media (max-width: 768px) {
      .player-list-container {
        padding: 16px;
      }
      
      .player-list-header {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }
      
      .filter-row {
        grid-template-columns: 1fr;
        gap: 12px;
      }
      
      .control-row {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
      }
      
      .sort-options {
        justify-content: space-between;
      }
      
      .view-options {
        justify-content: center;
      }
      
      .summary-stats {
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
      }
      
      .position-stats {
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }
      
      .players-container.grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }
      
      .section-header {
        flex-direction: column;
        gap: 8px;
        align-items: stretch;
        text-align: center;
      }
      
      .pagination {
        flex-wrap: wrap;
        gap: 12px;
      }
      
      .player-detail-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }
      
      .player-actions {
        flex-direction: column;
      }
    }
    
    @media (max-width: 480px) {
      .summary-stats {
        grid-template-columns: 1fr;
      }
      
      .position-stats {
        grid-template-columns: repeat(2, 1fr);
      }
      
      .ownership-stats {
        flex-direction: column;
        gap: 12px;
      }
    }
  `]
})
export class PlayerListComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly _isRefreshing = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _searchTerm = signal('');
  private readonly _selectedPosition = signal<string>('all');
  private readonly _selectedTeam = signal<number | 'all'>('all');
  private readonly _selectedStatus = signal<string>('all');
  private readonly _sortBy = signal<'name' | 'position' | 'team' | 'points' | 'ownership'>('name');
  private readonly _sortDirection = signal<'asc' | 'desc'>('asc');
  private readonly _viewMode = signal<'grid' | 'list'>('grid');
  private readonly _selectedPlayer = signal<Player | null>(null);
  private readonly _currentPage = signal(1);
  private readonly _pageSize = signal(50);
  private readonly _showOwnership = signal(true);

  // Inject services
  protected readonly dataService = StubService;
  private readonly errorHandler = StubErrorHandler;

  // Public signals
  readonly isRefreshing = this._isRefreshing.asReadonly();
  readonly error = this._error.asReadonly();
  readonly searchTerm = this._searchTerm.asReadonly();
  readonly selectedPosition = this._selectedPosition.asReadonly();
  readonly selectedTeam = this._selectedTeam.asReadonly();
  readonly selectedStatus = this._selectedStatus.asReadonly();
  readonly sortBy = this._sortBy.asReadonly();
  readonly sortDirection = this._sortDirection.asReadonly();
  readonly viewMode = this._viewMode.asReadonly();
  readonly selectedPlayer = this._selectedPlayer.asReadonly();
  readonly currentPage = this._currentPage.asReadonly();
  readonly pageSize = this._pageSize.asReadonly();
  readonly showOwnership = this._showOwnership.asReadonly();

  // Computed properties
  readonly availableTeams = computed(() => {
    return this.dataService.teams();
  });

  readonly allPlayers = computed(() => {
    const rosters = this.dataService.rosters();
    const players: Array<{player: Player, rosterEntry?: RosterEntry, teamId: number}> = [];
    
    rosters.forEach(team => {
      if (team.roster?.entries) {
        team.roster.entries.forEach(entry => {
          if (entry.playerPoolEntry?.player) {
            players.push({
              player: entry.playerPoolEntry.player,
              rosterEntry: entry,
              teamId: team.id
            });
          }
        });
      }
    });
    
    return players;
  });

  readonly filteredPlayers = computed(() => {
    let players = this.allPlayers();
    const searchTerm = this._searchTerm().toLowerCase();
    const selectedPosition = this._selectedPosition();
    const selectedTeam = this._selectedTeam();
    const selectedStatus = this._selectedStatus();
    const sortBy = this._sortBy();
    const sortDir = this._sortDirection();

    // Filter by search term
    if (searchTerm) {
      players = players.filter(p => 
        p.player.fullName.toLowerCase().includes(searchTerm) ||
        p.player.firstName.toLowerCase().includes(searchTerm) ||
        p.player.lastName.toLowerCase().includes(searchTerm)
      );
    }

    // Filter by position
    if (selectedPosition !== 'all') {
      const positionId = this.getPositionId(selectedPosition);
      players = players.filter(p => p.player.defaultPositionId === positionId);
    }

    // Filter by team
    if (selectedTeam !== 'all') {
      players = players.filter(p => p.teamId === selectedTeam);
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      players = players.filter(p => {
        const rosterEntry = p.rosterEntry;
        if (!rosterEntry) return false;
        
        switch (selectedStatus) {
          case 'starter':
            return rosterEntry.lineupSlotId !== PlayerPosition.BENCH && 
                   rosterEntry.lineupSlotId !== PlayerPosition.IR;
          case 'bench':
            return rosterEntry.lineupSlotId === PlayerPosition.BENCH;
          case 'injured':
            return rosterEntry.injuryStatus && 
                   rosterEntry.injuryStatus !== 'ACTIVE' && 
                   rosterEntry.injuryStatus !== 'NORMAL';
          default:
            return true;
        }
      });
    }

    // Sort players
    players = players.slice().sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.player.fullName.toLowerCase();
          bValue = b.player.fullName.toLowerCase();
          break;
        case 'position':
          aValue = this.getPositionName(a.player.defaultPositionId);
          bValue = this.getPositionName(b.player.defaultPositionId);
          break;
        case 'team':
          const aTeam = this.dataService.getTeamById(a.teamId);
          const bTeam = this.dataService.getTeamById(b.teamId);
          aValue = aTeam?.name.toLowerCase() || '';
          bValue = bTeam?.name.toLowerCase() || '';
          break;
        case 'points':
          aValue = a.rosterEntry?.playerPoolEntry?.appliedStatTotal || 0;
          bValue = b.rosterEntry?.playerPoolEntry?.appliedStatTotal || 0;
          break;
        case 'ownership':
          aValue = a.player.ownership?.percentOwned || 0;
          bValue = b.player.ownership?.percentOwned || 0;
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

    return players;
  });

  readonly paginatedPlayers = computed(() => {
    const players = this.filteredPlayers();
    const pageSize = this._pageSize();
    const currentPage = this._currentPage();
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return players.slice(startIndex, endIndex);
  });

  readonly totalPages = computed(() => {
    const totalPlayers = this.filteredPlayers().length;
    const pageSize = this._pageSize();
    return Math.ceil(totalPlayers / pageSize);
  });

  readonly playerStats = computed((): Record<string, StatConfig> => {
    const allPlayers = this.allPlayers();
    const filteredPlayers = this.filteredPlayers();
    
    const totalFantasyPoints = allPlayers.reduce((sum, p) => 
      sum + (p.rosterEntry?.playerPoolEntry?.appliedStatTotal || 0), 0);
    const avgFantasyPoints = allPlayers.length > 0 ? totalFantasyPoints / allPlayers.length : 0;
    
    const injuredPlayers = allPlayers.filter(p => 
      p.rosterEntry?.injuryStatus && 
      p.rosterEntry.injuryStatus !== 'ACTIVE' && 
      p.rosterEntry.injuryStatus !== 'NORMAL'
    ).length;

    return {
      totalPlayers: {
        label: 'Total Players',
        value: allPlayers.length,
        format: 'number',
        icon: '👤'
      },
      filteredPlayers: {
        label: 'Filtered Results',
        value: filteredPlayers.length,
        format: 'number',
        icon: '🔍'
      },
      avgFantasyPoints: {
        label: 'Avg Fantasy Points',
        value: avgFantasyPoints,
        format: 'number',
        decimals: 1,
        icon: '📊'
      },
      injuredPlayers: {
        label: 'Injured Players',
        value: injuredPlayers,
        format: 'number',
        icon: '🏥'
      }
    };
  });

  readonly positionBreakdown = computed(() => {
    const players = this.allPlayers();
    const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'];
    
    return positions.map(position => {
      const positionId = this.getPositionId(position);
      const count = players.filter(p => p.player.defaultPositionId === positionId).length;
      
      return {
        position,
        stat: {
          label: position,
          value: count,
          format: 'number' as const,
          icon: this.getPositionIcon(position)
        }
      };
    });
  });

  readonly selectedPlayerStats = computed((): Record<string, StatConfig> => {
    const player = this._selectedPlayer();
    if (!player || !player.ownership) return {};

    return {
      ownership: {
        label: 'Owned',
        value: player.ownership.percentOwned,
        format: 'percentage',
        decimals: 1
      },
      started: {
        label: 'Started',
        value: player.ownership.percentStarted,
        format: 'percentage',
        decimals: 1
      }
    };
  });

  ngOnInit(): void {
    this.initializePlayerList();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async initializePlayerList(): Promise<void> {
    try {
      this._error.set(null);
      if (this.dataService.rosters().length === 0) {
        await this.dataService.loadRosters();
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
      await this.dataService.loadRosters();
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
    this._currentPage.set(1); // Reset to first page
  }

  updatePositionFilter(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this._selectedPosition.set(target.value);
    this._currentPage.set(1);
  }

  updateTeamFilter(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    this._selectedTeam.set(value === 'all' ? 'all' : +value);
    this._currentPage.set(1);
  }

  updateStatusFilter(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this._selectedStatus.set(target.value);
    this._currentPage.set(1);
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

  clearFilters(): void {
    this._searchTerm.set('');
    this._selectedPosition.set('all');
    this._selectedTeam.set('all');
    this._selectedStatus.set('all');
    this._sortBy.set('name');
    this._sortDirection.set('asc');
    this._currentPage.set(1);
  }

  previousPage(): void {
    const current = this._currentPage();
    if (current > 1) {
      this._currentPage.set(current - 1);
    }
  }

  nextPage(): void {
    const current = this._currentPage();
    const totalPages = this.totalPages();
    if (current < totalPages) {
      this._currentPage.set(current + 1);
    }
  }

  updatePageSize(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this._pageSize.set(+target.value);
    this._currentPage.set(1);
  }

  selectPlayer(player: Player): void {
    const current = this._selectedPlayer();
    this._selectedPlayer.set(current?.id === player.id ? null : player);
  }

  clearPlayerSelection(): void {
    this._selectedPlayer.set(null);
  }

  getPositionName(positionId: number): string {
    const positionMap: Record<number, string> = {
      [PlayerPosition.QB]: 'QB',
      [PlayerPosition.RB]: 'RB',
      [PlayerPosition.WR]: 'WR',
      [PlayerPosition.TE]: 'TE',
      [PlayerPosition.K]: 'K',
      [PlayerPosition.DST]: 'D/ST'
    };
    
    return positionMap[positionId] || 'UNKNOWN';
  }

  getPositionId(positionName: string): number {
    const positionMap: Record<string, number> = {
      'QB': PlayerPosition.QB,
      'RB': PlayerPosition.RB,
      'WR': PlayerPosition.WR,
      'TE': PlayerPosition.TE,
      'K': PlayerPosition.K,
      'DST': PlayerPosition.DST
    };
    
    return positionMap[positionName] || 0;
  }

  getPositionIcon(position: string): string {
    const iconMap: Record<string, string> = {
      'QB': '🏈',
      'RB': '🏃',
      'WR': '🙌',
      'TE': '🔗',
      'K': '🦵',
      'DST': '🛡️'
    };
    
    return iconMap[position] || '👤';
  }

  getProTeamName(proTeamId: number): string {
    // This would typically come from a pro team mapping service
    // For now, return a placeholder
    return `Team ${proTeamId}`;
  }

  getFantasyTeamName(player: Player): string {
    const playerData = this.allPlayers().find(p => p.player.id === player.id);
    if (!playerData) return 'Free Agent';
    
    const team = this.dataService.getTeamById(playerData.teamId);
    return team?.name || 'Unknown Team';
  }

  getPlayerStatus(player: Player): string {
    const playerData = this.allPlayers().find(p => p.player.id === player.id);
    if (!playerData?.rosterEntry) return 'Free Agent';
    
    const rosterEntry = playerData.rosterEntry;
    
    if (rosterEntry.injuryStatus && 
        rosterEntry.injuryStatus !== 'ACTIVE' && 
        rosterEntry.injuryStatus !== 'NORMAL') {
      return rosterEntry.injuryStatus;
    }
    
    if (rosterEntry.lineupSlotId === PlayerPosition.BENCH) {
      return 'Bench';
    } else if (rosterEntry.lineupSlotId === PlayerPosition.IR) {
      return 'IR';
    } else {
      return 'Starter';
    }
  }

  getPlayerStatusClass(player: Player): string {
    const status = this.getPlayerStatus(player);
    
    if (['OUT', 'DOUBTFUL', 'QUESTIONABLE', 'IR'].includes(status)) {
      return 'injured';
    } else if (status === 'Starter') {
      return 'starter';
    } else if (status === 'Bench') {
      return 'bench';
    }
    
    return '';
  }

  viewPlayerDetails(player: Player): void {
    // Navigate to player details page
    console.log('View player details:', player);
  }

  trackByPlayer(index: number, playerData: any): number {
    return playerData.player.id;
  }
}