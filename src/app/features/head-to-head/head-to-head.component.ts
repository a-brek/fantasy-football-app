import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { TeamsStore } from '../../store/teams.store';
import { MatchupsStore } from '../../store/matchups.store';
import { StatDisplayComponent, StatConfig } from '../../shared/components/stat-display.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner.component';
import { ErrorDisplayComponent } from '../../shared/components/error-display.component';
import { Team, ScheduleItem } from '../../models/espn-fantasy.interfaces';

interface HeadToHeadStats {
  team1Wins: number;
  team2Wins: number;
  ties: number;
  totalGames: number;
  team1AvgScore: number;
  team2AvgScore: number;
  avgScoreDifference: number;
  closestGame: number;
  highestScoringGame: number;
  currentStreak: {
    winner: 'team1' | 'team2' | 'none';
    length: number;
  };
  longestStreak: {
    winner: 'team1' | 'team2' | 'none';
    length: number;
  };
}

interface HeadToHeadMatchup {
  // Include all ScheduleItem properties
  id?: number;
  matchupPeriodId: number;
  home: {
    teamId: number;
    totalPoints: number;
    gamesPlayed: number;
  };
  away: {
    teamId: number;
    totalPoints: number;
    gamesPlayed: number;
  };
  originalWinner?: string; // Keep original winner from ScheduleItem
  
  // Add head-to-head specific properties
  isTeam1Home: boolean;
  team1Score: number;
  team2Score: number;
  scoreDifference: number;
  winner: 'team1' | 'team2' | 'tie';
}

/**
 * Head-to-Head Analysis Component
 * Allows users to compare two teams' historical matchup data
 */
@Component({
  selector: 'app-head-to-head',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatDisplayComponent,
    LoadingSpinnerComponent,
    ErrorDisplayComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="head-to-head-container">
      <header class="head-to-head-header">
        <h1>⚔️ Head-to-Head Analysis</h1>
        <p class="header-subtitle">Compare any two teams' historical matchup data and rivalry stats</p>
        <!-- Debug info -->
        <p style="background: yellow; padding: 10px; margin: 10px 0;">
          DEBUG: Component loaded. Teams: {{ availableTeams().length }}, Matchups: {{ (matchupsStore.matchups() || []).length }}
          <br>Selected Team 1 ID: {{ selectedTeam1Id() }} 
          <br>Selected Team 2 ID: {{ selectedTeam2Id() }}
          <br>Team 1 Object: {{ team1()?.name }} (ID: {{ team1()?.id }})
          <br>Team 2 Object: {{ team2()?.name }} (ID: {{ team2()?.id }})
          <br>Head-to-head matchups found: {{ headToHeadMatchups().length }}
        </p>
      </header>

      <!-- Team Selection -->
      <section class="team-selection">
        <div class="team-selector">
          <label for="team1Select">Team 1:</label>
          <select id="team1Select" [ngModel]="selectedTeam1Id()" (ngModelChange)="selectedTeam1Id.set($event ? +$event : null)">
            <option value="">Select Team 1</option>
            <option *ngFor="let team of availableTeams()" [value]="team.id">
              {{ team.name }}
            </option>
          </select>
        </div>

        <div class="vs-divider">
          <span class="vs-text">VS</span>
        </div>

        <div class="team-selector">
          <label for="team2Select">Team 2:</label>
          <select id="team2Select" [ngModel]="selectedTeam2Id()" (ngModelChange)="selectedTeam2Id.set($event ? +$event : null)">
            <option value="">Select Team 2</option>
            <option *ngFor="let team of availableTeams()" [value]="team.id">
              {{ team.name }}
            </option>
          </select>
        </div>
      </section>

      <!-- Loading State -->
      <app-loading-spinner 
        *ngIf="isLoading()"
        type="circle"
        size="large"
        message="Calculating head-to-head stats..."
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

      <!-- Head-to-Head Content -->
      <div class="head-to-head-content" *ngIf="showContent()">
        
        <!-- Teams Preview -->
        <section class="teams-preview" *ngIf="team1() && team2()">
          <div class="team-card">
            <div class="team-logo">
              <img [src]="team1()!.logo" [alt]="team1()!.name + ' logo'" (error)="onImageError($event)" />
            </div>
            <h3 class="team-name">{{ team1()!.name }}</h3>
            <p class="team-record">{{ getTeamRecord(team1()!) }}</p>
          </div>

          <div class="rivalry-center">
            <div class="rivalry-title">Rivalry Stats</div>
            <div class="overall-record">
              {{ headToHeadStats()?.team1Wins || 0 }} - {{ headToHeadStats()?.team2Wins || 0 }}
              <span *ngIf="headToHeadStats()?.ties" class="ties-count">- {{ headToHeadStats()!.ties }}</span>
            </div>
          </div>

          <div class="team-card">
            <div class="team-logo">
              <img [src]="team2()!.logo" [alt]="team2()!.name + ' logo'" (error)="onImageError($event)" />
            </div>
            <h3 class="team-name">{{ team2()!.name }}</h3>
            <p class="team-record">{{ getTeamRecord(team2()!) }}</p>
          </div>
        </section>

        <!-- Statistics Overview -->
        <section class="stats-overview" *ngIf="headToHeadStats()">
          <h2>📊 Rivalry Statistics</h2>
          <div class="stats-grid">
            <app-stat-display 
              [stat]="rivalryStatsConfig()['totalGames']"
              size="medium"
              variant="card">
            </app-stat-display>
            
            <app-stat-display 
              [stat]="rivalryStatsConfig()['winPercentage']"
              size="medium"
              variant="highlighted">
            </app-stat-display>
            
            <app-stat-display 
              [stat]="rivalryStatsConfig()['avgScoreDiff']"
              size="medium"
              variant="card">
            </app-stat-display>
            
            <app-stat-display 
              [stat]="rivalryStatsConfig()['closestGame']"
              size="medium"
              variant="success">
            </app-stat-display>
          </div>
        </section>

        <!-- Detailed Comparison -->
        <section class="detailed-comparison" *ngIf="headToHeadStats()">
          <h2>🔍 Detailed Comparison</h2>
          <div class="comparison-grid">
            
            <!-- Scoring Averages -->
            <div class="comparison-card">
              <h3>Average Scoring</h3>
              <div class="comparison-row">
                <span class="team1-stat">{{ team1()!.name }}: {{ headToHeadStats()!.team1AvgScore.toFixed(1) }} pts</span>
                <span class="team2-stat">{{ team2()!.name }}: {{ headToHeadStats()!.team2AvgScore.toFixed(1) }} pts</span>
              </div>
            </div>

            <!-- Current Streak -->
            <div class="comparison-card">
              <h3>Current Streak</h3>
              <div class="streak-info">
                <span *ngIf="headToHeadStats()!.currentStreak.winner !== 'none'" class="streak-text">
                  {{ getStreakWinnerName(headToHeadStats()!.currentStreak.winner) }} 
                  {{ headToHeadStats()!.currentStreak.length }} game(s)
                </span>
                <span *ngIf="headToHeadStats()!.currentStreak.winner === 'none'" class="streak-text">
                  No current streak
                </span>
              </div>
            </div>

            <!-- Longest Streak -->
            <div class="comparison-card">
              <h3>Longest Streak</h3>
              <div class="streak-info">
                <span *ngIf="headToHeadStats()!.longestStreak.winner !== 'none'" class="streak-text">
                  {{ getStreakWinnerName(headToHeadStats()!.longestStreak.winner) }} 
                  {{ headToHeadStats()!.longestStreak.length }} game(s)
                </span>
                <span *ngIf="headToHeadStats()!.longestStreak.winner === 'none'" class="streak-text">
                  No streaks yet
                </span>
              </div>
            </div>

            <!-- Game Extremes -->
            <div class="comparison-card">
              <h3>Game Records</h3>
              <div class="comparison-row">
                <span class="game-stat">Closest: {{ headToHeadStats()!.closestGame.toFixed(1) }} pts</span>
                <span class="game-stat">Highest Scoring: {{ headToHeadStats()!.highestScoringGame.toFixed(1) }} pts</span>
              </div>
            </div>

          </div>
        </section>

        <!-- Matchup History -->
        <section class="matchup-history" *ngIf="headToHeadMatchups().length > 0">
          <h2>📜 Matchup History</h2>
          <div class="history-table">
            <div class="history-header">
              <div class="week-col">Week</div>
              <div class="teams-col">Matchup</div>
              <div class="score-col">Score</div>
              <div class="winner-col">Winner</div>
            </div>
            
            <div class="history-row" *ngFor="let matchup of headToHeadMatchups()" 
                 [class]="getMatchupRowClass(matchup)">
              <div class="week-col">{{ matchup.matchupPeriodId }}</div>
              <div class="teams-col">
                <span class="team-name" [class.winner]="matchup.winner === 'team1'">
                  {{ team1()!.name }}
                </span>
                <span class="vs">vs</span>
                <span class="team-name" [class.winner]="matchup.winner === 'team2'">
                  {{ team2()!.name }}
                </span>
              </div>
              <div class="score-col">
                <span class="score" [class.winner]="matchup.winner === 'team1'">
                  {{ matchup.team1Score.toFixed(1) }}
                </span>
                <span class="score-divider">-</span>
                <span class="score" [class.winner]="matchup.winner === 'team2'">
                  {{ matchup.team2Score.toFixed(1) }}
                </span>
              </div>
              <div class="winner-col">
                <span *ngIf="matchup.winner !== 'tie'" class="winner-name">
                  {{ matchup.winner === 'team1' ? team1()!.name : team2()!.name }}
                </span>
                <span *ngIf="matchup.winner === 'tie'" class="tie-result">Tie</span>
              </div>
            </div>
          </div>
        </section>

        <!-- No Matchups Message -->
        <section class="no-matchups" *ngIf="team1() && team2() && headToHeadMatchups().length === 0">
          <div class="no-matchups-card">
            <h3>No Historical Matchups</h3>
            <p>{{ team1()!.name }} and {{ team2()!.name }} haven't played each other yet this season.</p>
            <p>Check back after they face off!</p>
          </div>
        </section>

      </div>
    </div>
  `,
  styles: [`
    .head-to-head-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .head-to-head-header {
      text-align: center;
      margin-bottom: 30px;
    }
    
    .head-to-head-header h1 {
      margin: 0 0 8px 0;
      color: var(--text-primary, #333);
      font-size: 2.2em;
      font-weight: 700;
    }
    
    .header-subtitle {
      margin: 0;
      color: var(--text-muted, #888);
      font-size: 1.1em;
    }
    
    /* Team Selection */
    .team-selection {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 30px;
      margin-bottom: 40px;
      padding: 24px;
      background: var(--card-background, #ffffff);
      border: 1px solid var(--card-border, #e0e0e0);
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .team-selector {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 200px;
    }
    
    .team-selector label {
      font-weight: 600;
      color: var(--text-primary, #333);
      font-size: 1.1em;
    }
    
    .team-selector select {
      padding: 12px 16px;
      border: 2px solid var(--input-border, #ccc);
      border-radius: 8px;
      font-size: 1em;
      background: white;
      transition: all 0.2s ease;
    }
    
    .team-selector select:focus {
      outline: none;
      border-color: var(--primary-color, #007bff);
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
    }
    
    .vs-divider {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    
    .vs-text {
      font-size: 1.5em;
      font-weight: 800;
      color: var(--primary-color, #007bff);
      padding: 8px 16px;
      border: 2px solid var(--primary-color, #007bff);
      border-radius: 50%;
      background: white;
    }
    
    /* Teams Preview */
    .teams-preview {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 30px;
      align-items: center;
      margin-bottom: 40px;
      padding: 30px;
      background: var(--card-background, #ffffff);
      border: 1px solid var(--card-border, #e0e0e0);
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .team-card {
      text-align: center;
      padding: 20px;
      border-radius: 8px;
      background: var(--team-background, #f8f9fa);
    }
    
    .team-logo {
      width: 60px;
      height: 60px;
      margin: 0 auto 12px;
    }
    
    .team-logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 8px;
    }
    
    .team-name {
      margin: 0 0 8px 0;
      font-size: 1.3em;
      font-weight: 700;
      color: var(--text-primary, #333);
    }
    
    .team-record {
      margin: 0;
      color: var(--text-muted, #888);
      font-weight: 500;
    }
    
    .rivalry-center {
      text-align: center;
      padding: 20px;
      background: linear-gradient(135deg, #007bff, #0056b3);
      border-radius: 12px;
      color: white;
    }
    
    .rivalry-title {
      font-size: 1.1em;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    .overall-record {
      font-size: 2em;
      font-weight: 800;
      line-height: 1;
    }
    
    .ties-count {
      font-size: 0.8em;
      opacity: 0.9;
    }
    
    /* Statistics */
    .stats-overview,
    .detailed-comparison {
      margin-bottom: 40px;
    }
    
    .stats-overview h2,
    .detailed-comparison h2,
    .matchup-history h2 {
      margin: 0 0 20px 0;
      color: var(--text-primary, #333);
      font-size: 1.6em;
      font-weight: 600;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }
    
    .comparison-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }
    
    .comparison-card {
      background: var(--card-background, #ffffff);
      border: 1px solid var(--card-border, #e0e0e0);
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .comparison-card h3 {
      margin: 0 0 12px 0;
      font-size: 1.1em;
      font-weight: 600;
      color: var(--text-primary, #333);
    }
    
    .comparison-row {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .team1-stat,
    .team2-stat,
    .game-stat {
      padding: 8px;
      background: var(--stat-background, #f8f9fa);
      border-radius: 4px;
      font-weight: 500;
    }
    
    .streak-info,
    .streak-text {
      font-weight: 600;
      color: var(--primary-color, #007bff);
      text-align: center;
      padding: 12px;
      background: var(--primary-background, #e3f2fd);
      border-radius: 6px;
    }
    
    /* Matchup History */
    .history-table {
      background: var(--card-background, #ffffff);
      border: 1px solid var(--card-border, #e0e0e0);
      border-radius: 8px;
      overflow: hidden;
    }
    
    .history-header {
      display: grid;
      grid-template-columns: 80px 1fr 120px 120px;
      gap: 12px;
      padding: 16px;
      background: var(--table-header-background, #f8f9fa);
      font-weight: 600;
      color: var(--text-primary, #333);
      border-bottom: 1px solid var(--border-color, #e0e0e0);
    }
    
    .history-row {
      display: grid;
      grid-template-columns: 80px 1fr 120px 120px;
      gap: 12px;
      padding: 16px;
      border-bottom: 1px solid var(--border-color, #e0e0e0);
      transition: all 0.2s ease;
    }
    
    .history-row:hover {
      background: var(--row-hover-background, #f8f9fa);
    }
    
    .history-row:last-child {
      border-bottom: none;
    }
    
    .teams-col {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .team-name.winner {
      font-weight: 700;
      color: var(--success-color, #28a745);
    }
    
    .vs {
      font-size: 0.9em;
      color: var(--text-muted, #888);
    }
    
    .score-col {
      display: flex;
      align-items: center;
      gap: 4px;
      font-weight: 600;
    }
    
    .score.winner {
      color: var(--success-color, #28a745);
      font-weight: 800;
    }
    
    .score-divider {
      color: var(--text-muted, #888);
    }
    
    .winner-name {
      font-weight: 700;
      color: var(--success-color, #28a745);
    }
    
    .tie-result {
      font-weight: 600;
      color: var(--warning-color, #ffc107);
    }
    
    /* No Matchups */
    .no-matchups {
      text-align: center;
      margin-top: 40px;
    }
    
    .no-matchups-card {
      padding: 40px;
      background: var(--card-background, #ffffff);
      border: 1px solid var(--card-border, #e0e0e0);
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .no-matchups-card h3 {
      margin: 0 0 16px 0;
      color: var(--text-primary, #333);
      font-size: 1.4em;
    }
    
    .no-matchups-card p {
      margin: 0 0 8px 0;
      color: var(--text-muted, #888);
      font-size: 1.1em;
    }
    
    .no-matchups-card p:last-child {
      margin-bottom: 0;
    }
    
    /* Responsive Design */
    @media (max-width: 768px) {
      .head-to-head-container {
        padding: 16px;
      }
      
      .team-selection {
        flex-direction: column;
        gap: 20px;
      }
      
      .vs-divider {
        order: -1;
      }
      
      .teams-preview {
        grid-template-columns: 1fr;
        gap: 20px;
        text-align: center;
      }
      
      .rivalry-center {
        order: -1;
      }
      
      .stats-grid,
      .comparison-grid {
        grid-template-columns: 1fr;
      }
      
      .history-header,
      .history-row {
        grid-template-columns: 60px 1fr 100px 100px;
        gap: 8px;
        font-size: 0.9em;
      }
    }
  `]
})
export class HeadToHeadComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  
  // Inject stores
  protected readonly teamsStore = inject(TeamsStore);
  protected readonly matchupsStore = inject(MatchupsStore);
  
  // Component state
  selectedTeam1Id = signal<number | null>(null);
  selectedTeam2Id = signal<number | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  // Public signals
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed properties
  readonly availableTeams = computed(() => {
    return this.teamsStore.teams() || [];
  });

  readonly team1 = computed(() => {
    const id = this.selectedTeam1Id();
    return id ? this.teamsStore.getTeamById(id) : null;
  });

  readonly team2 = computed(() => {
    const id = this.selectedTeam2Id();
    return id ? this.teamsStore.getTeamById(id) : null;
  });

  readonly showContent = computed(() => {
    return this.team1() && this.team2() && !this._isLoading() && !this._error();
  });

  readonly headToHeadMatchups = computed(() => {
    const team1 = this.team1();
    const team2 = this.team2();
    if (!team1 || !team2) {
      console.log('🔍 No teams selected for head-to-head');
      return [];
    }

    console.log('🔍 Head-to-head analysis for:', team1.name, 'vs', team2.name);
    console.log('🔍 Team IDs:', team1.id, 'vs', team2.id);
    console.log('🔍 Team 1 full object:', team1);
    console.log('🔍 Team 2 full object:', team2);

    const allMatchups = this.matchupsStore.matchups() || [];
    console.log('🔍 Total matchups available:', allMatchups.length);
    
    // Log all teams for comparison
    const allTeams = this.teamsStore.teams() || [];
    console.log('🔍 All teams with IDs:', allTeams.map(t => ({ name: t.name, id: t.id })));
    
    // Log unique team IDs in matchups
    const uniqueTeamIds = new Set<number>();
    allMatchups.forEach(matchup => {
      uniqueTeamIds.add(matchup.home.teamId);
      uniqueTeamIds.add(matchup.away.teamId);
    });
    console.log('🔍 Unique team IDs in matchups:', Array.from(uniqueTeamIds).sort());
    
    const matchups: HeadToHeadMatchup[] = [];

    allMatchups.forEach((matchup, index) => {
      const isTeam1Home = matchup.home.teamId === team1.id && matchup.away.teamId === team2.id;
      const isTeam1Away = matchup.away.teamId === team1.id && matchup.home.teamId === team2.id;
      
      if (index < 3) { // Debug first few matchups to see structure
        console.log(`🔍 Matchup ${index}:`, {
          week: matchup.matchupPeriodId,
          home: matchup.home.teamId,
          away: matchup.away.teamId,
          homeScore: matchup.home.totalPoints,
          awayScore: matchup.away.totalPoints,
          isTeam1Home,
          isTeam1Away
        });
      }
      
      if (isTeam1Home || isTeam1Away) {
        const team1Score = isTeam1Home ? matchup.home.totalPoints : matchup.away.totalPoints;
        const team2Score = isTeam1Home ? matchup.away.totalPoints : matchup.home.totalPoints;
        const scoreDifference = Math.abs(team1Score - team2Score);
        
        let winner: 'team1' | 'team2' | 'tie' = 'tie';
        if (team1Score > team2Score) winner = 'team1';
        else if (team2Score > team1Score) winner = 'team2';

        console.log('🔍 Found head-to-head matchup:', {
          week: matchup.matchupPeriodId,
          team1Score,
          team2Score,
          winner
        });

        matchups.push({
          id: matchup.id,
          matchupPeriodId: matchup.matchupPeriodId,
          home: matchup.home,
          away: matchup.away,
          originalWinner: matchup.winner,
          isTeam1Home,
          team1Score,
          team2Score,
          scoreDifference,
          winner
        });
      }
    });

    console.log('🔍 Total head-to-head matchups found:', matchups.length);
    return matchups.sort((a, b) => b.matchupPeriodId - a.matchupPeriodId);
  });

  readonly headToHeadStats = computed((): HeadToHeadStats | null => {
    const matchups = this.headToHeadMatchups();
    if (matchups.length === 0) return null;

    let team1Wins = 0;
    let team2Wins = 0;
    let ties = 0;
    let team1TotalScore = 0;
    let team2TotalScore = 0;
    let closestGame = Infinity;
    let highestScoringGame = 0;

    matchups.forEach(matchup => {
      if (matchup.winner === 'team1') team1Wins++;
      else if (matchup.winner === 'team2') team2Wins++;
      else ties++;

      team1TotalScore += matchup.team1Score;
      team2TotalScore += matchup.team2Score;
      
      closestGame = Math.min(closestGame, matchup.scoreDifference);
      highestScoringGame = Math.max(highestScoringGame, matchup.team1Score + matchup.team2Score);
    });

    // Calculate streaks
    const currentStreak = this.calculateCurrentStreak(matchups);
    const longestStreak = this.calculateLongestStreak(matchups);

    return {
      team1Wins,
      team2Wins,
      ties,
      totalGames: matchups.length,
      team1AvgScore: team1TotalScore / matchups.length,
      team2AvgScore: team2TotalScore / matchups.length,
      avgScoreDifference: matchups.reduce((sum, m) => sum + m.scoreDifference, 0) / matchups.length,
      closestGame: closestGame === Infinity ? 0 : closestGame,
      highestScoringGame,
      currentStreak,
      longestStreak
    };
  });

  readonly rivalryStatsConfig = computed((): Record<string, StatConfig> => {
    const stats = this.headToHeadStats();
    const team1 = this.team1();
    const team2 = this.team2();
    
    if (!stats || !team1 || !team2) return {};

    const team1WinPct = stats.totalGames > 0 ? (stats.team1Wins / stats.totalGames) * 100 : 0;

    return {
      totalGames: {
        label: 'Total Games',
        value: stats.totalGames,
        format: 'number',
        icon: '🏈'
      },
      winPercentage: {
        label: `${team1.name} Win %`,
        value: team1WinPct,
        format: 'number',
        decimals: 1,
        icon: '📊',
        suffix: '%'
      },
      avgScoreDiff: {
        label: 'Avg Score Diff',
        value: stats.avgScoreDifference,
        format: 'number',
        decimals: 1,
        icon: '⚖️'
      },
      closestGame: {
        label: 'Closest Game',
        value: stats.closestGame,
        format: 'number',
        decimals: 1,
        icon: '🎯',
        suffix: ' pts'
      }
    };
  });

  ngOnInit(): void {
    console.log('🚀 Head-to-head component initializing');
    console.log('🚀 Component loaded successfully');
    
    // Load initial data
    if (!this.teamsStore.teams()?.length) {
      console.log('📥 Loading teams data...');
      this.teamsStore.load().subscribe({
        next: () => {
          console.log('✅ Teams loaded:', this.teamsStore.teams()?.length || 0);
        },
        error: (error) => {
          console.error('❌ Failed to load teams:', error);
        }
      });
    } else {
      console.log('✅ Teams already loaded:', this.teamsStore.teams()?.length || 0);
    }
    
    if (!this.matchupsStore.matchups()?.length) {
      console.log('📥 Loading matchups data...');
      this.matchupsStore.load().subscribe({
        next: () => {
          console.log('✅ Matchups loaded:', this.matchupsStore.matchups()?.length || 0);
        },
        error: (error) => {
          console.error('❌ Failed to load matchups:', error);
        }
      });
    } else {
      console.log('✅ Matchups already loaded:', this.matchupsStore.matchups()?.length || 0);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  refreshData(): void {
    this._isLoading.set(true);
    this._error.set(null);

    // Refresh both teams and matchups data
    Promise.all([
      this.teamsStore.refresh().toPromise(),
      this.matchupsStore.refresh().toPromise()
    ]).then(() => {
      this._isLoading.set(false);
    }).catch((error) => {
      this._error.set('Failed to refresh data. Please try again.');
      this._isLoading.set(false);
    });
  }

  getTeamRecord(team: Team): string {
    const record = team.record.overall;
    return `${record.wins}-${record.losses}${record.ties ? `-${record.ties}` : ''}`;
  }

  getStreakWinnerName(winner: 'team1' | 'team2' | 'none'): string {
    if (winner === 'team1') return this.team1()?.name || 'Team 1';
    if (winner === 'team2') return this.team2()?.name || 'Team 2';
    return 'None';
  }

  getMatchupRowClass(matchup: HeadToHeadMatchup): string {
    return matchup.winner === 'tie' ? 'tie-game' : 'regular-game';
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiByeD0iOCIgZmlsbD0iI0Y4RjlGQSIvPgo8cGF0aCBkPSJNMzAgNDBDMzUuNTIyOCA0MCA0MCAzNS41MjI4IDQwIDMwQzQwIDI0LjQ3NzIgMzUuNTIyOCAyMCAzMCAyMEMyNC40NzcyIDIwIDIwIDI0LjQ3NzIgMjAgMzBDMjAgMzUuNTIyOCAyNC40NzcyIDQwIDMwIDQwWiIgZmlsbD0iI0RERERERCIvPgo8L3N2Zz4K';
  }

  private calculateCurrentStreak(matchups: HeadToHeadMatchup[]): { winner: 'team1' | 'team2' | 'none'; length: number } {
    if (matchups.length === 0) return { winner: 'none', length: 0 };

    const sortedMatchups = [...matchups].sort((a, b) => b.matchupPeriodId - a.matchupPeriodId);
    const latestWinner = sortedMatchups[0].winner;
    
    if (latestWinner === 'tie') return { winner: 'none', length: 0 };

    let streakLength = 0;
    for (const matchup of sortedMatchups) {
      if (matchup.winner === latestWinner) {
        streakLength++;
      } else {
        break;
      }
    }

    return { winner: latestWinner, length: streakLength };
  }

  private calculateLongestStreak(matchups: HeadToHeadMatchup[]): { winner: 'team1' | 'team2' | 'none'; length: number } {
    if (matchups.length === 0) return { winner: 'none', length: 0 };

    const sortedMatchups = [...matchups].sort((a, b) => a.matchupPeriodId - b.matchupPeriodId);
    
    let longestStreak = { winner: 'none' as 'team1' | 'team2' | 'none', length: 0 };
    let currentStreakWinner: 'team1' | 'team2' | 'tie' | null = null;
    let currentStreakLength = 0;

    for (const matchup of sortedMatchups) {
      if (matchup.winner === currentStreakWinner && matchup.winner !== 'tie') {
        currentStreakLength++;
      } else {
        // Check if previous streak was longer
        if (currentStreakLength > longestStreak.length && currentStreakWinner !== 'tie' && currentStreakWinner !== null) {
          longestStreak = { winner: currentStreakWinner, length: currentStreakLength };
        }
        
        // Start new streak
        currentStreakWinner = matchup.winner;
        currentStreakLength = matchup.winner !== 'tie' ? 1 : 0;
      }
    }

    // Check final streak
    if (currentStreakLength > longestStreak.length && currentStreakWinner !== 'tie' && currentStreakWinner !== null) {
      longestStreak = { winner: currentStreakWinner, length: currentStreakLength };
    }

    return longestStreak;
  }
}