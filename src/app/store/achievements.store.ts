/**
 * Achievements Store
 * 
 * Manages fantasy football achievements, badges, progress tracking, and 
 * gamification elements to enhance league engagement.
 * 
 * @version 1.0.0
 * @author Generated with Claude Code
 */

import { Injectable, computed, inject } from '@angular/core';
import { Observable, of, map, catchError, forkJoin } from 'rxjs';
import { BaseStore, StoreConfig } from './base-store';
import { FantasyFootballService } from '../services/fantasy-football/fantasy-football.service';
import { 
  Achievement, 
  UserAchievements, 
  UnlockedAchievement, 
  AchievementProgress,
  WeeklyAchievementRecap,
  AchievementLeaderboard,
  AchievementCategory,
  AchievementRarity
} from '../models/espn-fantasy.interfaces';

// =============================================
// TYPES AND INTERFACES
// =============================================

export interface AchievementsData {
  /** All available achievements */
  achievements: { [achievementId: string]: Achievement };
  
  /** User achievement data by team ID */
  userAchievements: { [teamId: string]: UserAchievements };
  
  /** Current season achievements */
  currentSeasonAchievements: { [teamId: string]: UnlockedAchievement[] };
  
  /** Achievement definitions by category */
  achievementsByCategory: { [category in AchievementCategory]: Achievement[] };
  
  /** Leaderboard data */
  leaderboard: AchievementLeaderboard;
  
  /** Weekly recap data */
  weeklyRecaps: { [week: number]: WeeklyAchievementRecap };
  
  /** Last check timestamp for new achievements */
  lastCheckTimestamp: number;
}

export interface AchievementCheckResult {
  /** Team ID that was checked */
  teamId: number;
  
  /** Newly unlocked achievements */
  newlyUnlocked: UnlockedAchievement[];
  
  /** Updated progress */
  progressUpdates: AchievementProgress[];
  
  /** Whether any achievements were unlocked */
  hasNewAchievements: boolean;
}

export interface AchievementNotification {
  /** Achievement that was unlocked */
  achievement: Achievement;
  
  /** Unlock details */
  unlockDetails: UnlockedAchievement;
  
  /** Team ID */
  teamId: number;
  
  /** Team name */
  teamName: string;
  
  /** Notification priority */
  priority: 'high' | 'medium' | 'low';
}

// =============================================
// ACHIEVEMENT DEFINITIONS
// =============================================

const ACHIEVEMENT_DEFINITIONS: Achievement[] = [
  // Scoring Achievements
  {
    id: 'high_score_150',
    name: 'Century and a Half',
    description: 'Score 150+ points in a single game',
    category: 'scoring',
    rarity: 'uncommon',
    icon: 'trophy',
    points: 100,
    criteria: {
      type: 'single_game',
      requirements: {
        stat: 'total_points',
        threshold: 150,
        operator: 'gte'
      }
    },
    repeatable: false,
    scope: 'season',
    hidden: false
  },
  {
    id: 'high_score_200',
    name: 'Double Century',
    description: 'Score 200+ points in a single game',
    category: 'scoring',
    rarity: 'epic',
    icon: 'star',
    points: 500,
    criteria: {
      type: 'single_game',
      requirements: {
        stat: 'total_points',
        threshold: 200,
        operator: 'gte'
      }
    },
    repeatable: false,
    scope: 'alltime',
    hidden: false
  },
  {
    id: 'consistent_scorer',
    name: 'Mr. Reliable',
    description: 'Score 100+ points for 8 consecutive weeks',
    category: 'consistency',
    rarity: 'rare',
    icon: 'target',
    points: 250,
    criteria: {
      type: 'streak',
      requirements: {
        stat: 'total_points',
        threshold: 100,
        operator: 'gte',
        duration: {
          type: 'weeks',
          value: 8
        }
      }
    },
    repeatable: false,
    scope: 'season',
    hidden: false
  },
  
  // Domination Achievements
  {
    id: 'blowout_victory',
    name: 'Steamroller',
    description: 'Win by 50+ points',
    category: 'domination',
    rarity: 'uncommon',
    icon: 'fire',
    points: 150,
    criteria: {
      type: 'single_game',
      requirements: {
        stat: 'margin_of_victory',
        threshold: 50,
        operator: 'gte'
      }
    },
    repeatable: true,
    scope: 'season',
    hidden: false
  },
  {
    id: 'perfect_season',
    name: 'Undefeated',
    description: 'Go undefeated in the regular season',
    category: 'domination',
    rarity: 'legendary',
    icon: 'crown',
    points: 1000,
    criteria: {
      type: 'season_total',
      requirements: {
        stat: 'losses',
        threshold: 0,
        operator: 'eq'
      }
    },
    repeatable: false,
    scope: 'season',
    hidden: false
  },
  
  // Comeback Achievements
  {
    id: 'comeback_kid',
    name: 'Comeback Kid',
    description: 'Win after being down by 30+ points on Sunday',
    category: 'comeback',
    rarity: 'rare',
    icon: 'trending-up',
    points: 300,
    criteria: {
      type: 'complex',
      requirements: {
        conditions: [
          { type: 'context', value: 'sunday_deficit', operator: 'gte' },
          { type: 'context', value: 30, operator: 'gte' }
        ]
      }
    },
    repeatable: true,
    scope: 'season',
    hidden: false
  },
  
  // Strategy Achievements
  {
    id: 'waiver_wire_wizard',
    name: 'Waiver Wire Wizard',
    description: 'Pick up a player who scores 25+ points that week',
    category: 'strategy',
    rarity: 'uncommon',
    icon: 'magic-wand',
    points: 200,
    criteria: {
      type: 'complex',
      requirements: {
        conditions: [
          { type: 'context', value: 'waiver_pickup', operator: 'eq' },
          { type: 'context', value: 25, operator: 'gte' }
        ]
      }
    },
    repeatable: true,
    scope: 'season',
    hidden: false
  },
  
  // Milestone Achievements
  {
    id: 'first_championship',
    name: 'Champion',
    description: 'Win your first league championship',
    category: 'milestone',
    rarity: 'epic',
    icon: 'trophy',
    points: 750,
    criteria: {
      type: 'milestone',
      requirements: {
        stat: 'championships',
        threshold: 1,
        operator: 'gte'
      }
    },
    repeatable: false,
    scope: 'career',
    hidden: false
  },
  {
    id: 'dynasty_builder',
    name: 'Dynasty Builder',
    description: 'Win 3 championships',
    category: 'milestone',
    rarity: 'legendary',
    icon: 'crown',
    points: 2000,
    criteria: {
      type: 'milestone',
      requirements: {
        stat: 'championships',
        threshold: 3,
        operator: 'gte'
      }
    },
    repeatable: false,
    scope: 'career',
    hidden: false
  },
  
  // Special/Fun Achievements
  {
    id: 'lowest_score',
    name: 'Participation Trophy',
    description: 'Score the lowest points in a single game (minimum 50)',
    category: 'special',
    rarity: 'common',
    icon: 'sad-face',
    points: 50,
    criteria: {
      type: 'comparative',
      requirements: {
        stat: 'total_points',
        operator: 'lt',
        conditions: [
          { type: 'context', value: 'weekly_minimum', operator: 'eq' }
        ]
      }
    },
    repeatable: false,
    scope: 'season',
    hidden: false
  },
  {
    id: 'glass_house',
    name: 'Glass House',
    description: 'Score the most points in a week but still lose',
    category: 'special',
    rarity: 'rare',
    icon: 'broken-heart',
    points: 200,
    criteria: {
      type: 'comparative',
      requirements: {
        conditions: [
          { type: 'context', value: 'highest_scorer', operator: 'eq' },
          { type: 'context', value: 'lost_game', operator: 'eq' }
        ]
      }
    },
    repeatable: true,
    scope: 'season',
    hidden: false
  }
];

// =============================================
// ACHIEVEMENTS STORE IMPLEMENTATION
// =============================================

@Injectable({
  providedIn: 'root'
})
export class AchievementsStore extends BaseStore<AchievementsData> {
  
  private readonly achievementsConfig: StoreConfig = {
    cacheTtl: 30 * 60 * 1000, // 30 minutes
    retryAttempts: 2,
    retryDelay: 1000,
    autoRefreshInterval: null, // Manual refresh after game updates
    persistToLocalStorage: true,
    storageKey: 'fantasy-football-achievements'
  };

  private readonly fantasyService = inject(FantasyFootballService);

  // Computed selectors
  public readonly allAchievements = computed(() => 
    Object.values(this.data()?.achievements ?? {})
  );
  
  public readonly achievementsByCategory = computed(() => 
    this.data()?.achievementsByCategory ?? {} as any
  );
  
  public readonly leaderboard = computed(() => this.data()?.leaderboard);
  
  public readonly currentWeekRecap = computed(() => {
    const currentWeek = new Date().getWeek(); // Would need to implement
    return this.data()?.weeklyRecaps[currentWeek];
  });

  constructor() {
    super();
    this.config = this.achievementsConfig;
  }

  protected loadData(): Observable<AchievementsData> {
    // Initialize with achievement definitions and load user progress
    return forkJoin({
      userAchievements: this.loadUserAchievements(),
      leaderboard: this.loadLeaderboard(),
      weeklyRecaps: this.loadWeeklyRecaps()
    }).pipe(
      map(({ userAchievements, leaderboard, weeklyRecaps }) => {
        return this.createAchievementsData(userAchievements, leaderboard, weeklyRecaps);
      }),
      catchError(error => {
        console.error('Failed to load achievements data:', error);
        return of(this.createEmptyAchievementsData());
      })
    );
  }

  protected getStoreName(): string {
    return 'AchievementsStore';
  }

  // =============================================
  // PUBLIC API METHODS
  // =============================================

  /**
   * Check for new achievements for a specific team
   */
  public checkTeamAchievements(teamId: number, gameData: any): Observable<AchievementCheckResult> {
    return of(this.performAchievementCheck(teamId, gameData));
  }

  /**
   * Get user achievements for a specific team
   */
  public getUserAchievements(teamId: string): UserAchievements | null {
    const data = this.data();
    return data?.userAchievements[teamId] ?? null;
  }

  /**
   * Get achievements by category
   */
  public getAchievementsByCategory(category: AchievementCategory): Achievement[] {
    const data = this.data();
    return data?.achievementsByCategory[category] ?? [];
  }

  /**
   * Get achievements by rarity
   */
  public getAchievementsByRarity(rarity: AchievementRarity): Achievement[] {
    return this.allAchievements().filter(achievement => achievement.rarity === rarity);
  }

  /**
   * Mark achievement notification as seen
   */
  public markNotificationSeen(teamId: string, achievementId: string): void {
    this.updateOptimistically(current => {
      if (!current) return current;
      
      const userAchievements = current.userAchievements[teamId];
      if (!userAchievements) return current;
      
      const updatedUnlocked = userAchievements.unlockedAchievements.map(unlocked => 
        unlocked.achievementId === achievementId 
          ? { ...unlocked, notificationSeen: true }
          : unlocked
      );
      
      return {
        ...current,
        userAchievements: {
          ...current.userAchievements,
          [teamId]: {
            ...userAchievements,
            unlockedAchievements: updatedUnlocked
          }
        }
      };
    });
  }

  /**
   * Get pending notifications for a team
   */
  public getPendingNotifications(teamId: string): AchievementNotification[] {
    const userAchievements = this.getUserAchievements(teamId);
    if (!userAchievements) return [];
    
    const data = this.data();
    if (!data) return [];
    
    return userAchievements.recentUnlocks
      .filter(unlock => !unlock.notificationSeen)
      .map(unlock => ({
        achievement: data.achievements[unlock.achievementId],
        unlockDetails: unlock,
        teamId: parseInt(teamId),
        teamName: `Team ${teamId}`, // Would get from team data
        priority: this.getNotificationPriority(data.achievements[unlock.achievementId])
      }))
      .filter(notification => notification.achievement); // Filter out missing achievements
  }

  /**
   * Simulate achievement unlock (for testing)
   */
  public simulateAchievementUnlock(teamId: string, achievementId: string): void {
    const data = this.data();
    if (!data?.achievements[achievementId]) return;
    
    const newUnlock: UnlockedAchievement = {
      achievementId,
      unlockedAt: Date.now(),
      seasonId: new Date().getFullYear(),
      week: Math.floor(Math.random() * 17) + 1,
      context: {
        triggerValue: Math.floor(Math.random() * 100) + 100,
        metadata: { simulated: true }
      },
      notificationSeen: false
    };
    
    this.updateOptimistically(current => {
      if (!current) return current;
      
      const userAchievements = current.userAchievements[teamId];
      if (!userAchievements) {
        // Create new user achievements
        current.userAchievements[teamId] = this.createEmptyUserAchievements(teamId);
      }
      
      const updated = current.userAchievements[teamId];
      const achievement = current.achievements[achievementId];
      
      return {
        ...current,
        userAchievements: {
          ...current.userAchievements,
          [teamId]: {
            ...updated,
            unlockedAchievements: [...updated.unlockedAchievements, newUnlock],
            recentUnlocks: [newUnlock, ...updated.recentUnlocks.slice(0, 4)], // Keep 5 most recent
            totalPoints: updated.totalPoints + achievement.points,
            level: Math.floor((updated.totalPoints + achievement.points) / 1000) + 1
          }
        }
      };
    });
    
    this.trackAnalytics('achievement_unlocked', 'achievements', achievementId);
  }

  /**
   * Get achievement progress for a team
   */
  public getAchievementProgress(teamId: string, achievementId: string): AchievementProgress | null {
    const userAchievements = this.getUserAchievements(teamId);
    return userAchievements?.progress[achievementId] ?? null;
  }

  /**
   * Update achievement progress
   */
  public updateAchievementProgress(teamId: string, achievementId: string, newValue: number): void {
    const data = this.data();
    const achievement = data?.achievements[achievementId];
    if (!achievement) return;
    
    const targetValue = achievement.criteria.requirements.threshold ?? 100;
    const progressPercent = Math.min((newValue / targetValue) * 100, 100);
    
    this.updateOptimistically(current => {
      if (!current) return current;
      
      const userAchievements = current.userAchievements[teamId];
      if (!userAchievements) return current;
      
      const existingProgress = userAchievements.progress[achievementId];
      const updatedProgress: AchievementProgress = {
        achievementId,
        currentValue: newValue,
        targetValue,
        progressPercent,
        isActive: progressPercent < 100,
        lastUpdated: Date.now(),
        progressHistory: [
          ...(existingProgress?.progressHistory ?? []),
          {
            timestamp: Date.now(),
            value: newValue,
            context: {
              seasonId: new Date().getFullYear(),
              week: Math.floor(Math.random() * 17) + 1
            }
          }
        ].slice(-10) // Keep last 10 snapshots
      };
      
      return {
        ...current,
        userAchievements: {
          ...current.userAchievements,
          [teamId]: {
            ...userAchievements,
            progress: {
              ...userAchievements.progress,
              [achievementId]: updatedProgress
            }
          }
        }
      };
    });
  }

  // =============================================
  // PRIVATE HELPER METHODS
  // =============================================

  private loadUserAchievements(): Observable<{ [teamId: string]: UserAchievements }> {
    // Mock implementation - would load from API
    return of(this.createMockUserAchievements());
  }

  private loadLeaderboard(): Observable<AchievementLeaderboard> {
    // Mock implementation - would load from API
    return of(this.createMockLeaderboard());
  }

  private loadWeeklyRecaps(): Observable<{ [week: number]: WeeklyAchievementRecap }> {
    // Mock implementation - would load from API
    return of({});
  }

  private createAchievementsData(
    userAchievements: { [teamId: string]: UserAchievements },
    leaderboard: AchievementLeaderboard,
    weeklyRecaps: { [week: number]: WeeklyAchievementRecap }
  ): AchievementsData {
    const achievements = ACHIEVEMENT_DEFINITIONS.reduce((acc, achievement) => {
      acc[achievement.id] = achievement;
      return acc;
    }, {} as { [id: string]: Achievement });
    
    const achievementsByCategory = ACHIEVEMENT_DEFINITIONS.reduce((acc, achievement) => {
      if (!acc[achievement.category]) {
        acc[achievement.category] = [];
      }
      acc[achievement.category].push(achievement);
      return acc;
    }, {} as { [category in AchievementCategory]: Achievement[] });
    
    return {
      achievements,
      userAchievements,
      currentSeasonAchievements: this.extractCurrentSeasonAchievements(userAchievements),
      achievementsByCategory,
      leaderboard,
      weeklyRecaps,
      lastCheckTimestamp: Date.now()
    };
  }

  private createEmptyAchievementsData(): AchievementsData {
    return {
      achievements: {},
      userAchievements: {},
      currentSeasonAchievements: {},
      achievementsByCategory: {} as any,
      leaderboard: {
        overallLeaders: [],
        categoryLeaders: {} as any,
        recentUnlocks: [],
        rarestAchievements: []
      },
      weeklyRecaps: {},
      lastCheckTimestamp: Date.now()
    };
  }

  private performAchievementCheck(teamId: number, gameData: any): AchievementCheckResult {
    // Mock implementation of achievement checking logic
    const newlyUnlocked: UnlockedAchievement[] = [];
    const progressUpdates: AchievementProgress[] = [];
    
    // Example: Check for high score achievement
    if (gameData?.totalPoints >= 150) {
      const existing = this.getUserAchievements(teamId.toString())?.unlockedAchievements
        .find(unlock => unlock.achievementId === 'high_score_150');
      
      if (!existing) {
        newlyUnlocked.push({
          achievementId: 'high_score_150',
          unlockedAt: Date.now(),
          seasonId: new Date().getFullYear(),
          week: gameData.week,
          context: {
            triggerValue: gameData.totalPoints,
            opponent: gameData.opponentId
          },
          notificationSeen: false
        });
      }
    }
    
    return {
      teamId,
      newlyUnlocked,
      progressUpdates,
      hasNewAchievements: newlyUnlocked.length > 0
    };
  }

  private createMockUserAchievements(): { [teamId: string]: UserAchievements } {
    const userAchievements: { [teamId: string]: UserAchievements } = {};
    
    // Create mock data for teams 1-10
    for (let teamId = 1; teamId <= 10; teamId++) {
      userAchievements[teamId.toString()] = this.createEmptyUserAchievements(teamId.toString());
      
      // Add some random unlocked achievements
      if (Math.random() > 0.5) {
        userAchievements[teamId.toString()].unlockedAchievements.push({
          achievementId: 'high_score_150',
          unlockedAt: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
          seasonId: new Date().getFullYear(),
          week: Math.floor(Math.random() * 17) + 1,
          context: { triggerValue: 155.5 },
          notificationSeen: Math.random() > 0.3
        });
        
        userAchievements[teamId.toString()].totalPoints += 100;
      }
    }
    
    return userAchievements;
  }

  private createEmptyUserAchievements(userId: string): UserAchievements {
    return {
      userId,
      unlockedAchievements: [],
      progress: {},
      totalPoints: 0,
      level: 1,
      pointsToNextLevel: 1000,
      recentUnlocks: []
    };
  }

  private createMockLeaderboard(): AchievementLeaderboard {
    return {
      overallLeaders: Array.from({ length: 10 }, (_, i) => ({
        teamId: i + 1,
        teamName: `Team ${i + 1}`,
        score: Math.floor(Math.random() * 1000) + 500,
        rank: i + 1,
        change: Math.floor(Math.random() * 6) - 3
      })),
      categoryLeaders: {} as any, // Would populate with real data
      recentUnlocks: [],
      rarestAchievements: []
    };
  }

  private extractCurrentSeasonAchievements(userAchievements: { [teamId: string]: UserAchievements }): { [teamId: string]: UnlockedAchievement[] } {
    const currentSeason = new Date().getFullYear();
    const result: { [teamId: string]: UnlockedAchievement[] } = {};
    
    Object.entries(userAchievements).forEach(([teamId, achievements]) => {
      result[teamId] = achievements.unlockedAchievements.filter(
        unlock => unlock.seasonId === currentSeason
      );
    });
    
    return result;
  }

  private getNotificationPriority(achievement: Achievement): 'high' | 'medium' | 'low' {
    switch (achievement.rarity) {
      case 'legendary': return 'high';
      case 'epic': return 'high';
      case 'rare': return 'medium';
      case 'uncommon': return 'medium';
      case 'common': return 'low';
      default: return 'low';
    }
  }
}

// Extend Date prototype for week calculation (would typically be in a utils file)
declare global {
  interface Date {
    getWeek(): number;
  }
}

Date.prototype.getWeek = function(): number {
  const onejan = new Date(this.getFullYear(), 0, 1);
  const millisecsInDay = 86400000;
  return Math.ceil((((this.getTime() - onejan.getTime()) / millisecsInDay) + onejan.getDay() + 1) / 7);
};