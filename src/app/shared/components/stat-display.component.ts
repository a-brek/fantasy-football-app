import { Component, Input, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Interface for stat configuration
 */
export interface StatConfig {
  label: string;
  value: number | string;
  format?: 'number' | 'percentage' | 'currency' | 'custom';
  decimals?: number;
  suffix?: string;
  prefix?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
  icon?: string;
}

/**
 * Reusable stat display component for showing statistics
 * Supports various formats, trends, and styling options
 */
@Component({
  selector: 'app-stat-display',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stat-display" [class]="displaySize + ' ' + displayVariant">
      <div class="stat-header" *ngIf="showLabel">
        <span class="stat-icon" *ngIf="statConfig().icon">{{ statConfig().icon }}</span>
        <span class="stat-label">{{ statConfig().label }}</span>
        <span class="stat-trend" *ngIf="statConfig().trend" [class]="'trend-' + statConfig().trend">
          {{ getTrendIcon() }}
        </span>
      </div>
      
      <div class="stat-value-container">
        <span class="stat-prefix" *ngIf="statConfig().prefix">{{ statConfig().prefix }}</span>
        <span class="stat-value" [style.color]="statConfig().color">
          {{ formattedValue() }}
        </span>
        <span class="stat-suffix" *ngIf="statConfig().suffix">{{ statConfig().suffix }}</span>
      </div>
      
      <div class="stat-description" *ngIf="description">
        <small>{{ description }}</small>
      </div>
    </div>
  `,
  styles: [`
    .stat-display {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 8px;
      border-radius: 6px;
      background: var(--stat-background, #ffffff);
      border: 1px solid var(--stat-border, #e0e0e0);
      transition: all 0.2s ease;
    }
    
    .stat-display:hover {
      background: var(--stat-background-hover, #f8f9fa);
    }
    
    /* Size variants */
    .stat-display.small {
      padding: 6px;
      min-width: 80px;
    }
    
    .stat-display.medium {
      padding: 12px;
      min-width: 120px;
    }
    
    .stat-display.large {
      padding: 16px;
      min-width: 160px;
    }
    
    /* Style variants */
    .stat-display.card {
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .stat-display.minimal {
      border: none;
      background: transparent;
      padding: 4px;
    }
    
    .stat-display.highlighted {
      background: var(--primary-color-light, #e3f2fd);
      border-color: var(--primary-color, #007bff);
    }
    
    .stat-display.success {
      background: var(--success-color-light, #d4edda);
      border-color: var(--success-color, #28a745);
    }
    
    .stat-display.warning {
      background: var(--warning-color-light, #fff3cd);
      border-color: var(--warning-color, #ffc107);
    }
    
    .stat-display.danger {
      background: var(--danger-color-light, #f8d7da);
      border-color: var(--danger-color, #dc3545);
    }
    
    .stat-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      margin-bottom: 4px;
      width: 100%;
    }
    
    .stat-icon {
      font-size: 0.8em;
    }
    
    .stat-label {
      font-size: 0.75em;
      font-weight: 500;
      color: var(--text-muted, #888);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .stat-trend {
      font-size: 0.7em;
      font-weight: 600;
      padding: 1px 3px;
      border-radius: 2px;
    }
    
    .trend-up {
      color: var(--success-color, #28a745);
    }
    
    .trend-down {
      color: var(--danger-color, #dc3545);
    }
    
    .trend-neutral {
      color: var(--text-muted, #888);
    }
    
    .stat-value-container {
      display: flex;
      align-items: baseline;
      justify-content: center;
      margin-bottom: 4px;
    }
    
    .stat-prefix,
    .stat-suffix {
      font-size: 0.8em;
      color: var(--text-muted, #888);
      font-weight: 500;
    }
    
    .stat-value {
      font-size: 1.2em;
      font-weight: 700;
      color: var(--text-primary, #333);
      margin: 0 2px;
    }
    
    /* Size-specific value styling */
    .small .stat-value {
      font-size: 1em;
      font-weight: 600;
    }
    
    .medium .stat-value {
      font-size: 1.4em;
    }
    
    .large .stat-value {
      font-size: 2em;
    }
    
    .stat-description {
      width: 100%;
    }
    
    .stat-description small {
      font-size: 0.7em;
      color: var(--text-muted, #888);
      line-height: 1.2;
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
      .stat-display {
        min-width: auto;
        width: 100%;
      }
      
      .large .stat-value {
        font-size: 1.6em;
      }
      
      .medium .stat-value {
        font-size: 1.2em;
      }
    }
    
    /* Animation for value changes */
    .stat-value {
      transition: all 0.3s ease;
    }
    
    .stat-display.updated .stat-value {
      transform: scale(1.1);
      color: var(--primary-color, #007bff);
    }
  `]
})
export class StatDisplayComponent {
  @Input({ required: true }) stat!: StatConfig;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() variant: 'default' | 'card' | 'minimal' | 'highlighted' | 'success' | 'warning' | 'danger' = 'default';
  @Input() showLabel: boolean = true;
  @Input() description?: string;

  // Signals for reactive data
  private readonly _stat = signal<StatConfig>(this.stat);

  // Update signal when input changes
  ngOnChanges(): void {
    this._stat.set(this.stat);
  }

  // Computed properties
  readonly statConfig = computed(() => this._stat());
  readonly displaySize = computed(() => this.size);
  readonly displayVariant = computed(() => this.variant);

  readonly formattedValue = computed(() => {
    const config = this.statConfig();
    const value = config.value;

    if (typeof value === 'string') {
      return value;
    }

    const decimals = config.decimals ?? 0;
    
    switch (config.format) {
      case 'percentage':
        return (value * 100).toFixed(decimals) + '%';
      
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }).format(value);
      
      case 'number':
        return new Intl.NumberFormat('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }).format(value);
      
      case 'custom':
        return value.toString();
      
      default:
        if (decimals > 0) {
          return value.toFixed(decimals);
        }
        return Math.round(value).toString();
    }
  });

  getTrendIcon(): string {
    const trend = this.statConfig().trend;
    switch (trend) {
      case 'up':
        return '↗';
      case 'down':
        return '↘';
      case 'neutral':
      default:
        return '→';
    }
  }
}