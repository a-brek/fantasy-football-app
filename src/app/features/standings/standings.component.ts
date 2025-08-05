import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { StandingsStore } from '../../store/standings.store';
import { TeamsStore } from '../../store/teams.store';
import { StatDisplayComponent, StatConfig } from '../../shared/components/stat-display.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner.component';
import { ErrorDisplayComponent } from '../../shared/components/error-display.component';
import { Team } from '../../models/espn-fantasy.interfaces';

/**
 * Standings component for displaying league standings and team rankings
 * Features sortable standings, playoff scenarios, and detailed team comparisons
 */
@Component({
  selector: 'app-standings',
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
    <div class="standings-container">
      <header class="standings-header">
        <h1>League Standings</h1>
        <div class="header-actions">
          <button class="btn btn-primary" (click)="refreshData()" [disabled]="isRefreshing()">
            <span *ngIf="!isRefreshing()">🔄 Refresh</span>
            <span *ngIf="isRefreshing()">Refreshing...</span>
          </button>
        </div>
      </header>

      <!-- Loading State -->
      <app-loading-spinner 
        *ngIf="isRefreshing()"
        type="circle"
        size="large"
        message="Loading standings..."
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

      <!-- Standings Content -->
      <div class="standings-content" *ngIf="!isRefreshing() && !error()">
        
        <!-- League Overview Stats -->
        <section class="league-overview">
          <div class="overview-stats">
            <app-stat-display 
              [stat]="leagueStats().totalTeams"
              size="medium"
              variant="card">
            </app-stat-display>
            
            <app-stat-display 
              [stat]="leagueStats().gamesPlayed"
              size="medium"
              variant="highlighted">
            </app-stat-display>
            
            <app-stat-display 
              [stat]="leagueStats().avgPointsPerGame"
              size="medium"
              variant="card">
            </app-stat-display>
            
            <app-stat-display 
              [stat]="leagueStats().totalPointsScored"
              size="medium"
              variant="card">
            </app-stat-display>
          </div>
        </section>

        <!-- Standings Controls -->
        <section class="standings-controls">
          <div class="view-options">
            <div class="sort-options">
              <label for="sortBy">Sort by:</label>
              <select id="sortBy" [(ngModel)]="sortBy" (change)="updateSortBy($event)">
                <option value="standings">Standings</option>
                <option value="pointsFor">Points For</option>
                <option value="pointsAgainst">Points Against</option>
                <option value="pointsDiff">Point Differential</option>
                <option value="winPct">Win Percentage</option>
                <option value="name">Team Name</option>
              </select>
            </div>
            
            <div class="display-options">
              <label>
                <input type="checkbox" [(ngModel)]="showPlayoffPositions" (change)="togglePlayoffPositions()">
                Show Playoff Positions
              </label>
              <label>
                <input type="checkbox" [(ngModel)]="showDetailedStats" (change)="toggleDetailedStats()">
                Show Detailed Stats
              </label>
            </div>
          </div>
        </section>

        <!-- Standings Table -->
        <section class="standings-table-section">
          <div class="standings-table" [class.detailed]="showDetailedStats">
            
            <!-- Table Header -->
            <div class="table-header">
              <div class="rank-col">Rank</div>
              <div class="team-col">Team</div>
              <div class="record-col">Record</div>
              <div class="pct-col">Win %</div>
              <div class="points-for-col">PF</div>
              <div class="points-against-col">PA</div>
              <div class="diff-col">Diff</div>
              <div class="streak-col" *ngIf="showDetailedStats">Streak</div>
              <div class="games-back-col" *ngIf="showDetailedStats">GB</div>
              <div class="actions-col">Actions</div>
            </div>

            <!-- Playoff Line (if showing playoff positions) -->
            <div class="playoff-line" *ngIf="showPlayoffPositions && playoffCutoff() > 0">
              <div class="playoff-indicator">
                <span class="playoff-text">Playoff Line</span>
              </div>
            </div>

            <!-- Team Rows -->
            <div class="team-row" 
                 *ngFor="let team of sortedTeams(); let i = index; trackBy: trackByTeam"
                 [class]="getTeamRowClass(team, i + 1)"
                 (click)="selectTeam(team)">
              
              <!-- Rank -->
              <div class="rank-col">
                <span class="rank-number">{{ i + 1 }}</span>
                <span class="playoff-seed" *ngIf="showPlayoffPositions && team.playoffSeed">
                  ({{ team.playoffSeed }})
                </span>
              </div>

              <!-- Team Info -->
              <div class="team-col">
                <div class="team-info">
                  <div class="team-logo">
                    <img [src]="team.logo" [alt]="team.name + ' logo'" 
                         (error)="onImageError($event)" />
                  </div>
                  <div class="team-details">
                    <div class="team-name">{{ team.name }}</div>
                    <div class="team-abbrev">{{ team.abbrev }}</div>
                    <div class="team-owners" *ngIf="showDetailedStats">{{ getOwnerNames(team) }}</div>
                  </div>
                </div>
              </div>

              <!-- Record -->
              <div class="record-col">
                <span class="record-wins">{{ team.record.overall.wins }}</span>-<span class="record-losses">{{ team.record.overall.losses }}</span><span class="record-ties" *ngIf="team.record.overall.ties > 0">-{{ team.record.overall.ties }}</span>
              </div>

              <!-- Win Percentage -->
              <div class="pct-col">
                {{ (team.record.overall.percentage * 100).toFixed(1) }}%
              </div>

              <!-- Points For -->
              <div class="points-for-col">
                {{ team.record.overall.pointsFor | number:'1.1-1' }}
              </div>

              <!-- Points Against -->
              <div class="points-against-col">
                {{ team.record.overall.pointsAgainst | number:'1.1-1' }}
              </div>

              <!-- Point Differential -->
              <div class="diff-col" [class]="getPointDiffClass(team)">
                {{ getPointDifferential(team) }}
              </div>

              <!-- Streak (if detailed) -->
              <div class="streak-col" *ngIf="showDetailedStats">
                <span class="streak-badge" [class]="getStreakClass(team)">
                  {{ getStreakDisplay(team) }}
                </span>
              </div>

              <!-- Games Back (if detailed) -->
              <div class="games-back-col" *ngIf="showDetailedStats">
                {{ team.record.overall.gamesBack || 0 }}
              </div>

              <!-- Actions -->
              <div class="actions-col">
                <button class="btn btn-sm btn-primary" (click)="viewTeamDetails(team); $event.stopPropagation()">
                  View
                </button>
                <button class="btn btn-sm btn-secondary" (click)="viewTeamRoster(team); $event.stopPropagation()">
                  Roster
                </button>
              </div>
            </div>

          </div>
        </section>

        <!-- Selected Team Details -->
        <section class="team-details-section" *ngIf="selectedTeam()">
          <h2>{{ selectedTeam()!.name }} - Detailed Stats</h2>
          
          <div class="detailed-stats-grid">
            <!-- Overall Stats -->
            <div class="stats-category">
              <h3>Overall Record</h3>
              <div class="stats-row">
                <app-stat-display [stat]="selectedTeamStats().overall.wins" size="small"></app-stat-display>
                <app-stat-display [stat]="selectedTeamStats().overall.losses" size="small"></app-stat-display>
                <app-stat-display [stat]="selectedTeamStats().overall.ties" size="small" 
                                  *ngIf="selectedTeamStats().overall.ties.value > 0"></app-stat-display>
              </div>
            </div>

            <!-- Home/Away Stats -->
            <div class="stats-category">
              <h3>Home Record</h3>
              <div class="stats-row">
                <app-stat-display [stat]="selectedTeamStats().home.wins" size="small"></app-stat-display>
                <app-stat-display [stat]="selectedTeamStats().home.losses" size="small"></app-stat-display>
              </div>
            </div>

            <div class="stats-category">
              <h3>Away Record</h3>
              <div class="stats-row">
                <app-stat-display [stat]="selectedTeamStats().away.wins" size="small"></app-stat-display>
                <app-stat-display [stat]="selectedTeamStats().away.losses" size="small"></app-stat-display>
              </div>
            </div>

            <!-- Division Stats -->
            <div class="stats-category">
              <h3>Division Record</h3>
              <div class="stats-row">
                <app-stat-display [stat]="selectedTeamStats().division.wins" size="small"></app-stat-display>
                <app-stat-display [stat]="selectedTeamStats().division.losses" size="small"></app-stat-display>
              </div>
            </div>

            <!-- Scoring Stats -->
            <div class="stats-category">
              <h3>Scoring</h3>
              <div class="stats-row">
                <app-stat-display [stat]="selectedTeamStats().pointsFor" size="small" variant="success"></app-stat-display>
                <app-stat-display [stat]="selectedTeamStats().pointsAgainst" size="small" variant="warning"></app-stat-display>
                <app-stat-display [stat]="selectedTeamStats().avgPointsPerGame" size="small"></app-stat-display>
              </div>
            </div>
          </div>

          <div class="team-detail-actions">
            <button class="btn btn-primary" (click)="viewTeamDetails(selectedTeam()!)">
              Full Team Details
            </button>
            <button class="btn btn-secondary" (click)="clearTeamSelection()">
              Close Details
            </button>
          </div>
        </section>

        <!-- Playoff Picture (if showing playoff positions) -->
        <section class="playoff-picture" *ngIf="showPlayoffPositions">
          <h2>Playoff Picture</h2>
          
          <div class="playoff-categories">
            <div class="playoff-category">
              <h3>Playoff Teams</h3>
              <div class="playoff-teams">
                <div *ngFor="let team of playoffTeams()" class="playoff-team">
                  <span class="seed">#{{ team.playoffSeed || '?' }}</span>
                  <span class="team-name">{{ team.name }}</span>
                  <span class="record">({{ getTeamRecord(team) }})</span>
                </div>
              </div>
            </div>

            <div class="playoff-category" *ngIf="bubbleTeams().length > 0">
              <h3>On the Bubble</h3>
              <div class="bubble-teams">
                <div *ngFor="let team of bubbleTeams()" class="bubble-team">
                  <span class="team-name">{{ team.name }}</span>
                  <span class="record">({{ getTeamRecord(team) }})</span>
                  <span class="games-back">{{ team.record.overall.gamesBack || 0 }} GB</span>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  `,
  styles: [`
    .standings-container {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }
    
    .standings-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border-color, #e0e0e0);
    }
    
    .standings-header h1 {
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
    
    .btn-sm {
      padding: 6px 12px;
      font-size: 0.875em;
    }
    
    /* League Overview */
    .league-overview {
      margin-bottom: 30px;
    }
    
    .overview-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }
    
    /* Standings Controls */
    .standings-controls {
      margin-bottom: 30px;
      padding: 20px;
      background: var(--card-background, #ffffff);
      border: 1px solid var(--card-border, #e0e0e0);
      border-radius: 8px;
    }
    
    .view-options {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
    }
    
    .sort-options {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .sort-options label {
      font-weight: 500;
      color: var(--text-primary, #333);
    }
    
    .sort-options select {
      padding: 8px 12px;
      border: 1px solid var(--input-border, #ccc);
      border-radius: 4px;
      font-size: 0.9em;
    }
    
    .display-options {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }
    
    .display-options label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.9em;
      color: var(--text-primary, #333);
      cursor: pointer;
    }
    
    /* Standings Table */
    .standings-table-section {
      margin-bottom: 40px;
    }
    
    .standings-table {
      background: var(--card-background, #ffffff);
      border: 1px solid var(--card-border, #e0e0e0);
      border-radius: 8px;
      overflow: hidden;
    }
    
    .table-header {
      display: grid;
      grid-template-columns: 60px 1fr 80px 60px 80px 80px 80px 80px;
      gap: 12px;
      padding: 16px;
      background: var(--table-header-background, #f8f9fa);
      font-weight: 600;
      font-size: 0.9em;
      color: var(--text-primary, #333);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .standings-table.detailed .table-header {
      grid-template-columns: 60px 1fr 80px 60px 80px 80px 80px 80px 60px 80px;
    }
    
    .playoff-line {
      border-bottom: 3px solid var(--success-color, #28a745);
      padding: 8px 16px;
      background: var(--success-color-light, #d4edda);
    }
    
    .playoff-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .playoff-text {
      font-size: 0.85em;
      font-weight: 600;
      color: var(--success-color, #28a745);
    }
    
    .team-row {
      display: grid;
      grid-template-columns: 60px 1fr 80px 60px 80px 80px 80px 80px;
      gap: 12px;
      padding: 16px;
      border-bottom: 1px solid var(--border-color, #e0e0e0);
      cursor: pointer;
      transition: all 0.2s ease;
      align-items: center;
    }
    
    .standings-table.detailed .team-row {
      grid-template-columns: 60px 1fr 80px 60px 80px 80px 80px 80px 60px 80px;
    }
    
    .team-row:hover {
      background: var(--row-hover-background, #f8f9fa);
    }
    
    .team-row:last-child {
      border-bottom: none;
    }
    
    .team-row.playoff-position {
      background: var(--playoff-background, #e8f5e8);
    }
    
    .team-row.bubble-position {
      background: var(--bubble-background, #fff3cd);
    }
    
    .team-row.selected {
      background: var(--selected-background, #e3f2fd);
      border-color: var(--primary-color, #007bff);
    }
    
    /* Team Info */
    .rank-col {
      display: flex;
      align-items: center;
      gap: 4px;
      font-weight: 600;
      font-size: 1.1em;
    }
    
    .rank-number {
      color: var(--primary-color, #007bff);
    }
    
    .playoff-seed {
      font-size: 0.8em;
      color: var(--text-muted, #888);
    }
    
    .team-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .team-logo {
      width: 32px;
      height: 32px;
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
      min-width: 0;
    }
    
    .team-name {
      font-weight: 600;
      color: var(--text-primary, #333);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .team-abbrev {
      font-size: 0.85em;
      color: var(--text-muted, #888);
      font-weight: 500;
    }
    
    .team-owners {
      font-size: 0.75em;
      color: var(--text-muted, #888);
    }
    
    .record-col {
      font-weight: 600;
      color: var(--text-primary, #333);
    }
    
    .record-wins {
      color: var(--success-color, #28a745);
    }
    
    .record-losses {
      color: var(--danger-color, #dc3545);
    }
    
    .record-ties {
      color: var(--warning-color, #ffc107);
    }
    
    .pct-col {
      font-weight: 600;
      color: var(--text-primary, #333);
    }
    
    .points-for-col,
    .points-against-col {
      font-weight: 500;
      color: var(--text-primary, #333);
    }
    
    .diff-col {
      font-weight: 600;
    }
    
    .diff-col.positive {
      color: var(--success-color, #28a745);
    }
    
    .diff-col.negative {
      color: var(--danger-color, #dc3545);
    }
    
    .diff-col.zero {
      color: var(--text-muted, #888);
    }
    
    .streak-badge {
      font-size: 0.8em;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 3px;
      text-transform: uppercase;
    }
    
    .streak-badge.WIN {
      background: var(--success-color, #28a745);
      color: white;
    }
    
    .streak-badge.LOSS {
      background: var(--danger-color, #dc3545);
      color: white;
    }
    
    .streak-badge.TIE {
      background: var(--warning-color, #ffc107);
      color: var(--text-primary, #333);
    }
    
    .games-back-col {
      font-weight: 500;
      color: var(--text-muted, #888);
    }
    
    .actions-col {
      display: flex;
      gap: 6px;
    }
    
    /* Team Details Section */
    .team-details-section {
      margin-bottom: 40px;
      padding: 24px;
      background: var(--card-background, #ffffff);
      border: 1px solid var(--card-border, #e0e0e0);
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .team-details-section h2 {
      margin: 0 0 20px 0;
      color: var(--text-primary, #333);
      font-size: 1.5em;
      font-weight: 600;
    }
    
    .detailed-stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
      margin-bottom: 24px;
    }
    
    .stats-category h3 {
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
    
    .team-detail-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    
    /* Playoff Picture */
    .playoff-picture {
      margin-bottom: 40px;
    }
    
    .playoff-picture h2 {
      margin: 0 0 20px 0;
      color: var(--text-primary, #333);
      font-size: 1.5em;
      font-weight: 600;
    }
    
    .playoff-categories {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
    }
    
    .playoff-category {
      background: var(--card-background, #ffffff);
      border: 1px solid var(--card-border, #e0e0e0);
      border-radius: 8px;
      padding: 20px;
    }
    
    .playoff-category h3 {
      margin: 0 0 16px 0;
      color: var(--text-primary, #333);
      font-size: 1.2em;
      font-weight: 600;
    }
    
    .playoff-teams,
    .bubble-teams {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .playoff-team,
    .bubble-team {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      background: var(--team-background, #f8f9fa);
      border-radius: 6px;
    }
    
    .seed {
      font-weight: 700;
      color: var(--primary-color, #007bff);
      min-width: 30px;
    }
    
    .team-name {
      flex: 1;
      font-weight: 600;
      color: var(--text-primary, #333);
    }
    
    .record {
      font-size: 0.9em;
      color: var(--text-muted, #888);
    }
    
    .games-back {
      font-size: 0.85em;
      color: var(--text-muted, #888);
      font-weight: 500;
    }
    
    /* Responsive Design */
    @media (max-width: 1200px) {
      .table-header,
      .team-row {
        grid-template-columns: 50px 1fr 70px 50px 60px 60px 60px 80px;
        gap: 8px;
        font-size: 0.9em;
      }
      
      .standings-table.detailed .table-header,
      .standings-table.detailed .team-row {
        grid-template-columns: 50px 1fr 70px 50px 60px 60px 60px 50px 50px 80px;
      }
    }
    
    @media (max-width: 768px) {
      .standings-container {
        padding: 16px;
      }
      
      .standings-header {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }
      
      .view-options {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }
      
      .display-options {
        justify-content: space-between;
      }
      
      .overview-stats {
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
      }
      
      .table-header,
      .team-row {
        grid-template-columns: 40px 1fr 60px 60px 80px;
        gap: 6px;
        font-size: 0.8em;
      }
      
      .standings-table.detailed .table-header,
      .standings-table.detailed .team-row {
        grid-template-columns: 40px 1fr 60px 60px 80px;
      }
      
      .pct-col,
      .points-against-col,
      .diff-col,
      .streak-col,
      .games-back-col {
        display: none;
      }
      
      .detailed-stats-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }
      
      .playoff-categories {
        grid-template-columns: 1fr;
      }
      
      .team-detail-actions {
        flex-direction: column;
      }
    }
    
    @media (max-width: 480px) {
      .overview-stats {
        grid-template-columns: 1fr;
      }
      
      .actions-col {
        flex-direction: column;
        gap: 4px;
      }
    }
  `]
})
export class StandingsComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly _isRefreshing = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _sortBy = signal<'standings' | 'pointsFor' | 'pointsAgainst' | 'pointsDiff' | 'winPct' | 'name'>('standings');
  private readonly _showPlayoffPositions = signal(true);
  private readonly _showDetailedStats = signal(false);
  private readonly _selectedTeam = signal<Team | null>(null);
  private readonly _playoffCutoff = signal(6); // Typical playoff cutoff

  // Inject stores
  private readonly standingsStore = inject(StandingsStore);
  private readonly teamsStore = inject(TeamsStore);
  
  constructor() {
    // Initialize stores on component creation
    this.standingsStore.load();
    this.teamsStore.load();
  }

  // Public signals
  readonly isRefreshing = computed(() => {
    return this.standingsStore.isRefreshing() || this.teamsStore.isRefreshing() || this._isRefreshing();
  });
  readonly error = computed(() => {
    const standingsError = this.standingsStore.error();
    const teamsError = this.teamsStore.error();
    return standingsError?.error || teamsError?.error || this._error();
  });
  readonly sortBy = this._sortBy.asReadonly();
  readonly showPlayoffPositions = this._showPlayoffPositions.asReadonly();
  readonly showDetailedStats = this._showDetailedStats.asReadonly();
  readonly selectedTeam = this._selectedTeam.asReadonly();
  readonly playoffCutoff = this._playoffCutoff.asReadonly();

  // Computed properties
  readonly sortedTeams = computed(() => {
    const teams = this.standingsStore.standings() || [];
    const sortBy = this._sortBy();

    if (sortBy === 'standings') {
      return teams; // Already sorted by standings in dataService
    }

    return teams.slice().sort((a, b) => {
      switch (sortBy) {
        case 'pointsFor':
          return b.record.overall.pointsFor - a.record.overall.pointsFor;
        case 'pointsAgainst':
          return a.record.overall.pointsAgainst - b.record.overall.pointsAgainst;
        case 'pointsDiff':
          const aDiff = a.record.overall.pointsFor - a.record.overall.pointsAgainst;
          const bDiff = b.record.overall.pointsFor - b.record.overall.pointsAgainst;
          return bDiff - aDiff;
        case 'winPct':
          return b.record.overall.percentage - a.record.overall.percentage;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
  });

  readonly leagueStats = computed((): Record<string, StatConfig> => {
    const teams = this.standingsStore.standings() || [];
    
    if (teams.length === 0) {
      return {
        totalTeams: { label: 'Total Teams', value: 0 },
        gamesPlayed: { label: 'Games Played', value: 0 },
        avgPointsPerGame: { label: 'Avg Points/Game', value: 0 },
        totalPointsScored: { label: 'Total Points', value: 0 }
      };
    }

    const totalPoints = teams.reduce((sum, team) => sum + team.record.overall.pointsFor, 0);
    const totalGames = teams.reduce((sum, team) => 
      sum + team.record.overall.wins + team.record.overall.losses + team.record.overall.ties, 0);
    const avgPointsPerGame = totalGames > 0 ? totalPoints / totalGames : 0;
    const avgGamesPerTeam = totalGames / teams.length / 2; // Divide by 2 since each game involves 2 teams

    return {
      totalTeams: {
        label: 'Total Teams',
        value: teams.length,
        format: 'number',
        icon: '👥'
      },
      gamesPlayed: {
        label: 'Games Played',
        value: avgGamesPerTeam,
        format: 'number',
        decimals: 0,
        icon: '🏈'
      },
      avgPointsPerGame: {
        label: 'Avg Points/Game',
        value: avgPointsPerGame,
        format: 'number',
        decimals: 1,
        icon: '📊'
      },
      totalPointsScored: {
        label: 'Total Points',
        value: totalPoints,
        format: 'number',
        decimals: 0,
        icon: '🎯'
      }
    };
  });

  readonly selectedTeamStats = computed((): Record<string, any> => {
    const team = this._selectedTeam();
    if (!team) return {};

    const totalGames = team.record.overall.wins + team.record.overall.losses + team.record.overall.ties;
    const avgPointsPerGame = totalGames > 0 ? team.record.overall.pointsFor / totalGames : 0;

    return {
      overall: {
        wins: { label: 'Wins', value: team.record.overall.wins, format: 'number' as const },
        losses: { label: 'Losses', value: team.record.overall.losses, format: 'number' as const },
        ties: { label: 'Ties', value: team.record.overall.ties, format: 'number' as const }
      },
      home: {
        wins: { label: 'Home Wins', value: team.record.home.wins, format: 'number' as const },
        losses: { label: 'Home Losses', value: team.record.home.losses, format: 'number' as const }
      },
      away: {
        wins: { label: 'Away Wins', value: team.record.away.wins, format: 'number' as const },
        losses: { label: 'Away Losses', value: team.record.away.losses, format: 'number' as const }
      },
      division: {
        wins: { label: 'Div Wins', value: team.record.division.wins, format: 'number' as const },
        losses: { label: 'Div Losses', value: team.record.division.losses, format: 'number' as const }
      },
      pointsFor: {
        label: 'Points For',
        value: team.record.overall.pointsFor,
        format: 'number' as const,
        decimals: 1
      },
      pointsAgainst: {
        label: 'Points Against',
        value: team.record.overall.pointsAgainst,
        format: 'number' as const,
        decimals: 1
      },
      avgPointsPerGame: {
        label: 'Avg/Game',
        value: avgPointsPerGame,
        format: 'number' as const,
        decimals: 1
      }
    };
  });

  readonly playoffTeams = computed(() => {
    const teams = this.sortedTeams();
    const cutoff = this._playoffCutoff();
    return teams.slice(0, cutoff);
  });

  readonly bubbleTeams = computed(() => {
    const teams = this.sortedTeams();
    const cutoff = this._playoffCutoff();
    return teams.slice(cutoff, cutoff + 3); // Show next 3 teams
  });

  ngOnInit(): void {
    this.initializeStandings();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async initializeStandings(): Promise<void> {
    try {
      this._error.set(null);
      const standings = this.standingsStore.standings();
      if (!standings || standings.length === 0) {
        this.standingsStore.load().subscribe({
          error: (error) => {
            console.warn('Failed to load standings:', error);
            this._error.set('Failed to load standings data');
          }
        });
      }
    } catch (error) {
      this._error.set('Failed to initialize standings');
    }
  }

  async refreshData(): Promise<void> {
    this._isRefreshing.set(true);
    this._error.set(null);

    this.standingsStore.refresh().subscribe({
      next: () => {
        console.log('Standings refreshed successfully');
        this._isRefreshing.set(false);
      },
      error: (error) => {
        console.warn('Failed to refresh standings:', error);
        this._error.set('Failed to refresh standings data');
        this._isRefreshing.set(false);
      }
    });
  }

  updateSortBy(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this._sortBy.set(target.value as any);
  }

  togglePlayoffPositions(): void {
    this._showPlayoffPositions.set(!this._showPlayoffPositions());
  }

  toggleDetailedStats(): void {
    this._showDetailedStats.set(!this._showDetailedStats());
  }

  selectTeam(team: Team): void {
    const current = this._selectedTeam();
    this._selectedTeam.set(current?.id === team.id ? null : team);
  }

  clearTeamSelection(): void {
    this._selectedTeam.set(null);
  }

  getOwnerNames(team: Team): string {
    // For now, return a placeholder since we don't have league member data
    // This would need to be implemented when we have access to league member information
    return 'Owner';
  }

  getTeamRowClass(team: Team, rank: number): string {
    const classes = [];
    
    if (this._showPlayoffPositions() && rank <= this._playoffCutoff()) {
      classes.push('playoff-position');
    } else if (this._showPlayoffPositions() && rank <= this._playoffCutoff() + 3) {
      classes.push('bubble-position');
    }
    
    if (this._selectedTeam()?.id === team.id) {
      classes.push('selected');
    }
    
    return classes.join(' ');
  }

  getPointDifferential(team: Team): string {
    const diff = team.record.overall.pointsFor - team.record.overall.pointsAgainst;
    return diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
  }

  getPointDiffClass(team: Team): string {
    const diff = team.record.overall.pointsFor - team.record.overall.pointsAgainst;
    if (diff > 0) return 'positive';
    if (diff < 0) return 'negative';
    return 'zero';
  }

  getStreakDisplay(team: Team): string {
    const record = team.record.overall;
    if (record.streakLength === 0) return 'None';
    return `${record.streakType.charAt(0)}${record.streakLength}`;
  }

  getStreakClass(team: Team): string {
    return team.record.overall.streakType;
  }

  getTeamRecord(team: Team): string {
    const record = team.record.overall;
    return `${record.wins}-${record.losses}${record.ties ? `-${record.ties}` : ''}`;
  }

  viewTeamDetails(team: Team): void {
    // Navigate to team details
    window.open(`/teams/${team.id}`, '_blank');
  }

  viewTeamRoster(team: Team): void {
    // Navigate to team roster
    window.open(`/teams/${team.id}/roster`, '_blank');
  }

  trackByTeam(index: number, team: Team): number {
    return team.id;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNCIgZmlsbD0iI0Y4RjlGQSIvPgo8cGF0aCBkPSJNMTYgMjJDMTkuMzEzNyAyMiAyMiAxOS4zMTM3IDIyIDE2QzIyIDEyLjY4NjMgMTkuMzEzNyAxMCAxNiAxMEMxMi42ODYzIDEwIDEwIDEyLjY4NjMgMTAgMTZDMTAgMTkuMzEzNyAxMi42ODYzIDIyIDE2IDIyWiIgZmlsbD0iI0RERERERCIvPgo8L3N2Zz4K';
  }
}