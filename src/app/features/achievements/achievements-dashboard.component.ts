/**
 * Achievements Dashboard Component
 * 
 * Main dashboard for viewing achievements, progress tracking, leaderboards,
 * and gamification elements.
 * 
 * @version 1.0.0
 * @author Generated with Claude Code
 */

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AchievementsStore } from '../../store/achievements.store';
import { TeamsStore } from '../../store/teams.store';
import { AppStore } from '../../store/app.store';
import { AchievementBadgeComponent } from '../../shared/components/achievement-badge.component';
import { 
  Achievement, 
  UserAchievements, 
  AchievementCategory,
  AchievementRarity,
  AchievementLeaderboard
} from '../../models/espn-fantasy.interfaces';

interface FilterOptions {
  category: AchievementCategory | 'all';
  rarity: AchievementRarity | 'all';
  status: 'all' | 'unlocked' | 'locked' | 'in-progress';
}

@Component({
  selector: 'app-achievements-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, AchievementBadgeComponent],
  template: `
    <div class="achievements-dashboard">
      <!-- Header -->
      <div class="dashboard-header">
        <h1 class="page-title">Achievements</h1>
        <p class="page-subtitle">
          Track your fantasy football accomplishments and compete for glory
        </p>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading achievements...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="hasError()" class="error-container">
        <h3>Unable to Load Achievements</h3>
        <p>{{ error()?.error }}</p>
        <button class="btn btn-primary" (click)="retryLoad()">
          Retry
        </button>
      </div>

      <!-- Main Content -->
      <div *ngIf="!isLoading() && !hasError()" class="dashboard-content">
        
        <!-- User Stats Overview -->
        <section class="user-stats-section">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon">🏆</div>
              <div class="stat-content">
                <div class="stat-value">{{ userAchievements()?.unlockedAchievements.length || 0 }}</div>
                <div class="stat-label">Achievements</div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon">⭐</div>
              <div class="stat-content">
                <div class="stat-value">{{ userAchievements()?.totalPoints || 0 }}</div>
                <div class="stat-label">Total Points</div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon">📊</div>
              <div class="stat-content">
                <div class="stat-value">{{ userAchievements()?.level || 1 }}</div>
                <div class="stat-label">Level</div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon">🎯</div>
              <div class="stat-content">
                <div class="stat-value">{{ getInProgressCount() }}</div>
                <div class="stat-label">In Progress</div>
              </div>
            </div>
          </div>

          <!-- Level Progress -->
          <div class="level-progress" *ngIf="userAchievements()">
            <div class="level-info">
              <span class="current-level">Level {{ userAchievements()!.level }}</span>
              <span class="next-level">Level {{ userAchievements()!.level + 1 }}</span>
            </div>
            <div class="progress-bar">
              <div 
                class="progress-fill" 
                [style.width.%]="getLevelProgressPercent()">
              </div>
            </div>
            <div class="progress-text">
              {{ getLevelProgressText() }}
            </div>
          </div>
        </section>

        <!-- Recent Achievements -->
        <section class="recent-achievements-section" *ngIf="getRecentAchievements().length > 0">
          <h2 class="section-title">Recent Achievements</h2>
          
          <div class="recent-achievements-grid">
            <app-achievement-badge
              *ngFor="let unlock of getRecentAchievements()"
              [achievement]="getAchievementById(unlock.achievementId)!"
              [unlock]="unlock"
              size="medium"
              style="detailed"
              (badgeClick)="onAchievementClick($event)">
            </app-achievement-badge>
          </div>
        </section>

        <!-- Achievement Filters -->
        <section class="filters-section">
          <div class="filters-container">
            <div class="filter-group">
              <label class="filter-label">Category:</label>
              <select 
                class="filter-select" 
                [(ngModel)]="filters().category"
                (ngModelChange)="updateFilters({ category: $event })">
                <option value="all">All Categories</option>
                <option value="scoring">📊 Scoring</option>
                <option value="strategy">🧠 Strategy</option>
                <option value="consistency">🎯 Consistency</option>
                <option value="comeback">📈 Comeback</option>
                <option value="domination">👑 Domination</option>
                <option value="participation">🤝 Participation</option>
                <option value="milestone">🏁 Milestone</option>
                <option value="special">🎭 Special</option>
                <option value="seasonal">📅 Seasonal</option>
              </select>
            </div>

            <div class="filter-group">
              <label class="filter-label">Rarity:</label>
              <select 
                class="filter-select" 
                [(ngModel)]="filters().rarity"
                (ngModelChange)="updateFilters({ rarity: $event })">
                <option value="all">All Rarities</option>
                <option value="common">⚪ Common</option>
                <option value="uncommon">🟢 Uncommon</option>
                <option value="rare">🔵 Rare</option>
                <option value="epic">🟣 Epic</option>
                <option value="legendary">🟡 Legendary</option>
              </select>
            </div>

            <div class="filter-group">
              <label class="filter-label">Status:</label>
              <select 
                class="filter-select" 
                [(ngModel)]="filters().status"
                (ngModelChange)="updateFilters({ status: $event })">
                <option value="all">All Achievements</option>
                <option value="unlocked">✅ Unlocked</option>
                <option value="in-progress">🔄 In Progress</option>
                <option value="locked">🔒 Locked</option>
              </select>
            </div>

            <div class="filter-actions">
              <button class="btn btn-secondary btn-sm" (click)="clearFilters()">
                Clear Filters
              </button>
            </div>
          </div>
        </section>

        <!-- Achievements Grid -->
        <section class="achievements-grid-section">
          <div class="section-header">
            <h2 class="section-title">
              All Achievements 
              <span class="achievement-count">({{ getFilteredAchievements().length }})</span>
            </h2>
            
            <div class="view-options">
              <button 
                class="view-toggle"
                [class.active]="viewMode() === 'grid'"
                (click)="setViewMode('grid')">
                Grid
              </button>
              <button 
                class="view-toggle"
                [class.active]="viewMode() === 'list'"
                (click)="setViewMode('list')">
                List
              </button>
            </div>
          </div>

          <div class="achievements-grid" [class]="'view-' + viewMode()">
            <app-achievement-badge
              *ngFor="let achievement of getFilteredAchievements(); trackBy: trackAchievement"
              [achievement]="achievement"
              [unlock]="getUserUnlock(achievement.id)"
              [progress]="getUserProgress(achievement.id)"
              [size]="viewMode() === 'list' ? 'medium' : 'large'"
              [style]="viewMode() === 'list' ? 'default' : 'detailed'"
              (badgeClick)="onAchievementClick($event)">
            </app-achievement-badge>
          </div>

          <!-- Empty State -->
          <div *ngIf="getFilteredAchievements().length === 0" class="empty-state">
            <div class="empty-icon">🔍</div>
            <h3>No achievements found</h3>
            <p>Try adjusting your filters to see more achievements.</p>
          </div>
        </section>

        <!-- Leaderboard Section -->
        <section class="leaderboard-section" *ngIf="leaderboard()">
          <h2 class="section-title">Achievement Leaderboard</h2>
          
          <div class="leaderboard-container">
            <div class="leaderboard-header">
              <div class="rank-header">Rank</div>
              <div class="team-header">Team</div>
              <div class="score-header">Points</div>
              <div class="change-header">Change</div>
            </div>
            
            <div class="leaderboard-entries">
              <div 
                class="leaderboard-entry"
                *ngFor="let entry of leaderboard()!.overallLeaders; let i = index"
                [class.current-user]="isCurrentUser(entry.teamId)">
                
                <div class="entry-rank">
                  <span class="rank-number">{{ entry.rank }}</span>
                  <span class="rank-medal" *ngIf="entry.rank <= 3">
                    {{ getRankMedal(entry.rank) }}
                  </span>
                </div>
                
                <div class="entry-team">
                  <span class="team-name">{{ entry.teamName }}</span>
                </div>
                
                <div class="entry-score">
                  {{ entry.score }}
                </div>
                
                <div class="entry-change" [class]="getChangeClass(entry.change)">
                  <span *ngIf="entry.change !== 0">
                    {{ entry.change > 0 ? '+' : '' }}{{ entry.change }}
                  </span>
                  <span *ngIf="entry.change === 0">-</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Testing Section (Development Only) -->
        <section class="testing-section" *ngIf="isDevelopment()">
          <h3>Achievement Testing</h3>
          <div class="test-actions">
            <button 
              class="btn btn-warning btn-sm"
              (click)="simulateAchievement('high_score_150')">
              Simulate High Score
            </button>
            <button 
              class="btn btn-warning btn-sm"
              (click)="simulateAchievement('first_championship')">
              Simulate Championship
            </button>
            <button 
              class="btn btn-secondary btn-sm"
              (click)="clearTestAchievements()">
              Clear Test Data
            </button>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .achievements-dashboard {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .dashboard-header {
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

    /* User Stats Section */
    .user-stats-section {
      margin-bottom: 3rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: var(--card-bg, #fff);
      border: 1px solid var(--border-color, #dee2e6);
      border-radius: 8px;
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: transform 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-2px);
    }

    .stat-icon {
      font-size: 2rem;
      width: 60px;
      text-align: center;
    }

    .stat-content {
      flex: 1;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--primary-color, #007bff);
      display: block;
      margin-bottom: 0.25rem;
    }

    .stat-label {
      font-size: 0.9rem;
      color: var(--text-muted, #6c757d);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Level Progress */
    .level-progress {
      background: var(--card-bg, #fff);
      border: 1px solid var(--border-color, #dee2e6);
      border-radius: 8px;
      padding: 1.5rem;
    }

    .level-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .current-level {
      font-weight: 600;
      color: var(--primary-color, #007bff);
    }

    .next-level {
      color: var(--text-muted, #6c757d);
    }

    .progress-bar {
      height: 8px;
      background: var(--border-color, #dee2e6);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--primary-color, #007bff), var(--success-color, #28a745));
      transition: width 0.3s ease;
    }

    .progress-text {
      text-align: center;
      font-size: 0.9rem;
      color: var(--text-muted, #6c757d);
    }

    /* Section Styling */
    .section-title {
      font-size: 1.8rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
      color: var(--text-primary, #212529);
    }

    .achievement-count {
      color: var(--text-muted, #6c757d);
      font-weight: 400;
      font-size: 1.2rem;
    }

    /* Recent Achievements */
    .recent-achievements-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    /* Filters */
    .filters-container {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: center;
      background: var(--card-bg, #fff);
      border: 1px solid var(--border-color, #dee2e6);
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .filter-label {
      font-weight: 500;
      color: var(--text-primary, #212529);
      white-space: nowrap;
    }

    .filter-select {
      padding: 0.5rem;
      border: 1px solid var(--border-color, #dee2e6);
      border-radius: 4px;
      background: var(--input-bg, #fff);
      color: var(--text-primary, #212529);
    }

    /* Section Header with View Options */
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .view-options {
      display: flex;
      gap: 0.5rem;
    }

    .view-toggle {
      padding: 0.5rem 1rem;
      border: 1px solid var(--border-color, #dee2e6);
      background: var(--card-bg, #fff);
      color: var(--text-primary, #212529);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .view-toggle:hover {
      background: var(--hover-bg, #f8f9fa);
    }

    .view-toggle.active {
      background: var(--primary-color, #007bff);
      color: white;
      border-color: var(--primary-color, #007bff);
    }

    /* Achievements Grid */
    .achievements-grid.view-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1.5rem;
    }

    .achievements-grid.view-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-muted, #6c757d);
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    /* Leaderboard */
    .leaderboard-container {
      background: var(--card-bg, #fff);
      border: 1px solid var(--border-color, #dee2e6);
      border-radius: 8px;
      overflow: hidden;
    }

    .leaderboard-header {
      display: grid;
      grid-template-columns: 80px 1fr 100px 80px;
      gap: 1rem;
      padding: 1rem;
      background: var(--header-bg, #f8f9fa);
      font-weight: 600;
      color: var(--text-primary, #212529);
      border-bottom: 1px solid var(--border-color, #dee2e6);
    }

    .leaderboard-entry {
      display: grid;
      grid-template-columns: 80px 1fr 100px 80px;
      gap: 1rem;
      padding: 1rem;
      border-bottom: 1px solid var(--border-light, #f8f9fa);
      transition: background 0.2s;
    }

    .leaderboard-entry:hover {
      background: var(--hover-bg, #f8f9fa);
    }

    .leaderboard-entry:last-child {
      border-bottom: none;
    }

    .leaderboard-entry.current-user {
      background: var(--primary-bg, #e3f2fd);
      border-left: 4px solid var(--primary-color, #007bff);
    }

    .entry-rank {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .rank-number {
      font-weight: 600;
      color: var(--text-primary, #212529);
    }

    .rank-medal {
      font-size: 1.2rem;
    }

    .team-name {
      font-weight: 500;
      color: var(--text-primary, #212529);
    }

    .entry-score {
      font-weight: 600;
      color: var(--success-color, #28a745);
    }

    .entry-change {
      font-weight: 500;
    }

    .entry-change.positive {
      color: var(--success-color, #28a745);
    }

    .entry-change.negative {
      color: var(--danger-color, #dc3545);
    }

    .entry-change.neutral {
      color: var(--text-muted, #6c757d);
    }

    /* Testing Section */
    .testing-section {
      margin-top: 3rem;
      padding: 1.5rem;
      background: var(--warning-bg, #fff3cd);
      border: 1px solid var(--warning-color, #ffc107);
      border-radius: 8px;
    }

    .test-actions {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      margin-top: 1rem;
    }

    /* Buttons */
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

    .btn-secondary {
      background: var(--secondary-color, #6c757d);
      color: white;
    }

    .btn-warning {
      background: var(--warning-color, #ffc107);
      color: var(--dark, #212529);
    }

    .btn-sm {
      padding: 0.375rem 0.75rem;
      font-size: 0.8rem;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .achievements-dashboard {
        padding: 1rem;
      }

      .page-title {
        font-size: 2rem;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
      }

      .filters-container {
        flex-direction: column;
        align-items: stretch;
      }

      .filter-group {
        justify-content: space-between;
      }

      .section-header {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
      }

      .achievements-grid.view-grid {
        grid-template-columns: 1fr;
      }

      .leaderboard-header,
      .leaderboard-entry {
        grid-template-columns: 60px 1fr 80px 60px;
        gap: 0.5rem;
        padding: 0.75rem;
      }
    }
  `]
})
export class AchievementsDashboardComponent implements OnInit {
  
  private readonly achievementsStore = inject(AchievementsStore);
  private readonly teamsStore = inject(TeamsStore);
  private readonly appStore = inject(AppStore);

  // Store computed properties
  public readonly isLoading = this.achievementsStore.isLoading;
  public readonly hasError = this.achievementsStore.hasError;
  public readonly error = this.achievementsStore.error;
  public readonly allAchievements = this.achievementsStore.allAchievements;
  public readonly leaderboard = this.achievementsStore.leaderboard;

  // Component state
  private readonly currentTeamId = signal('1'); // Would get from user/app state
  private readonly filters = signal<FilterOptions>({
    category: 'all',
    rarity: 'all',
    status: 'all'
  });
  private readonly viewMode = signal<'grid' | 'list'>('grid');

  // Computed properties
  public readonly userAchievements = computed(() => 
    this.achievementsStore.getUserAchievements(this.currentTeamId())
  );

  ngOnInit(): void {
    // Load achievements data
    this.achievementsStore.load().subscribe({
      error: (error) => console.error('Failed to load achievements:', error)
    });
    
    // Load teams for reference
    this.teamsStore.load().subscribe({
      error: (error) => console.error('Failed to load teams:', error)
    });
  }

  retryLoad(): void {
    this.achievementsStore.retry().subscribe();
  }

  getInProgressCount(): number {
    const userAchievements = this.userAchievements();
    if (!userAchievements) return 0;
    
    return Object.values(userAchievements.progress).filter(
      progress => progress.isActive && progress.progressPercent > 0 && progress.progressPercent < 100
    ).length;
  }

  getLevelProgressPercent(): number {
    const userAchievements = this.userAchievements();
    if (!userAchievements) return 0;
    
    const currentLevelMin = (userAchievements.level - 1) * 1000;
    const nextLevelMin = userAchievements.level * 1000;
    const currentPoints = userAchievements.totalPoints;
    
    return ((currentPoints - currentLevelMin) / (nextLevelMin - currentLevelMin)) * 100;
  }

  getLevelProgressText(): string {
    const userAchievements = this.userAchievements();
    if (!userAchievements) return '';
    
    const pointsToNext = userAchievements.pointsToNextLevel;
    return `${pointsToNext} points to next level`;
  }

  getRecentAchievements() {
    const userAchievements = this.userAchievements();
    return userAchievements?.recentUnlocks.slice(0, 6) || [];
  }

  getAchievementById(id: string): Achievement | undefined {
    return this.allAchievements().find(achievement => achievement.id === id);
  }

  getFilteredAchievements(): Achievement[] {
    const achievements = this.allAchievements();
    const currentFilters = this.filters();
    const userAchievements = this.userAchievements();
    
    return achievements.filter(achievement => {
      // Category filter
      if (currentFilters.category !== 'all' && achievement.category !== currentFilters.category) {
        return false;
      }
      
      // Rarity filter
      if (currentFilters.rarity !== 'all' && achievement.rarity !== currentFilters.rarity) {
        return false;
      }
      
      // Status filter
      if (currentFilters.status !== 'all') {
        const isUnlocked = userAchievements?.unlockedAchievements.some(
          unlock => unlock.achievementId === achievement.id
        );
        const hasProgress = (userAchievements?.progress[achievement.id]?.progressPercent ?? 0) > 0;
        
        switch (currentFilters.status) {
          case 'unlocked':
            if (!isUnlocked) return false;
            break;
          case 'in-progress':
            if (isUnlocked || !hasProgress) return false;
            break;
          case 'locked':
            if (isUnlocked || hasProgress) return false;
            break;
        }
      }
      
      return true;
    });
  }

  getUserUnlock(achievementId: string) {
    return this.userAchievements()?.unlockedAchievements.find(
      unlock => unlock.achievementId === achievementId
    );
  }

  getUserProgress(achievementId: string) {
    return this.userAchievements()?.progress[achievementId] || null;
  }

  updateFilters(updates: Partial<FilterOptions>): void {
    this.filters.update(current => ({ ...current, ...updates }));
  }

  clearFilters(): void {
    this.filters.set({
      category: 'all',
      rarity: 'all',
      status: 'all'
    });
  }

  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode.set(mode);
  }

  onAchievementClick(achievement: Achievement): void {
    // Show achievement details modal or navigate to details page
    console.log('Achievement clicked:', achievement);
    this.appStore.showInfo('Achievement Details', `${achievement.name}: ${achievement.description}`);
  }

  trackAchievement(index: number, achievement: Achievement): string {
    return achievement.id;
  }

  isCurrentUser(teamId: number): boolean {
    return teamId.toString() === this.currentTeamId();
  }

  getRankMedal(rank: number): string {
    const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
    return medals[rank as keyof typeof medals] || '';
  }

  getChangeClass(change: number): string {
    if (change > 0) return 'positive';
    if (change < 0) return 'negative';
    return 'neutral';
  }

  isDevelopment(): boolean {
    return typeof window !== 'undefined' && window.location?.hostname === 'localhost';
  }

  simulateAchievement(achievementId: string): void {
    this.achievementsStore.simulateAchievementUnlock(this.currentTeamId(), achievementId);
    this.appStore.showSuccess('Achievement Unlocked!', `Simulated achievement: ${achievementId}`);
  }

  clearTestAchievements(): void {
    // In a real app, would clear test data
    this.appStore.showInfo('Test Data', 'Test achievement data cleared');
  }
}