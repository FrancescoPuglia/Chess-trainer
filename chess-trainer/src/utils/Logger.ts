/**
 * ♔ ENTERPRISE LOGGING SYSTEM
 * 
 * Structured logging system with enterprise-grade features:
 * - Multiple log levels with filtering
 * - Contextual metadata support
 * - Performance and error integration with QualityGate
 * - Environment-aware behavior
 * - Memory-efficient log rotation
 * - Structured JSON output for production analysis
 * - Development-friendly console formatting
 * 
 * Architecture:
 * - Singleton pattern for consistent global access
 * - Strategy pattern for different output formats
 * - Observer pattern for log event hooks
 * - Zero-runtime overhead in production when disabled
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  metadata?: Record<string, any>;
  error?: Error;
  context?: {
    component?: string;
    function?: string;
    userId?: string;
    sessionId?: string;
  };
  performance?: {
    duration?: number;
    memoryUsage?: number;
    renderTime?: number;
  };
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  maxStoredEntries: number;
  enableQualityGateIntegration: boolean;
  enablePerformanceTracking: boolean;
  categories: Set<string>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  critical: 4,
};

class EnterpriseLogger {
  private config: LoggerConfig;
  private entries: LogEntry[] = [];
  private hooks: ((entry: LogEntry) => void)[] = [];
  private qualityGateIntegration: any = null;

  constructor() {
    // Environment-aware default configuration
    this.config = {
      level: (process.env.NODE_ENV === 'development' ? 'debug' : 'info') as LogLevel,
      enableConsole: process.env.NODE_ENV === 'development',
      enableStorage: true,
      maxStoredEntries: 1000,
      enableQualityGateIntegration: true,
      enablePerformanceTracking: true,
      categories: new Set(['app', 'game', 'video', 'sync', 'srs', 'database', 'performance', 'ui']),
    };

    // Initialize QualityGate integration
    this.initializeQualityGateIntegration();

    // Setup global error handler integration
    this.setupGlobalErrorHandler();
  }

  /**
   * Configure logger behavior
   */
  configure(partialConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...partialConfig };
  }

  /**
   * Add log entry hook for external systems
   */
  addHook(hook: (entry: LogEntry) => void): void {
    this.hooks.push(hook);
  }

  /**
   * Core logging method with full context support
   */
  log(
    level: LogLevel,
    category: string,
    message: string,
    metadata?: Record<string, any>,
    error?: Error,
    context?: LogEntry['context'],
    performance?: LogEntry['performance']
  ): void {
    // Early exit if log level is below threshold
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.level]) {
      return;
    }

    // Validate category
    if (!this.config.categories.has(category)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Unknown log category: ${category}`);
      }
      category = 'app'; // fallback to default category
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      metadata,
      error,
      context,
      performance,
    };

    // Store entry (with rotation)
    if (this.config.enableStorage) {
      this.storeEntry(entry);
    }

    // Console output (development-friendly)
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }

    // QualityGate integration
    if (this.config.enableQualityGateIntegration) {
      this.integrateWithQualityGate(entry);
    }

    // Execute hooks
    this.hooks.forEach(hook => {
      try {
        hook(entry);
      } catch (hookError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Logger hook failed:', hookError);
        }
      }
    });
  }

  /**
   * Convenience methods for different log levels
   */
  debug(category: string, message: string, metadata?: Record<string, any>, context?: LogEntry['context']): void {
    this.log('debug', category, message, metadata, undefined, context);
  }

  info(category: string, message: string, metadata?: Record<string, any>, context?: LogEntry['context']): void {
    this.log('info', category, message, metadata, undefined, context);
  }

  warn(category: string, message: string, metadata?: Record<string, any>, context?: LogEntry['context']): void {
    this.log('warn', category, message, metadata, undefined, context);
  }

  error(category: string, message: string, error?: Error, metadata?: Record<string, any>, context?: LogEntry['context']): void {
    this.log('error', category, message, metadata, error, context);
  }

  critical(category: string, message: string, error?: Error, metadata?: Record<string, any>, context?: LogEntry['context']): void {
    this.log('critical', category, message, metadata, error, context);
  }

  /**
   * Performance logging with automatic timing
   */
  performance(
    category: string, 
    operation: string, 
    startTime: number, 
    metadata?: Record<string, any>,
    context?: LogEntry['context']
  ): void {
    const duration = performance.now() - startTime;
    const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;
    
    this.log('info', category, `Performance: ${operation}`, metadata, undefined, context, {
      duration,
      memoryUsage,
    });
  }

  /**
   * User interaction logging with context
   */
  userAction(
    action: string, 
    component: string, 
    metadata?: Record<string, any>,
    userId?: string,
    sessionId?: string
  ): void {
    this.info('ui', `User action: ${action}`, metadata, {
      component,
      userId,
      sessionId,
    });
  }

  /**
   * Get recent log entries for debugging
   */
  getRecentEntries(count: number = 100, level?: LogLevel): LogEntry[] {
    let entries = this.entries.slice(-count);
    
    if (level) {
      entries = entries.filter(entry => entry.level === level);
    }
    
    return entries;
  }

  /**
   * Get log statistics
   */
  getStatistics(): Record<string, any> {
    const stats = {
      totalEntries: this.entries.length,
      byLevel: {} as Record<LogLevel, number>,
      byCategory: {} as Record<string, number>,
      errorRate: 0,
      avgPerformanceTime: 0,
    };

    // Count by level and category
    let totalErrors = 0;
    let totalPerformanceEntries = 0;
    let totalPerformanceTime = 0;

    for (const entry of this.entries) {
      // Level stats
      stats.byLevel[entry.level] = (stats.byLevel[entry.level] || 0) + 1;
      
      // Category stats
      stats.byCategory[entry.category] = (stats.byCategory[entry.category] || 0) + 1;
      
      // Error rate
      if (entry.level === 'error' || entry.level === 'critical') {
        totalErrors++;
      }
      
      // Performance stats
      if (entry.performance?.duration) {
        totalPerformanceEntries++;
        totalPerformanceTime += entry.performance.duration;
      }
    }

    stats.errorRate = this.entries.length > 0 ? (totalErrors / this.entries.length) * 100 : 0;
    stats.avgPerformanceTime = totalPerformanceEntries > 0 ? 
      totalPerformanceTime / totalPerformanceEntries : 0;

    return stats;
  }

  /**
   * Export logs for analysis (JSON format)
   */
  exportLogs(startDate?: Date, endDate?: Date): string {
    let entries = this.entries;
    
    if (startDate || endDate) {
      entries = entries.filter(entry => {
        const timestamp = entry.timestamp.getTime();
        if (startDate && timestamp < startDate.getTime()) return false;
        if (endDate && timestamp > endDate.getTime()) return false;
        return true;
      });
    }

    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      totalEntries: entries.length,
      entries: entries.map(entry => ({
        ...entry,
        timestamp: entry.timestamp.toISOString(),
        error: entry.error ? {
          name: entry.error.name,
          message: entry.error.message,
          stack: entry.error.stack,
        } : undefined,
      })),
    }, null, 2);
  }

  /**
   * Clear stored logs (useful for testing)
   */
  clear(): void {
    this.entries = [];
  }

  // Private methods

  private storeEntry(entry: LogEntry): void {
    this.entries.push(entry);
    
    // Rotate logs if we exceed the max
    if (this.entries.length > this.config.maxStoredEntries) {
      this.entries = this.entries.slice(-this.config.maxStoredEntries);
    }
  }

  private outputToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString().substr(11, 12); // HH:MM:SS.mmm
    const levelIcon = this.getLevelIcon(entry.level);
    const categoryColor = this.getCategoryColor(entry.category);
    
    // Format message with context
    let formattedMessage = `${levelIcon} ${timestamp} [${entry.category}] ${entry.message}`;
    
    if (entry.context?.component) {
      formattedMessage += ` (${entry.context.component})`;
    }
    
    if (entry.performance?.duration) {
      formattedMessage += ` [${entry.performance.duration.toFixed(1)}ms]`;
    }

    // Choose console method based on level
    const consoleMethod = this.getConsoleMethod(entry.level);
    
    // Output main message
    if (entry.metadata || entry.error) {
      console.group(formattedMessage);
      
      if (entry.metadata) {
        console.log('Metadata:', entry.metadata);
      }
      
      if (entry.error) {
        console.error('Error:', entry.error);
      }
      
      console.groupEnd();
    } else {
      consoleMethod(formattedMessage);
    }
  }

  private getLevelIcon(level: LogLevel): string {
    const icons = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      critical: '🚨',
    };
    return icons[level];
  }

  private getCategoryColor(category: string): string {
    // This could be extended with actual console colors
    return category;
  }

  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case 'debug': return console.debug;
      case 'info': return console.info;
      case 'warn': return console.warn;
      case 'error':
      case 'critical': return console.error;
      default: return console.log;
    }
  }

  private async initializeQualityGateIntegration(): Promise<void> {
    if (!this.config.enableQualityGateIntegration) return;

    try {
      // Dynamically import QualityGate to avoid circular dependencies
      const { default: qualityGate } = await import('./QualityGate');
      this.qualityGateIntegration = qualityGate;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Could not initialize QualityGate integration:', error);
      }
    }
  }

  private integrateWithQualityGate(entry: LogEntry): void {
    if (!this.qualityGateIntegration) return;

    try {
      // Record errors in QualityGate
      if (entry.error && (entry.level === 'error' || entry.level === 'critical')) {
        const severity = entry.level === 'critical' ? 'critical' : 'warning';
        this.qualityGateIntegration.recordError(entry.error, severity);
      }

      // Record performance metrics
      if (entry.performance?.duration) {
        this.qualityGateIntegration.recordPerformance('operationDurationMs', entry.performance.duration);
      }

      if (entry.performance?.memoryUsage) {
        this.qualityGateIntegration.recordPerformance('memoryUsageBytes', entry.performance.memoryUsage);
      }
    } catch (error) {
      // Silently ignore QualityGate integration errors to prevent logging loops
    }
  }

  private setupGlobalErrorHandler(): void {
    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error('app', 'Unhandled promise rejection', event.reason, {
        type: 'unhandledrejection',
        promise: event.promise,
      });
    });

    // Capture global errors
    window.addEventListener('error', (event) => {
      this.error('app', 'Global error', event.error || new Error(event.message), {
        type: 'error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });
  }
}

// Singleton instance
const logger = new EnterpriseLogger();

export default logger;

// Named exports for convenience
export const {
  debug,
  info,
  warn,
  error,
  critical,
  performance: logPerformance,
  userAction,
  configure: configureLogger,
  addHook: addLogHook,
  getRecentEntries,
  getStatistics: getLogStatistics,
  exportLogs,
  clear: clearLogs,
} = logger;