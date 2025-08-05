import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Reusable loading spinner component with various styles and sizes
 * Uses OnPush change detection for optimal performance
 */
@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="loading-container" [class]="containerClass">
      <div class="loading-spinner" 
           [class]="spinnerClass" 
           [attr.aria-label]="message || 'Loading'"
           role="status">
        
        <!-- Spinner Type: Circle -->
        <div *ngIf="type === 'circle'" class="spinner-circle">
          <div class="spinner-circle-inner"></div>
        </div>
        
        <!-- Spinner Type: Dots -->
        <div *ngIf="type === 'dots'" class="spinner-dots">
          <div class="dot dot-1"></div>
          <div class="dot dot-2"></div>
          <div class="dot dot-3"></div>
        </div>
        
        <!-- Spinner Type: Bars -->
        <div *ngIf="type === 'bars'" class="spinner-bars">
          <div class="bar bar-1"></div>
          <div class="bar bar-2"></div>
          <div class="bar bar-3"></div>
          <div class="bar bar-4"></div>
        </div>
        
        <!-- Spinner Type: Ring -->
        <div *ngIf="type === 'ring'" class="spinner-ring">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        
        <!-- Spinner Type: Pulse -->
        <div *ngIf="type === 'pulse'" class="spinner-pulse"></div>
        
        <!-- Default/Simple spinner -->
        <div *ngIf="type === 'simple'" class="spinner-simple"></div>
      </div>
      
      <div class="loading-message" *ngIf="showMessage && message">
        {{ message }}
      </div>
    </div>
  `,
  styles: [`
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    
    .loading-container.fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.9);
      z-index: 9999;
    }
    
    .loading-container.overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.8);
      z-index: 100;
    }
    
    .loading-container.inline {
      position: relative;
      padding: 20px;
    }
    
    .loading-spinner {
      display: inline-block;
    }
    
    .loading-spinner.small {
      width: 20px;
      height: 20px;
    }
    
    .loading-spinner.medium {
      width: 40px;
      height: 40px;
    }
    
    .loading-spinner.large {
      width: 60px;
      height: 60px;
    }
    
    .loading-message {
      font-size: 0.9em;
      color: var(--text-muted, #888);
      text-align: center;
      font-weight: 500;
    }
    
    /* Circle Spinner */
    .spinner-circle {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border: 3px solid var(--spinner-bg, #f3f3f3);
      border-top: 3px solid var(--spinner-color, #007bff);
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    /* Dots Spinner */
    .spinner-dots {
      display: flex;
      gap: 4px;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }
    
    .dot {
      width: 25%;
      height: 25%;
      border-radius: 50%;
      background: var(--spinner-color, #007bff);
      animation: dot-bounce 1.4s ease-in-out infinite both;
    }
    
    .dot-1 { animation-delay: -0.32s; }
    .dot-2 { animation-delay: -0.16s; }
    .dot-3 { animation-delay: 0s; }
    
    @keyframes dot-bounce {
      0%, 80%, 100% {
        transform: scale(0);
        opacity: 0.5;
      }
      40% {
        transform: scale(1);
        opacity: 1;
      }
    }
    
    /* Bars Spinner */
    .spinner-bars {
      display: flex;
      gap: 2px;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }
    
    .bar {
      width: 15%;
      height: 100%;
      background: var(--spinner-color, #007bff);
      animation: bar-stretch 1.2s ease-in-out infinite;
    }
    
    .bar-1 { animation-delay: -1.1s; }
    .bar-2 { animation-delay: -1.0s; }
    .bar-3 { animation-delay: -0.9s; }
    .bar-4 { animation-delay: -0.8s; }
    
    @keyframes bar-stretch {
      0%, 40%, 100% {
        transform: scaleY(0.4);
        opacity: 0.6;
      }
      20% {
        transform: scaleY(1);
        opacity: 1;
      }
    }
    
    /* Ring Spinner */
    .spinner-ring {
      display: inline-block;
      position: relative;
      width: 100%;
      height: 100%;
    }
    
    .spinner-ring div {
      box-sizing: border-box;
      display: block;
      position: absolute;
      width: 80%;
      height: 80%;
      margin: 10%;
      border: 3px solid var(--spinner-color, #007bff);
      border-radius: 50%;
      animation: ring-spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
      border-color: var(--spinner-color, #007bff) transparent transparent transparent;
    }
    
    .spinner-ring div:nth-child(1) { animation-delay: -0.45s; }
    .spinner-ring div:nth-child(2) { animation-delay: -0.3s; }
    .spinner-ring div:nth-child(3) { animation-delay: -0.15s; }
    
    @keyframes ring-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    /* Pulse Spinner */
    .spinner-pulse {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: var(--spinner-color, #007bff);
      animation: pulse-scale 1s ease-in-out infinite;
    }
    
    @keyframes pulse-scale {
      0% {
        transform: scale(0);
        opacity: 1;
      }
      100% {
        transform: scale(1);
        opacity: 0;
      }
    }
    
    /* Simple Spinner */
    .spinner-simple {
      width: 100%;
      height: 100%;
      border: 2px solid var(--spinner-bg, #f3f3f3);
      border-radius: 50%;
      border-top: 2px solid var(--spinner-color, #007bff);
      animation: spin 0.8s linear infinite;
    }
    
    /* Color variants */
    .loading-spinner.primary {
      --spinner-color: var(--primary-color, #007bff);
    }
    
    .loading-spinner.secondary {
      --spinner-color: var(--secondary-color, #6c757d);
    }
    
    .loading-spinner.success {
      --spinner-color: var(--success-color, #28a745);
    }
    
    .loading-spinner.warning {
      --spinner-color: var(--warning-color, #ffc107);
    }
    
    .loading-spinner.danger {
      --spinner-color: var(--danger-color, #dc3545);
    }
    
    .loading-spinner.info {
      --spinner-color: var(--info-color, #17a2b8);
    }
    
    .loading-spinner.light {
      --spinner-color: #ffffff;
      --spinner-bg: rgba(255, 255, 255, 0.3);
    }
    
    .loading-spinner.dark {
      --spinner-color: #343a40;
      --spinner-bg: rgba(52, 58, 64, 0.3);
    }
    
    /* Accessibility */
    @media (prefers-reduced-motion: reduce) {
      .loading-spinner * {
        animation-duration: 2s;
        animation-iteration-count: 1;
      }
    }
    
    /* High contrast mode */
    @media (prefers-contrast: high) {
      .loading-spinner {
        --spinner-color: currentColor;
        --spinner-bg: transparent;
      }
      
      .spinner-circle,
      .spinner-simple {
        border-width: 4px;
      }
    }
  `]
})
export class LoadingSpinnerComponent {
  @Input() type: 'circle' | 'dots' | 'bars' | 'ring' | 'pulse' | 'simple' = 'circle';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() color: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'light' | 'dark' = 'primary';
  @Input() layout: 'inline' | 'overlay' | 'fullscreen' = 'inline';
  @Input() message?: string;
  @Input() showMessage: boolean = false;

  get containerClass(): string {
    return this.layout;
  }

  get spinnerClass(): string {
    return `${this.size} ${this.color}`;
  }
}