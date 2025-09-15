/**
 * ♔ ENTERPRISE STOCKFISH ENGINE CORE
 * 
 * Professional chess engine integration with Stockfish WebWorker,
 * enterprise-grade performance monitoring, and comprehensive error handling.
 * 
 * Features:
 * - WebWorker isolation for UI thread protection
 * - Progressive depth analysis with real-time updates
 * - Intelligent caching and memory management
 * - Quality Gate integration for performance monitoring
 * - Comprehensive TypeScript safety
 * 
 * Architecture:
 * - Single Responsibility: One engine per worker
 * - Observer Pattern: Event-driven evaluation updates
 * - Strategy Pattern: Configurable analysis strategies
 * - Command Pattern: UCI command abstraction
 */

import type { 
  EngineEvaluation, 
  EngineOptions
} from '../../types/index';
import { qualityGate } from '../../utils/QualityGate';
import logger from '../../utils/Logger';

/**
 * Enhanced engine configuration for enterprise use
 */
export interface StockfishConfig extends EngineOptions {
  // Performance Settings
  maxAnalysisTimeMs: number;     // Maximum time per analysis (default: 5000ms)
  progressiveDepth: boolean;     // Enable progressive depth analysis
  cacheSize: number;             // Evaluation cache size in MB
  enableTablebase: boolean;      // Enable tablebase support
  
  // Quality Settings
  qualityThreshold: number;      // Minimum nodes for quality evaluation
  accuracyTarget: number;        // Target evaluation accuracy (0-1)
  
  // WebWorker Settings
  workerPath: string;            // Path to Stockfish WebWorker
  maxWorkers: number;            // Maximum concurrent workers
  workerTimeout: number;         // Worker timeout in milliseconds
}

/**
 * UCI (Universal Chess Interface) command abstraction
 */
export interface UCICommand {
  command: string;
  params?: Record<string, string | number>;
  expectsResponse: boolean;
  timeout?: number;
}

/**
 * Real-time evaluation update event
 */
export interface EvaluationUpdate {
  evaluation: Partial<EngineEvaluation>;
  isComplete: boolean;
  progress: number;              // 0-100 completion percentage
  analysisId: string;
  timestamp: Date;
}

/**
 * Engine state for comprehensive monitoring
 */
export interface EngineState {
  isInitialized: boolean;
  isAnalyzing: boolean;
  currentDepth: number;
  nodesSearched: number;
  evaluationsCompleted: number;
  averageResponseTime: number;
  lastError: Error | null;
  workerHealth: 'healthy' | 'degraded' | 'failed';
}

/**
 * Event listeners for engine state changes
 */
export interface EngineEventListeners {
  onEvaluationUpdate?: (update: EvaluationUpdate) => void;
  onAnalysisComplete?: (evaluation: EngineEvaluation) => void;
  onError?: (error: Error) => void;
  onStateChange?: (state: EngineState) => void;
  onWorkerReady?: () => void;
}

/**
 * Professional Stockfish engine with enterprise features
 */
export class StockfishEngine {
  private worker: Worker | null = null;
  private config: StockfishConfig;
  private state: EngineState;
  private listeners: EngineEventListeners = {};
  private evaluationCache: Map<string, EngineEvaluation> = new Map();
  // private commandQueue: UCICommand[] = [];
  // private isProcessingCommand = false;
  private currentAnalysisId: string | null = null;
  private analysisStartTime: number = 0;

  constructor(config: Partial<StockfishConfig> = {}) {
    this.config = {
      // Default EngineOptions
      depth: 15,
      multiPV: 1,
      threads: 1,
      hash: 16,
      
      // Enhanced StockfishConfig defaults
      maxAnalysisTimeMs: 5000,
      progressiveDepth: true,
      cacheSize: 32,
      enableTablebase: false,
      qualityThreshold: 100000,
      accuracyTarget: 0.95,
      
      // WebWorker defaults
      workerPath: '/stockfish/stockfish.js',
      maxWorkers: 2,
      workerTimeout: 10000,
      
      ...config
    };

    this.state = {
      isInitialized: false,
      isAnalyzing: false,
      currentDepth: 0,
      nodesSearched: 0,
      evaluationsCompleted: 0,
      averageResponseTime: 0,
      lastError: null,
      workerHealth: 'healthy'
    };

    logger.info('stockfish', 'StockfishEngine instance created', { 
      config: this.config 
    }, { 
      component: 'StockfishEngine', 
      function: 'constructor' 
    });
  }

  /**
   * Initialize the Stockfish engine
   */
  async initialize(): Promise<void> {
    const startTime = performance.now();
    
    try {
      logger.info('stockfish', 'Initializing Stockfish engine', {}, { 
        component: 'StockfishEngine', 
        function: 'initialize' 
      });

      // Load Stockfish WebWorker
      await this.loadWorker();
      
      // Configure engine options
      await this.configureEngine();
      
      // Verify engine is ready
      await this.verifyEngineReady();
      
      this.state.isInitialized = true;
      this.state.workerHealth = 'healthy';
      
      // Record performance metrics
      const initTime = performance.now() - startTime;
      qualityGate.recordPerformance('stockfishInitMs', initTime);
      
      logger.info('stockfish', 'Stockfish engine initialized successfully', { 
        initTimeMs: initTime,
        config: this.config 
      }, { 
        component: 'StockfishEngine', 
        function: 'initialize' 
      });

      this.listeners.onWorkerReady?.();
      this.emitStateChange();

    } catch (error) {
      this.state.lastError = error as Error;
      this.state.workerHealth = 'failed';
      
      const errorObj = error instanceof Error ? error : new Error(String(error));
      qualityGate.recordError(errorObj, 'critical');
      logger.error('stockfish', 'Failed to initialize Stockfish engine', errorObj, {}, { 
        component: 'StockfishEngine', 
        function: 'initialize' 
      });
      
      this.emitStateChange();
      throw error;
    }
  }

  /**
   * Load and configure Stockfish WebWorker
   */
  private async loadWorker(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create worker with proper error handling
        this.worker = new Worker(this.config.workerPath);
        
        // Set up worker event handlers
        this.worker.onmessage = (event) => this.handleWorkerMessage(event.data);
        this.worker.onerror = (error) => this.handleWorkerError(error);
        
        // Test worker communication
        this.worker.postMessage('uci');
        
        // Set timeout for worker initialization
        const timeoutId = setTimeout(() => {
          reject(new Error(`Worker initialization timeout after ${this.config.workerTimeout}ms`));
        }, this.config.workerTimeout);
        
        // Listen for 'uciok' response
        const initHandler = (event: MessageEvent) => {
          if (event.data === 'uciok') {
            clearTimeout(timeoutId);
            this.worker!.removeEventListener('message', initHandler);
            resolve();
          }
        };
        
        this.worker.addEventListener('message', initHandler);
        
      } catch (error) {
        reject(new Error(`Failed to create Stockfish worker: ${error}`));
      }
    });
  }

  /**
   * Configure engine options via UCI commands
   */
  private async configureEngine(): Promise<void> {
    const commands: UCICommand[] = [
      {
        command: `setoption name Hash value ${this.config.hash}`,
        expectsResponse: false
      },
      {
        command: `setoption name Threads value ${this.config.threads}`,
        expectsResponse: false
      },
      {
        command: `setoption name MultiPV value ${this.config.multiPV}`,
        expectsResponse: false
      }
    ];

    // Add tablebase configuration if enabled
    if (this.config.enableTablebase) {
      commands.push({
        command: 'setoption name SyzygyPath value /tablebase',
        expectsResponse: false
      });
    }

    // Execute configuration commands
    for (const cmd of commands) {
      await this.sendCommand(cmd);
    }

    // Send isready command and wait for readyok
    await this.sendCommand({
      command: 'isready',
      expectsResponse: true
    });
  }

  /**
   * Verify engine is ready for analysis
   */
  private async verifyEngineReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Engine readiness verification timeout'));
      }, this.config.workerTimeout);

      const readyHandler = (event: MessageEvent) => {
        if (event.data === 'readyok') {
          clearTimeout(timeout);
          this.worker!.removeEventListener('message', readyHandler);
          resolve();
        }
      };

      this.worker!.addEventListener('message', readyHandler);
      this.worker!.postMessage('isready');
    });
  }

  /**
   * Analyze chess position and return comprehensive evaluation
   */
  async analyzePosition(
    fen: string, 
    options: Partial<EngineOptions> = {}
  ): Promise<EngineEvaluation> {
    if (!this.state.isInitialized) {
      throw new Error('Engine not initialized. Call initialize() first.');
    }

    const analysisOptions = { ...this.config, ...options };
    const cacheKey = this.generateCacheKey(fen, analysisOptions);
    
    // Check cache first
    const cachedEvaluation = this.evaluationCache.get(cacheKey);
    if (cachedEvaluation) {
      logger.debug('stockfish', 'Cache hit for position analysis', { 
        fen: fen.substring(0, 20) + '...',
        cacheKey 
      }, { 
        component: 'StockfishEngine', 
        function: 'analyzePosition' 
      });
      return cachedEvaluation;
    }

    this.analysisStartTime = performance.now();
    this.currentAnalysisId = `analysis-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    this.state.isAnalyzing = true;
    this.emitStateChange();

    logger.info('stockfish', 'Starting position analysis', { 
      fen: fen.substring(0, 30) + '...',
      analysisId: this.currentAnalysisId,
      depth: analysisOptions.depth,
      multiPV: analysisOptions.multiPV
    }, { 
      component: 'StockfishEngine', 
      function: 'analyzePosition' 
    });

    try {
      // Set up position
      await this.sendCommand({
        command: `position fen ${fen}`,
        expectsResponse: false
      });

      // Start analysis
      const evaluation = await this.performAnalysis(analysisOptions);
      
      // Cache the result
      this.evaluationCache.set(cacheKey, evaluation);
      this.manageCacheSize();

      // Update metrics
      const analysisTime = performance.now() - this.analysisStartTime;
      qualityGate.recordPerformance('stockfishResponseMs', analysisTime);
      this.updatePerformanceMetrics(analysisTime);

      logger.info('stockfish', 'Position analysis completed', { 
        analysisId: this.currentAnalysisId,
        analysisTimeMs: analysisTime,
        depth: evaluation.depth,
        nodes: evaluation.nodes,
        score: evaluation.score
      }, { 
        component: 'StockfishEngine', 
        function: 'analyzePosition' 
      });

      this.listeners.onAnalysisComplete?.(evaluation);
      return evaluation;

    } catch (error) {
      this.state.lastError = error as Error;
      const errorObj = error instanceof Error ? error : new Error(String(error));
      qualityGate.recordError(errorObj, 'warning');
      
      logger.error('stockfish', 'Position analysis failed', errorObj, { 
        analysisId: this.currentAnalysisId,
        fen: fen.substring(0, 30) + '...'
      }, { 
        component: 'StockfishEngine', 
        function: 'analyzePosition' 
      });
      
      throw error;
    } finally {
      this.state.isAnalyzing = false;
      this.currentAnalysisId = null;
      this.emitStateChange();
    }
  }

  /**
   * Perform the actual engine analysis
   */
  private async performAnalysis(options: EngineOptions): Promise<EngineEvaluation> {
    return new Promise((resolve, reject) => {
      let currentEvaluation: Partial<EngineEvaluation> = {};
      let depthCompleted = 0;
      
      const timeout = setTimeout(() => {
        this.worker!.postMessage('stop');
        reject(new Error(`Analysis timeout after ${this.config.maxAnalysisTimeMs}ms`));
      }, this.config.maxAnalysisTimeMs);

      const analysisHandler = (event: MessageEvent) => {
        const line = event.data;
        
        if (line.startsWith('info')) {
          const evaluation = this.parseInfoLine(line);
          if (evaluation) {
            currentEvaluation = { ...currentEvaluation, ...evaluation };
            
            // Emit progress update
            if (evaluation.depth && evaluation.depth > depthCompleted) {
              depthCompleted = evaluation.depth;
              this.state.currentDepth = evaluation.depth;
              
              const progress = Math.min((evaluation.depth / options.depth) * 100, 100);
              
              this.listeners.onEvaluationUpdate?.({
                evaluation: currentEvaluation,
                isComplete: false,
                progress,
                analysisId: this.currentAnalysisId!,
                timestamp: new Date()
              });
            }
          }
        } else if (line.startsWith('bestmove')) {
          clearTimeout(timeout);
          this.worker!.removeEventListener('message', analysisHandler);
          
          // Parse final evaluation
          const bestMove = line.split(' ')[1];
          if (currentEvaluation.depth && currentEvaluation.score) {
            const finalEvaluation: EngineEvaluation = {
              depth: currentEvaluation.depth,
              score: currentEvaluation.score,
              pv: currentEvaluation.pv || [],
              bestMove: bestMove !== '(none)' ? bestMove : undefined,
              nodes: currentEvaluation.nodes || 0,
              nps: currentEvaluation.nps || 0,
              time: currentEvaluation.time || 0
            };
            
            resolve(finalEvaluation);
          } else {
            reject(new Error('Invalid evaluation received from engine'));
          }
        }
      };

      this.worker!.addEventListener('message', analysisHandler);
      
      // Start analysis
      const goCommand = this.config.progressiveDepth
        ? `go depth ${options.depth}`
        : `go depth ${options.depth} movetime ${this.config.maxAnalysisTimeMs}`;
        
      this.worker!.postMessage(goCommand);
    });
  }

  /**
   * Parse UCI info line into evaluation data
   */
  private parseInfoLine(line: string): Partial<EngineEvaluation> | null {
    const parts = line.split(' ');
    const evaluation: Partial<EngineEvaluation> = {};

    for (let i = 0; i < parts.length; i++) {
      const token = parts[i];
      
      switch (token) {
        case 'depth':
          evaluation.depth = parseInt(parts[i + 1]);
          break;
        case 'score':
          const scoreType = parts[i + 1];
          const scoreValue = parseInt(parts[i + 2]);
          evaluation.score = {
            type: scoreType as 'cp' | 'mate',
            value: scoreValue
          };
          i += 2;
          break;
        case 'nodes':
          evaluation.nodes = parseInt(parts[i + 1]);
          break;
        case 'nps':
          evaluation.nps = parseInt(parts[i + 1]);
          break;
        case 'time':
          evaluation.time = parseInt(parts[i + 1]);
          break;
        case 'pv':
          evaluation.pv = parts.slice(i + 1);
          return evaluation; // PV is always last
      }
    }

    return Object.keys(evaluation).length > 0 ? evaluation : null;
  }

  /**
   * Send UCI command to engine
   */
  private async sendCommand(command: UCICommand): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not available'));
        return;
      }

      if (command.expectsResponse) {
        const timeout = setTimeout(() => {
          reject(new Error(`Command timeout: ${command.command}`));
        }, command.timeout || this.config.workerTimeout);

        const responseHandler = (event: MessageEvent) => {
          const expectedResponses = ['readyok', 'uciok'];
          if (expectedResponses.includes(event.data)) {
            clearTimeout(timeout);
            this.worker!.removeEventListener('message', responseHandler);
            resolve();
          }
        };

        this.worker.addEventListener('message', responseHandler);
      }

      this.worker.postMessage(command.command);
      
      if (!command.expectsResponse) {
        resolve();
      }
    });
  }

  /**
   * Handle worker messages
   */
  private handleWorkerMessage(data: string): void {
    // Log all worker communication for debugging
    logger.debug('stockfish', 'Worker message received', { message: data }, { 
      component: 'StockfishEngine', 
      function: 'handleWorkerMessage' 
    });

    // Additional message processing can be added here
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(error: ErrorEvent): void {
    const errorObj = new Error(`Worker error: ${error.message}`);
    this.state.lastError = errorObj;
    this.state.workerHealth = 'failed';
    
    qualityGate.recordError(errorObj, 'critical');
    logger.error('stockfish', 'Worker error occurred', errorObj, { 
      originalError: error.message 
    }, { 
      component: 'StockfishEngine', 
      function: 'handleWorkerError' 
    });
    
    this.listeners.onError?.(errorObj);
    this.emitStateChange();
  }

  /**
   * Generate cache key for position and options
   */
  private generateCacheKey(fen: string, options: EngineOptions): string {
    const fenHash = btoa(fen).substring(0, 16);
    const optionsHash = btoa(JSON.stringify(options)).substring(0, 8);
    return `${fenHash}-${optionsHash}`;
  }

  /**
   * Manage cache size to prevent memory issues
   */
  private manageCacheSize(): void {
    const maxEntries = Math.floor(this.config.cacheSize * 1024 / 100); // Rough estimate
    
    if (this.evaluationCache.size > maxEntries) {
      // Remove oldest entries (simple LRU approximation)
      const entries = Array.from(this.evaluationCache.entries());
      const toRemove = entries.slice(0, entries.length - maxEntries);
      
      for (const [key] of toRemove) {
        this.evaluationCache.delete(key);
      }
      
      logger.debug('stockfish', 'Cache pruned', { 
        removedEntries: toRemove.length,
        currentSize: this.evaluationCache.size 
      }, { 
        component: 'StockfishEngine', 
        function: 'manageCacheSize' 
      });
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(analysisTime: number): void {
    this.state.evaluationsCompleted++;
    
    // Update running average of response time
    const alpha = 0.1; // Exponential moving average factor
    this.state.averageResponseTime = this.state.averageResponseTime === 0
      ? analysisTime
      : this.state.averageResponseTime * (1 - alpha) + analysisTime * alpha;
  }

  /**
   * Stop current analysis
   */
  stopAnalysis(): void {
    if (this.state.isAnalyzing && this.worker) {
      this.worker.postMessage('stop');
      this.state.isAnalyzing = false;
      this.currentAnalysisId = null;
      
      logger.info('stockfish', 'Analysis stopped by user', {}, { 
        component: 'StockfishEngine', 
        function: 'stopAnalysis' 
      });
      
      this.emitStateChange();
    }
  }

  /**
   * Set event listeners
   */
  setListeners(listeners: Partial<EngineEventListeners>): void {
    this.listeners = { ...this.listeners, ...listeners };
  }

  /**
   * Get current engine state
   */
  getState(): EngineState {
    return { ...this.state };
  }

  /**
   * Get engine configuration
   */
  getConfig(): StockfishConfig {
    return { ...this.config };
  }

  /**
   * Clear evaluation cache
   */
  clearCache(): void {
    this.evaluationCache.clear();
    logger.info('stockfish', 'Evaluation cache cleared', {}, { 
      component: 'StockfishEngine', 
      function: 'clearCache' 
    });
  }

  /**
   * Emit state change to listeners
   */
  private emitStateChange(): void {
    this.listeners.onStateChange?.(this.getState());
  }

  /**
   * Cleanup and terminate worker
   */
  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    this.clearCache();
    this.listeners = {};
    this.state.isInitialized = false;
    this.state.workerHealth = 'failed';
    
    logger.info('stockfish', 'StockfishEngine disposed', {}, { 
      component: 'StockfishEngine', 
      function: 'dispose' 
    });
  }
}

export default StockfishEngine;