/**
 * Achievement Badge Component
 * 
 * Displays individual achievement badges with icons, progress, and unlock details.
 * Used throughout the app to show user achievements and progress.
 * 
 * @version 1.0.0
 * @author Generated with Claude Code
 */

import { Component, Input, Output, EventEmitter, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  Achievement, 
  UnlockedAchievement, 
  AchievementProgress 
} from '../../models/espn-fantasy.interfaces';

export type BadgeSize = 'small' | 'medium' | 'large';
export type BadgeStyle = 'default' | 'compact' | 'detailed' | 'notification';

@Component({
  selector: 'app-achievement-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="achievement-badge"
      [class]="getBadgeClasses()"
      [attr.title]="getTooltipText()"
      (click)="onBadgeClick()">
      
      <!-- Badge Icon -->
      <div class="badge-icon-container">
        <div class="badge-icon" [innerHTML]="getIconHtml()"></div>
        
        <!-- Rarity Indicator -->
        <div class="rarity-indicator" [class]="'rarity-' + achievement.rarity"></div>
        
        <!-- Unlock Status Overlay -->
        <div 
          *ngIf="!isUnlocked() && showProgress" 
          class="progress-overlay">
          <div 
            class="progress-fill" 
            [style.width.%]="getProgressPercent()">
          </div>
        </div>
        
        <!-- Lock Overlay for Locked Achievements -->
        <div *ngIf="!isUnlocked() && !showProgress" class="lock-overlay">
          <span class="lock-icon">🔒</span>
        </div>
        
        <!-- New Achievement Indicator -->
        <div *ngIf="isNewUnlock()" class="new-indicator">
          <span class="new-badge">NEW</span>
        </div>
      </div>

      <!-- Badge Content -->
      <div class="badge-content" *ngIf="style !== 'compact'">
        <div class="badge-title">{{ achievement.name }}</div>
        
        <div class="badge-description" *ngIf="style === 'detailed'">
          {{ achievement.description }}
        </div>
        
        <!-- Progress Bar for Ongoing Achievements -->
        <div 
          *ngIf="!isUnlocked() && progress && style === 'detailed'" 
          class="progress-bar">
          <div class="progress-background">
            <div 
              class="progress-foreground" 
              [style.width.%]="progress.progressPercent">
            </div>
          </div>
          <div class="progress-text">
            {{ progress.currentValue }} / {{ progress.targetValue }}
            ({{ progress.progressPercent.toFixed(0) }}%)
          </div>
        </div>

        <!-- Unlock Details -->
        <div *ngIf="isUnlocked() && unlock && style === 'detailed'" class="unlock-details">
          <div class="unlock-date">
            Unlocked {{ formatUnlockDate(unlock.unlockedAt) }}
          </div>
          <div *ngIf="unlock.context?.triggerValue" class="unlock-context">
            Value: {{ unlock.context.triggerValue }}
          </div>
        </div>

        <!-- Achievement Points -->
        <div class="badge-points" *ngIf="style === 'detailed'">
          <span class="points-value">{{ achievement.points }}</span>
          <span class="points-label">pts</span>
        </div>
      </div>

      <!-- Notification Style Content -->
      <div class="notification-content" *ngIf="style === 'notification'">
        <div class="notification-header">
          <span class="notification-title">Achievement Unlocked!</span>
          <button 
            class="notification-close" 
            (click)="onCloseNotification($event)"
            *ngIf="showCloseButton">
            ×
          </button>
        </div>
        <div class="notification-achievement">
          <strong>{{ achievement.name }}</strong>
        </div>
        <div class="notification-description">
          {{ achievement.description }}
        </div>
        <div class="notification-points">
          +{{ achievement.points }} points
        </div>
      </div>
    </div>
  `,
  styles: [`
    .achievement-badge {
      position: relative;
      display: flex;
      align-items: center;
      cursor: pointer;
      transition: all 0.3s ease;
      border-radius: 8px;
      background: var(--card-bg, #fff);
      border: 1px solid var(--border-color, #dee2e6);
    }

    .achievement-badge:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    /* Size Variations */
    .badge-small {
      padding: 0.5rem;
      min-height: 60px;
    }

    .badge-small .badge-icon-container {
      width: 40px;
      height: 40px;
    }

    .badge-medium {
      padding: 1rem;
      min-height: 80px;
    }

    .badge-medium .badge-icon-container {
      width: 60px;
      height: 60px;
    }

    .badge-large {
      padding: 1.5rem;
      min-height: 120px;
    }

    .badge-large .badge-icon-container {
      width: 80px;
      height: 80px;
    }

    /* Style Variations */
    .badge-compact .badge-content {
      display: none;
    }

    .badge-notification {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      color: white;
      padding: 1rem;
      max-width: 300px;
      animation: slideIn 0.5s ease-out;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    /* Badge Icon */
    .badge-icon-container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      flex-shrink: 0;
      margin-right: 1rem;
      background: var(--icon-bg, #f8f9fa);
      border: 2px solid var(--icon-border, #dee2e6);
    }

    .badge-compact .badge-icon-container {
      margin-right: 0;
    }

    .badge-icon {
      font-size: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .badge-small .badge-icon {
      font-size: 1.2rem;
    }

    .badge-large .badge-icon {
      font-size: 2rem;
    }

    /* Rarity Indicators */
    .rarity-indicator {
      position: absolute;
      bottom: -2px;
      right: -2px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid white;
    }

    .rarity-common {
      background: #6c757d;
    }

    .rarity-uncommon {
      background: #28a745;
    }

    .rarity-rare {
      background: #007bff;
    }

    .rarity-epic {
      background: #6f42c1;
    }

    .rarity-legendary {
      background: linear-gradient(45deg, #ffd700, #ffed4e);
      animation: shimmer 2s infinite;
    }

    @keyframes shimmer {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.8; }
    }

    /* Progress Overlay */
    .progress-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: 50%;
      overflow: hidden;
      background: rgba(0,0,0,0.3);
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(to top, var(--success-color, #28a745), transparent);
      transition: width 0.3s ease;
    }

    /* Lock Overlay */
    .lock-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.5);
      border-radius: 50%;
      color: white;
    }

    .lock-icon {
      font-size: 1.2rem;
    }

    /* New Achievement Indicator */
    .new-indicator {
      position: absolute;
      top: -8px;
      right: -8px;
      z-index: 10;
    }

    .new-badge {
      background: var(--danger-color, #dc3545);
      color: white;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0.2rem 0.4rem;
      border-radius: 10px;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    /* Badge Content */
    .badge-content {
      flex: 1;
      min-width: 0;
    }

    .badge-title {
      font-weight: 600;
      color: var(--text-primary, #212529);
      margin-bottom: 0.25rem;
      font-size: 1rem;
    }

    .badge-small .badge-title {
      font-size: 0.9rem;
    }

    .badge-large .badge-title {
      font-size: 1.1rem;
    }

    .badge-description {
      color: var(--text-muted, #6c757d);
      font-size: 0.85rem;
      line-height: 1.3;
      margin-bottom: 0.5rem;
    }

    /* Progress Bar */
    .progress-bar {
      margin: 0.5rem 0;
    }

    .progress-background {
      height: 6px;
      background: var(--border-color, #dee2e6);
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 0.25rem;
    }

    .progress-foreground {
      height: 100%;
      background: var(--primary-color, #007bff);
      transition: width 0.3s ease;
    }

    .progress-text {
      font-size: 0.75rem;
      color: var(--text-muted, #6c757d);
    }

    /* Unlock Details */
    .unlock-details {
      margin-top: 0.5rem;
      font-size: 0.8rem;
      color: var(--text-muted, #6c757d);
    }

    .unlock-date {
      margin-bottom: 0.25rem;
    }

    /* Badge Points */
    .badge-points {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin-top: 0.5rem;
    }

    .points-value {
      font-weight: 600;
      color: var(--warning-color, #ffc107);
      font-size: 1.1rem;
    }

    .points-label {
      font-size: 0.8rem;
      color: var(--text-muted, #6c757d);
    }

    /* Notification Style */
    .notification-content {
      width: 100%;
    }

    .notification-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .notification-title {
      font-weight: 600;
      font-size: 0.9rem;
      opacity: 0.9;
    }

    .notification-close {
      background: none;
      border: none;
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background 0.2s;
    }

    .notification-close:hover {
      background: rgba(255,255,255,0.2);
    }

    .notification-achievement {
      font-size: 1.1rem;
      margin-bottom: 0.5rem;
    }

    .notification-description {
      opacity: 0.9;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }

    .notification-points {
      font-weight: 600;
      color: #ffd700;
    }

    /* State Variations */
    .badge-unlocked {
      border-color: var(--success-color, #28a745);
    }

    .badge-unlocked .badge-icon-container {
      border-color: var(--success-color, #28a745);
      background: var(--success-bg, #d4edda);
    }

    .badge-locked {
      opacity: 0.6;
    }

    .badge-in-progress {
      border-color: var(--primary-color, #007bff);
    }

    .badge-in-progress .badge-icon-container {
      border-color: var(--primary-color, #007bff);
    }

    /* Hidden Achievements */
    .badge-hidden {
      opacity: 0.3;
    }

    .badge-hidden .badge-title::after {
      content: " (Hidden)";
      font-style: italic;
      color: var(--text-muted, #6c757d);
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .badge-medium {
        padding: 0.75rem;
      }
      
      .badge-large {
        padding: 1rem;
      }
      
      .badge-icon-container {
        margin-right: 0.75rem;
      }
      
      .badge-title {
        font-size: 0.9rem;
      }
    }
  `]
})
export class AchievementBadgeComponent {
  @Input() achievement!: Achievement;
  @Input() unlock?: UnlockedAchievement;
  @Input() progress?: AchievementProgress;
  @Input() size: BadgeSize = 'medium';
  @Input() style: BadgeStyle = 'default';
  @Input() showProgress = true;
  @Input() showCloseButton = false;
  @Input() clickable = true;

  @Output() badgeClick = new EventEmitter<Achievement>();
  @Output() closeNotification = new EventEmitter<void>();

  readonly isUnlocked = computed(() => !!this.unlock);
  readonly isNewUnlock = computed(() => 
    this.unlock && !this.unlock.notificationSeen && 
    Date.now() - this.unlock.unlockedAt < 7 * 24 * 60 * 60 * 1000 // 7 days
  );

  getBadgeClasses(): string {
    const classes = [
      `badge-${this.size}`,
      `badge-${this.style}`
    ];

    if (this.isUnlocked()) {
      classes.push('badge-unlocked');
    } else if (this.progress && this.progress.progressPercent > 0) {
      classes.push('badge-in-progress');
    } else {
      classes.push('badge-locked');
    }

    if (this.achievement.hidden && !this.isUnlocked()) {
      classes.push('badge-hidden');
    }

    if (!this.clickable) {
      classes.push('badge-non-clickable');
    }

    return classes.join(' ');
  }

  getIconHtml(): string {
    // Map achievement icons to actual symbols/emojis
    const iconMap: { [key: string]: string } = {
      'trophy': '🏆',
      'star': '⭐',
      'target': '🎯',
      'fire': '🔥',
      'crown': '👑',
      'trending-up': '📈',
      'magic-wand': '🪄',
      'sad-face': '😢',
      'broken-heart': '💔',
      'medal': '🏅',
      'gem': '💎',
      'lightning': '⚡',
      'rocket': '🚀',
      'shield': '🛡️'
    };

    return iconMap[this.achievement.icon] || '🏆';
  }

  getProgressPercent(): number {
    if (!this.progress) return 0;
    return Math.min(this.progress.progressPercent, 100);
  }

  getTooltipText(): string {
    if (this.achievement.hidden && !this.isUnlocked()) {
      return 'Hidden achievement - unlock to reveal details';
    }

    let tooltip = `${this.achievement.name}\n${this.achievement.description}`;
    
    if (this.isUnlocked() && this.unlock) {
      tooltip += `\n\nUnlocked: ${this.formatUnlockDate(this.unlock.unlockedAt)}`;
      if (this.unlock.context?.triggerValue) {
        tooltip += `\nValue: ${this.unlock.context.triggerValue}`;
      }
    } else if (this.progress) {
      tooltip += `\n\nProgress: ${this.progress.currentValue} / ${this.progress.targetValue}`;
      tooltip += ` (${this.progress.progressPercent.toFixed(0)}%)`;
    }

    tooltip += `\n\nRarity: ${this.achievement.rarity}`;
    tooltip += `\nPoints: ${this.achievement.points}`;

    return tooltip;
  }

  formatUnlockDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  onBadgeClick(): void {
    if (this.clickable) {
      this.badgeClick.emit(this.achievement);
    }
  }

  onCloseNotification(event: Event): void {
    event.stopPropagation();
    this.closeNotification.emit();
  }
}