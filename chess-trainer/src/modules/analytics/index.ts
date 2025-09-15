/**
 * ♔ ENTERPRISE ANALYTICS MODULE
 * 
 * Complete analytics solution with move history, KPI tracking,
 * real-time insights, ML-powered analysis, and comprehensive reporting.
 * 
 * Export Structure:
 * - MoveHistoryManager: Real-time move analysis and history tracking
 * - AnalyticsCore: KPI calculations and dashboard generation  
 * - AdvancedInsightsEngine: ML-powered insights and predictions
 * - Factory functions for easy instantiation
 * - Type definitions for comprehensive type safety
 */

// Core Classes
export { MoveHistoryManager, createMoveHistoryManager } from './MoveHistoryManager';
export { AnalyticsCore, getAnalyticsCore } from './AnalyticsCore';
export { default as AdvancedInsightsEngine } from './AdvancedInsightsEngine';

// Type Re-exports for convenience
export type {
  MoveHistoryEntry,
  GameAnalytics,
  StudyAnalytics,
  AnalyticsEvent,
  AnalyticsEventType,
  MoveClassification,
  MoveComplexity,
  PieceAnalysis,
  VideoSyncIntegration,
  StudyRecommendation,
  AnalyticsInsight,
  KPIDefinition,
  KPIResult,
  AnalyticsDashboard
} from '../../types';

// Advanced Analytics Types
export type {
  InsightsEngineConfig,
  SkillAssessment,
  SkillMetric,
  PredictiveInsight,
  PredictionOutcome,
  BehavioralPattern,
  AnomalyDetection
} from './AdvancedInsightsEngine';

// Configuration Types
export type { MoveHistoryManagerConfig } from './MoveHistoryManager';
export type { AnalyticsCoreConfig } from './AnalyticsCore';

import { MoveHistoryManager, createMoveHistoryManager } from './MoveHistoryManager';
import { AnalyticsCore, getAnalyticsCore } from './AnalyticsCore';
import AdvancedInsightsEngine from './AdvancedInsightsEngine';
import type { IGameAPI } from '../../core/game-api';
import type { 
  SkillAssessment, 
  PredictiveInsight, 
  BehavioralPattern,
  InsightsEngineConfig
} from './AdvancedInsightsEngine';
import logger from '../../utils/Logger';
import { qualityGate } from '../../utils/QualityGate';

/**
 * Enhanced Integrated Analytics System with ML capabilities
 */
export interface IntegratedAnalyticsSystem {
  moveHistory: MoveHistoryManager;
  analytics: AnalyticsCore;
  insights: AdvancedInsightsEngine;
  
  // Lifecycle
  initialize(): Promise<void>;
  destroy(): void;
  
  // Advanced Analytics
  getSkillAssessment(sessionId: string): Promise<SkillAssessment>;
  getPredictiveInsights(sessionId: string): Promise<PredictiveInsight[]>;
  getBehavioralAnalysis(sessionId: string): Promise<BehavioralPattern>;
  
  // Real-time Updates
  onAnalyticsUpdate(callback: (data: any) => void): void;
  offAnalyticsUpdate(callback: (data: any) => void): void;
}

export const createIntegratedAnalytics = async (
  gameAPI: IGameAPI,
  config?: {
    moveHistory?: Partial<import('./MoveHistoryManager').MoveHistoryManagerConfig>;
    analytics?: Partial<import('./AnalyticsCore').AnalyticsCoreConfig>;
    insights?: Partial<InsightsEngineConfig>;
    enableMLInsights?: boolean;
  }
): Promise<IntegratedAnalyticsSystem> => {
  const startTime = performance.now();
  
  try {
    logger.info('analytics', 'Creating enhanced integrated analytics system', {
      config,
      mlEnabled: config?.enableMLInsights ?? true
    }, { component: 'AnalyticsModule', function: 'createIntegratedAnalytics' });

    const moveHistory = createMoveHistoryManager(gameAPI, config?.moveHistory);
    const analytics = getAnalyticsCore(config?.analytics);
    const insights = new AdvancedInsightsEngine(config?.insights);
    
    const updateCallbacks: ((data: any) => void)[] = [];

    // Set up integration between components
    moveHistory.addListener({
      onAnalyticsEvent: (event) => {
        analytics.recordEvent(event);
      },
      onHistoryUpdate: (history) => {
        // Trigger ML model updates if enabled
        if (config?.enableMLInsights !== false && history.length > 0) {
          // Could schedule model retraining
        }
      },
      onStatsUpdate: (stats) => {
        // Trigger real-time dashboard updates
        updateCallbacks.forEach(callback => {
          try {
            callback({ type: 'stats_update', stats });
          } catch (error) {
            logger.error('analytics', 'Update callback failed', error, {}, 
              { component: 'AnalyticsModule', function: 'onStatsUpdate' });
          }
        });
      }
    });

    const system: IntegratedAnalyticsSystem = {
      moveHistory,
      analytics,
      insights,
      
      async initialize() {
        const initStartTime = performance.now();
        
        // Initialize all components in parallel
        await Promise.all([
          analytics.initialize(),
          config?.enableMLInsights !== false ? insights.initialize() : Promise.resolve()
        ]);
        
        const initTime = performance.now() - initStartTime;
        qualityGate.recordPerformance('analyticsSystemInitMs', initTime);
        
        logger.info('analytics', 'Enhanced integrated analytics system initialized', {
          moveHistoryReady: true,
          analyticsReady: true,
          insightsReady: config?.enableMLInsights !== false,
          initTimeMs: initTime
        }, { component: 'AnalyticsModule', function: 'initialize' });
      },

      destroy() {
        moveHistory.destroy();
        analytics.destroy();
        insights.dispose();
        updateCallbacks.length = 0;
        
        logger.info('analytics', 'Enhanced integrated analytics system destroyed', {}, 
          { component: 'AnalyticsModule', function: 'destroy' });
      },
      
      async getSkillAssessment(sessionId: string): Promise<SkillAssessment> {
        const history = moveHistory.getHistory();
        const gameAnalytics = moveHistory.getCurrentAnalytics();
        return await insights.assessPlayerSkill(sessionId, history, gameAnalytics);
      },
      
      async getPredictiveInsights(sessionId: string): Promise<PredictiveInsight[]> {
        const skillAssessment = await this.getSkillAssessment(sessionId);
        const studyAnalytics = moveHistory.getStudyAnalytics('board-demo');
        return await insights.generatePredictiveInsights(sessionId, skillAssessment, studyAnalytics);
      },
      
      async getBehavioralAnalysis(sessionId: string): Promise<BehavioralPattern> {
        const history = moveHistory.getHistory();
        const gameAnalytics = moveHistory.getCurrentAnalytics();
        return await insights.analyzeBehavioralPatterns(sessionId, history, gameAnalytics);
      },
      
      onAnalyticsUpdate(callback: (data: any) => void): void {
        updateCallbacks.push(callback);
      },
      
      offAnalyticsUpdate(callback: (data: any) => void): void {
        const index = updateCallbacks.indexOf(callback);
        if (index > -1) {
          updateCallbacks.splice(index, 1);
        }
      }
    };
    
    const totalTime = performance.now() - startTime;
    qualityGate.recordPerformance('createIntegratedAnalyticsMs', totalTime);

    logger.info('analytics', 'Enhanced integrated analytics system created successfully', {
      totalTimeMs: totalTime,
      mlEnabled: config?.enableMLInsights !== false
    }, { component: 'AnalyticsModule', function: 'createIntegratedAnalytics' });

    return system;
    
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    qualityGate.recordError(errorObj, 'critical');
    
    logger.error('analytics', 'Failed to create enhanced integrated analytics system', errorObj, {}, 
      { component: 'AnalyticsModule', function: 'createIntegratedAnalytics' });
    
    throw error;
  }
};

// Convenience exports
export default {
  MoveHistoryManager,
  AnalyticsCore,
  AdvancedInsightsEngine,
  createMoveHistoryManager,
  getAnalyticsCore,
  createIntegratedAnalytics
};