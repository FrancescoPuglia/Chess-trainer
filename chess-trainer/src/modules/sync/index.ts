/**
 * ♔ ENTERPRISE SYNC MODULE
 * 
 * Complete video synchronization solution with advanced algorithms,
 * adaptive quality control, and sub-100ms precision guarantee.
 * 
 * Export Structure:
 * - SyncManager: Base synchronization with binary search algorithm
 * - PredictiveSync: ML-enhanced predictive synchronization
 * - AdaptiveQualityController: Intelligent quality management
 * - Comprehensive type definitions and configuration options
 */

// Core Sync Classes
export { default as SyncManager } from './SyncManager';
export { default as PredictiveSync } from './PredictiveSync';  
export { default as AdaptiveQualityController, QualityLevel } from './AdaptiveQualityController';

// Configuration Types
export type { 
  SyncManagerConfig,
  SyncStats 
} from './SyncManager';

export type { 
  PredictiveSyncConfig
} from './PredictiveSync';

export type { 
  QualityConfig,
  SystemMetrics,
  QualityStrategy
} from './AdaptiveQualityController';

// Enhanced sync integration factory
import { SyncManager, type SyncManagerConfig } from './SyncManager';
import PredictiveSync, { type PredictiveSyncConfig } from './PredictiveSync';
import AdaptiveQualityController, { 
  type QualityConfig, 
  QualityLevel 
} from './AdaptiveQualityController';
import logger from '../../utils/Logger';
import { qualityGate } from '../../utils/QualityGate';

/**
 * Enhanced sync system configuration
 */
export interface EnhancedSyncConfig {
  // Base sync settings
  baseSync?: Partial<SyncManagerConfig>;
  
  // Predictive sync settings  
  predictiveSync?: Partial<PredictiveSyncConfig>;
  
  // Quality control settings
  qualityControl?: {
    initialLevel?: QualityLevel;
    enableAdaptation?: boolean;
    adaptationInterval?: number;
  };
  
  // Integration settings
  enablePredictiveSync?: boolean;
  enableQualityControl?: boolean;
  enablePerformanceMonitoring?: boolean;
}

/**
 * Complete sync system with all enhancements
 */
export interface EnhancedSyncSystem {
  // Core components
  syncManager: SyncManager | PredictiveSync;
  qualityController: AdaptiveQualityController;
  
  // Lifecycle methods
  initialize(): Promise<void>;
  destroy(): void;
  
  // Sync operations
  fenForTime(timestamp: number): string;
  timeForFen(fen: string): number | undefined;
  setSyncPoints(points: import('../../types').VideoSyncPoint[]): void;
  
  // Enhanced operations
  predictUpcomingPositions(timestamp: number, lookahead?: number): Promise<void>;
  seekWithSubFramePrecision(timestamp: number, targetFen?: string): Promise<boolean>;
  adaptQuality(forceAdaptation?: boolean): Promise<void>;
  
  // Monitoring
  getStats(): import('./SyncManager').SyncStats;
  getPredictiveMetrics?(): any;
  getQualityAnalytics(): any;
  
  // Event handling
  onQualityChange(callback: (config: QualityConfig) => void): void;
  onSyncUpdate(callback: (stats: any) => void): void;
}

/**
 * Create enhanced sync system with all components
 */
export const createEnhancedSyncSystem = async (
  config: EnhancedSyncConfig = {}
): Promise<EnhancedSyncSystem> => {
  const startTime = performance.now();
  
  try {
    logger.info('sync', 'Creating enhanced sync system', {
      config,
      predictiveEnabled: config.enablePredictiveSync ?? true,
      qualityControlEnabled: config.enableQualityControl ?? true
    }, { component: 'SyncModule', function: 'createEnhancedSyncSystem' });

    // Create sync manager (predictive or base)
    const syncManager = config.enablePredictiveSync !== false
      ? new PredictiveSync(config.predictiveSync)
      : new SyncManager(config.baseSync);

    // Create quality controller
    const qualityController = new AdaptiveQualityController(
      config.qualityControl?.initialLevel ?? QualityLevel.HIGH
    );

    // Event callbacks
    const qualityCallbacks: Array<(config: QualityConfig) => void> = [];
    const syncCallbacks: Array<(stats: any) => void> = [];

    const system: EnhancedSyncSystem = {
      syncManager,
      qualityController,
      
      async initialize() {
        const initStartTime = performance.now();
        
        // Start quality adaptation if enabled
        if (config.enableQualityControl !== false) {
          qualityController.startAdaptation((newConfig) => {
            qualityCallbacks.forEach(callback => {
              try {
                callback(newConfig);
              } catch (error) {
                logger.error('sync', 'Quality change callback failed', error, {}, 
                  { component: 'SyncModule', function: 'onQualityChange' });
              }
            });
          });
        }
        
        const initTime = performance.now() - initStartTime;
        qualityGate.recordPerformance('enhancedSyncInitMs', initTime);
        
        logger.info('sync', 'Enhanced sync system initialized', {
          syncManagerType: syncManager.constructor.name,
          qualityControlEnabled: config.enableQualityControl !== false,
          initTimeMs: initTime
        }, { component: 'SyncModule', function: 'initialize' });
      },
      
      destroy() {
        qualityController.stopAdaptation();
        syncManager.destroy();
        qualityCallbacks.length = 0;
        syncCallbacks.length = 0;
        
        logger.info('sync', 'Enhanced sync system destroyed', {}, 
          { component: 'SyncModule', function: 'destroy' });
      },
      
      fenForTime(timestamp: number): string {
        const startTime = performance.now();
        const result = syncManager.fenForTime(timestamp);
        
        if (config.enablePerformanceMonitoring !== false) {
          const duration = performance.now() - startTime;
          qualityGate.recordPerformance('syncFenForTimeMs', duration);
          
          // Trigger sync callbacks
          syncCallbacks.forEach(callback => {
            try {
              callback({ type: 'fen_update', timestamp, fen: result, duration });
            } catch (error) {
              logger.error('sync', 'Sync update callback failed', error, {}, 
                { component: 'SyncModule', function: 'fenForTime' });
            }
          });
        }
        
        return result;
      },
      
      timeForFen(fen: string): number | undefined {
        return syncManager.timeForFen(fen);
      },
      
      setSyncPoints(points: import('../../types').VideoSyncPoint[]): void {
        syncManager.setSyncPoints(points);
      },
      
      async predictUpcomingPositions(timestamp: number, lookahead = 500): Promise<void> {
        if (syncManager instanceof PredictiveSync) {
          await syncManager.predictUpcomingPositions(timestamp, lookahead);
        }
      },
      
      async seekWithSubFramePrecision(timestamp: number, targetFen?: string): Promise<boolean> {
        if (syncManager instanceof PredictiveSync) {
          return await syncManager.seekWithSubFramePrecision(timestamp, targetFen);
        }
        return false;
      },
      
      async adaptQuality(forceAdaptation = false): Promise<void> {
        await qualityController.adaptQuality(forceAdaptation);
      },
      
      getStats() {
        return syncManager.getStats();
      },
      
      getPredictiveMetrics() {
        return syncManager instanceof PredictiveSync 
          ? syncManager.getPredictiveMetrics()
          : undefined;
      },
      
      getQualityAnalytics() {
        return qualityController.getAnalytics();
      },
      
      onQualityChange(callback: (config: QualityConfig) => void): void {
        qualityCallbacks.push(callback);
      },
      
      onSyncUpdate(callback: (stats: any) => void): void {
        syncCallbacks.push(callback);
      }
    };
    
    const totalTime = performance.now() - startTime;
    qualityGate.recordPerformance('createEnhancedSyncMs', totalTime);
    
    logger.info('sync', 'Enhanced sync system created successfully', {
      totalTimeMs: totalTime,
      components: {
        syncManager: syncManager.constructor.name,
        qualityController: 'AdaptiveQualityController'
      }
    }, { component: 'SyncModule', function: 'createEnhancedSyncSystem' });
    
    return system;
    
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    qualityGate.recordError(errorObj, 'critical');
    
    logger.error('sync', 'Failed to create enhanced sync system', errorObj, {}, 
      { component: 'SyncModule', function: 'createEnhancedSyncSystem' });
    
    throw error;
  }
};

// Convenience exports
export default {
  SyncManager,
  PredictiveSync,
  AdaptiveQualityController,
  QualityLevel,
  createEnhancedSyncSystem
};