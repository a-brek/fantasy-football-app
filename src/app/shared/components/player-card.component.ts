import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Player, RosterEntry, PlayerPosition, InjuryStatus } from '../../models/espn-fantasy.interfaces';

/**
 * Reusable player card component for displaying player information
 * Uses OnPush change detection and Angular Signals for optimal performance
 */
@Component({
  selector: 'app-player-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="player-card" [class.injured]="isInjured()" [class.bench]="isBenched()">
      <div class="player-header">
        <div class="player-info">
          <h4 class="player-name">{{ playerData().fullName }}</h4>
          <div class="player-details">
            <span class="player-position">{{ positionDisplay() }}</span>
            <span class="player-team" *ngIf="proTeamName">{{ proTeamName }}</span>
          </div>
        </div>
        <div class="player-status">
          <span class="injury-status" 
                [class]="injuryStatusClass()" 
                *ngIf="injuryStatusDisplay()">
            {{ injuryStatusDisplay() }}
          </span>
          <span class="lineup-position" [class]="lineupPositionClass()">
            {{ lineupPositionDisplay() }}
          </span>
        </div>
      </div>

      <div class="player-stats" *ngIf="showStats && playerStats().length > 0">
        <div class="stat-row" *ngFor="let stat of playerStats()">
          <span class="stat-label">{{ stat.label }}</span>
          <span class="stat-value">{{ stat.value }}</span>
        </div>
      </div>

      <div class="player-ownership" *ngIf="showOwnership && playerData().ownership">
        <div class="ownership-stat">
          <span class="ownership-label">Owned</span>
          <span class="ownership-value">{{ ownedPercentage() }}%</span>
        </div>
        <div class="ownership-stat">
          <span class="ownership-label">Started</span>
          <span class="ownership-value">{{ startedPercentage() }}%</span>
        </div>
      </div>

      <div class="player-projection" *ngIf="showProjection && projectedPoints()">
        <span class="projection-label">Projected</span>
        <span class="projection-value">{{ projectedPoints() }} pts</span>
      </div>

      <div class="player-actions" *ngIf="showActions">
        <button class="btn btn-sm btn-primary" (click)="onViewPlayer($event)">
          View Details
        </button>
        <button class="btn btn-sm btn-secondary" 
                (click)="onMovePlayer($event)" 
                *ngIf="canMove">
          {{ isBenched() ? 'Start' : 'Bench' }}
        </button>
        <button class="btn btn-sm btn-danger" 
                (click)="onDropPlayer($event)" 
                *ngIf="canDrop">
          Drop
        </button>
      </div>
    </div>
  `,
  styles: [`
    .player-card {
      background: var(--card-background, #ffffff);
      border: 1px solid var(--card-border, #e0e0e0);
      border-radius: 6px;
      padding: 12px;
      margin: 4px 0;
      transition: all 0.2s ease;
      position: relative;
    }
    
    .player-card:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border-color: var(--primary-color, #007bff);
    }
    
    .player-card.injured {
      border-left: 4px solid var(--danger-color, #dc3545);
      background: rgba(220, 53, 69, 0.05);
    }
    
    .player-card.bench {
      opacity: 0.8;
      background: var(--bench-background, #f8f9fa);
    }
    
    .player-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    
    .player-info {
      flex: 1;
    }
    
    .player-name {
      margin: 0 0 4px 0;
      font-size: 0.95em;
      font-weight: 600;
      color: var(--text-primary, #333);
    }
    
    .player-details {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    
    .player-position {
      font-size: 0.75em;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 3px;
      background: var(--position-background, #e9ecef);
      color: var(--position-color, #495057);
    }
    
    .player-team {
      font-size: 0.75em;
      color: var(--text-muted, #888);
      font-weight: 500;
    }
    
    .player-status {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }
    
    .injury-status {
      font-size: 0.7em;
      font-weight: 600;
      padding: 2px 4px;
      border-radius: 2px;
      text-transform: uppercase;
    }
    
    .injury-status.OUT,
    .injury-status.IR {
      background: var(--danger-color, #dc3545);
      color: white;
    }
    
    .injury-status.DOUBTFUL {
      background: var(--warning-color, #ffc107);
      color: var(--text-primary, #333);
    }
    
    .injury-status.QUESTIONABLE {
      background: var(--info-color, #17a2b8);
      color: white;
    }
    
    .lineup-position {
      font-size: 0.7em;
      font-weight: 600;
      padding: 2px 4px;
      border-radius: 2px;
      text-transform: uppercase;
    }
    
    .lineup-position.STARTER {
      background: var(--success-color, #28a745);
      color: white;
    }
    
    .lineup-position.BENCH {
      background: var(--secondary-color, #6c757d);
      color: white;
    }
    
    .lineup-position.IR {
      background: var(--danger-color, #dc3545);
      color: white;
    }
    
    .player-stats {
      background: var(--stats-background, #f8f9fa);
      border-radius: 4px;
      padding: 8px;
      margin-bottom: 8px;
    }
    
    .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2px 0;
    }
    
    .stat-label {
      font-size: 0.75em;
      color: var(--text-muted, #888);
    }
    
    .stat-value {
      font-size: 0.75em;
      font-weight: 600;
      color: var(--text-primary, #333);
    }
    
    .player-ownership {
      display: flex;
      gap: 16px;
      margin-bottom: 8px;
    }
    
    .ownership-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    
    .ownership-label {
      font-size: 0.7em;
      color: var(--text-muted, #888);
      margin-bottom: 2px;
    }
    
    .ownership-value {
      font-size: 0.8em;
      font-weight: 600;
      color: var(--text-primary, #333);
    }
    
    .player-projection {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 8px;
      background: var(--projection-background, #e3f2fd);
      border-radius: 4px;
      margin-bottom: 8px;
    }
    
    .projection-label {
      font-size: 0.75em;
      color: var(--text-muted, #888);
    }
    
    .projection-value {
      font-size: 0.8em;
      font-weight: 600;
      color: var(--primary-color, #007bff);
    }
    
    .player-actions {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    
    .btn {
      padding: 4px 8px;
      border: none;
      border-radius: 3px;
      font-size: 0.7em;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .btn-sm {
      padding: 3px 6px;
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
    
    .btn-danger {
      background: var(--danger-color, #dc3545);
      color: white;
    }
    
    .btn-danger:hover {
      background: var(--danger-color-dark, #c82333);
    }
    
    /* Responsive design */
    @media (max-width: 768px) {
      .player-card {
        padding: 10px;
      }
      
      .player-header {
        flex-direction: column;
        gap: 8px;
      }
      
      .player-status {
        align-items: flex-start;
        flex-direction: row;
        gap: 8px;
      }
      
      .player-ownership {
        justify-content: space-around;
      }
      
      .player-actions {
        justify-content: center;
      }
    }
  `]
})
export class PlayerCardComponent {
  @Input({ required: true }) player!: Player;
  @Input() rosterEntry?: RosterEntry;
  @Input() showStats: boolean = true;
  @Input() showOwnership: boolean = false;
  @Input() showProjection: boolean = false;
  @Input() showActions: boolean = true;
  @Input() canMove: boolean = false;
  @Input() canDrop: boolean = false;
  @Input() proTeamName?: string;
  
  @Output() playerClick = new EventEmitter<Player>();
  @Output() viewPlayer = new EventEmitter<Player>();
  @Output() movePlayer = new EventEmitter<{ player: Player, rosterEntry?: RosterEntry }>();
  @Output() dropPlayer = new EventEmitter<{ player: Player, rosterEntry?: RosterEntry }>();

  // Signals for reactive data
  private readonly _player = signal<Player>(this.player);
  private readonly _rosterEntry = signal<RosterEntry | undefined>(this.rosterEntry);

  // Update signals when inputs change
  ngOnChanges(): void {
    this._player.set(this.player);
    this._rosterEntry.set(this.rosterEntry);
  }

  // Computed properties using signals
  readonly playerData = computed(() => this._player());
  readonly rosterData = computed(() => this._rosterEntry());

  readonly positionDisplay = computed(() => {
    const positionId = this.playerData().defaultPositionId;
    return this.getPositionName(positionId);
  });

  readonly isInjured = computed(() => {
    const injuryStatus = this.rosterData()?.injuryStatus || this.playerData().injuryStatus;
    return injuryStatus && injuryStatus !== InjuryStatus.ACTIVE && injuryStatus !== InjuryStatus.NORMAL;
  });

  readonly isBenched = computed(() => {
    const rosterEntry = this.rosterData();
    return rosterEntry ? rosterEntry.lineupSlotId === PlayerPosition.BENCH : false;
  });

  readonly injuryStatusDisplay = computed(() => {
    const injuryStatus = this.rosterData()?.injuryStatus || this.playerData().injuryStatus;
    return injuryStatus && injuryStatus !== InjuryStatus.ACTIVE && injuryStatus !== InjuryStatus.NORMAL 
      ? injuryStatus : '';
  });

  readonly injuryStatusClass = computed(() => {
    return this.injuryStatusDisplay();
  });

  readonly lineupPositionDisplay = computed(() => {
    const rosterEntry = this.rosterData();
    if (!rosterEntry) return '';
    
    if (rosterEntry.lineupSlotId === PlayerPosition.BENCH) return 'BENCH';
    if (rosterEntry.lineupSlotId === PlayerPosition.IR) return 'IR';
    return 'STARTER';
  });

  readonly lineupPositionClass = computed(() => {
    return this.lineupPositionDisplay();
  });

  readonly playerStats = computed(() => {
    const player = this.playerData();
    if (!player.stats || player.stats.length === 0) return [];
    
    // Get the most recent stats
    const latestStats = player.stats[player.stats.length - 1];
    const stats = latestStats.appliedStats;
    
    const displayStats = [];
    
    // Add relevant stats based on position
    const positionId = player.defaultPositionId;
    
    if (positionId === PlayerPosition.QB) {
      if (stats['3']) displayStats.push({ label: 'Pass Yds', value: stats['3'].toFixed(0) });
      if (stats['4']) displayStats.push({ label: 'Pass TD', value: stats['4'].toFixed(0) });
      if (stats['20']) displayStats.push({ label: 'INT', value: stats['20'].toFixed(0) });
    } else if (positionId === PlayerPosition.RB) {
      if (stats['24']) displayStats.push({ label: 'Rush Yds', value: stats['24'].toFixed(0) });
      if (stats['25']) displayStats.push({ label: 'Rush TD', value: stats['25'].toFixed(0) });
      if (stats['53']) displayStats.push({ label: 'Rec', value: stats['53'].toFixed(0) });
    } else if (positionId === PlayerPosition.WR || positionId === PlayerPosition.TE) {
      if (stats['53']) displayStats.push({ label: 'Rec', value: stats['53'].toFixed(0) });
      if (stats['42']) displayStats.push({ label: 'Rec Yds', value: stats['42'].toFixed(0) });
      if (stats['43']) displayStats.push({ label: 'Rec TD', value: stats['43'].toFixed(0) });
    } else if (positionId === PlayerPosition.K) {
      if (stats['72']) displayStats.push({ label: 'FG', value: stats['72'].toFixed(0) });
      if (stats['74']) displayStats.push({ label: 'XP', value: stats['74'].toFixed(0) });
    } else if (positionId === PlayerPosition.DST) {
      if (stats['95']) displayStats.push({ label: 'Def TD', value: stats['95'].toFixed(0) });
      if (stats['96']) displayStats.push({ label: 'INT', value: stats['96'].toFixed(0) });
      if (stats['99']) displayStats.push({ label: 'Sacks', value: stats['99'].toFixed(0) });
    }
    
    return displayStats;
  });

  readonly ownedPercentage = computed(() => {
    const ownership = this.playerData().ownership;
    return ownership ? (ownership.percentOwned * 100).toFixed(1) : '0.0';
  });

  readonly startedPercentage = computed(() => {
    const ownership = this.playerData().ownership;
    return ownership ? (ownership.percentStarted * 100).toFixed(1) : '0.0';
  });

  readonly projectedPoints = computed(() => {
    const player = this.playerData();
    if (!player.stats || player.stats.length === 0) return null;
    
    // This would typically come from projected stats
    // For now, return null as we don't have projection data in our interfaces
    return null;
  });

  private getPositionName(positionId: number): string {
    const positionMap: Record<number, string> = {
      [PlayerPosition.QB]: 'QB',
      [PlayerPosition.RB]: 'RB',
      [PlayerPosition.WR]: 'WR',
      [PlayerPosition.TE]: 'TE',
      [PlayerPosition.K]: 'K',
      [PlayerPosition.DST]: 'D/ST',
      [PlayerPosition.FLEX]: 'FLEX',
      [PlayerPosition.BENCH]: 'BENCH',
      [PlayerPosition.IR]: 'IR'
    };
    
    return positionMap[positionId] || 'UNKNOWN';
  }

  onViewPlayer(event: Event): void {
    event.stopPropagation();
    this.viewPlayer.emit(this.playerData());
  }

  onMovePlayer(event: Event): void {
    event.stopPropagation();
    this.movePlayer.emit({ 
      player: this.playerData(), 
      rosterEntry: this.rosterData() 
    });
  }

  onDropPlayer(event: Event): void {
    event.stopPropagation();
    this.dropPlayer.emit({ 
      player: this.playerData(), 
      rosterEntry: this.rosterData() 
    });
  }
}