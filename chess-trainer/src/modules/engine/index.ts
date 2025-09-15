/**
 * ♔ ENTERPRISE STOCKFISH ENGINE MODULE
 * 
 * Professional chess engine integration providing comprehensive analysis,
 * performance monitoring, and educational insights for training applications.
 * 
 * This module exports a complete engine system with:
 * - StockfishEngine: Core WebWorker-based engine wrapper
 * - EngineManager: Pool management with load balancing and failover  
 * - EngineAnalyzer: High-level analysis with educational context
 * - Performance monitoring and quality gate integration
 * 
 * Usage:
 * ```typescript
 * import { createEngineSystem, EngineAnalyzer } from './modules/engine';
 * 
 * const engineSystem = await createEngineSystem();
 * const analysis = await engineSystem.analyzer.analyzePosition(fen, context);
 * ```
 */

// Core engine exports
export { default as StockfishEngine } from './StockfishEngine';
export { default as EngineManager } from './EngineManager';
export { default as EngineAnalyzer } from './EngineAnalyzer';

// Type exports for external consumption
export type {
  StockfishConfig,
  UCICommand,
  EvaluationUpdate,
  EngineState,
  EngineEventListeners
} from './StockfishEngine';

export type {
  EnginePoolConfig,
  AnalysisRequest,
  PoolMetrics,
  PoolEventListeners
} from './EngineManager';

export type {
  AnalysisContext,
  PositionAnalysis,
  TacticalThreat,
  TacticalOpportunity,
  TacticalPattern,
  StrategicTheme,
  PawnStructureAnalysis,
  KingSafetyAnalysis,
  PieceActivityAnalysis,
  MoveRecommendation,
  MoveQualityAssessment
} from './EngineAnalyzer';

import EngineManager from './EngineManager';
import EngineAnalyzer from './EngineAnalyzer';
import type { StockfishConfig, EnginePoolConfig, AnalysisContext } from './index';
import { qualityGate } from '../../utils/QualityGate';
import logger from '../../utils/Logger';

/**
 * Complete engine system configuration
 */
export interface EngineSystemConfig {
  // Engine Configuration
  engine?: Partial<StockfishConfig>;
  
  // Pool Configuration  
  pool?: Partial<EnginePoolConfig>;
  
  // System Settings
  enableAnalytics: boolean;
  enableCaching: boolean;
  maxCacheSize: number;        // MB
  
  // Quality Settings
  performanceMonitoring: boolean;
  qualityThresholds: {
    maxInitTimeMs: number;
    maxResponseTimeMs: number;
    minAccuracy: number;
  };
}

/**
 * Integrated engine system with all components
 */
export interface EngineSystem {
  manager: EngineManager;
  analyzer: EngineAnalyzer;
  
  // System methods
  isInitialized: boolean;
  initialize(): Promise<void>;
  getMetrics(): EngineSystemMetrics;
  dispose(): Promise<void>;
}

/**
 * System-wide metrics
 */
export interface EngineSystemMetrics {
  pool: ReturnType<EngineManager['getPoolMetrics']>;
  performance: {
    totalAnalyses: number;
    averageResponseTime: number;
    successRate: number;
    uptime: number;
  };
  quality: {
    healthScore: number;
    performanceScore: number;
    reliabilityScore: number;
  };
}

/**
 * ENTERPRISE FACTORY: Create complete engine system
 * 
 * This factory creates and configures a complete enterprise-grade engine system
 * with monitoring, quality gates, and comprehensive error handling.
 */
export async function createEngineSystem(
  config: Partial<EngineSystemConfig> = {}
): Promise<EngineSystem> {
  const startTime = performance.now();
  
  const systemConfig: EngineSystemConfig = {
    // Default engine config
    engine: {
      depth: 15,
      threads: 1,
      hash: 16,
      maxAnalysisTimeMs: 5000,
      progressiveDepth: true,
      cacheSize: 32,
      enableTablebase: false,
      workerPath: '/stockfish/stockfish.js',
      ...config.engine
    },
    
    // Default pool config
    pool: {
      initialPoolSize: 2,
      maxPoolSize: 4,
      minPoolSize: 1,
      loadBalancingStrategy: 'least-busy',
      maxConcurrentAnalyses: 3,
      adaptiveScaling: true,
      performanceTarget: 200,
      enableDetailedMetrics: true,
      ...config.pool
    },
    
    // Default system config
    enableAnalytics: true,
    enableCaching: true,
    maxCacheSize: 64,
    performanceMonitoring: true,
    qualityThresholds: {
      maxInitTimeMs: 3000,
      maxResponseTimeMs: 500,
      minAccuracy: 0.95
    },
    
    ...config
  };

  logger.info('engine-system', 'Creating enterprise engine system', { 
    config: systemConfig 
  }, { 
    component: 'EngineSystem', 
    function: 'createEngineSystem' 
  });

  try {
    // Create engine manager
    const manager = new EngineManager(systemConfig.pool);
    
    // Create analyzer
    const analyzer = new EngineAnalyzer(manager);

    // Performance tracking
    let totalAnalyses = 0;
    let successfulAnalyses = 0;
    let totalResponseTime = 0;
    const systemStartTime = Date.now();

    // Create integrated system
    const engineSystem: EngineSystem = {
      manager,
      analyzer,
      isInitialized: false,

      async initialize(): Promise<void> {
        const initStartTime = performance.now();
        
        logger.info('engine-system', 'Initializing engine system', {}, { 
          component: 'EngineSystem', 
          function: 'initialize' 
        });

        try {
          // Initialize manager
          await manager.initialize();
          
          // Set up performance monitoring
          if (systemConfig.performanceMonitoring) {
            manager.setListeners({
              onEngineAdded: (engineId) => {
                logger.debug('engine-system', 'Engine added to system', { engineId });
              },
              onEngineRemoved: (engineId, reason) => {
                logger.warn('engine-system', 'Engine removed from system', { engineId, reason });
              },
              onPerformanceAlert: (metric, value, threshold) => {
                logger.warn('engine-system', 'Performance threshold exceeded', { 
                  metric, value, threshold 
                });
                qualityGate.recordIssue('warning', `Engine ${metric} exceeded threshold: ${value} > ${threshold}`);
              }
            });
          }

          const initTime = performance.now() - initStartTime;
          
          // Check quality thresholds
          if (initTime > systemConfig.qualityThresholds.maxInitTimeMs) {
            qualityGate.recordIssue('warning', 
              `Engine system initialization exceeded threshold: ${initTime}ms > ${systemConfig.qualityThresholds.maxInitTimeMs}ms`
            );
          }

          this.isInitialized = true;
          qualityGate.recordPerformance('engineSystemInitMs', initTime);
          
          logger.info('engine-system', 'Engine system initialized successfully', { 
            initTimeMs: initTime,
            poolSize: manager.getPoolMetrics().totalEngines 
          }, { 
            component: 'EngineSystem', 
            function: 'initialize' 
          });

        } catch (error) {
          const errorObj = error instanceof Error ? error : new Error(String(error));
          qualityGate.recordError(errorObj, 'critical');
          logger.error('engine-system', 'Failed to initialize engine system', errorObj, {}, { 
            component: 'EngineSystem', 
            function: 'initialize' 
          });
          throw error;
        }
      },

      getMetrics(): EngineSystemMetrics {
        const poolMetrics = manager.getPoolMetrics();
        const uptime = Date.now() - systemStartTime;
        
        return {
          pool: poolMetrics,
          performance: {
            totalAnalyses,
            averageResponseTime: totalAnalyses > 0 ? totalResponseTime / totalAnalyses : 0,
            successRate: totalAnalyses > 0 ? successfulAnalyses / totalAnalyses : 1,
            uptime
          },
          quality: {
            healthScore: poolMetrics.performanceScore,
            performanceScore: Math.max(0, 100 - (poolMetrics.averageResponseTime - systemConfig.qualityThresholds.maxResponseTimeMs) / 10),
            reliabilityScore: Math.max(0, 100 - poolMetrics.errorRate * 100)
          }
        };
      },

      async dispose(): Promise<void> {
        logger.info('engine-system', 'Disposing engine system', {}, { 
          component: 'EngineSystem', 
          function: 'dispose' 
        });

        try {
          await analyzer.dispose();
          this.isInitialized = false;
          
          logger.info('engine-system', 'Engine system disposed successfully', {}, { 
            component: 'EngineSystem', 
            function: 'dispose' 
          });
        } catch (error) {
          const errorObj = error instanceof Error ? error : new Error(String(error));
          logger.error('engine-system', 'Error during engine system disposal', errorObj, {}, { 
            component: 'EngineSystem', 
            function: 'dispose' 
          });
          throw error;
        }
      }
    };

    const totalInitTime = performance.now() - startTime;
    
    logger.info('engine-system', 'Engine system factory completed', { 
      totalInitTimeMs: totalInitTime 
    }, { 
      component: 'EngineSystem', 
      function: 'createEngineSystem' 
    });

    return engineSystem;

  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    qualityGate.recordError(errorObj, 'critical');
    logger.error('engine-system', 'Engine system creation failed', errorObj, {}, { 
      component: 'EngineSystem', 
      function: 'createEngineSystem' 
    });
    throw error;
  }
}

/**
 * ENTERPRISE UTILITY: Quick analysis helper
 * 
 * Simplified interface for common analysis tasks without managing the full system.
 */
export async function quickAnalysis(
  fen: string,
  context: AnalysisContext,
  options?: {
    depth?: number;
    timeLimit?: number;
    multiPV?: number;
  }
): Promise<ReturnType<EngineAnalyzer['analyzePosition']>> {
  
  const system = await createEngineSystem({
    engine: {
      depth: options?.depth || 12,
      maxAnalysisTimeMs: options?.timeLimit || 3000
    },
    pool: {
      initialPoolSize: 1,
      maxPoolSize: 1
    }
  });

  try {
    await system.initialize();
    const result = await system.analyzer.analyzePosition(fen, context, {
      depth: options?.depth,
      multiPV: options?.multiPV
    });
    return result;
  } finally {
    await system.dispose();
  }
}

/**
 * ENTERPRISE UTILITY: Batch analysis for multiple positions
 */
export async function batchAnalysis(
  positions: Array<{ fen: string; context: AnalysisContext }>,
  options?: {
    concurrency?: number;
    depth?: number;
    timeLimit?: number;
  }
): Promise<Array<ReturnType<EngineAnalyzer['analyzePosition']>>> {
  
  const concurrency = options?.concurrency || 2;
  
  const system = await createEngineSystem({
    engine: {
      depth: options?.depth || 12,
      maxAnalysisTimeMs: options?.timeLimit || 3000
    },
    pool: {
      initialPoolSize: concurrency,
      maxPoolSize: concurrency,
      loadBalancingStrategy: 'round-robin'
    }
  });

  try {
    await system.initialize();
    
    // Process in batches to respect concurrency limits
    const results: Array<ReturnType<EngineAnalyzer['analyzePosition']>> = [];
    
    for (let i = 0; i < positions.length; i += concurrency) {
      const batch = positions.slice(i, i + concurrency);
      
      const batchPromises = batch.map(({ fen, context }) =>
        system.analyzer.analyzePosition(fen, context, {
          depth: options?.depth
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
    
  } finally {
    await system.dispose();
  }
}

/**
 * ENTERPRISE CONSTANT: Default analysis contexts for common use cases
 */
export const DEFAULT_CONTEXTS = {
  TRAINING_BEGINNER: {
    purpose: 'training',
    playerLevel: 'beginner',
    focus: 'general'
  } as AnalysisContext,
  
  TRAINING_INTERMEDIATE: {
    purpose: 'training', 
    playerLevel: 'intermediate',
    focus: 'tactical'
  } as AnalysisContext,
  
  PUZZLE_SOLVING: {
    purpose: 'puzzle',
    playerLevel: 'intermediate', 
    focus: 'tactical'
  } as AnalysisContext,
  
  GAME_REVIEW: {
    purpose: 'review',
    playerLevel: 'intermediate',
    focus: 'general'
  } as AnalysisContext,
  
  POSITION_STUDY: {
    purpose: 'study',
    playerLevel: 'advanced',
    focus: 'positional'
  } as AnalysisContext
};

// Default export for convenience
export default createEngineSystem;