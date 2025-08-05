/**
 * Historical Feature Routes
 * 
 * Lazy-loaded routes for historical data features including detailed season views,
 * team histories, records, and trend analysis.
 * 
 * @version 1.0.0
 * @author Generated with Claude Code
 */

import { Routes } from '@angular/router';
import { HistoricalOverviewComponent } from './historical-overview.component';

export const HISTORICAL_ROUTES: Routes = [
  // Main historical overview (already handled in main routes)
  // { path: '', component: HistoricalOverviewComponent },
  
  // Additional historical routes for future expansion
  // { 
  //   path: 'seasons', 
  //   loadComponent: () => import('./seasons-list.component').then(c => c.SeasonsListComponent),
  //   data: { title: 'All Seasons' }
  // },
  // { 
  //   path: 'season/:year', 
  //   loadComponent: () => import('./season-detail.component').then(c => c.SeasonDetailComponent),
  //   data: { title: 'Season Details' }
  // },
  // { 
  //   path: 'records', 
  //   loadComponent: () => import('./records-browser.component').then(c => c.RecordsBrowserComponent),
  //   data: { title: 'League Records' }
  // },
  // { 
  //   path: 'trends', 
  //   loadComponent: () => import('./league-trends.component').then(c => c.LeagueTrendsComponent),
  //   data: { title: 'League Trends' }
  // },
  // { 
  //   path: 'teams', 
  //   loadComponent: () => import('./team-histories.component').then(c => c.TeamHistoriesComponent),
  //   data: { title: 'Team Histories' }
  // },
  // { 
  //   path: 'team/:id', 
  //   loadComponent: () => import('./team-history-detail.component').then(c => c.TeamHistoryDetailComponent),
  //   data: { title: 'Team History' }
  // },
  // { 
  //   path: 'draft', 
  //   loadComponent: () => import('./draft-history.component').then(c => c.DraftHistoryComponent),
  //   data: { title: 'Draft History' }
  // },
  // { 
  //   path: 'draft/:year', 
  //   loadComponent: () => import('./draft-detail.component').then(c => c.DraftDetailComponent),
  //   data: { title: 'Draft Details' }
  // }
];