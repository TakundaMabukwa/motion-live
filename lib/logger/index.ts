import config from '../config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMetadata {
  [key: string]: any;
}

/**
 * Logger utility for consistent logging across the application
 */
export class Logger {
  private context: string;
  private isProduction: boolean;
  
  /**
   * Create a new logger instance
   * @param context The context for this logger (usually the class or file name)
   */
  constructor(context: string) {
    this.context = context;
    this.isProduction = config.environment === 'production';
  }
  
  /**
   * Log a debug message
   * @param message The message to log
   * @param metadata Additional metadata
   */
  debug(message: string, metadata?: LogMetadata): void {
    this.log('debug', message, metadata);
  }
  
  /**
   * Log an info message
   * @param message The message to log
   * @param metadata Additional metadata
   */
  info(message: string, metadata?: LogMetadata): void {
    this.log('info', message, metadata);
  }
  
  /**
   * Log a warning message
   * @param message The message to log
   * @param metadata Additional metadata
   */
  warn(message: string, metadata?: LogMetadata): void {
    this.log('warn', message, metadata);
  }
  
  /**
   * Log an error message
   * @param message The message to log
   * @param error The error object
   * @param metadata Additional metadata
   */
  error(message: string, error?: Error, metadata?: LogMetadata): void {
    const combinedMetadata = {
      ...metadata,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined
    };
    
    this.log('error', message, combinedMetadata);
  }
  
  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, metadata?: LogMetadata): void {
    // Skip debug logs in production
    if (level === 'debug' && this.isProduction) {
      return;
    }
    
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      context: this.context,
      message,
      ...metadata
    };
    
    // In production, we would typically send logs to a service
    // For now, just use console with appropriate methods
    if (this.isProduction) {
      // In production, stringify everything to ensure it's captured properly
      console[level === 'debug' ? 'debug' : level](JSON.stringify(logData));
    } else {
      // In development, format for readability
      const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.context}]`;
      
      switch (level) {
        case 'debug':
          console.debug(prefix, message, metadata || '');
          break;
        case 'info':
          console.info(prefix, message, metadata || '');
          break;
        case 'warn':
          console.warn(prefix, message, metadata || '');
          break;
        case 'error':
          console.error(prefix, message, metadata || '');
          break;
      }
    }
  }
}
