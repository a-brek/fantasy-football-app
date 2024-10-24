import { Component, OnInit } from '@angular/core';
import { FantasyFootballService } from '../../services/fantasy-football/fantasy-football.service';

@Component({
  selector: 'app-standings',
  templateUrl: './standings.component.html',
})
export class StandingsComponent implements OnInit {
  teams: any[] = []; // Stores team data with actual records
  sortedTeams: any[] = []; // Stores sorted team data
  teamNamesMap: { [key: number]: string } = {}; // A map to hold team IDs and names

  constructor(private fantasyService: FantasyFootballService) {}

  ngOnInit() {
    // Fetch team data (contains actual records and points)
    this.fantasyService.getTeamsData().subscribe((teamData) => {
      // Create a map of team IDs to team names
      this.teamNamesMap = teamData.teams.reduce((map: any, team: any) => {
        map[team.id] = team.name;
        return map;
      }, {});

      this.teams = teamData.teams;

      // Sort teams by their wins, then by losses (secondary), and finally by points as a tiebreaker
      this.sortedTeams = this.teams.sort((a: any, b: any) => {
        // Sort by wins (descending order), then losses (ascending order), and finally points (descending order)
        const aWins = a.record.overall.wins;
        const aLosses = a.record.overall.losses;
        const bWins = b.record.overall.wins;
        const bLosses = b.record.overall.losses;
        const aPoints = a.points;
        const bPoints = b.points;

        // Compare wins first, then losses, then points
        if (aWins !== bWins) {
          return bWins - aWins; // Descending by wins
        } else if (aLosses !== bLosses) {
          return aLosses - bLosses; // Ascending by losses
        } else {
          return bPoints - aPoints; // Descending by points
        }
      });
    });
  }

  // Method to get the team name by team ID
  getTeamName(teamId: number): string {
    return this.teamNamesMap[teamId] || 'Unknown Team';
  }
}
