import chalk from 'chalk';
import { EXIT_CODES } from '../constants.js';

export enum ErrorCategory {
  CONFIG = 'CONFIGURATION',
  NETWORK = 'NETWORK',
  FILE = 'FILE',
  PERMISSION = 'PERMISSION',
  VALIDATION = 'VALIDATION',
  ENCRYPTION = 'ENCRYPTION',
  CONTRACT = 'CONTRACT',
  PAYMENT = 'PAYMENT',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  FATAL = 'fatal'
}

export interface AppErrorOptions {
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  cause?: unknown;
  details?: Record<string, any>;
  userMessage?: string;
  technicalMessage?: string;
  recoverable?: boolean;
  exitCode?: number;
}

export class AppError extends Error {
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public override readonly cause?: unknown;
  public readonly details?: Record<string, any>;
  public readonly userMessage: string;
  public readonly technicalMessage?: string;
  public readonly recoverable: boolean;
  public readonly exitCode: number;
  public readonly timestamp: Date;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = 'AppError';
    this.category = options.category || ErrorCategory.UNKNOWN;
    this.severity = options.severity || ErrorSeverity.ERROR;
    this.cause = options.cause;
    this.details = options.details;
    this.userMessage = options.userMessage || message;
    this.technicalMessage = options.technicalMessage;
    this.recoverable = options.recoverable ?? false;
    this.exitCode = options.exitCode ?? EXIT_CODES.ERROR;
    this.timestamp = new Date();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

interface ErrorContext {
  spinner?: any;
  debug?: boolean;
  exitOnFatal?: boolean;
}

class ErrorHandler {
  private static instance: ErrorHandler;
  private context: ErrorContext = {
    debug: false,
    exitOnFatal: true
  };

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  public setContext(context: Partial<ErrorContext>): void {
    this.context = { ...this.context, ...context };
  }

  public handle(error: unknown, customMessage?: string): void {
    const appError = this.normalizeError(error);
    
    // Stop spinner if one is active
    if (this.context.spinner) {
      const message = customMessage || appError.userMessage;
      this.context.spinner.fail(message);
    }

    // Log based on severity
    this.logError(appError);

    // Exit if fatal and configured to do so
    if (appError.severity === ErrorSeverity.FATAL && this.context.exitOnFatal) {
      process.exit(appError.exitCode);
    }

    // Throw if not recoverable
    if (!appError.recoverable) {
      throw appError;
    }
  }

  public handleWithRecovery(
    error: unknown,
    recoveryFn: () => void | Promise<void>,
    customMessage?: string
  ): void {
    const appError = this.normalizeError(error);
    
    if (appError.recoverable) {
      this.logError(appError, ErrorSeverity.WARNING);
      
      // Attempt recovery
      try {
        const result = recoveryFn();
        if (result instanceof Promise) {
          result.catch(recoveryError => {
            console.error(chalk.red('Recovery failed:'), recoveryError);
            this.handle(appError, customMessage);
          });
        }
      } catch (recoveryError) {
        console.error(chalk.red('Recovery failed:'), recoveryError);
        this.handle(appError, customMessage);
      }
    } else {
      this.handle(error, customMessage);
    }
  }

  private normalizeError(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      // Categorize known error types
      const category = this.categorizeError(error);
      const severity = this.determineSeverity(error);
      
      return new AppError(error.message, {
        category,
        severity,
        cause: error,
        userMessage: this.createUserMessage(error, category),
        technicalMessage: error.stack,
        recoverable: this.isRecoverable(error, category),
        exitCode: this.determineExitCode(category)
      });
    }

    // Handle non-Error objects
    return new AppError('An unknown error occurred', {
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.ERROR,
      cause: error,
      userMessage: 'An unexpected error occurred. Please try again.',
      recoverable: false,
      exitCode: 1
    });
  }

  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    
    // Configuration errors
    if (message.includes('environment variable') || 
        message.includes('config') || 
        message.includes('.env')) {
      return ErrorCategory.CONFIG;
    }
    
    // Network errors
    if (message.includes('network') || 
        message.includes('timeout') || 
        message.includes('connection') ||
        message.includes('rpc')) {
      return ErrorCategory.NETWORK;
    }
    
    // File errors
    if (message.includes('file') || 
        message.includes('enoent') || 
        message.includes('directory') ||
        message.includes('path')) {
      return ErrorCategory.FILE;
    }
    
    // Permission errors
    if (message.includes('permission') || 
        message.includes('access') || 
        message.includes('denied') ||
        message.includes('unauthorized')) {
      return ErrorCategory.PERMISSION;
    }
    
    // Encryption errors
    if (message.includes('encrypt') || 
        message.includes('decrypt') || 
        message.includes('lit protocol') ||
        message.includes('signature')) {
      return ErrorCategory.ENCRYPTION;
    }
    
    // Smart contract errors
    if (message.includes('contract') || 
        message.includes('revert') || 
        message.includes('useroperation') ||
        message.includes('simulation')) {
      return ErrorCategory.CONTRACT;
    }
    
    // Payment errors
    if (message.includes('balance') || 
        message.includes('insufficient') || 
        message.includes('usdfc') ||
        message.includes('payment')) {
      return ErrorCategory.PAYMENT;
    }
    
    return ErrorCategory.UNKNOWN;
  }

  private determineSeverity(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();
    
    if (message.includes('warning') || message.includes('deprecated')) {
      return ErrorSeverity.WARNING;
    }
    
    if (message.includes('fatal') || message.includes('critical')) {
      return ErrorSeverity.FATAL;
    }
    
    return ErrorSeverity.ERROR;
  }

  private createUserMessage(error: Error, category: ErrorCategory): string {
    const baseMessages: Record<ErrorCategory, string> = {
      [ErrorCategory.CONFIG]: 'Configuration error. Please check your .env file.',
      [ErrorCategory.NETWORK]: 'Network connection issue. Please check your internet connection.',
      [ErrorCategory.FILE]: 'File operation failed. Please check the file path and permissions.',
      [ErrorCategory.PERMISSION]: 'Permission denied. You may not have access to this resource.',
      [ErrorCategory.VALIDATION]: 'Validation failed. Please check your input.',
      [ErrorCategory.ENCRYPTION]: 'Encryption/decryption operation failed.',
      [ErrorCategory.CONTRACT]: 'Smart contract operation failed.',
      [ErrorCategory.PAYMENT]: 'Payment or balance issue.',
      [ErrorCategory.UNKNOWN]: 'An unexpected error occurred.'
    };

    // Add specific guidance for common errors
    const message = error.message.toLowerCase();
    
    if (message.includes('insufficient usdfc')) {
      return 'Insufficient USDFC balance. Please deposit funds using the "deposit" command.';
    }
    
    if (message.includes('private_key')) {
      return 'Private key not configured. Please set PRIVATE_KEY in your .env file.';
    }
    
    if (message.includes('not found') && category === ErrorCategory.FILE) {
      return 'File not found. Please check that the file exists and the path is correct.';
    }
    
    if (message.includes('useroperation reverted')) {
      return 'Smart contract transaction failed. This may be due to network congestion or insufficient gas.';
    }

    if (message.includes('failed to verify signature')) {
      return 'Signature verification failed. Please ensure you are using the correct wallet.';
    }
    
    return baseMessages[category];
  }

  private isRecoverable(error: Error, category: ErrorCategory): boolean {
    // Network errors are often recoverable with retry
    if (category === ErrorCategory.NETWORK) {
      return true;
    }
    
    // Some contract errors can be recovered with retry
    if (category === ErrorCategory.CONTRACT) {
      const message = error.message.toLowerCase();
      return message.includes('congestion') || message.includes('timeout');
    }
    
    // Configuration and validation errors are not recoverable
    if (category === ErrorCategory.CONFIG || category === ErrorCategory.VALIDATION) {
      return false;
    }
    
    return false;
  }

  private determineExitCode(category: ErrorCategory): number {
    const exitCodes: Record<ErrorCategory, number> = {
      [ErrorCategory.CONFIG]: EXIT_CODES.CONFIG_ERROR,
      [ErrorCategory.NETWORK]: EXIT_CODES.NETWORK_ERROR,
      [ErrorCategory.FILE]: EXIT_CODES.FILE_ERROR,
      [ErrorCategory.PERMISSION]: EXIT_CODES.PERMISSION_ERROR,
      [ErrorCategory.VALIDATION]: EXIT_CODES.VALIDATION_ERROR,
      [ErrorCategory.ENCRYPTION]: EXIT_CODES.ENCRYPTION_ERROR,
      [ErrorCategory.CONTRACT]: EXIT_CODES.CONTRACT_ERROR,
      [ErrorCategory.PAYMENT]: EXIT_CODES.PAYMENT_ERROR,
      [ErrorCategory.UNKNOWN]: EXIT_CODES.ERROR
    };
    
    return exitCodes[category];
  }

  private logError(error: AppError, overrideSeverity?: ErrorSeverity): void {
    const severity = overrideSeverity || error.severity;
    
    // User-friendly message
    switch (severity) {
      case ErrorSeverity.INFO:
        console.log(chalk.blue('ℹ'), error.userMessage);
        break;
      case ErrorSeverity.WARNING:
        console.log(chalk.yellow('⚠'), error.userMessage);
        break;
      case ErrorSeverity.ERROR:
      case ErrorSeverity.FATAL:
        console.error(chalk.red('✖'), error.userMessage);
        break;
    }
    
    // Technical details in debug mode
    if (this.context.debug) {
      console.error(chalk.gray('\n--- Debug Information ---'));
      console.error(chalk.gray(`Category: ${error.category}`));
      console.error(chalk.gray(`Severity: ${error.severity}`));
      console.error(chalk.gray(`Timestamp: ${error.timestamp.toISOString()}`));
      
      if (error.details) {
        console.error(chalk.gray('Details:'), error.details);
      }
      
      if (error.technicalMessage) {
        console.error(chalk.gray('\nStack Trace:'));
        console.error(chalk.gray(error.technicalMessage));
      }
      
      if (error.cause) {
        console.error(chalk.gray('\nOriginal Error:'));
        console.error(error.cause);
      }
    }
  }

  public createError(
    message: string,
    category: ErrorCategory,
    options: Omit<AppErrorOptions, 'category'> = {}
  ): AppError {
    return new AppError(message, { ...options, category });
  }
}

export const errorHandler = ErrorHandler.getInstance();

// Convenience functions for creating specific error types
export const createConfigError = (
  message: string,
  options?: Omit<AppErrorOptions, 'category'>
): AppError => {
  return new AppError(message, {
    ...options,
    category: ErrorCategory.CONFIG,
    severity: ErrorSeverity.FATAL,
    exitCode: EXIT_CODES.CONFIG_ERROR
  });
};

export const createNetworkError = (
  message: string,
  options?: Omit<AppErrorOptions, 'category'>
): AppError => {
  return new AppError(message, {
    ...options,
    category: ErrorCategory.NETWORK,
    recoverable: true,
    exitCode: EXIT_CODES.NETWORK_ERROR
  });
};

export const createFileError = (
  message: string,
  options?: Omit<AppErrorOptions, 'category'>
): AppError => {
  return new AppError(message, {
    ...options,
    category: ErrorCategory.FILE,
    exitCode: EXIT_CODES.FILE_ERROR
  });
};

export const createPaymentError = (
  message: string,
  options?: Omit<AppErrorOptions, 'category'>
): AppError => {
  return new AppError(message, {
    ...options,
    category: ErrorCategory.PAYMENT,
    exitCode: EXIT_CODES.PAYMENT_ERROR
  });
};

export const createEncryptionError = (
  message: string,
  options?: Omit<AppErrorOptions, 'category'>
): AppError => {
  return new AppError(message, {
    ...options,
    category: ErrorCategory.ENCRYPTION,
    exitCode: EXIT_CODES.ENCRYPTION_ERROR
  });
};

export const createContractError = (
  message: string,
  options?: Omit<AppErrorOptions, 'category'>
): AppError => {
  return new AppError(message, {
    ...options,
    category: ErrorCategory.CONTRACT,
    exitCode: EXIT_CODES.CONTRACT_ERROR
  });
};