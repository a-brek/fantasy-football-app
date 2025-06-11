import { Component, OnInit } from '@angular/core';
import { FantasyFootballService } from '../../services/fantasy-football/fantasy-football.service';

@Component({
  selector: 'app-roster',
  templateUrl: './roster.component.html',
  styleUrls: ['./roster.component.scss']
})
export class RosterComponent implements OnInit {
  teams: any[] = []; // Stores all teams
  selectedTeamId: number = 0; // Default selected team
  roster: any = {}; // Stores the categorized roster of the selected team
  fullRosters: any[] = []; // Stores full roster data for all teams
  selectedTeamName: string = 'Unknown Team'; // To store the selected team's name

  constructor(private fantasyService: FantasyFootballService) {}

  ngOnInit() {
    this.fantasyService.getTeamsData().subscribe(teamData => {
      // Populate teams dropdown
      this.teams = teamData.teams.map((team: any) => ({
        id: team.id,
        name: team.name || 'Unknown'
      }));

      // Fetch all teams and rosters
      this.fantasyService.getRosters().subscribe(rosterData => {
        this.fullRosters = rosterData.teams.map((team: any) => ({
          teamId: team.id,
          teamName: this.teams.find(t => t.id === team.id)?.name || 'Unknown',
          startingLineup: {
            QB: this.getPlayersBySlot(team.roster.entries, 0),  // Quarterback (QB)
            RB: this.getPlayersBySlot(team.roster.entries, 2),  // Running Back (RB)
            WR: this.getPlayersBySlot(team.roster.entries, 4),  // Wide Receiver (WR)
            TE: this.getPlayersBySlot(team.roster.entries, 6),  // Tight End (TE)
            FLEX: this.getPlayersBySlot(team.roster.entries, 23),  // FLEX (RB/WR/TE)
            DEFENSE: this.getPlayersBySlot(team.roster.entries, 16),  // Defense (D/ST)
          },
          benchPlayers: team.roster.entries.filter((entry: any) => entry.lineupSlotId === 20)  // Bench
        }));

        console.log(this.fullRosters);
        // Initialize default team if one is pre-selected
        if (this.selectedTeamId) {
          this.onTeamChange(this.selectedTeamId);
        }
      });
    });
  }

  // Helper method to get players by lineupSlotId
  getPlayersBySlot(entries: any[], slotId: number): any[] {
    return entries
      .filter(entry => entry.lineupSlotId === slotId)
      .map(entry => ({
        playerId: entry.playerId,
        playerName: entry.playerPoolEntry.player.fullName,
        position: entry.playerPoolEntry.player.defaultPositionId,
        injuryStatus: entry.playerPoolEntry.player.injuryStatus
      }));
  }

  // Method to update roster and team name based on selected team
  onTeamChange(teamId: number) {
    this.selectedTeamId = Number(teamId);
    const selectedTeam = this.fullRosters.find(team => team.teamId === this.selectedTeamId);
    this.roster = selectedTeam ? selectedTeam.startingLineup : {};
    this.selectedTeamName = selectedTeam ? selectedTeam.teamName : 'Unknown Team';
  }
}
