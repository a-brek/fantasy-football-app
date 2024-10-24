import { Component, OnInit } from '@angular/core';
import { FantasyFootballService } from '../../services/fantasy-football/fantasy-football.service';

@Component({
  selector: 'app-matchups',
  templateUrl: './matchups.component.html',
  styleUrls: ['./matchups.component.scss']
})
export class MatchupsComponent implements OnInit {
  matchups: any[] = [];
  teams: any = {}; // Stores team information by teamId for easy lookup
  selectedWeek: number = 1; // Default to week 1
  currentWeek: number = 1; // Store the current week based on logic
  weeks: number[] = []; // Store available weeks

  constructor(private fantasyService: FantasyFootballService) {}

  ngOnInit() {
    // Fetch teams and matchups simultaneously
    this.fantasyService.getTeamsData().subscribe(teamData => {
      // Map teams by their IDs for easier lookup
      this.teams = teamData.teams.reduce((map: any, team: any) => {
        map[team.id] = team;
        return map;
      }, {});

      // Fetch matchups
      this.fantasyService.getMatchups().subscribe(matchupData => {
        this.matchups = matchupData.schedule.map((matchup: any) => ({
          week: Number(matchup.matchupPeriodId), // Ensure week is a number
          homeTeamId: matchup.home.teamId,
          awayTeamId: matchup.away.teamId,
          homeTeamName: this.teams[matchup.home.teamId]?.name || 'Unknown',
          awayTeamName: this.teams[matchup.away.teamId]?.name || 'Unknown',
          homeTeamPoints: matchup.home.totalPoints,
          awayTeamPoints: matchup.away.totalPoints,
          winner: matchup.winner
        }));

        // Collect the available weeks
        this.weeks = [...new Set(this.matchups.map(m => Number(m.week)))];

        // Determine the current week based on logic
        this.setCurrentWeek();
      });
    });
  }

  setCurrentWeek() {
    // Filter out matchups with scores
    const playedMatchups = this.matchups.filter(m => m.homeTeamPoints > 0 || m.awayTeamPoints > 0);

    // Find the max week where scores are present (completed weeks)
    const maxPlayedWeek = Math.max(...playedMatchups.map(m => m.week));

    // Check each team’s wins and losses
    let maxGamesPlayed = 0;
    for (const teamId in this.teams) {
      const team = this.teams[teamId];
      const totalGamesPlayed = (team.record?.overall?.wins || 0) + (team.record?.overall?.losses || 0);
      if (totalGamesPlayed > maxGamesPlayed) {
        maxGamesPlayed = totalGamesPlayed;
      }
    }

    // The current week should be the next week after the max games played
    this.currentWeek = maxGamesPlayed + 1;

    // Ensure that this.currentWeek does not exceed the max available weeks
    if (this.currentWeek > Math.max(...this.weeks)) {
      this.currentWeek = maxPlayedWeek + 1; // fallback if logic fails
    }

    // Set the selectedWeek to the currentWeek
    this.selectedWeek = this.currentWeek;

    console.log('Current Week:', this.currentWeek); // Debugging log
  }

  getFilteredMatchups(): any[] {
    return this.matchups.filter(matchup => Number(matchup.week) === Number(this.selectedWeek));
  }
}
