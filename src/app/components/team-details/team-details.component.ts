// team-details.component.ts
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-team-details',
  templateUrl: './team-details.component.html',
  styleUrls: ['./team-details.component.scss']
})
export class TeamDetailsComponent {
  @Input() team: any; // The selected team data
  @Input() overallRecord: { wins: number; losses: number; pointsFor: number; pointsAgainst: number } = { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 }; // Default initializer

  // Calculate win percentage
  getWinPercentage(): number {
    const { wins, losses } = this.overallRecord;
    return wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;
  }

  // Get the CSS for the circle graph based on historical data
  getCircleGraphStyle() {
    const winPercentage = this.getWinPercentage();
    return {
      background: `conic-gradient(green ${winPercentage}%, red ${winPercentage}%)`
    };
  }
}
