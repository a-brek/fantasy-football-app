// team-historical-matchups.component.ts
import { Component, OnInit } from '@angular/core';
import { FantasyFootballService } from '../../services/fantasy-football/fantasy-football.service';

@Component({
  selector: 'app-team-historical-matchups',
  templateUrl: './team-historical-matchups.component.html',
})
export class TeamHistoricalMatchupsComponent implements OnInit {
  matchupsData: any[] = [];
  historicalRecords: { [opponentId: number]: { wins: number; losses: number; games: number } } = {};

  constructor(private fantasyService: FantasyFootballService) {}

  ngOnInit() {
    // Fetch historical matchups data for all years
    this.fantasyService.getAllYearsMatchups('532886').subscribe((data) => {
      this.matchupsData = data;
      this.calculateWinLossByOpponent();
    });
  }

  calculateWinLossByOpponent() {
    this.matchupsData.forEach((yearData) => {
      yearData.forEach((matchup) => {
        const { home, away, winner } = matchup;
        const opponentId = home.teamId === thisTeamId ? away.teamId : home.teamId;
        const isWin = winner === thisTeamId;

        if (!this.historicalRecords[opponentId]) {
          this.historicalRecords[opponentId] = { wins: 0, losses: 0, games: 0 };
        }

        // Increment win/loss count
        if (isWin) {
          this.historicalRecords[opponentId].wins += 1;
        } else {
          this.historicalRecords[opponentId].losses += 1;
        }

        this.historicalRecords[opponentId].games += 1;
      });
    });
  }
}
