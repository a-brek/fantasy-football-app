/**
 * Achievements Feature Routes
 * 
 * Lazy-loaded routes for achievement features including detailed views,
 * leaderboards, and progress tracking.
 * 
 * @version 1.0.0
 * @author Generated with Claude Code
 */

import { Routes } from '@angular/router';
import { AchievementsDashboardComponent } from './achievements-dashboard.component';

export const ACHIEVEMENTS_ROUTES: Routes = [
  // Main achievements dashboard (already handled in main routes)
  // { path: '', component: AchievementsDashboardComponent },
  
  // Additional achievement routes for future expansion
  // { 
  //   path: 'leaderboard', 
  //   loadComponent: () => import('./achievements-leaderboard.component').then(c => c.AchievementsLeaderboardComponent),
  //   data: { title: 'Achievement Leaderboard' }
  // },
  // { 
  //   path: 'category/:category', 
  //   loadComponent: () => import('./category-achievements.component').then(c => c.CategoryAchievementsComponent),
  //   data: { title: 'Category Achievements' }
  // },
  // { 
  //   path: 'achievement/:id', 
  //   loadComponent: () => import('./achievement-detail.component').then(c => c.AchievementDetailComponent),
  //   data: { title: 'Achievement Details' }
  // },
  // { 
  //   path: 'progress', 
  //   loadComponent: () => import('./achievement-progress.component').then(c => c.AchievementProgressComponent),
  //   data: { title: 'My Progress' }
  // },
  // { 
  //   path: 'history', 
  //   loadComponent: () => import('./achievement-history.component').then(c => c.AchievementHistoryComponent),
  //   data: { title: 'Achievement History' }
  // },
  // { 
  //   path: 'weekly-recap', 
  //   loadComponent: () => import('./weekly-recap.component').then(c => c.WeeklyRecapComponent),
  //   data: { title: 'Weekly Recap' }
  // },
  // { 
  //   path: 'weekly-recap/:week', 
  //   loadComponent: () => import('./weekly-recap-detail.component').then(c => c.WeeklyRecapDetailComponent),
  //   data: { title: 'Weekly Recap Details' }
  // }
];