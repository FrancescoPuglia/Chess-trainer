/**
 * ♔ ENTERPRISE ENGINE MANAGER
 * 
 * Advanced engine pool management with load balancing, failover,
 * and comprehensive monitoring for production chess applications.
 * 
 * Features:
 * - Worker pool management with intelligent load balancing
 * - Automatic failover and recovery mechanisms
 * - Performance monitoring and adaptive scaling
 * - Request queuing with priority support
 * - Comprehensive analytics and reporting
 * 
 * Architecture:
 * - Factory Pattern: Creates and manages engine instances
 * - Observer Pattern: Event-driven notifications
 * - Strategy Pattern: Configurable load balancing strategies
 * - Circuit Breaker Pattern: Fault tolerance
 */

import StockfishEngine, { 
  StockfishConfig, 
  EngineEventListeners,
  EngineState,
  EvaluationUpdate
} from './StockfishEngine';
import type { 
  EngineEvaluation, 
  EngineOptions 
} from '../../types/index';
import { qualityGate } from '../../utils/QualityGate';
import logger from '../../utils/Logger';

/**
 * Engine pool configuration for enterprise environments
 */
export interface EnginePoolConfig {
  // Pool Management
  initialPoolSize: number;       // Initial number of engines (default: 2)
  maxPoolSize: number;          // Maximum pool size (default: 4)
  minPoolSize: number;          // Minimum pool size (default: 1)
  
  // Load Balancing
  loadBalancingStrategy: 'round-robin' | 'least-busy' | 'random';
  maxConcurrentAnalyses: number; // Max analyses per engine
  
  // Health & Recovery
  healthCheckInterval: number;   // Health check frequency (ms)
  maxRetries: number;           // Max retries per request
  circuitBreakerThreshold: number; // Failures before circuit opens
  
  // Performance
  adaptiveScaling: boolean;     // Enable automatic pool scaling
  performanceTarget: number;    // Target response time (ms)
  scalingCooldown: number;      // Cooldown between scaling events (ms)
  
  // Monitoring
  enableDetailedMetrics: boolean;
  metricsRetentionPeriod: number; // How long to keep metrics (ms)
}

/**
 * Analysis request with priority and context
 */
export interface AnalysisRequest {
  id: string;
  fen: string;
  options: Partial<EngineOptions>;
  priority: 'low' | 'normal' | 'high' | 'critical';
  timeout?: number;
  context?: {
    source: string;
    sessionId?: string;
    userId?: string;
  };
  callbacks?: {
    onProgress?: (update: EvaluationUpdate) => void;
    onComplete?: (evaluation: EngineEvaluation) => void;
    onError?: (error: Error) => void;
  };
}

/**
 * Engine instance metadata for pool management
 */
interface EngineInstance {
  id: string;
  engine: StockfishEngine;
  state: EngineState;
  activeAnalyses: number;
  totalAnalyses: number;
  lastUsed: Date;
  averageResponseTime: number;
  errorCount: number;
  isHealthy: boolean;
}

/**
 * Pool performance metrics
 */
export interface PoolMetrics {
  totalEngines: number;
  healthyEngines: number;
  activeAnalyses: number;
  queueLength: number;
  averageResponseTime: number;
  throughputPerMinute: number;
  errorRate: number;
  uptime: number;
  lastScalingEvent?: Date;
  performanceScore: number; // 0-100
}

/**
 * Pool event notifications
 */
export interface PoolEventListeners {
  onEngineAdded?: (engineId: string) => void;
  onEngineRemoved?: (engineId: string, reason: string) => void;
  onEngineHealthChange?: (engineId: string, isHealthy: boolean) => void;
  onPoolScaled?: (newSize: number, reason: string) => void;
  onPerformanceAlert?: (metric: string, value: number, threshold: number) => void;
  onQueueFull?: (queueLength: number) => void;
}

/**
 * Professional engine pool manager with enterprise features
 */
export class EngineManager {
  private config: EnginePoolConfig;
  private engines: Map<string, EngineInstance> = new Map();
  private analysisQueue: AnalysisRequest[] = [];
  private isProcessingQueue = false;
  private listeners: PoolEventListeners = {};
  
  // Performance tracking
  private metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    startTime: Date;
    lastScalingCheck: Date;
  };

  // Circuit breaker state
  private circuitBreaker: {
    failureCount: number;
    isOpen: boolean;
    lastFailureTime: Date;
    nextRetryTime: Date;
  };

  constructor(config: Partial<EnginePoolConfig> = {}) {
    this.config = {
      // Pool defaults
      initialPoolSize: 2,
      maxPoolSize: 4,
      minPoolSize: 1,
      
      // Load balancing defaults
      loadBalancingStrategy: 'least-busy',
      maxConcurrentAnalyses: 3,
      
      // Health defaults
      healthCheckInterval: 30000, // 30 seconds
      maxRetries: 3,
      circuitBreakerThreshold: 5,
      
      // Performance defaults
      adaptiveScaling: true,
      performanceTarget: 200, // 200ms target
      scalingCooldown: 60000, // 1 minute
      
      // Monitoring defaults
      enableDetailedMetrics: true,
      metricsRetentionPeriod: 3600000, // 1 hour
      
      ...config
    };

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      startTime: new Date(),
      lastScalingCheck: new Date()
    };

    this.circuitBreaker = {
      failureCount: 0,
      isOpen: false,
      lastFailureTime: new Date(0),
      nextRetryTime: new Date(0)
    };

    logger.info('engine-manager', 'EngineManager created', { 
      config: this.config 
    }, { 
      component: 'EngineManager', 
      function: 'constructor' 
    });
  }

  /**
   * Initialize the engine pool
   */
  async initialize(): Promise<void> {
    const startTime = performance.now();
    
    logger.info('engine-manager', 'Initializing engine pool', { 
      initialSize: this.config.initialPoolSize 
    }, { 
      component: 'EngineManager', 
      function: 'initialize' 
    });

    try {
      // Create initial pool of engines
      const initPromises: Promise<void>[] = [];
      
      for (let i = 0; i < this.config.initialPoolSize; i++) {
        initPromises.push(this.addEngine(`engine-${i + 1}`));
      }

      await Promise.all(initPromises);

      // Start health monitoring
      this.startHealthMonitoring();

      // Start queue processing
      this.startQueueProcessing();

      const initTime = performance.now() - startTime;
      
      logger.info('engine-manager', 'Engine pool initialized successfully', { 
        poolSize: this.engines.size,
        initTimeMs: initTime 
      }, { 
        component: 'EngineManager', 
        function: 'initialize' 
      });

      qualityGate.recordPerformance('enginePoolInitMs', initTime);

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      qualityGate.recordError(errorObj, 'critical');
      logger.error('engine-manager', 'Failed to initialize engine pool', errorObj, {}, { 
        component: 'EngineManager', 
        function: 'initialize' 
      });
      throw error;
    }
  }

  /**
   * Add a new engine to the pool
   */
  private async addEngine(engineId: string): Promise<void> {
    try {
      const engine = new StockfishEngine({
        depth: 15,
        threads: 1,
        hash: 16,
        maxAnalysisTimeMs: 5000,
        progressiveDepth: true
      });

      // Set up engine event listeners
      engine.setListeners({
        onStateChange: (state) => this.handleEngineStateChange(engineId, state),
        onError: (error) => this.handleEngineError(engineId, error),
        onAnalysisComplete: () => this.updateEngineUsage(engineId)
      });

      await engine.initialize();

      const instance: EngineInstance = {
        id: engineId,
        engine,
        state: engine.getState(),
        activeAnalyses: 0,
        totalAnalyses: 0,
        lastUsed: new Date(),
        averageResponseTime: 0,
        errorCount: 0,
        isHealthy: true
      };

      this.engines.set(engineId, instance);

      logger.info('engine-manager', 'Engine added to pool', { 
        engineId,
        poolSize: this.engines.size 
      }, { 
        component: 'EngineManager', 
        function: 'addEngine' 
      });

      this.listeners.onEngineAdded?.(engineId);

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.error('engine-manager', 'Failed to add engine to pool', errorObj, { 
        engineId 
      }, { 
        component: 'EngineManager', 
        function: 'addEngine' 
      });
      throw error;
    }
  }

  /**
   * Remove an engine from the pool
   */
  private async removeEngine(engineId: string, reason: string): Promise<void> {
    const instance = this.engines.get(engineId);
    if (!instance) return;

    // Wait for active analyses to complete (with timeout)
    let waitTime = 0;
    const maxWaitTime = 5000; // 5 seconds
    
    while (instance.activeAnalyses > 0 && waitTime < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100));
      waitTime += 100;
    }

    // Force cleanup
    instance.engine.dispose();
    this.engines.delete(engineId);

    logger.info('engine-manager', 'Engine removed from pool', { 
      engineId,
      reason,
      poolSize: this.engines.size 
    }, { 
      component: 'EngineManager', 
      function: 'removeEngine' 
    });

    this.listeners.onEngineRemoved?.(engineId, reason);
  }

  /**
   * Analyze position with intelligent engine selection
   */
  async analyzePosition(
    fen: string, 
    options: Partial<EngineOptions> = {},
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal',
    context?: AnalysisRequest['context']
  ): Promise<EngineEvaluation> {
    
    // Check circuit breaker
    if (this.circuitBreaker.isOpen) {
      if (Date.now() < this.circuitBreaker.nextRetryTime.getTime()) {
        throw new Error('Circuit breaker is open - engine pool temporarily unavailable');
      } else {
        // Reset circuit breaker
        this.circuitBreaker.isOpen = false;
        this.circuitBreaker.failureCount = 0;
      }
    }

    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const startTime = performance.now();

    return new Promise((resolve, reject) => {
      const request: AnalysisRequest = {
        id: requestId,
        fen,
        options,
        priority,
        context,
        callbacks: {
          onComplete: (evaluation) => {
            this.metrics.successfulRequests++;
            this.updateMetrics(performance.now() - startTime);
            resolve(evaluation);
          },
          onError: (error) => {
            this.metrics.failedRequests++;
            this.handleRequestFailure(error);
            reject(error);
          }
        }
      };

      this.metrics.totalRequests++;

      // Try immediate execution or queue
      if (!this.tryImmediateExecution(request)) {
        this.queueRequest(request);
      }
    });
  }

  /**
   * Try to execute request immediately
   */
  private tryImmediateExecution(request: AnalysisRequest): boolean {
    const engine = this.selectBestEngine();
    
    if (engine && engine.activeAnalyses < this.config.maxConcurrentAnalyses) {
      this.executeRequest(request, engine);
      return true;
    }
    
    return false;
  }

  /**
   * Add request to priority queue
   */
  private queueRequest(request: AnalysisRequest): void {
    // Insert based on priority
    const priorityOrder = { 'critical': 0, 'high': 1, 'normal': 2, 'low': 3 };
    const insertIndex = this.analysisQueue.findIndex(
      queued => priorityOrder[queued.priority] > priorityOrder[request.priority]
    );

    if (insertIndex === -1) {
      this.analysisQueue.push(request);
    } else {
      this.analysisQueue.splice(insertIndex, 0, request);
    }

    logger.debug('engine-manager', 'Request queued', { 
      requestId: request.id,
      priority: request.priority,
      queueLength: this.analysisQueue.length 
    }, { 
      component: 'EngineManager', 
      function: 'queueRequest' 
    });

    // Check for queue overflow
    if (this.analysisQueue.length > 100) {
      this.listeners.onQueueFull?.(this.analysisQueue.length);
    }
  }

  /**
   * Execute analysis request on specific engine
   */
  private async executeRequest(request: AnalysisRequest, engineInstance: EngineInstance): Promise<void> {
    engineInstance.activeAnalyses++;
    engineInstance.lastUsed = new Date();

    try {
      logger.debug('engine-manager', 'Executing analysis request', { 
        requestId: request.id,
        engineId: engineInstance.id,
        fen: request.fen.substring(0, 30) + '...'
      }, { 
        component: 'EngineManager', 
        function: 'executeRequest' 
      });

      const evaluation = await engineInstance.engine.analyzePosition(request.fen, request.options);
      
      engineInstance.totalAnalyses++;
      request.callbacks?.onComplete?.(evaluation);

    } catch (error) {
      engineInstance.errorCount++;
      request.callbacks?.onError?.(error as Error);
      
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.error('engine-manager', 'Analysis request failed', errorObj, { 
        requestId: request.id,
        engineId: engineInstance.id 
      }, { 
        component: 'EngineManager', 
        function: 'executeRequest' 
      });
    } finally {
      engineInstance.activeAnalyses--;
    }
  }

  /**
   * Select best engine based on load balancing strategy
   */
  private selectBestEngine(): EngineInstance | null {
    const healthyEngines = Array.from(this.engines.values()).filter(e => e.isHealthy);
    
    if (healthyEngines.length === 0) return null;

    switch (this.config.loadBalancingStrategy) {
      case 'least-busy':
        return healthyEngines.reduce((best, current) => 
          current.activeAnalyses < best.activeAnalyses ? current : best
        );
        
      case 'round-robin':
        // Simple round-robin based on total analyses
        return healthyEngines.reduce((best, current) => 
          current.totalAnalyses < best.totalAnalyses ? current : best
        );
        
      case 'random':
        return healthyEngines[Math.floor(Math.random() * healthyEngines.length)];
        
      default:
        return healthyEngines[0];
    }
  }

  /**
   * Start queue processing
   */
  private startQueueProcessing(): void {
    setInterval(() => {
      if (this.analysisQueue.length > 0 && !this.isProcessingQueue) {
        this.processQueue();
      }
    }, 100); // Check every 100ms
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;

    try {
      while (this.analysisQueue.length > 0) {
        const engine = this.selectBestEngine();
        
        if (!engine || engine.activeAnalyses >= this.config.maxConcurrentAnalyses) {
          break; // No available engines
        }

        const request = this.analysisQueue.shift()!;
        this.executeRequest(request, engine);
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    setInterval(() => {
      this.performHealthCheck();
      this.checkPerformanceAndScale();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health check on all engines
   */
  private performHealthCheck(): void {
    for (const [engineId, instance] of this.engines) {
      const wasHealthy = instance.isHealthy;
      
      // Health criteria
      const isHealthy = 
        instance.state.workerHealth === 'healthy' &&
        instance.errorCount < 10 &&
        Date.now() - instance.lastUsed.getTime() < 300000; // 5 minutes

      instance.isHealthy = isHealthy;

      if (wasHealthy !== isHealthy) {
        logger.info('engine-manager', 'Engine health status changed', { 
          engineId,
          isHealthy,
          errorCount: instance.errorCount,
          workerHealth: instance.state.workerHealth 
        }, { 
          component: 'EngineManager', 
          function: 'performHealthCheck' 
        });

        this.listeners.onEngineHealthChange?.(engineId, isHealthy);
      }

      // Remove unhealthy engines
      if (!isHealthy && instance.activeAnalyses === 0) {
        this.removeEngine(engineId, 'health check failed');
      }
    }
  }

  /**
   * Check performance and scale pool if needed
   */
  private checkPerformanceAndScale(): void {
    if (!this.config.adaptiveScaling) return;

    const now = Date.now();
    const timeSinceLastCheck = now - this.metrics.lastScalingCheck.getTime();
    
    if (timeSinceLastCheck < this.config.scalingCooldown) return;

    const poolMetrics = this.getPoolMetrics();
    
    // Scale up if performance is degraded or queue is building
    if (
      (poolMetrics.averageResponseTime > this.config.performanceTarget * 1.5 ||
       poolMetrics.queueLength > 5) &&
      poolMetrics.totalEngines < this.config.maxPoolSize
    ) {
      this.scaleUp();
    }
    
    // Scale down if over-provisioned
    if (
      poolMetrics.averageResponseTime < this.config.performanceTarget * 0.5 &&
      poolMetrics.queueLength === 0 &&
      poolMetrics.totalEngines > this.config.minPoolSize
    ) {
      this.scaleDown();
    }

    this.metrics.lastScalingCheck = new Date();
  }

  /**
   * Scale up the pool
   */
  private async scaleUp(): Promise<void> {
    const newEngineId = `engine-scaled-${Date.now()}`;
    
    try {
      await this.addEngine(newEngineId);
      
      logger.info('engine-manager', 'Pool scaled up', { 
        newPoolSize: this.engines.size,
        reason: 'performance degradation' 
      }, { 
        component: 'EngineManager', 
        function: 'scaleUp' 
      });

      this.listeners.onPoolScaled?.(this.engines.size, 'scale up - performance');
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.error('engine-manager', 'Failed to scale up pool', errorObj, {}, { 
        component: 'EngineManager', 
        function: 'scaleUp' 
      });
    }
  }

  /**
   * Scale down the pool
   */
  private async scaleDown(): Promise<void> {
    // Find least used healthy engine
    const healthyEngines = Array.from(this.engines.values()).filter(e => e.isHealthy);
    const leastUsed = healthyEngines.reduce((least, current) => 
      current.totalAnalyses < least.totalAnalyses ? current : least
    );

    if (leastUsed && leastUsed.activeAnalyses === 0) {
      await this.removeEngine(leastUsed.id, 'scale down - over-provisioned');
      
      logger.info('engine-manager', 'Pool scaled down', { 
        newPoolSize: this.engines.size,
        removedEngine: leastUsed.id 
      }, { 
        component: 'EngineManager', 
        function: 'scaleDown' 
      });

      this.listeners.onPoolScaled?.(this.engines.size, 'scale down - over-provisioned');
    }
  }

  /**
   * Handle engine state changes
   */
  private handleEngineStateChange(engineId: string, state: EngineState): void {
    const instance = this.engines.get(engineId);
    if (instance) {
      instance.state = state;
    }
  }

  /**
   * Handle engine errors
   */
  private handleEngineError(engineId: string, error: Error): void {
    const instance = this.engines.get(engineId);
    if (instance) {
      instance.errorCount++;
    }

    logger.warn('engine-manager', 'Engine error reported', { 
      engineId,
      error: error.message 
    }, { 
      component: 'EngineManager', 
      function: 'handleEngineError' 
    });
  }

  /**
   * Update engine usage statistics
   */
  private updateEngineUsage(engineId: string): void {
    const instance = this.engines.get(engineId);
    if (instance) {
      instance.lastUsed = new Date();
    }
  }

  /**
   * Handle request failures for circuit breaker
   */
  private handleRequestFailure(error: Error): void {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = new Date();

    if (this.circuitBreaker.failureCount >= this.config.circuitBreakerThreshold) {
      this.circuitBreaker.isOpen = true;
      this.circuitBreaker.nextRetryTime = new Date(Date.now() + 30000); // 30 second break
      
      logger.warn('engine-manager', 'Circuit breaker opened', { 
        failureCount: this.circuitBreaker.failureCount,
        threshold: this.config.circuitBreakerThreshold 
      }, { 
        component: 'EngineManager', 
        function: 'handleRequestFailure' 
      });
    }
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(responseTime: number): void {
    // Update average response time with exponential moving average
    const alpha = 0.1;
    this.metrics.averageResponseTime = this.metrics.averageResponseTime === 0
      ? responseTime
      : this.metrics.averageResponseTime * (1 - alpha) + responseTime * alpha;
  }

  /**
   * Get comprehensive pool metrics
   */
  getPoolMetrics(): PoolMetrics {
    const healthyEngines = Array.from(this.engines.values()).filter(e => e.isHealthy);
    const activeAnalyses = healthyEngines.reduce((sum, e) => sum + e.activeAnalyses, 0);
    const uptime = Date.now() - this.metrics.startTime.getTime();
    const errorRate = this.metrics.totalRequests > 0 
      ? this.metrics.failedRequests / this.metrics.totalRequests 
      : 0;

    return {
      totalEngines: this.engines.size,
      healthyEngines: healthyEngines.length,
      activeAnalyses,
      queueLength: this.analysisQueue.length,
      averageResponseTime: this.metrics.averageResponseTime,
      throughputPerMinute: this.metrics.successfulRequests / (uptime / 60000),
      errorRate,
      uptime,
      performanceScore: Math.max(0, 100 - (errorRate * 100) - Math.max(0, this.metrics.averageResponseTime - this.config.performanceTarget) / 10)
    };
  }

  /**
   * Set event listeners
   */
  setListeners(listeners: Partial<PoolEventListeners>): void {
    this.listeners = { ...this.listeners, ...listeners };
  }

  /**
   * Stop all engines and analysis
   */
  stopAllAnalyses(): void {
    for (const instance of this.engines.values()) {
      instance.engine.stopAnalysis();
    }
    
    this.analysisQueue.length = 0;
    
    logger.info('engine-manager', 'All analyses stopped', {}, { 
      component: 'EngineManager', 
      function: 'stopAllAnalyses' 
    });
  }

  /**
   * Cleanup and dispose of all resources
   */
  async dispose(): Promise<void> {
    logger.info('engine-manager', 'Disposing engine manager', { 
      poolSize: this.engines.size 
    }, { 
      component: 'EngineManager', 
      function: 'dispose' 
    });

    // Stop all analyses
    this.stopAllAnalyses();

    // Dispose all engines
    const disposePromises = Array.from(this.engines.values()).map(instance => 
      this.removeEngine(instance.id, 'manager disposal')
    );

    await Promise.all(disposePromises);

    // Clear state
    this.engines.clear();
    this.listeners = {};
    
    logger.info('engine-manager', 'Engine manager disposed successfully', {}, { 
      component: 'EngineManager', 
      function: 'dispose' 
    });
  }
}

export default EngineManager;