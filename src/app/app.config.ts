import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app-routing.module';  // Import from app-routing.module
import { provideHttpClient } from '@angular/common/http';
import { AppStore } from './store/app.store';
import { TeamsStore } from './store/teams.store';
import { PlayersStore } from './store/players.store';
import { MatchupsStore } from './store/matchups.store';
import { StandingsStore } from './store/standings.store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    AppStore,
    TeamsStore,
    PlayersStore,
    MatchupsStore,
    StandingsStore
  ]
};
