/**
 * Quality Gate System - Enterprise Performance Monitoring
 * 
 * Implements automated quality checks as specified in the best practices:
 * - Performance budget monitoring
 * - Error tracking and thresholds
 * - Feature flag management
 * - Health check reporting
 */

// Import logger with circular dependency guard
let loggerInstance: any = null;
try {
  loggerInstance = require('./Logger').default;
} catch {
  // Logger may not be available during bootstrap - use console
  loggerInstance = null;
}

export interface PerformanceBudget {
  ttiMs: number;           // Time to Interactive
  stockfishInitMs: number; // Stockfish initialization
  stockfishResponseMs: number; // Engine response time
  syncDriftMs: number;     // Video sync drift tolerance
  srsRatePerMinute: number; // SRS review throughput
  // Day 2 Custom Metrics
  videoLoadTimeMs: number;
  seekTimeMs: number;
  fileUploadMs: number;
  gameValidationMs: number;
}

export interface QualityMetrics {
  performance: {
    tti: number;
    stockfishInit: number;
    stockfishResponse: number;
    averageSyncDrift: number;
    srsReviewRate: number;
    lastMeasured: Date;
  };
  errors: {
    total: number;
    critical: number;
    warnings: number;
    lastError?: {
      message: string;
      timestamp: Date;
      stack?: string;
    };
  };
  features: {
    stockfishEnabled: boolean;
    syncEnabled: boolean;
    fsrsEnabled: boolean;
    lichessEnabled: boolean;
  };
  health: {
    score: number; // 0-100
    status: 'excellent' | 'good' | 'warning' | 'critical';
    issues: string[];
    lastCheck: Date;
  };
}

export interface FeatureFlags {
  stockfish: boolean;
  lichessOAuth: boolean;
  fsrsAdvanced: boolean;
  videoSync: boolean;
  analytics: boolean;
  debugMode: boolean;
  performanceMonitoring: boolean;
}

export class QualityGate {
  private budget: PerformanceBudget;
  private metrics: QualityMetrics;
  private featureFlags: FeatureFlags;
  private listeners: ((metrics: QualityMetrics) => void)[] = [];

  constructor() {
    this.budget = {
      ttiMs: 2000,        // 2s TTI budget
      memoryMb: 256,      // 256MB memory budget
      bundleSizeKb: 1024, // 1MB bundle size budget
      renderTimeMs: 100,  // 100ms render budget
      apiResponseMs: 500, // 500ms API budget
      errorRate: 0.01,    // 1% error rate budget
      
      // Engine-specific budgets
      stockfishInitMs: 1500, // 1.5s init budget
      stockfishResponseMs: 200, // 200ms response budget
      
      // Video-specific budgets
      videoLoadTimeMs: 3000, // 3s video load budget
      seekTimeMs: 500,    // 500ms seek budget
      
      // File operation budgets
      fileUploadMs: 5000, // 5s upload budget
      
      // Game validation budgets
      gameValidationMs: 100, // 100ms validation budget
      
      // Sync budgets
      syncDriftMs: 300,   // 0.3s sync drift budget
      
      // SRS budgets
      srsRatePerMinute: 60, // 60 cards per 10 minutes = 6/min
      
      // Analytics budgets
      moveAnalysisMs: 50,  // 50ms move analysis budget
      positionAnalysisMs: 200, // 200ms position analysis budget
      
      // Engine pool budgets
      enginePoolInitMs: 2000, // 2s engine pool init budget
      
      // System budgets
      engineSystemInitMs: 3000, // 3s engine system init budget
    };

    this.metrics = {
      performance: {
        ttiMs: 0,
        memoryMb: 0,
        bundleSizeKb: 0,
        renderTimeMs: 0,
        apiResponseMs: 0,
        errorRate: 0,
        stockfishInitMs: 0,
        stockfishResponseMs: 0,
        videoLoadTimeMs: 0,
        seekTimeMs: 0,
        fileUploadMs: 0,
        gameValidationMs: 0,
        syncDriftMs: 0,
        srsRatePerMinute: 0,
        moveAnalysisMs: 0,
        positionAnalysisMs: 0,
        enginePoolInitMs: 0,
        engineSystemInitMs: 0,
      },
      errors: {
        total: 0,
        critical: 0,
        warnings: 0,
      },
      features: {
        stockfishEnabled: true,
        syncEnabled: true,
        fsrsEnabled: true,
        lichessEnabled: true,
      },
      health: {
        score: 100,
        status: 'excellent',
        issues: [],
        lastCheck: new Date(),
      },
    };

    this.featureFlags = {
      stockfish: true,
      lichessOAuth: false, // Disabled by default until user configures
      fsrsAdvanced: true,
      videoSync: true,
      analytics: true,
      debugMode: false,
      performanceMonitoring: true,
    };

    // Load feature flags from localStorage
    this.loadFeatureFlags();
    
    // Start automatic health checks
    this.startHealthMonitoring();
  }

  /**
   * Record performance measurement
   */
  recordPerformance(metric: keyof PerformanceBudget, value: number): void {
    const budgetValue = this.budget[metric];
    const performanceKey = this.getPerformanceKey(metric);
    
    if (performanceKey) {
      this.metrics.performance[performanceKey] = value;
      this.metrics.performance.lastMeasured = new Date();

      // Check if exceeds budget
      if (value > budgetValue) {
        this.internalRecordIssue('warning', `${metric} exceeded budget: ${value}ms > ${budgetValue}ms`);
      }

      this.updateHealthScore();
      this.notifyListeners();
    }
  }

  /**
   * Record error occurrence
   */
  recordError(error: Error, severity: 'warning' | 'critical' = 'warning'): void {
    this.metrics.errors.total++;
    
    if (severity === 'critical') {
      this.metrics.errors.critical++;
    } else {
      this.metrics.errors.warnings++;
    }

    this.metrics.errors.lastError = {
      message: error.message,
      timestamp: new Date(),
      stack: error.stack,
    };

    this.internalRecordIssue(severity, `${severity} error: ${error.message}`);
    this.updateHealthScore();
    this.notifyListeners();
  }

  /**
   * Get feature flag status
   */
  getFeatureFlag(flag: keyof FeatureFlags): boolean {
    return this.featureFlags[flag];
  }

  /**
   * Set feature flag
   */
  setFeatureFlag(flag: keyof FeatureFlags, enabled: boolean): void {
    this.featureFlags[flag] = enabled;
    this.saveFeatureFlags();
    
    // Update metrics
    if (flag === 'stockfish') this.metrics.features.stockfishEnabled = enabled;
    if (flag === 'videoSync') this.metrics.features.syncEnabled = enabled;
    if (flag === 'fsrsAdvanced') this.metrics.features.fsrsEnabled = enabled;
    if (flag === 'lichessOAuth') this.metrics.features.lichessEnabled = enabled;

    this.notifyListeners();
  }

  /**
   * Get current quality metrics
   */
  getMetrics(): QualityMetrics {
    return JSON.parse(JSON.stringify(this.metrics)); // Deep clone
  }

  /**
   * Get performance budget
   */
  getBudget(): PerformanceBudget {
    return { ...this.budget };
  }

  /**
   * Update performance budget
   */
  updateBudget(updates: Partial<PerformanceBudget>): void {
    this.budget = { ...this.budget, ...updates };
  }

  /**
   * Check if system passes quality gates
   */
  passesQualityGate(): boolean {
    const issues = this.runQualityChecks();
    return issues.length === 0;
  }

  /**
   * Run comprehensive quality checks
   */
  runQualityChecks(): string[] {
    const issues: string[] = [];
    const perf = this.metrics.performance;

    // Performance checks
    if (perf.tti > this.budget.ttiMs) {
      issues.push(`TTI exceeds budget: ${perf.tti}ms > ${this.budget.ttiMs}ms`);
    }

    if (perf.stockfishInit > this.budget.stockfishInitMs) {
      issues.push(`Stockfish init exceeds budget: ${perf.stockfishInit}ms > ${this.budget.stockfishInitMs}ms`);
    }

    if (perf.stockfishResponse > this.budget.stockfishResponseMs) {
      issues.push(`Stockfish response exceeds budget: ${perf.stockfishResponse}ms > ${this.budget.stockfishResponseMs}ms`);
    }

    if (perf.averageSyncDrift > this.budget.syncDriftMs) {
      issues.push(`Sync drift exceeds budget: ${perf.averageSyncDrift}ms > ${this.budget.syncDriftMs}ms`);
    }

    // Error rate checks
    const errorRate = this.metrics.errors.total > 0 
      ? this.metrics.errors.critical / this.metrics.errors.total 
      : 0;

    if (errorRate > 0.1) { // >10% critical error rate
      issues.push(`High critical error rate: ${(errorRate * 100).toFixed(1)}%`);
    }

    // Feature availability checks
    const criticalFeatures = ['stockfishEnabled', 'syncEnabled', 'fsrsEnabled'] as const;
    for (const feature of criticalFeatures) {
      if (!this.metrics.features[feature]) {
        issues.push(`Critical feature disabled: ${feature}`);
      }
    }

    return issues;
  }

  /**
   * Generate health report
   */
  generateHealthReport(): {
    summary: string;
    score: number;
    recommendations: string[];
    rawMetrics: QualityMetrics;
  } {
    const issues = this.runQualityChecks();
    const score = Math.max(0, 100 - (issues.length * 10));
    
    let status: string;
    if (score >= 90) status = 'Excellent';
    else if (score >= 75) status = 'Good';
    else if (score >= 50) status = 'Needs Attention';
    else status = 'Critical';

    const recommendations: string[] = [];
    
    if (this.metrics.performance.tti > this.budget.ttiMs) {
      recommendations.push('Consider code splitting to reduce initial bundle size');
    }
    
    if (this.metrics.performance.stockfishInit > this.budget.stockfishInitMs) {
      recommendations.push('Implement lazy loading for Stockfish engine');
    }
    
    if (this.metrics.errors.critical > 0) {
      recommendations.push('Address critical errors immediately');
    }

    if (issues.length > 5) {
      recommendations.push('Run comprehensive system diagnostic');
    }

    return {
      summary: `System health: ${status} (${score}/100)`,
      score,
      recommendations,
      rawMetrics: this.getMetrics(),
    };
  }

  /**
   * Subscribe to metrics updates
   */
  subscribe(listener: (metrics: QualityMetrics) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Export diagnostics data
   */
  exportDiagnostics(): string {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      version: '1.0.0', // Would come from package.json
      metrics: this.metrics,
      budget: this.budget,
      featureFlags: this.featureFlags,
      qualityChecks: this.runQualityChecks(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    return JSON.stringify(diagnostics, null, 2);
  }

  // Private methods

  private getPerformanceKey(budgetKey: keyof PerformanceBudget): keyof QualityMetrics['performance'] | null {
    const mapping: Record<string, keyof QualityMetrics['performance']> = {
      ttiMs: 'tti',
      stockfishInitMs: 'stockfishInit',
      stockfishResponseMs: 'stockfishResponse',
      syncDriftMs: 'averageSyncDrift',
      srsRatePerMinute: 'srsReviewRate',
    };
    return mapping[budgetKey] || null;
  }

  /**
   * Public method to record issues from external components
   */
  recordIssue(severity: 'warning' | 'critical' | 'info', message: string): void {
    if (!this.metrics.health.issues.includes(message)) {
      this.metrics.health.issues.push(message);
    }

    // Update error counts
    if (severity === 'critical') {
      this.metrics.errors.critical++;
    } else {
      this.metrics.errors.warnings++;
    }
    this.metrics.errors.total++;

    this.updateHealthScore();
  }

  private internalRecordIssue(severity: 'warning' | 'critical', message: string): void {
    if (!this.metrics.health.issues.includes(message)) {
      this.metrics.health.issues.push(message);
    }

    // Keep only recent issues (last 10)
    if (this.metrics.health.issues.length > 10) {
      this.metrics.health.issues = this.metrics.health.issues.slice(-10);
    }
  }

  private updateHealthScore(): void {
    const issues = this.runQualityChecks();
    const score = Math.max(0, 100 - (issues.length * 10));
    
    this.metrics.health.score = score;
    this.metrics.health.lastCheck = new Date();

    if (score >= 90) this.metrics.health.status = 'excellent';
    else if (score >= 75) this.metrics.health.status = 'good';
    else if (score >= 50) this.metrics.health.status = 'warning';
    else this.metrics.health.status = 'critical';

    this.metrics.health.issues = issues;
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.getMetrics());
      } catch (error) {
        if (loggerInstance) {
          loggerInstance.error('performance', 'Quality gate listener error', error, {}, { component: 'QualityGate', function: 'notifyListeners' });
        } else {
          console.error('Quality gate listener error:', error);
        }
      }
    }
  }

  private loadFeatureFlags(): void {
    try {
      const stored = localStorage.getItem('chess-trainer-feature-flags');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.featureFlags = { ...this.featureFlags, ...parsed };
      }
    } catch (error) {
      if (loggerInstance) {
        loggerInstance.warn('performance', 'Feature flags loading failed', { error: error.message }, { component: 'QualityGate', function: 'loadFeatureFlags' });
      } else {
        console.warn('Failed to load feature flags:', error);
      }
    }
  }

  private saveFeatureFlags(): void {
    try {
      localStorage.setItem('chess-trainer-feature-flags', JSON.stringify(this.featureFlags));
    } catch (error) {
      if (loggerInstance) {
        loggerInstance.warn('performance', 'Feature flags saving failed', { error: error.message }, { component: 'QualityGate', function: 'saveFeatureFlags' });
      } else {
        console.warn('Failed to save feature flags:', error);
      }
    }
  }

  private startHealthMonitoring(): void {
    // Run health check every 30 seconds
    setInterval(() => {
      if (this.featureFlags.performanceMonitoring) {
        this.updateHealthScore();
      }
    }, 30000);
  }
}

// Singleton instance
export const qualityGate = new QualityGate();

export default qualityGate;