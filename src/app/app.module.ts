import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { HomepageComponent } from './components/homepage/homepage.component';
import { StandingsComponent } from './components/standings/standings.component';
import { MatchupsComponent } from './components/matchups/matchups.component';
import { RosterComponent } from './components/roster/roster.component';
import { TeamDetailsComponent } from './components/team-details/team-details.component';

@NgModule({
  declarations: [
    AppComponent,
    HomepageComponent,
    StandingsComponent,
    MatchupsComponent,
    RosterComponent,
    TeamDetailsComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    CommonModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
