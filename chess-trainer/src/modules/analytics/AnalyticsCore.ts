/**
 * ♔ ENTERPRISE ANALYTICS CORE
 * 
 * Comprehensive real-time analytics system with KPI tracking,
 * performance monitoring, and advanced reporting capabilities.
 * 
 * Architecture:
 * - Event-driven architecture with real-time processing
 * - Modular analytics plugins for extensibility  
 * - Time-series data management with efficient storage
 * - Dashboard-ready metrics with automated insights
 * - Integration with QualityGate for performance correlation
 * 
 * Features:
 * - Real-time KPI calculations and alerts
 * - Advanced statistical analysis and trending
 * - Multi-dimensional analytics (user, session, performance)
 * - Automated insights and recommendations
 * - Export capabilities for external analysis tools
 */

import type {
  AnalyticsEvent,
  AnalyticsEventType,
  GameAnalytics,
  StudyAnalytics,
  VideoSyncIntegration,
  StudyRecommendation
} from '../../types';

import logger from '../../utils/Logger';
import qualityGate from '../../utils/QualityGate';
import { DatabaseService } from '../../data/database';

export interface KPIDefinition {
  id: string;
  name: string;
  description: string;
  unit: string;
  target: number;
  warning: number;
  critical: number;
  calculation: (events: AnalyticsEvent[], timeWindow: number) => number;
  trending: 'higher-better' | 'lower-better' | 'stable-better';
}

export interface KPIResult {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  trend: 'improving' | 'stable' | 'declining';
  trendPercentage: number;
  target: number;
  historicalData: { timestamp: Date; value: number }[];
}

export interface AnalyticsDashboard {
  generatedAt: Date;
  timeWindow: { start: Date; end: Date };
  overview: {
    totalSessions: number;
    totalMoves: number;
    averageSessionDuration: number;
    userEngagement: number;
  };
  kpis: KPIResult[];
  insights: AnalyticsInsight[];
  recommendations: StudyRecommendation[];
  performance: {
    qualityGateScore: number;
    systemHealth: number;
    errorRate: number;
  };
}

export interface AnalyticsInsight {
  id: string;
  type: 'performance' | 'learning' | 'usage' | 'quality';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  data: Record<string, any>;
  confidence: number; // 0-100
  actionable: boolean;
  suggestedActions?: string[];
}

export interface AnalyticsCoreConfig {
  enableRealTimeKPIs: boolean;
  kpiCalculationIntervalMs: number;
  retentionDays: number;
  enableAutomatedInsights: boolean;
  insightConfidenceThreshold: number;
  batchSize: number;
  enablePersistence: boolean;
}

/**
 * Enterprise Analytics Core System
 */
export class AnalyticsCore {
  private config: AnalyticsCoreConfig;
  private events: AnalyticsEvent[] = [];
  private kpiDefinitions: Map<string, KPIDefinition> = new Map();
  private kpiHistory: Map<string, { timestamp: Date; value: number }[]> = new Map();
  private calculateTimer: NodeJS.Timeout | null = null;
  private listeners: ((dashboard: AnalyticsDashboard) => void)[] = [];
  private isInitialized = false;

  constructor(config?: Partial<AnalyticsCoreConfig>) {
    this.config = {
      enableRealTimeKPIs: true,
      kpiCalculationIntervalMs: 60000, // 1 minute
      retentionDays: 90,
      enableAutomatedInsights: true,
      insightConfidenceThreshold: 70,
      batchSize: 1000,
      enablePersistence: true,
      ...config
    };

    this.initializeKPIs();
    this.startKPICalculation();

    logger.info('analytics', 'AnalyticsCore initialized with enterprise KPI tracking', {
      config: this.config,
      kpiCount: this.kpiDefinitions.size
    }, { component: 'AnalyticsCore', function: 'constructor' });
  }

  /**
   * Initialize the analytics system
   */
  async initialize(): Promise<void> {
    try {
      // Load historical data if persistence is enabled
      if (this.config.enablePersistence) {
        await this.loadHistoricalData();
      }

      this.isInitialized = true;
      
      logger.info('analytics', 'AnalyticsCore initialization completed', {
        eventsLoaded: this.events.length,
        kpis: Array.from(this.kpiDefinitions.keys())
      }, { component: 'AnalyticsCore', function: 'initialize' });

    } catch (error) {
      logger.error('analytics', 'AnalyticsCore initialization failed', error as Error, {}, 
        { component: 'AnalyticsCore', function: 'initialize' });
      throw error;
    }
  }

  /**
   * Record an analytics event
   */
  recordEvent(event: AnalyticsEvent): void {
    if (!this.isInitialized) {
      logger.warn('analytics', 'Event recorded before initialization', { eventType: event.type });
    }

    this.events.push(event);

    // Maintain event buffer size
    if (this.events.length > this.config.batchSize * 10) {
      this.events = this.events.slice(-this.config.batchSize * 5);
    }

    // Persist event if enabled
    if (this.config.enablePersistence) {
      this.persistEvent(event).catch(error => {
        logger.error('analytics', 'Event persistence failed', error, { eventId: event.id });
      });
    }

    logger.debug('analytics', 'Analytics event recorded', {
      eventType: event.type,
      eventId: event.id,
      totalEvents: this.events.length
    }, { component: 'AnalyticsCore', function: 'recordEvent' });
  }

  /**
   * Get real-time dashboard data
   */
  getDashboard(timeWindow?: { start: Date; end: Date }): AnalyticsDashboard {
    const window = timeWindow || {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      end: new Date()
    };

    const windowEvents = this.getEventsInWindow(window.start, window.end);
    const kpis = this.calculateKPIs(windowEvents, window.end.getTime() - window.start.getTime());
    const insights = this.config.enableAutomatedInsights ? 
      this.generateInsights(windowEvents, kpis) : [];
    const recommendations = this.generateRecommendations(insights);

    const dashboard: AnalyticsDashboard = {
      generatedAt: new Date(),
      timeWindow: window,
      overview: this.calculateOverview(windowEvents),
      kpis,
      insights,
      recommendations,
      performance: {
        qualityGateScore: qualityGate.getMetrics().health.score,
        systemHealth: this.calculateSystemHealth(windowEvents),
        errorRate: this.calculateErrorRate(windowEvents)
      }
    };

    // Notify listeners
    this.notifyListeners(dashboard);

    return dashboard;
  }

  /**
   * Get KPI trend analysis
   */
  getKPITrends(kpiId: string, timeWindow: { start: Date; end: Date }): { timestamp: Date; value: number }[] {
    const history = this.kpiHistory.get(kpiId) || [];
    return history.filter(point => 
      point.timestamp >= timeWindow.start && 
      point.timestamp <= timeWindow.end
    );
  }

  /**
   * Export analytics data for external analysis
   */
  exportData(format: 'json' | 'csv' = 'json'): string {
    const exportData = {
      exportedAt: new Date().toISOString(),
      configuration: this.config,
      events: this.events.map(event => ({
        ...event,
        timestamp: event.timestamp.toISOString()
      })),
      kpis: Object.fromEntries(this.kpiDefinitions),
      kpiHistory: Object.fromEntries(
        Array.from(this.kpiHistory.entries()).map(([key, values]) => [
          key,
          values.map(v => ({ ...v, timestamp: v.timestamp.toISOString() }))
        ])
      )
    };

    if (format === 'json') {
      return JSON.stringify(exportData, null, 2);
    } else {
      return this.convertToCSV(exportData);
    }
  }

  /**
   * Add dashboard listener for real-time updates
   */
  addDashboardListener(listener: (dashboard: AnalyticsDashboard) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove dashboard listener
   */
  removeDashboardListener(listener: (dashboard: AnalyticsDashboard) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Add custom KPI definition
   */
  addKPI(kpi: KPIDefinition): void {
    this.kpiDefinitions.set(kpi.id, kpi);
    this.kpiHistory.set(kpi.id, []);

    logger.info('analytics', 'Custom KPI added', {
      kpiId: kpi.id,
      name: kpi.name
    }, { component: 'AnalyticsCore', function: 'addKPI' });
  }

  /**
   * Clean up old data and resources
   */
  async cleanup(): Promise<void> {
    // Remove old events
    const cutoffDate = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
    this.events = this.events.filter(event => event.timestamp >= cutoffDate);

    // Clean KPI history
    this.kpiHistory.forEach((history, kpiId) => {
      const filtered = history.filter(point => point.timestamp >= cutoffDate);
      this.kpiHistory.set(kpiId, filtered);
    });

    if (this.config.enablePersistence) {
      // Clean database
      try {
        await DatabaseService.cleanupOldData(this.config.retentionDays);
      } catch (error) {
        logger.error('analytics', 'Database cleanup failed', error as Error);
      }
    }

    logger.info('analytics', 'Analytics data cleanup completed', {
      eventsRemaining: this.events.length,
      cutoffDate: cutoffDate.toISOString()
    }, { component: 'AnalyticsCore', function: 'cleanup' });
  }

  /**
   * Destroy analytics core and cleanup resources
   */
  destroy(): void {
    if (this.calculateTimer) {
      clearInterval(this.calculateTimer);
      this.calculateTimer = null;
    }

    this.listeners = [];
    this.events = [];
    this.kpiHistory.clear();

    logger.info('analytics', 'AnalyticsCore destroyed', {}, 
      { component: 'AnalyticsCore', function: 'destroy' });
  }

  // Private implementation methods

  private initializeKPIs(): void {
    // Core Performance KPIs
    this.kpiDefinitions.set('session-duration', {
      id: 'session-duration',
      name: 'Average Session Duration',
      description: 'Average time users spend in active study sessions',
      unit: 'minutes',
      target: 30,
      warning: 15,
      critical: 10,
      calculation: (events, timeWindow) => {
        const sessions = this.extractSessions(events);
        const durations = sessions.map(s => (s.end - s.start) / (1000 * 60));
        return durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
      },
      trending: 'higher-better'
    });

    this.kpiDefinitions.set('moves-per-minute', {
      id: 'moves-per-minute',
      name: 'Moves Per Minute',
      description: 'Rate of chess moves made during active play',
      unit: 'moves/min',
      target: 2.0,
      warning: 1.0,
      critical: 0.5,
      calculation: (events, timeWindow) => {
        const moveEvents = events.filter(e => e.type === 'move_made');
        return (moveEvents.length / (timeWindow / (1000 * 60))) || 0;
      },
      trending: 'higher-better'
    });

    this.kpiDefinitions.set('sync-quality', {
      id: 'sync-quality',
      name: 'Video Sync Quality',
      description: 'Quality of video-board synchronization',
      unit: 'score',
      target: 95,
      warning: 85,
      critical: 70,
      calculation: (events, timeWindow) => {
        const syncEvents = events.filter(e => e.type === 'sync_quality_change');
        if (syncEvents.length === 0) return 100;
        const scores = syncEvents.map(e => e.data.qualityScore || 100);
        return scores.reduce((a, b) => a + b, 0) / scores.length;
      },
      trending: 'higher-better'
    });

    this.kpiDefinitions.set('error-rate', {
      id: 'error-rate',
      name: 'Error Rate',
      description: 'Percentage of actions resulting in errors',
      unit: '%',
      target: 1,
      warning: 5,
      critical: 10,
      calculation: (events, timeWindow) => {
        const totalEvents = events.length;
        const errorEvents = events.filter(e => e.type === 'error_occurred').length;
        return totalEvents > 0 ? (errorEvents / totalEvents) * 100 : 0;
      },
      trending: 'lower-better'
    });

    this.kpiDefinitions.set('learning-velocity', {
      id: 'learning-velocity',
      name: 'Learning Velocity',
      description: 'Rate of new chess concepts encountered',
      unit: 'concepts/hour',
      target: 5,
      warning: 2,
      critical: 1,
      calculation: (events, timeWindow) => {
        const conceptEvents = events.filter(e => e.type === 'pattern_recognized');
        const uniqueConcepts = new Set(conceptEvents.map(e => e.data.pattern)).size;
        return (uniqueConcepts / (timeWindow / (1000 * 60 * 60))) || 0;
      },
      trending: 'higher-better'
    });

    this.kpiDefinitions.set('user-engagement', {
      id: 'user-engagement',
      name: 'User Engagement',
      description: 'Overall user engagement score based on interaction patterns',
      unit: 'score',
      target: 80,
      warning: 60,
      critical: 40,
      calculation: (events, timeWindow) => {
        const totalEvents = events.length;
        const userEvents = events.filter(e => e.type === 'user_action').length;
        const sessionDuration = timeWindow / (1000 * 60); // minutes
        
        if (sessionDuration === 0) return 0;
        
        const eventsPerMinute = totalEvents / sessionDuration;
        const userInteractionRatio = userEvents / Math.max(totalEvents, 1);
        
        return Math.min((eventsPerMinute * 10 * userInteractionRatio), 100);
      },
      trending: 'higher-better'
    });

    logger.debug('analytics', 'KPI definitions initialized', {
      count: this.kpiDefinitions.size,
      kpis: Array.from(this.kpiDefinitions.keys())
    }, { component: 'AnalyticsCore', function: 'initializeKPIs' });
  }

  private startKPICalculation(): void {
    if (!this.config.enableRealTimeKPIs) return;

    this.calculateTimer = setInterval(() => {
      try {
        this.calculateAndStoreKPIs();
      } catch (error) {
        logger.error('analytics', 'KPI calculation failed', error as Error, {}, 
          { component: 'AnalyticsCore', function: 'startKPICalculation' });
      }
    }, this.config.kpiCalculationIntervalMs);
  }

  private calculateAndStoreKPIs(): void {
    const now = new Date();
    const timeWindow = this.config.kpiCalculationIntervalMs * 2; // Look back 2x the interval
    const windowEvents = this.getEventsInWindow(new Date(now.getTime() - timeWindow), now);

    this.kpiDefinitions.forEach((kpi, kpiId) => {
      try {
        const value = kpi.calculation(windowEvents, timeWindow);
        
        // Store in history
        let history = this.kpiHistory.get(kpiId) || [];
        history.push({ timestamp: now, value });
        
        // Keep last 1000 data points per KPI
        if (history.length > 1000) {
          history = history.slice(-1000);
        }
        
        this.kpiHistory.set(kpiId, history);

        logger.debug('analytics', 'KPI calculated and stored', {
          kpiId,
          value,
          timestamp: now.toISOString()
        }, { component: 'AnalyticsCore', function: 'calculateAndStoreKPIs' });

      } catch (error) {
        logger.error('analytics', 'Individual KPI calculation failed', error as Error, {
          kpiId,
          kpiName: kpi.name
        }, { component: 'AnalyticsCore', function: 'calculateAndStoreKPIs' });
      }
    });
  }

  private calculateKPIs(events: AnalyticsEvent[], timeWindow: number): KPIResult[] {
    const results: KPIResult[] = [];

    this.kpiDefinitions.forEach((kpi, kpiId) => {
      try {
        const currentValue = kpi.calculation(events, timeWindow);
        const history = this.kpiHistory.get(kpiId) || [];
        
        // Calculate status
        let status: KPIResult['status'] = 'excellent';
        if (kpi.trending === 'higher-better') {
          if (currentValue < kpi.critical) status = 'critical';
          else if (currentValue < kpi.warning) status = 'warning';
          else if (currentValue < kpi.target) status = 'good';
        } else {
          if (currentValue > kpi.critical) status = 'critical';
          else if (currentValue > kpi.warning) status = 'warning';
          else if (currentValue > kpi.target) status = 'good';
        }

        // Calculate trend
        let trend: KPIResult['trend'] = 'stable';
        let trendPercentage = 0;
        
        if (history.length >= 2) {
          const recent = history.slice(-5); // Last 5 data points
          const older = history.slice(-10, -5); // Previous 5 data points
          
          if (recent.length > 0 && older.length > 0) {
            const recentAvg = recent.reduce((a, b) => a + b.value, 0) / recent.length;
            const olderAvg = older.reduce((a, b) => a + b.value, 0) / older.length;
            
            if (olderAvg !== 0) {
              trendPercentage = ((recentAvg - olderAvg) / olderAvg) * 100;
              
              if (Math.abs(trendPercentage) < 5) {
                trend = 'stable';
              } else if (kpi.trending === 'higher-better') {
                trend = trendPercentage > 0 ? 'improving' : 'declining';
              } else {
                trend = trendPercentage < 0 ? 'improving' : 'declining';
              }
            }
          }
        }

        results.push({
          id: kpiId,
          name: kpi.name,
          value: currentValue,
          unit: kpi.unit,
          status,
          trend,
          trendPercentage,
          target: kpi.target,
          historicalData: [...history]
        });

      } catch (error) {
        logger.error('analytics', 'KPI result calculation failed', error as Error, {
          kpiId,
          kpiName: kpi.name
        }, { component: 'AnalyticsCore', function: 'calculateKPIs' });
      }
    });

    return results;
  }

  private generateInsights(events: AnalyticsEvent[], kpis: KPIResult[]): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];

    // Performance insights
    const criticalKPIs = kpis.filter(kpi => kpi.status === 'critical');
    if (criticalKPIs.length > 0) {
      insights.push({
        id: `insight-critical-${Date.now()}`,
        type: 'performance',
        priority: 'critical',
        title: 'Critical Performance Issues Detected',
        description: `${criticalKPIs.length} KPIs are in critical status and require immediate attention.`,
        data: { criticalKPIs: criticalKPIs.map(k => k.name) },
        confidence: 95,
        actionable: true,
        suggestedActions: [
          'Review system performance logs',
          'Check resource utilization',
          'Investigate user experience issues'
        ]
      });
    }

    // Learning velocity insights
    const learningVelocityKPI = kpis.find(kpi => kpi.id === 'learning-velocity');
    if (learningVelocityKPI && learningVelocityKPI.trend === 'declining') {
      insights.push({
        id: `insight-learning-${Date.now()}`,
        type: 'learning',
        priority: 'medium',
        title: 'Learning Velocity Declining',
        description: 'The rate of new concept discovery is decreasing, which may indicate a learning plateau.',
        data: { currentVelocity: learningVelocityKPI.value, trend: learningVelocityKPI.trendPercentage },
        confidence: 80,
        actionable: true,
        suggestedActions: [
          'Introduce more varied training content',
          'Increase difficulty level',
          'Focus on weaker areas identified in analysis'
        ]
      });
    }

    // Sync quality insights
    const syncQualityKPI = kpis.find(kpi => kpi.id === 'sync-quality');
    if (syncQualityKPI && syncQualityKPI.value < 90) {
      insights.push({
        id: `insight-sync-${Date.now()}`,
        type: 'quality',
        priority: 'high',
        title: 'Video Sync Quality Issues',
        description: 'Video-board synchronization quality is below optimal levels.',
        data: { syncScore: syncQualityKPI.value },
        confidence: 90,
        actionable: true,
        suggestedActions: [
          'Check video processing pipeline',
          'Verify network connectivity',
          'Review sync algorithm performance'
        ]
      });
    }

    // Usage pattern insights
    const moveEvents = events.filter(e => e.type === 'move_made');
    const hourlyDistribution = this.analyzeHourlyDistribution(moveEvents);
    const peakHour = hourlyDistribution.reduce((max, curr) => curr.count > max.count ? curr : max);
    
    if (peakHour.count > moveEvents.length * 0.3) {
      insights.push({
        id: `insight-usage-${Date.now()}`,
        type: 'usage',
        priority: 'low',
        title: 'Peak Usage Pattern Identified',
        description: `Most activity occurs around ${peakHour.hour}:00, representing ${((peakHour.count / moveEvents.length) * 100).toFixed(1)}% of moves.`,
        data: { peakHour: peakHour.hour, percentage: (peakHour.count / moveEvents.length) * 100 },
        confidence: 75,
        actionable: false
      });
    }

    return insights.filter(insight => insight.confidence >= this.config.insightConfidenceThreshold);
  }

  private generateRecommendations(insights: AnalyticsInsight[]): StudyRecommendation[] {
    const recommendations: StudyRecommendation[] = [];

    insights.forEach(insight => {
      if (insight.actionable && insight.suggestedActions) {
        recommendations.push({
          id: `rec-${insight.id}`,
          type: this.mapInsightTypeToRecommendationType(insight.type),
          priority: insight.priority,
          title: `Address: ${insight.title}`,
          description: insight.description,
          actionItems: insight.suggestedActions,
          expectedImpact: Math.min(insight.confidence, 90),
          estimatedTimeMinutes: this.estimateTimeForRecommendation(insight)
        });
      }
    });

    return recommendations;
  }

  private calculateOverview(events: AnalyticsEvent[]) {
    const sessions = this.extractSessions(events);
    const moveEvents = events.filter(e => e.type === 'move_made');
    const userActionEvents = events.filter(e => e.type === 'user_action');

    return {
      totalSessions: sessions.length,
      totalMoves: moveEvents.length,
      averageSessionDuration: sessions.length > 0 ? 
        sessions.reduce((acc, s) => acc + (s.end - s.start), 0) / sessions.length / (1000 * 60) : 0,
      userEngagement: userActionEvents.length > 0 ? 
        (userActionEvents.length / Math.max(events.length, 1)) * 100 : 0
    };
  }

  private calculateSystemHealth(events: AnalyticsEvent[]): number {
    const errorEvents = events.filter(e => e.type === 'error_occurred');
    const totalEvents = events.length;
    
    if (totalEvents === 0) return 100;
    
    const errorRate = (errorEvents.length / totalEvents) * 100;
    return Math.max(0, 100 - errorRate * 10); // Each 1% error reduces health by 10 points
  }

  private calculateErrorRate(events: AnalyticsEvent[]): number {
    const errorEvents = events.filter(e => e.type === 'error_occurred');
    const totalEvents = events.length;
    
    return totalEvents > 0 ? (errorEvents.length / totalEvents) * 100 : 0;
  }

  private getEventsInWindow(start: Date, end: Date): AnalyticsEvent[] {
    return this.events.filter(event => 
      event.timestamp >= start && event.timestamp <= end
    );
  }

  private extractSessions(events: AnalyticsEvent[]): { start: number; end: number }[] {
    // Simple session extraction based on time gaps
    const sessions: { start: number; end: number }[] = [];
    let currentSession: { start: number; end: number } | null = null;
    const SESSION_GAP_MS = 30 * 60 * 1000; // 30 minutes

    events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    events.forEach(event => {
      const eventTime = event.timestamp.getTime();
      
      if (!currentSession) {
        currentSession = { start: eventTime, end: eventTime };
      } else if (eventTime - currentSession.end > SESSION_GAP_MS) {
        sessions.push(currentSession);
        currentSession = { start: eventTime, end: eventTime };
      } else {
        currentSession.end = eventTime;
      }
    });

    if (currentSession) {
      sessions.push(currentSession);
    }

    return sessions;
  }

  private analyzeHourlyDistribution(events: AnalyticsEvent[]): { hour: number; count: number }[] {
    const distribution = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
    
    events.forEach(event => {
      const hour = event.timestamp.getHours();
      distribution[hour].count++;
    });

    return distribution;
  }

  private mapInsightTypeToRecommendationType(insightType: string): StudyRecommendation['type'] {
    switch (insightType) {
      case 'learning': return 'tactical';
      case 'performance': return 'time-management';
      case 'quality': return 'tactical';
      default: return 'positional';
    }
  }

  private estimateTimeForRecommendation(insight: AnalyticsInsight): number {
    switch (insight.priority) {
      case 'critical': return 60;
      case 'high': return 30;
      case 'medium': return 15;
      case 'low': return 10;
      default: return 15;
    }
  }

  private async loadHistoricalData(): Promise<void> {
    // In production, would load from database
    logger.debug('analytics', 'Loading historical analytics data', {}, 
      { component: 'AnalyticsCore', function: 'loadHistoricalData' });
  }

  private async persistEvent(event: AnalyticsEvent): Promise<void> {
    // In production, would persist to database
    logger.debug('analytics', 'Persisting analytics event', { eventId: event.id }, 
      { component: 'AnalyticsCore', function: 'persistEvent' });
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion - in production would use proper library
    const events = data.events;
    if (events.length === 0) return 'No data available';
    
    const headers = Object.keys(events[0]).join(',');
    const rows = events.map((event: any) => Object.values(event).join(','));
    
    return [headers, ...rows].join('\n');
  }

  private notifyListeners(dashboard: AnalyticsDashboard): void {
    this.listeners.forEach(listener => {
      try {
        listener(dashboard);
      } catch (error) {
        logger.error('analytics', 'Dashboard listener failed', error as Error, {}, 
          { component: 'AnalyticsCore', function: 'notifyListeners' });
      }
    });
  }
}

// Export singleton instance
let analyticsCore: AnalyticsCore | null = null;

export const getAnalyticsCore = (config?: Partial<AnalyticsCoreConfig>): AnalyticsCore => {
  if (!analyticsCore) {
    analyticsCore = new AnalyticsCore(config);
  }
  return analyticsCore;
};

export default AnalyticsCore;