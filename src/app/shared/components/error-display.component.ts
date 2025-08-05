import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppError, ErrorType } from '../../core/services/error-handler.service';

/**
 * Reusable error display component for showing error messages
 * Supports different error types, retry functionality, and customizable styling
 */
@Component({
  selector: 'app-error-display',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="error-display" [class]="errorClass()">
      <div class="error-header">
        <div class="error-icon">
          {{ errorIcon() }}
        </div>
        <div class="error-info">
          <h4 class="error-title" *ngIf="showTitle">
            {{ errorTitle() }}
          </h4>
          <p class="error-message">
            {{ displayMessage() }}
          </p>
        </div>
        <button class="error-dismiss" 
                *ngIf="dismissible" 
                (click)="onDismiss()"
                aria-label="Dismiss error">
          ×
        </button>
      </div>
      
      <div class="error-details" *ngIf="showDetails && errorData()?.details">
        <details>
          <summary>Technical Details</summary>
          <pre class="error-details-content">{{ getErrorDetails() }}</pre>
        </details>
      </div>
      
      <div class="error-actions" *ngIf="showActions">
        <button class="btn btn-primary" 
                *ngIf="canRetry()" 
                (click)="onRetry()"
                [disabled]="isRetrying">
          <span *ngIf="!isRetrying">{{ retryText }}</span>
          <span *ngIf="isRetrying" class="retry-spinner">⟳</span>
          <span *ngIf="isRetrying">Retrying...</span>
        </button>
        
        <button class="btn btn-secondary" 
                *ngIf="showReportButton" 
                (click)="onReport()">
          Report Issue
        </button>
        
        <button class="btn btn-outline" 
                *ngIf="showRefreshButton" 
                (click)="onRefresh()">
          Refresh Page
        </button>
      </div>
      
      <div class="error-suggestions" *ngIf="suggestions.length > 0">
        <h5>Suggestions:</h5>
        <ul>
          <li *ngFor="let suggestion of suggestions">{{ suggestion }}</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .error-display {
      border-radius: 6px;
      padding: 16px;
      margin: 8px 0;
      border-left: 4px solid;
      background: var(--error-background, #fff5f5);
      border-color: var(--danger-color, #dc3545);
      color: var(--text-primary, #333);
    }
    
    .error-display.network {
      border-color: var(--warning-color, #ffc107);
      background: var(--warning-background, #fffdf5);
    }
    
    .error-display.server {
      border-color: var(--danger-color, #dc3545);
      background: var(--danger-background, #fff5f5);
    }
    
    .error-display.validation {
      border-color: var(--info-color, #17a2b8);
      background: var(--info-background, #f0f9ff);
    }
    
    .error-display.authentication {
      border-color: var(--warning-color, #ffc107);
      background: var(--warning-background, #fffdf5);
    }
    
    .error-display.not-found {
      border-color: var(--secondary-color, #6c757d);
      background: var(--secondary-background, #f8f9fa);
    }
    
    .error-display.compact {
      padding: 12px;
    }
    
    .error-display.minimal {
      border: none;
      border-left: 3px solid var(--danger-color, #dc3545);
      background: transparent;
      padding: 8px 12px;
    }
    
    .error-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    
    .error-icon {
      font-size: 1.5em;
      flex-shrink: 0;
      margin-top: 2px;
    }
    
    .error-info {
      flex: 1;
    }
    
    .error-title {
      margin: 0 0 8px 0;
      font-size: 1.1em;
      font-weight: 600;
      color: var(--error-title-color, #721c24);
    }
    
    .error-message {
      margin: 0 0 12px 0;
      font-size: 0.95em;
      line-height: 1.4;
      color: var(--error-message-color, #842029);
    }
    
    .error-dismiss {
      background: none;
      border: none;
      font-size: 1.5em;
      color: var(--error-dismiss-color, #842029);
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s ease;
    }
    
    .error-dismiss:hover {
      background: rgba(132, 32, 41, 0.1);
    }
    
    .error-details {
      margin-top: 12px;
      border-top: 1px solid rgba(132, 32, 41, 0.2);
      padding-top: 12px;
    }
    
    .error-details summary {
      cursor: pointer;
      font-size: 0.9em;
      font-weight: 500;
      color: var(--error-details-color, #842029);
      margin-bottom: 8px;
    }
    
    .error-details-content {
      background: rgba(132, 32, 41, 0.1);
      padding: 8px;
      border-radius: 4px;
      font-size: 0.8em;
      line-height: 1.3;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }
    
    .error-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 12px;
    }
    
    .btn {
      padding: 6px 12px;
      border: 1px solid;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .btn-primary {
      background: var(--primary-color, #007bff);
      border-color: var(--primary-color, #007bff);
      color: white;
    }
    
    .btn-primary:hover:not(:disabled) {
      background: var(--primary-color-dark, #0056b3);
      border-color: var(--primary-color-dark, #0056b3);
    }
    
    .btn-secondary {
      background: var(--secondary-color, #6c757d);
      border-color: var(--secondary-color, #6c757d);
      color: white;
    }
    
    .btn-secondary:hover:not(:disabled) {
      background: var(--secondary-color-dark, #545b62);
      border-color: var(--secondary-color-dark, #545b62);
    }
    
    .btn-outline {
      background: transparent;
      border-color: var(--border-color, #dee2e6);
      color: var(--text-primary, #333);
    }
    
    .btn-outline:hover:not(:disabled) {
      background: var(--hover-background, #f8f9fa);
    }
    
    .retry-spinner {
      animation: spin 1s linear infinite;
      display: inline-block;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .error-suggestions {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid rgba(132, 32, 41, 0.2);
    }
    
    .error-suggestions h5 {
      margin: 0 0 8px 0;
      font-size: 0.9em;
      font-weight: 600;
      color: var(--error-suggestions-title, #842029);
    }
    
    .error-suggestions ul {
      margin: 0;
      padding-left: 20px;
    }
    
    .error-suggestions li {
      font-size: 0.85em;
      line-height: 1.4;
      margin-bottom: 4px;
      color: var(--error-suggestions-text, #842029);
    }
    
    /* Responsive design */
    @media (max-width: 768px) {
      .error-display {
        padding: 12px;
        margin: 4px 0;
      }
      
      .error-header {
        gap: 8px;
      }
      
      .error-actions {
        flex-direction: column;
      }
      
      .btn {
        justify-content: center;
      }
    }
    
    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .error-display {
        --error-background: #2d1b1b;
        --error-title-color: #f5c6cb;
        --error-message-color: #f8d7da;
        --error-dismiss-color: #f8d7da;
        --error-details-color: #f8d7da;
        --error-suggestions-title: #f5c6cb;
        --error-suggestions-text: #f8d7da;
      }
    }
  `]
})
export class ErrorDisplayComponent {
  @Input() error?: AppError | string | Error;
  @Input() type: 'default' | 'compact' | 'minimal' = 'default';
  @Input() showTitle: boolean = true;
  @Input() showDetails: boolean = false;
  @Input() showActions: boolean = true;
  @Input() showReportButton: boolean = false;
  @Input() showRefreshButton: boolean = false;
  @Input() dismissible: boolean = false;
  @Input() retryText: string = 'Try Again';
  @Input() isRetrying: boolean = false;
  @Input() suggestions: string[] = [];
  @Input() customMessage?: string;

  @Output() retry = new EventEmitter<void>();
  @Output() report = new EventEmitter<AppError | string | Error>();
  @Output() refresh = new EventEmitter<void>();
  @Output() dismiss = new EventEmitter<void>();

  // Signal for reactive error data
  private readonly _error = signal<AppError | string | Error | undefined>(this.error);

  ngOnChanges(): void {
    this._error.set(this.error);
  }

  readonly errorData = computed(() => {
    const error = this._error();
    if (!error) return null;

    if (typeof error === 'string') {
      return {
        type: ErrorType.UNKNOWN,
        message: error,
        userMessage: error,
        timestamp: new Date()
      } as AppError;
    }

    if (error instanceof Error) {
      return {
        type: ErrorType.UNKNOWN,
        message: error.message,
        userMessage: 'An unexpected error occurred. Please try again.',
        timestamp: new Date(),
        details: { stack: error.stack }
      } as AppError;
    }

    return error as AppError;
  });

  readonly displayMessage = computed(() => {
    if (this.customMessage) {
      return this.customMessage;
    }
    
    const errorData = this.errorData();
    return errorData?.userMessage || 'An error occurred';
  });

  readonly errorTitle = computed(() => {
    const errorData = this.errorData();
    if (!errorData) return 'Error';

    const titleMap: Record<ErrorType, string> = {
      [ErrorType.NETWORK]: 'Connection Error',
      [ErrorType.HTTP_CLIENT]: 'Request Error',
      [ErrorType.SERVER]: 'Server Error',
      [ErrorType.VALIDATION]: 'Validation Error',
      [ErrorType.AUTHENTICATION]: 'Authentication Required',
      [ErrorType.AUTHORIZATION]: 'Access Denied',
      [ErrorType.NOT_FOUND]: 'Not Found',
      [ErrorType.TIMEOUT]: 'Request Timeout',
      [ErrorType.UNKNOWN]: 'Error'
    };

    return titleMap[errorData.type] || 'Error';
  });

  readonly errorIcon = computed(() => {
    const errorData = this.errorData();
    if (!errorData) return '⚠️';

    const iconMap: Record<ErrorType, string> = {
      [ErrorType.NETWORK]: '🌐',
      [ErrorType.HTTP_CLIENT]: '🔗',
      [ErrorType.SERVER]: '🏥',
      [ErrorType.VALIDATION]: '⚠️',
      [ErrorType.AUTHENTICATION]: '🔐',
      [ErrorType.AUTHORIZATION]: '🚫',
      [ErrorType.NOT_FOUND]: '🔍',
      [ErrorType.TIMEOUT]: '⏱️',
      [ErrorType.UNKNOWN]: '❓'
    };

    return iconMap[errorData.type] || '⚠️';
  });

  readonly errorClass = computed(() => {
    const errorData = this.errorData();
    const typeClass = errorData?.type.toLowerCase() || 'unknown';
    return `${this.type} ${typeClass}`;
  });

  canRetry(): boolean {
    const errorData = this.errorData();
    if (!errorData) return false;

    const retryableTypes = [
      ErrorType.NETWORK,
      ErrorType.TIMEOUT,
      ErrorType.SERVER
    ];

    return retryableTypes.includes(errorData.type) || 
           (errorData.statusCode && errorData.statusCode >= 500);
  }

  getErrorDetails(): string {
    const errorData = this.errorData();
    if (!errorData || !errorData.details) return '';

    try {
      return JSON.stringify(errorData.details, null, 2);
    } catch {
      return String(errorData.details);
    }
  }

  onRetry(): void {
    this.retry.emit();
  }

  onReport(): void {
    this.report.emit(this._error());
  }

  onRefresh(): void {
    this.refresh.emit();
  }

  onDismiss(): void {
    this.dismiss.emit();
  }
}