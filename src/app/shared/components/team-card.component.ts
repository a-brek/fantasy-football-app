import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Team } from '../../models/espn-fantasy.interfaces';

/**
 * Reusable team card component for displaying team information
 * Uses OnPush change detection and Angular Signals for optimal performance
 */
@Component({
  selector: 'app-team-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="team-card" [class.selected]="isSelected" (click)="onCardClick()">
      <div class="team-header">
        <div class="team-logo">
          <img [src]="teamData().logo" [alt]="teamData().name + ' logo'" 
               (error)="onImageError($event)" />
        </div>
        <div class="team-info">
          <h3 class="team-name">{{ teamData().name }}</h3>
          <p class="team-abbreviation">{{ teamData().abbrev }}</p>
          <p class="team-owners">{{ ownerNames() }}</p>
        </div>
      </div>
      
      <div class="team-stats">
        <div class="stat-item">
          <span class="stat-label">Record</span>
          <span class="stat-value">{{ recordDisplay() }}</span>
        </div>
        
        <div class="stat-item">
          <span class="stat-label">Points For</span>
          <span class="stat-value">{{ teamData().record.overall.pointsFor | number:'1.1-1' }}</span>
        </div>
        
        <div class="stat-item">
          <span class="stat-label">Points Against</span>
          <span class="stat-value">{{ teamData().record.overall.pointsAgainst | number:'1.1-1' }}</span>
        </div>
        
        <div class="stat-item">
          <span class="stat-label">Win %</span>
          <span class="stat-value">{{ winPercentage() }}%</span>
        </div>
      </div>
      
      <div class="team-streak" *ngIf="streakDisplay()">
        <span class="streak-label">Streak:</span>
        <span class="streak-value" [class]="streakClass()">
          {{ streakDisplay() }}
        </span>
      </div>
      
      <div class="team-actions" *ngIf="showActions">
        <button class="btn btn-primary" (click)="onViewDetails($event)">
          View Details
        </button>
        <button class="btn btn-secondary" (click)="onViewRoster($event)" *ngIf="showRosterButton">
          View Roster
        </button>
      </div>
    </div>
  `,
  styles: [`
    .team-card {
      background: var(--card-background, #ffffff);
      border: 1px solid var(--card-border, #e0e0e0);
      border-radius: 8px;
      padding: 16px;
      margin: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
      cursor: pointer;
      position: relative;
    }
    
    .team-card:hover {
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }
    
    .team-card.selected {
      border-color: var(--primary-color, #007bff);
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    }
    
    .team-header {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
    }
    
    .team-logo {
      width: 48px;
      height: 48px;
      margin-right: 12px;
    }
    
    .team-logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 4px;
    }
    
    .team-info {
      flex: 1;
    }
    
    .team-name {
      margin: 0 0 4px 0;
      font-size: 1.1em;
      font-weight: 600;
      color: var(--text-primary, #333);
    }
    
    .team-abbreviation {
      margin: 0 0 4px 0;
      font-size: 0.9em;
      color: var(--text-secondary, #666);
      font-weight: 500;
    }
    
    .team-owners {
      margin: 0;
      font-size: 0.8em;
      color: var(--text-muted, #888);
    }
    
    .team-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8px;
      background: var(--stat-background, #f8f9fa);
      border-radius: 4px;
    }
    
    .stat-label {
      font-size: 0.75em;
      color: var(--text-muted, #888);
      margin-bottom: 4px;
      text-transform: uppercase;
      font-weight: 500;
    }
    
    .stat-value {
      font-size: 0.9em;
      font-weight: 600;
      color: var(--text-primary, #333);
    }
    
    .team-streak {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      padding: 4px 8px;
      border-radius: 4px;
      background: var(--streak-background, #f8f9fa);
    }
    
    .streak-label {
      font-size: 0.8em;
      color: var(--text-muted, #888);
      margin-right: 8px;
    }
    
    .streak-value {
      font-size: 0.8em;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 3px;
    }
    
    .streak-value.WIN {
      background: var(--success-color, #28a745);
      color: white;
    }
    
    .streak-value.LOSS {
      background: var(--danger-color, #dc3545);
      color: white;
    }
    
    .streak-value.TIE {
      background: var(--warning-color, #ffc107);
      color: var(--text-primary, #333);
    }
    
    .team-actions {
      display: flex;
      gap: 8px;
      justify-content: center;
    }
    
    .btn {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      font-size: 0.8em;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .btn-primary {
      background: var(--primary-color, #007bff);
      color: white;
    }
    
    .btn-primary:hover {
      background: var(--primary-color-dark, #0056b3);
    }
    
    .btn-secondary {
      background: var(--secondary-color, #6c757d);
      color: white;
    }
    
    .btn-secondary:hover {
      background: var(--secondary-color-dark, #545b62);
    }
    
    /* Responsive design */
    @media (max-width: 768px) {
      .team-card {
        margin: 4px;
        padding: 12px;
      }
      
      .team-stats {
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
      }
      
      .team-actions {
        flex-direction: column;
      }
    }
  `]
})
export class TeamCardComponent {
  @Input({ required: true }) team!: Team;
  @Input() isSelected: boolean = false;
  @Input() showActions: boolean = true;
  @Input() showRosterButton: boolean = true;
  @Input() owners: { [key: string]: string } = {};
  
  @Output() teamClick = new EventEmitter<Team>();
  @Output() viewDetails = new EventEmitter<Team>();
  @Output() viewRoster = new EventEmitter<Team>();

  // Signals for reactive data
  private readonly _team = signal<Team>(this.team);

  // Update signals when inputs change
  ngOnChanges(): void {
    this._team.set(this.team);
  }

  // Computed properties using signals
  readonly teamData = computed(() => this._team());

  readonly recordDisplay = computed(() => {
    const record = this.teamData().record.overall;
    return `${record.wins}-${record.losses}${record.ties ? `-${record.ties}` : ''}`;
  });

  readonly winPercentage = computed(() => {
    const percentage = this.teamData().record.overall.percentage;
    return (percentage * 100).toFixed(1);
  });

  readonly ownerNames = computed(() => {
    const team = this.teamData();
    const names = team.owners.map(ownerId => this.owners[ownerId] || 'Unknown');
    return names.join(', ') || 'No Owner';
  });

  readonly streakDisplay = computed(() => {
    const record = this.teamData().record.overall;
    if (record.streakLength === 0) return '';
    
    const streakType = record.streakType;
    return `${streakType.charAt(0)}${record.streakLength}`;
  });

  readonly streakClass = computed(() => {
    return this.teamData().record.overall.streakType;
  });

  onCardClick(): void {
    this.teamClick.emit(this.teamData());
  }

  onViewDetails(event: Event): void {
    event.stopPropagation();
    this.viewDetails.emit(this.teamData());
  }

  onViewRoster(event: Event): void {
    event.stopPropagation();
    this.viewRoster.emit(this.teamData());
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iNCIgZmlsbD0iI0Y4RjlGQSIvPgo8cGF0aCBkPSJNMjQgMzJDMjguNDE4MyAzMiAzMiAyOC40MTgzIDMyIDI0QzMyIDE5LjU4MTcgMjguNDE4MyAxNiAyNCAxNkMxOS41ODE3IDE2IDE2IDE5LjU4MTcgMTYgMjRDMTYgMjguNDE4MyAxOS41ODE3IDMyIDI0IDMyWiIgZmlsbD0iI0RERERERCIvPgo8L3N2Zz4K';
  }
}