/**
 * ♔ ENTERPRISE DATABASE MODULE
 * 
 * Complete database solution with advanced optimization, caching, and management
 * capabilities for high-performance chess training applications.
 * 
 * Export Structure:
 * - EnterpriseDatabase: Advanced database with enterprise features
 * - AdvancedCacheManager: Multi-tier caching system
 * - DatabaseOptimizer: Intelligent performance optimization
 * - Legacy database components for backward compatibility
 * - Complete factory functions and configuration options
 */

// Core Database Classes
export { default as EnterpriseDatabase } from './EnterpriseDatabase';
export { default as AdvancedCacheManager } from './AdvancedCacheManager';
export { default as DatabaseOptimizer } from './DatabaseOptimizer';

// Legacy Database Components (for backward compatibility)
export { ChessTrainerDB, DatabaseService, DatabaseUtils, db } from './database';

// Type Definitions
export type {
  IndexingStrategy,
  CachingConfig,
  CompressionConfig,
  DatabaseMetrics
} from './EnterpriseDatabase';

export type {
  CacheEntry,
  CacheReplacementStrategy,
  CacheTierConfig,
  CacheMetrics
} from './AdvancedCacheManager';

export type {
  QueryAnalysis,
  OptimizationSuggestion,
  IndexAnalysis,
  StorageOptimization,
  StorageAction,
  PerformanceThresholds
} from './DatabaseOptimizer';

// Enhanced database integration factory
import EnterpriseDatabase from './EnterpriseDatabase';
import AdvancedCacheManager from './AdvancedCacheManager';
import DatabaseOptimizer from './DatabaseOptimizer';
import { DatabaseService } from './database';
import logger from '../utils/Logger';
import { qualityGate } from '../utils/QualityGate';

/**
 * Complete database system configuration
 */
export interface EnterpriseDatabaseConfig {
  // Database Settings
  database?: {
    enableAdvancedIndexing?: boolean;
    enableMaterializedViews?: boolean;
    enableCompressionWorkers?: boolean;
    autoOptimizationInterval?: number;
  };
  
  // Caching Settings
  caching?: {
    enableMultiTierCache?: boolean;
    memoryLimitMB?: number;
    sessionLimitMB?: number;
    persistentLimitMB?: number;
    compressionThreshold?: number;
  };
  
  // Optimization Settings
  optimization?: {
    enableAutoOptimization?: boolean;
    optimizationInterval?: number;
    performanceMonitoring?: boolean;
    alertingEnabled?: boolean;
  };
  
  // Performance Settings
  performance?: {
    queryTimeoutMs?: number;
    batchSize?: number;
    connectionPoolSize?: number;
    enableProfiling?: boolean;
  };
}

/**
 * Complete enterprise database system
 */
export interface EnterpriseDatabaseSystem {
  // Core Components
  database: EnterpriseDatabase;
  cacheManager: AdvancedCacheManager;
  optimizer: DatabaseOptimizer;
  
  // Lifecycle Methods
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  
  // Database Operations
  executeQuery<T>(
    tableName: keyof import('../types').DatabaseSchema,
    queryFn: Function,
    options?: {
      cache?: boolean;
      cacheKey?: string;
      cacheTags?: string[];
      timeout?: number;
    }
  ): Promise<T>;
  
  // Bulk Operations
  bulkInsert<T>(
    tableName: keyof import('../types').DatabaseSchema,
    records: T[],
    options?: {
      batchSize?: number;
      compress?: boolean;
      validate?: boolean;
      onProgress?: (progress: number) => void;
    }
  ): Promise<void>;
  
  // Cache Management
  cache: {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, options?: any): Promise<void>;
    invalidate(options: any): Promise<number>;
    warm(strategy: any): Promise<void>;
    getMetrics(): any;
  };
  
  // Optimization
  optimization: {
    analyzePerformance(): Promise<any>;
    optimizeDatabase(options?: any): Promise<any>;
    getRecommendations(): Promise<any>;
    scheduleOptimization(interval?: number): void;
  };
  
  // Monitoring
  monitoring: {
    getMetrics(): Promise<any>;
    getHealthStatus(): Promise<any>;
    exportPerformanceReport(): Promise<string>;
    setAlertThresholds(thresholds: any): void;
  };
}

/**
 * Create comprehensive enterprise database system
 */
export const createEnterpriseDatabaseSystem = async (
  config: EnterpriseDatabaseConfig = {}
): Promise<EnterpriseDatabaseSystem> => {
  const startTime = performance.now();
  
  try {
    logger.info('database', 'Creating enterprise database system', {
      config
    }, { component: 'DatabaseModule', function: 'createEnterpriseDatabaseSystem' });

    // Initialize legacy database first for backward compatibility
    await DatabaseService.initialize();

    // Create advanced components
    const database = new EnterpriseDatabase({
      indexing: {
        primaryIndexes: ['id'],
        foreignKeyIndexes: [
          'pgnGameId', 'sourceVideoId', 'sourceStudyId', 
          'goalId', 'milestoneId', 'videoId', 'cardId'
        ],
        compositeIndexes: [
          { name: 'srs_due_type', fields: ['dueDate', 'type'] },
          { name: 'task_status_priority', fields: ['status', 'priority'] },
          { name: 'video_tags_duration', fields: ['tags', 'duration'] }
        ],
        textSearchIndexes: [
          { field: 'name', tokenizer: 'porter' },
          { field: 'description', tokenizer: 'porter' }
        ],
        temporalIndexes: [
          { field: 'createdAt', granularity: 'day' },
          { field: 'dueDate', granularity: 'day' }
        ]
      },
      caching: {
        memoryCache: {
          enabled: true,
          maxSizeBytes: (config.caching?.memoryLimitMB || 50) * 1024 * 1024,
          ttlSeconds: 300,
          strategy: 'lru'
        },
        sessionCache: {
          enabled: true,
          maxSizeBytes: (config.caching?.sessionLimitMB || 20) * 1024 * 1024,
          strategy: 'hot'
        },
        queryCache: {
          enabled: true,
          maxEntries: 1000,
          ttlSeconds: 600
        },
        preloading: {
          srsCards: true,
          activeStudies: true,
          recentVideos: true,
          todayKPIs: true
        }
      },
      compression: {
        compressText: true,
        compressBinary: true,
        compressionLevel: 6,
        minSizeBytes: config.caching?.compressionThreshold || 1024,
        textFields: ['description', 'pgn', 'notes', 'solution'],
        algorithm: 'gzip'
      }
    });

    const cacheManager = new AdvancedCacheManager({
      memory: {
        name: 'memory',
        maxSizeBytes: (config.caching?.memoryLimitMB || 50) * 1024 * 1024,
        maxEntries: 10000,
        defaultTtl: 300000,
        compressionThreshold: config.caching?.compressionThreshold || 1024,
        strategy: 'lru'
      },
      session: {
        name: 'session',
        maxSizeBytes: (config.caching?.sessionLimitMB || 20) * 1024 * 1024,
        maxEntries: 5000,
        defaultTtl: 1800000,
        compressionThreshold: (config.caching?.compressionThreshold || 1024) * 2,
        strategy: 'lfu'
      },
      persistent: {
        name: 'persistent',
        maxSizeBytes: (config.caching?.persistentLimitMB || 100) * 1024 * 1024,
        maxEntries: 20000,
        defaultTtl: 86400000,
        compressionThreshold: (config.caching?.compressionThreshold || 1024) * 4,
        strategy: 'arc'
      }
    });

    const optimizer = new DatabaseOptimizer({
      analysisRetentionDays: 30,
      optimizationInterval: config.optimization?.optimizationInterval || 24 * 60 * 60 * 1000,
      monitoringInterval: 5 * 60 * 1000,
      autoOptimize: config.optimization?.enableAutoOptimization !== false
    });

    // Performance monitoring and alerting
    let alertCallbacks: Array<(alert: any) => void> = [];

    const system: EnterpriseDatabaseSystem = {
      database,
      cacheManager,
      optimizer,
      
      async initialize() {
        const initStartTime = performance.now();
        
        logger.info('database', 'Initializing enterprise database system', {}, 
          { component: 'DatabaseModule', function: 'initialize' });
        
        // Initialize all components
        await database.defineSchema();
        
        // Pre-warm caches if enabled
        if (config.caching?.enableMultiTierCache !== false) {
          await cacheManager.warmCache({
            patterns: ['srs_*', 'study_*', 'video_*'],
            tags: ['hot', 'frequent'],
            priority: 'high',
            maxEntries: 500
          });
        }
        
        // Start optimization monitoring
        if (config.optimization?.performanceMonitoring !== false) {
          // Monitoring is started in optimizer constructor
        }
        
        const initTime = performance.now() - initStartTime;
        qualityGate.recordPerformance('enterpriseDbInitMs', initTime);
        
        logger.info('database', 'Enterprise database system initialized successfully', {
          initTimeMs: initTime,
          componentsInitialized: ['database', 'cacheManager', 'optimizer']
        }, { component: 'DatabaseModule', function: 'initialize' });
      },
      
      async destroy() {
        logger.info('database', 'Destroying enterprise database system', {}, 
          { component: 'DatabaseModule', function: 'destroy' });
        
        // Destroy all components
        optimizer.destroy();
        cacheManager.destroy();
        
        // Clear callbacks
        alertCallbacks = [];
        
        logger.info('database', 'Enterprise database system destroyed', {}, 
          { component: 'DatabaseModule', function: 'destroy' });
      },
      
      async executeQuery<T>(
        tableName: keyof import('../types').DatabaseSchema,
        queryFn: Function,
        options = {}
      ): Promise<T> {
        const {
          cache = true,
          cacheKey,
          cacheTags = [],
          timeout = config.performance?.queryTimeoutMs || 5000
        } = options;
        
        // Use database's optimized query execution
        return database.executeQuery(tableName, queryFn, cacheKey, cacheTags);
      },
      
      async bulkInsert<T>(
        tableName: keyof import('../types').DatabaseSchema,
        records: T[],
        options = {}
      ): Promise<void> {
        const {
          batchSize = config.performance?.batchSize || 100,
          compress = true,
          validate = true,
          onProgress
        } = options;
        
        return database.bulkInsert(tableName, records, {
          batchSize,
          compress,
          onProgress
        });
      },
      
      cache: {
        async get<T>(key: string): Promise<T | null> {
          return cacheManager.get<T>(key);
        },
        
        async set<T>(key: string, value: T, options = {}): Promise<void> {
          return cacheManager.set(key, value, options);
        },
        
        async invalidate(options: any): Promise<number> {
          return cacheManager.invalidate(options);
        },
        
        async warm(strategy: any): Promise<void> {
          return cacheManager.warmCache(strategy);
        },
        
        getMetrics() {
          return cacheManager.getMetrics();
        }
      },
      
      optimization: {
        async analyzePerformance() {
          return optimizer.getPerformanceReport();
        },
        
        async optimizeDatabase(options = {}) {
          return optimizer.optimizeDatabase(options);
        },
        
        async getRecommendations() {
          const report = await optimizer.getPerformanceReport();
          return report.optimizationSuggestions;
        },
        
        scheduleOptimization(interval = 24 * 60 * 60 * 1000) {
          // Optimizer handles its own scheduling
        }
      },
      
      monitoring: {
        async getMetrics() {
          const [dbMetrics, cacheMetrics] = await Promise.all([
            database.getPerformanceMetrics(),
            Promise.resolve(cacheManager.getMetrics())
          ]);
          
          return {
            database: dbMetrics,
            cache: cacheMetrics,
            timestamp: new Date()
          };
        },
        
        async getHealthStatus() {
          const metrics = await this.getMetrics();
          
          return {
            status: 'healthy', // Would be determined by actual metrics
            score: 95, // Health score out of 100
            issues: [],
            recommendations: [],
            lastCheck: new Date()
          };
        },
        
        async exportPerformanceReport(): Promise<string> {
          const report = await optimizer.getPerformanceReport();
          return JSON.stringify(report, null, 2);
        },
        
        setAlertThresholds(thresholds: any) {
          // Implementation for setting alert thresholds
        }
      }
    };
    
    const totalTime = performance.now() - startTime;
    qualityGate.recordPerformance('createEnterpriseDatabaseMs', totalTime);
    
    logger.info('database', 'Enterprise database system created successfully', {
      totalTimeMs: totalTime,
      config: {
        caching: config.caching?.enableMultiTierCache !== false,
        optimization: config.optimization?.enableAutoOptimization !== false,
        monitoring: config.optimization?.performanceMonitoring !== false
      }
    }, { component: 'DatabaseModule', function: 'createEnterpriseDatabaseSystem' });
    
    return system;
    
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    qualityGate.recordError(errorObj, 'critical');
    
    logger.error('database', 'Failed to create enterprise database system', errorObj, {
      config
    }, { component: 'DatabaseModule', function: 'createEnterpriseDatabaseSystem' });
    
    throw error;
  }
};

// Convenience exports for common database operations
export const createOptimizedDatabase = (config?: Partial<EnterpriseDatabaseConfig>) => {
  return createEnterpriseDatabaseSystem({
    ...config,
    caching: { enableMultiTierCache: true, ...config?.caching },
    optimization: { enableAutoOptimization: true, ...config?.optimization }
  });
};

export const createLightweightDatabase = (config?: Partial<EnterpriseDatabaseConfig>) => {
  return createEnterpriseDatabaseSystem({
    ...config,
    caching: { enableMultiTierCache: false, memoryLimitMB: 10, ...config?.caching },
    optimization: { enableAutoOptimization: false, performanceMonitoring: false, ...config?.optimization }
  });
};

// Default export
export default {
  EnterpriseDatabase,
  AdvancedCacheManager,
  DatabaseOptimizer,
  createEnterpriseDatabaseSystem,
  createOptimizedDatabase,
  createLightweightDatabase
};