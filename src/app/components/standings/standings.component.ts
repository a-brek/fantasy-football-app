import { Component, OnInit } from '@angular/core';
import { FantasyFootballService } from '../../services/fantasy-football/fantasy-football.service';

@Component({
  selector: 'app-standings',
  templateUrl: './standings.component.html',
})
export class StandingsComponent implements OnInit {
  teams: any[] = [];
  sortedTeams: any[] = [];
  teamNamesMap: { [key: number]: string } = {};
  selectedTeam: any = null;
  selectedTeamHistoricalData: any = null; // Stores historical data for the selected team
  highestWinsTeamId: number | null = null;
  highestPointsForTeamId: number | null = null;
  highestPointsAgainstTeamId: number | null = null;
  highestLossesTeamId: number | null = null;

  constructor(private fantasyService: FantasyFootballService) {}

  ngOnInit() {
    // Fetch current year standings data for display in standings table
    this.fantasyService.getTeamsData().subscribe((teamData: any) => {
      this.teamNamesMap = teamData.teams.reduce((map: any, team: any) => {
        map[team.id] = team.name;
        return map;
      }, {});

      // Sort teams by current year standings
      this.sortedTeams = teamData.teams.sort((a: any, b: any) => b.record.overall.wins - a.record.overall.wins);

      // Determine first-place icons based on current standings
      this.calculateFirstPlaceIcons();
    });
  }

  // Toggle selected team and load historical data when a team row is clicked
  toggleTeamDetails(team: any) {
    // Toggle selection
    this.selectedTeam = this.selectedTeam === team ? null : team;
    this.selectedTeamHistoricalData = null; // Reset historical data

    // Fetch historical data only if a team is selected
    if (this.selectedTeam) {
      this.fantasyService.getAllYearsData('532886', 'mTeam', 2010).subscribe((response: any) => {
        // Normalize data structure by checking if each year data is wrapped in an array
        const data = response.map((yearData: any) => {
          // Check if yearData is an array (pre-2019 structure)
          return Array.isArray(yearData) ? yearData[0] : yearData;
        });
        console.log('Normalized data:', data);
      
        // Filter out any invalid entries that may not contain teams
        const validData = data.filter((yearData: { teams: any; }) => yearData && Array.isArray(yearData.teams));
        console.log('Valid data:', validData);
      
        if (!validData.length) {
          console.error("No valid team data found in response:", response);
          return;
        }
      
        // Aggregate historical stats for the selected team
        const overallRecord = validData.reduce(
          (acc: { wins: number; losses: number; pointsFor: number; pointsAgainst: number; }, yearData: { teams: any[]; }) => {
            const yearTeam = yearData.teams.find((yTeam: any) => yTeam.id === team.id);
            console.log('Year team data:', yearTeam);
            if (yearTeam) {
              acc.wins += yearTeam.record.overall.wins;
              acc.losses += yearTeam.record.overall.losses;
              acc.pointsFor += yearTeam.record.overall.pointsFor;
              acc.pointsAgainst += yearTeam.record.overall.pointsAgainst;
            }
            return acc;
          },
          { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 }
        );
      
        // Store historical data for display in details
        this.selectedTeamHistoricalData = overallRecord;
      });
      
    }
  }

  // Determine which team has the highest values for specific fields
  calculateFirstPlaceIcons() {
    this.highestWinsTeamId = this.getHighestTeamId('record.overall.wins');
    this.highestPointsForTeamId = this.getHighestTeamId('record.overall.pointsFor');
    this.highestPointsAgainstTeamId = this.getHighestTeamId('record.overall.pointsAgainst');
    this.highestLossesTeamId = this.getHighestTeamId('record.overall.losses');
  }

  // Helper function to get the team with the highest value for a given field
  getHighestTeamId(fieldPath: string): number | null {
    let maxId = null;
    let maxValue = -Infinity;

    for (const team of this.sortedTeams) {
      const value = fieldPath.split('.').reduce((acc, key) => acc && acc[key], team) || 0;
      if (value > maxValue) {
        maxValue = value;
        maxId = team.id;
      }
    }
    return maxId;
  }

  // Calculate win percentage
  getWinPercentage(wins: number, losses: number): number {
    return (wins / (wins + losses)) * 100;
  }

  // Get the CSS for the circle graph
  getCircleGraphStyle(wins: number, losses: number) {
    const winPercentage = (wins / (wins + losses)) * 100;
    return {
      background: `conic-gradient(green ${winPercentage}%, red ${winPercentage}%)`
    };
  }  

  getTeamName(teamId: number): string {
    return this.teamNamesMap[teamId] || 'Unknown Team';
  }
}
