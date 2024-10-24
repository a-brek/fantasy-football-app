import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomepageComponent } from './components/homepage/homepage.component';
import { StandingsComponent } from './components/standings/standings.component';
import { MatchupsComponent } from './components/matchups/matchups.component';
import { RosterComponent } from './components/roster/roster.component';

export const routes: Routes = [
  { path: '', component: HomepageComponent },
  { path: 'standings', component: StandingsComponent },
  { path: 'matchups', component: MatchupsComponent },
  { path: 'roster', component: RosterComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
