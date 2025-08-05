import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { StandingsComponent } from './features/standings/standings.component';
import { MatchupListComponent } from './features/matchups/matchup-list.component';
import { TeamListComponent } from './features/teams/team-list.component';
import { PlayerListComponent } from './features/players/player-list.component';
import { HeadToHeadComponent } from './features/head-to-head/head-to-head.component';
import { HistoricalOverviewComponent } from './features/historical/historical-overview.component';
import { AchievementsDashboardComponent } from './features/achievements/achievements-dashboard.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'standings', component: StandingsComponent },
  { path: 'matchups', component: MatchupListComponent },
  { path: 'head-to-head', component: HeadToHeadComponent },
  { path: 'teams', component: TeamListComponent },
  { path: 'players', component: PlayerListComponent },
  
  // Historical Data Routes
  { 
    path: 'historical', 
    component: HistoricalOverviewComponent,
    data: { title: 'League History' }
  },
  
  // Achievements Routes
  { 
    path: 'achievements', 
    component: AchievementsDashboardComponent,
    data: { title: 'Achievements' }
  },
  
  { path: '**', redirectTo: '/dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
