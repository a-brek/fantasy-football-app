import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { StandingsComponent } from './features/standings/standings.component';
import { MatchupListComponent } from './features/matchups/matchup-list.component';
import { TeamListComponent } from './features/teams/team-list.component';
import { PlayerListComponent } from './features/players/player-list.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'standings', component: StandingsComponent },
  { path: 'matchups', component: MatchupListComponent },
  { path: 'teams', component: TeamListComponent },
  { path: 'players', component: PlayerListComponent },
  { path: '**', redirectTo: '/dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
