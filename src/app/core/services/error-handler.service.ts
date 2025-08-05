import { Injectable, ErrorHandler, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';

/**
 * Error types for categorizing different kinds of errors
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  HTTP_CLIENT = 'HTTP_CLIENT',
  SERVER = 'SERVER',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Structured error interface for consistent error handling
 */
export interface AppError {
  type: ErrorType;
  message: string;
  details?: any;
  timestamp: Date;
  statusCode?: number;
  url?: string;
  userMessage: string;
}

/**
 * Error handler service for consistent error handling across the application
 * Provides error categorization, user-friendly messages, and logging
 */
@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService implements ErrorHandler {
  private readonly isDevelopment = !window.location.hostname.includes('prod');

  /**
   * Handle Angular errors (global error handler)
   * @param error - The error to handle
   */
  handleError(error: any): void {
    const appError = this.processError(error);
    this.logError(appError, error);
    
    // In development, also log to console for debugging
    if (this.isDevelopment) {
      console.error('Angular Error:', error);
      console.error('Processed Error:', appError);
    }
  }

  /**
   * Handle HTTP errors specifically
   * @param error - HTTP error response
   * @returns Observable that emits the processed error
   */
  handleHttpError(error: HttpErrorResponse): Observable<never> {
    const appError = this.processHttpError(error);
    this.logError(appError, error);
    return throwError(() => appError);
  }

  /**
   * Handle and return error message for UI display
   * @param error - Any error object
   * @returns User-friendly error message
   */
  getUserFriendlyMessage(error: any): string {
    const appError = this.processError(error);
    return appError.userMessage;
  }

  /**
   * Process any error and convert to structured AppError
   * @param error - Raw error object
   * @returns Structured AppError
   */
  processError(error: any): AppError {
    if (error instanceof HttpErrorResponse) {
      return this.processHttpError(error);
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return this.createAppError(
        ErrorType.NETWORK,
        'Network connectivity issue',
        error,
        'Unable to connect to the server. Please check your internet connection.'
      );
    }

    if (error instanceof Error) {
      return this.createAppError(
        ErrorType.UNKNOWN,
        error.message,
        error,
        'An unexpected error occurred. Please try again.'
      );
    }

    return this.createAppError(
      ErrorType.UNKNOWN,
      'Unknown error occurred',
      error,
      'An unexpected error occurred. Please try again.'
    );
  }

  /**
   * Process HTTP errors specifically
   * @param error - HTTP error response
   * @returns Structured AppError
   */
  private processHttpError(error: HttpErrorResponse): AppError {
    let errorType: ErrorType;
    let userMessage: string;

    switch (error.status) {
      case 0:
        errorType = ErrorType.NETWORK;
        userMessage = 'Unable to connect to the server. Please check your internet connection.';
        break;
      
      case 400:
        errorType = ErrorType.VALIDATION;
        userMessage = 'Invalid request. Please check your input and try again.';
        break;
      
      case 401:
        errorType = ErrorType.AUTHENTICATION;
        userMessage = 'Authentication required. Please log in and try again.';
        break;
      
      case 403:
        errorType = ErrorType.AUTHORIZATION;
        userMessage = 'Access denied. You do not have permission to perform this action.';
        break;
      
      case 404:
        errorType = ErrorType.NOT_FOUND;
        userMessage = 'The requested resource was not found.';
        break;
      
      case 408:
        errorType = ErrorType.TIMEOUT;
        userMessage = 'Request timed out. Please try again.';
        break;
      
      case 429:
        errorType = ErrorType.SERVER;
        userMessage = 'Too many requests. Please wait a moment and try again.';
        break;
      
      case 500:
      case 502:
      case 503:
      case 504:
        errorType = ErrorType.SERVER;
        userMessage = 'Server error. Please try again later.';
        break;
      
      default:
        errorType = ErrorType.HTTP_CLIENT;
        userMessage = 'An error occurred while processing your request. Please try again.';
    }

    return this.createAppError(
      errorType,
      error.message || `HTTP ${error.status} Error`,
      {
        status: error.status,
        statusText: error.statusText,
        url: error.url,
        headers: error.headers,
        error: error.error
      },
      userMessage,
      error.status,
      error.url || undefined
    );
  }

  /**
   * Create a structured AppError object
   */
  private createAppError(
    type: ErrorType,
    message: string,
    details: any,
    userMessage: string,
    statusCode?: number,
    url?: string
  ): AppError {
    return {
      type,
      message,
      details,
      timestamp: new Date(),
      statusCode,
      url,
      userMessage
    };
  }

  /**
   * Log error information (could be extended to send to logging service)
   * @param appError - Structured error object
   * @param originalError - Original error object
   */
  private logError(appError: AppError, originalError: any): void {
    const logData = {
      timestamp: appError.timestamp.toISOString(),
      type: appError.type,
      message: appError.message,
      userMessage: appError.userMessage,
      statusCode: appError.statusCode,
      url: appError.url,
      userAgent: navigator.userAgent,
      href: window.location.href
    };

    // In development, log to console
    if (this.isDevelopment) {
      console.group(`🚨 Error [${appError.type}]`);
      console.error('User Message:', appError.userMessage);
      console.error('Technical Message:', appError.message);
      console.error('Details:', appError.details);
      console.error('Original Error:', originalError);
      console.error('Log Data:', logData);
      console.groupEnd();
    }

    // In production, you might want to send to a logging service
    // this.sendToLoggingService(logData);
  }

  /**
   * Check if error is recoverable (user can retry)
   * @param error - AppError object
   * @returns True if error is recoverable
   */
  isRecoverable(error: AppError): boolean {
    const recoverableTypes = [
      ErrorType.NETWORK,
      ErrorType.TIMEOUT,
      ErrorType.SERVER
    ];
    
    return recoverableTypes.includes(error.type) || 
           (error.statusCode && error.statusCode >= 500);
  }

  /**
   * Get retry delay based on error type
   * @param error - AppError object
   * @param attempt - Current retry attempt number
   * @returns Delay in milliseconds
   */
  getRetryDelay(error: AppError, attempt: number): number {
    if (!this.isRecoverable(error)) {
      return 0;
    }

    // Exponential backoff with jitter
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    
    // Add jitter (random variation) to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    
    return delay + jitter;
  }

  /**
   * Create a safe fallback response for failed requests
   * @param defaultValue - Default value to return
   * @returns Observable with default value
   */
  createFallbackResponse<T>(defaultValue: T): Observable<T> {
    return of(defaultValue);
  }

  /**
   * Extract relevant error information for reporting
   * @param error - Any error object
   * @returns Object with error information for reporting
   */
  extractErrorInfo(error: any): {
    message: string;
    stack?: string;
    type: string;
    timestamp: string;
  } {
    const appError = this.processError(error);
    
    return {
      message: appError.message,
      stack: error instanceof Error ? error.stack : undefined,
      type: appError.type,
      timestamp: appError.timestamp.toISOString()
    };
  }

  /**
   * Check if error indicates offline status
   * @param error - Error object
   * @returns True if error indicates offline
   */
  isOfflineError(error: any): boolean {
    if (error instanceof HttpErrorResponse) {
      return error.status === 0;
    }
    
    return error instanceof TypeError && 
           error.message.toLowerCase().includes('failed to fetch');
  }

  /**
   * Get appropriate icon for error type (for UI display)
   * @param errorType - Type of error
   * @returns Icon name or Unicode symbol
   */
  getErrorIcon(errorType: ErrorType): string {
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

    return iconMap[errorType] || '❓';
  }
}