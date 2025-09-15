/**
 * ♔ ADAPTIVE QUALITY CONTROLLER
 * 
 * Intelligent quality management system that automatically adjusts video and sync
 * quality based on system performance, network conditions, and user preferences.
 * 
 * Features:
 * - Real-time performance monitoring and adjustment
 * - Network bandwidth detection and adaptation
 * - CPU/GPU load balancing
 * - Quality prediction using historical data
 * - Seamless quality transitions
 * - User experience optimization
 * 
 * Architecture:
 * - Strategy Pattern: Multiple quality strategies for different scenarios  
 * - Observer Pattern: Real-time system monitoring
 * - State Pattern: Quality state management
 * - Command Pattern: Quality adjustment commands
 */

import logger from '../../utils/Logger';
import { qualityGate } from '../../utils/QualityGate';

/**
 * Quality levels with detailed specifications
 */
export enum QualityLevel {
  ULTRA = 'ultra',
  HIGH = 'high', 
  MEDIUM = 'medium',
  LOW = 'low',
  ADAPTIVE = 'adaptive'
}

/**
 * System performance metrics
 */
export interface SystemMetrics {
  // Performance Metrics
  cpuUsage: number;                    // CPU usage percentage (0-100)
  memoryUsage: number;                 // Memory usage percentage (0-100)
  gpuUsage?: number;                   // GPU usage if available (0-100)
  frameDropRate: number;               // Dropped frames percentage (0-100)
  
  // Network Metrics
  bandwidth: number;                   // Available bandwidth (Mbps)
  latency: number;                     // Network latency (ms)
  packetLoss: number;                  // Packet loss percentage (0-100)
  connectionStability: number;         // Connection stability score (0-100)
  
  // Rendering Metrics
  frameRate: number;                   // Actual frame rate achieved
  renderTime: number;                  // Time to render frame (ms)
  bufferHealth: number;                // Buffer utilization (0-100)
  syncDrift: number;                   // Synchronization drift (ms)
}

/**
 * Quality configuration for different levels
 */
export interface QualityConfig {
  level: QualityLevel;
  
  // Video Quality
  resolution: { width: number; height: number };
  frameRate: number;
  bitrate: number;                     // Video bitrate (kbps)
  compressionLevel: number;            // Compression level (0-100)
  
  // Sync Quality
  syncPrecision: number;               // Sync precision target (ms)
  bufferSize: number;                  // Buffer size (ms)
  predictionHorizon: number;           // Prediction lookahead (ms)
  
  // Performance Targets
  maxCpuUsage: number;                 // Maximum CPU usage allowed
  maxMemoryUsage: number;              // Maximum memory usage allowed
  targetFrameTime: number;             // Target frame time (ms)
  
  // Features
  enablePredictiveSync: boolean;
  enableNeuralEnhancement: boolean;
  enableMultiThreading: boolean;
  enableHardwareAcceleration: boolean;
}

/**
 * Quality adaptation strategy
 */
export interface QualityStrategy {
  name: string;
  shouldAdapt(metrics: SystemMetrics, currentConfig: QualityConfig): boolean;
  calculateNewQuality(metrics: SystemMetrics, currentConfig: QualityConfig): QualityConfig;
  getAdaptationReason(): string;
}

/**
 * Quality transition state
 */
interface QualityTransition {
  fromLevel: QualityLevel;
  toLevel: QualityLevel;
  startTime: number;
  duration: number;
  progress: number;
  isComplete: boolean;
}

/**
 * Quality analytics data
 */
interface QualityAnalytics {
  adaptations: number;
  averageQuality: number;
  stabilityScore: number;
  userSatisfactionIndex: number;
  performanceGains: number;
  transitionSmoothness: number;
}

/**
 * Adaptive Quality Controller with ML-enhanced decisions
 */
export class AdaptiveQualityController {
  private currentConfig: QualityConfig;
  private strategies: QualityStrategy[] = [];
  private isMonitoring = false;
  private monitoringInterval: number | null = null;
  private metricsHistory: SystemMetrics[] = [];
  private currentTransition: QualityTransition | null = null;
  private analytics: QualityAnalytics;
  
  // Configuration
  private readonly METRICS_HISTORY_SIZE = 50;
  private readonly MONITORING_INTERVAL = 1000; // 1 second
  private readonly ADAPTATION_COOLDOWN = 5000; // 5 seconds
  private lastAdaptationTime = 0;
  
  // Callbacks
  private onQualityChange?: (newConfig: QualityConfig) => void;
  private onMetricsUpdate?: (metrics: SystemMetrics) => void;

  constructor(initialLevel: QualityLevel = QualityLevel.HIGH) {
    this.currentConfig = this.getQualityConfigForLevel(initialLevel);
    this.analytics = {
      adaptations: 0,
      averageQuality: this.getQualityScore(initialLevel),
      stabilityScore: 100,
      userSatisfactionIndex: 85,
      performanceGains: 0,
      transitionSmoothness: 100
    };

    this.initializeStrategies();
    
    logger.info('quality-controller', 'AdaptiveQualityController initialized', {
      initialLevel,
      config: this.currentConfig
    }, { component: 'AdaptiveQualityController', function: 'constructor' });
  }

  /**
   * Start monitoring system performance and adapting quality
   */
  startAdaptation(onQualityChange?: (config: QualityConfig) => void): void {
    if (this.isMonitoring) {
      logger.warn('quality-controller', 'Quality monitoring already started', {}, 
        { component: 'AdaptiveQualityController', function: 'startAdaptation' });
      return;
    }

    this.onQualityChange = onQualityChange;
    this.isMonitoring = true;
    
    this.monitoringInterval = window.setInterval(() => {
      this.monitorAndAdapt();
    }, this.MONITORING_INTERVAL);

    logger.info('quality-controller', 'Quality adaptation started', {
      monitoringInterval: this.MONITORING_INTERVAL
    }, { component: 'AdaptiveQualityController', function: 'startAdaptation' });
  }

  /**
   * Stop quality adaptation monitoring
   */
  stopAdaptation(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      window.clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    logger.info('quality-controller', 'Quality adaptation stopped', {
      analytics: this.analytics
    }, { component: 'AdaptiveQualityController', function: 'stopAdaptation' });
  }

  /**
   * Manually trigger quality adaptation
   */
  async adaptQuality(forceAdaptation = false): Promise<void> {
    const metrics = await this.collectSystemMetrics();
    this.analyzeAndAdapt(metrics, forceAdaptation);
  }

  /**
   * Get current quality configuration
   */
  getCurrentConfig(): QualityConfig {
    return { ...this.currentConfig };
  }

  /**
   * Set quality level manually
   */
  setQualityLevel(level: QualityLevel): void {
    const newConfig = this.getQualityConfigForLevel(level);
    this.transitionToQuality(newConfig);
    
    logger.info('quality-controller', 'Quality level set manually', {
      level,
      config: newConfig
    }, { component: 'AdaptiveQualityController', function: 'setQualityLevel' });
  }

  /**
   * Get current quality analytics
   */
  getAnalytics(): QualityAnalytics {
    return { ...this.analytics };
  }

  /**
   * Predict optimal quality based on historical data
   */
  predictOptimalQuality(futureMetrics?: Partial<SystemMetrics>): QualityLevel {
    // Use recent metrics history to predict
    const recentMetrics = this.metricsHistory.slice(-10);
    if (recentMetrics.length === 0) return QualityLevel.MEDIUM;

    // Calculate average performance indicators
    const avgCpuUsage = recentMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / recentMetrics.length;
    const avgBandwidth = recentMetrics.reduce((sum, m) => sum + m.bandwidth, 0) / recentMetrics.length;
    const avgFrameDropRate = recentMetrics.reduce((sum, m) => sum + m.frameDropRate, 0) / recentMetrics.length;

    // Apply future adjustments if provided
    const predictedCpu = futureMetrics?.cpuUsage ?? avgCpuUsage;
    const predictedBandwidth = futureMetrics?.bandwidth ?? avgBandwidth;
    const predictedDropRate = futureMetrics?.frameDropRate ?? avgFrameDropRate;

    // Quality prediction logic
    if (predictedCpu < 30 && predictedBandwidth > 50 && predictedDropRate < 1) {
      return QualityLevel.ULTRA;
    } else if (predictedCpu < 50 && predictedBandwidth > 25 && predictedDropRate < 3) {
      return QualityLevel.HIGH;
    } else if (predictedCpu < 70 && predictedBandwidth > 10 && predictedDropRate < 8) {
      return QualityLevel.MEDIUM;
    } else {
      return QualityLevel.LOW;
    }
  }

  /**
   * Initialize quality adaptation strategies
   */
  private initializeStrategies(): void {
    // Performance-based strategy
    this.strategies.push({
      name: 'performance',
      shouldAdapt: (metrics, config) => {
        return metrics.cpuUsage > config.maxCpuUsage || 
               metrics.frameDropRate > 5 ||
               metrics.renderTime > config.targetFrameTime;
      },
      calculateNewQuality: (metrics, config) => {
        if (metrics.cpuUsage > 80 || metrics.frameDropRate > 10) {
          return this.reduceQuality(config);
        }
        return config;
      },
      getAdaptationReason: () => 'Performance optimization'
    });

    // Network-based strategy
    this.strategies.push({
      name: 'network',
      shouldAdapt: (metrics, config) => {
        return metrics.bandwidth < config.bitrate / 1000 * 1.5 || // Need 1.5x headroom
               metrics.latency > 200 ||
               metrics.packetLoss > 2;
      },
      calculateNewQuality: (metrics, config) => {
        if (metrics.bandwidth < 5) {
          return this.getQualityConfigForLevel(QualityLevel.LOW);
        } else if (metrics.bandwidth < 15) {
          return this.getQualityConfigForLevel(QualityLevel.MEDIUM);
        }
        return config;
      },
      getAdaptationReason: () => 'Network conditions'
    });

    // Buffer health strategy
    this.strategies.push({
      name: 'buffer',
      shouldAdapt: (metrics, config) => {
        return metrics.bufferHealth < 30 || metrics.syncDrift > config.syncPrecision * 2;
      },
      calculateNewQuality: (metrics, config) => {
        if (metrics.bufferHealth < 20) {
          return this.reduceQuality(config);
        }
        return config;
      },
      getAdaptationReason: () => 'Buffer stability'
    });

    // Quality improvement strategy
    this.strategies.push({
      name: 'improvement',
      shouldAdapt: (metrics, config) => {
        // Only improve if system has been stable for a while
        const recentMetrics = this.metricsHistory.slice(-5);
        if (recentMetrics.length < 5) return false;

        const avgCpu = recentMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / recentMetrics.length;
        const avgDropRate = recentMetrics.reduce((sum, m) => sum + m.frameDropRate, 0) / recentMetrics.length;

        return avgCpu < config.maxCpuUsage * 0.6 && 
               avgDropRate < 1 && 
               metrics.bandwidth > config.bitrate / 1000 * 2;
      },
      calculateNewQuality: (metrics, config) => {
        return this.improveQuality(config);
      },
      getAdaptationReason: () => 'Performance improvement opportunity'
    });
  }

  /**
   * Monitor system and adapt quality if needed
   */
  private async monitorAndAdapt(): Promise<void> {
    try {
      const metrics = await this.collectSystemMetrics();
      this.analyzeAndAdapt(metrics);
      
      // Update callbacks
      this.onMetricsUpdate?.(metrics);
      
    } catch (error) {
      logger.error('quality-controller', 'Monitoring cycle failed', error, {}, 
        { component: 'AdaptiveQualityController', function: 'monitorAndAdapt' });
    }
  }

  /**
   * Collect current system metrics
   */
  private async collectSystemMetrics(): Promise<SystemMetrics> {
    const startTime = performance.now();

    // Performance API metrics
    const memory = (performance as any).memory;
    const memoryUsage = memory ? (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100 : 50;
    
    // Connection API metrics  
    const connection = (navigator as any).connection;
    const bandwidth = connection ? Math.min(connection.downlink || 10, 100) : 10;
    
    // Simulated metrics (in a real implementation, these would come from actual monitoring)
    const metrics: SystemMetrics = {
      cpuUsage: this.estimateCpuUsage(),
      memoryUsage,
      frameDropRate: this.calculateFrameDropRate(),
      bandwidth,
      latency: this.estimateLatency(),
      packetLoss: Math.random() * 2, // 0-2%
      connectionStability: Math.max(0, 100 - bandwidth * 2),
      frameRate: this.getCurrentFrameRate(),
      renderTime: performance.now() - startTime,
      bufferHealth: this.getBufferHealth(),
      syncDrift: this.getCurrentSyncDrift()
    };

    // Store in history
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.METRICS_HISTORY_SIZE) {
      this.metricsHistory.shift();
    }

    return metrics;
  }

  /**
   * Analyze metrics and adapt quality if needed
   */
  private analyzeAndAdapt(metrics: SystemMetrics, forceAdaptation = false): void {
    // Check cooldown period
    const now = Date.now();
    if (!forceAdaptation && now - this.lastAdaptationTime < this.ADAPTATION_COOLDOWN) {
      return;
    }

    // Try each strategy
    for (const strategy of this.strategies) {
      if (strategy.shouldAdapt(metrics, this.currentConfig)) {
        const newConfig = strategy.calculateNewQuality(metrics, this.currentConfig);
        
        if (this.isSignificantQualityChange(this.currentConfig, newConfig)) {
          this.transitionToQuality(newConfig);
          this.lastAdaptationTime = now;
          
          logger.info('quality-controller', 'Quality adapted by strategy', {
            strategy: strategy.name,
            reason: strategy.getAdaptationReason(),
            oldLevel: this.getQualityLevelFromConfig(this.currentConfig),
            newLevel: this.getQualityLevelFromConfig(newConfig),
            metrics
          }, { component: 'AdaptiveQualityController', function: 'analyzeAndAdapt' });
          
          this.analytics.adaptations++;
          break; // Only apply first matching strategy
        }
      }
    }

    // Update analytics
    this.updateAnalytics(metrics);
  }

  /**
   * Transition smoothly to new quality configuration
   */
  private transitionToQuality(newConfig: QualityConfig): void {
    const oldLevel = this.getQualityLevelFromConfig(this.currentConfig);
    const newLevel = this.getQualityLevelFromConfig(newConfig);
    
    this.currentTransition = {
      fromLevel: oldLevel,
      toLevel: newLevel,
      startTime: Date.now(),
      duration: 2000, // 2 second transition
      progress: 0,
      isComplete: false
    };

    // Animate the transition
    this.animateQualityTransition(newConfig);
  }

  /**
   * Animate quality transition for smooth user experience
   */
  private animateQualityTransition(targetConfig: QualityConfig): void {
    if (!this.currentTransition) return;

    const transition = this.currentTransition;
    const elapsed = Date.now() - transition.startTime;
    transition.progress = Math.min(1, elapsed / transition.duration);

    // Interpolate quality settings
    const interpolatedConfig = this.interpolateQualityConfigs(
      this.currentConfig, 
      targetConfig, 
      transition.progress
    );

    if (transition.progress >= 1) {
      // Transition complete
      transition.isComplete = true;
      this.currentConfig = targetConfig;
      this.currentTransition = null;
      
      // Notify about quality change
      this.onQualityChange?.(targetConfig);
      
      logger.info('quality-controller', 'Quality transition completed', {
        fromLevel: transition.fromLevel,
        toLevel: transition.toLevel,
        duration: elapsed
      }, { component: 'AdaptiveQualityController', function: 'animateQualityTransition' });
      
    } else {
      // Continue transition
      this.currentConfig = interpolatedConfig;
      
      // Schedule next frame
      requestAnimationFrame(() => this.animateQualityTransition(targetConfig));
    }
  }

  /**
   * Interpolate between two quality configurations
   */
  private interpolateQualityConfigs(
    fromConfig: QualityConfig, 
    toConfig: QualityConfig, 
    progress: number
  ): QualityConfig {
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    return {
      ...fromConfig,
      resolution: {
        width: Math.round(lerp(fromConfig.resolution.width, toConfig.resolution.width, progress)),
        height: Math.round(lerp(fromConfig.resolution.height, toConfig.resolution.height, progress))
      },
      frameRate: lerp(fromConfig.frameRate, toConfig.frameRate, progress),
      bitrate: lerp(fromConfig.bitrate, toConfig.bitrate, progress),
      compressionLevel: lerp(fromConfig.compressionLevel, toConfig.compressionLevel, progress),
      syncPrecision: lerp(fromConfig.syncPrecision, toConfig.syncPrecision, progress),
      bufferSize: lerp(fromConfig.bufferSize, toConfig.bufferSize, progress),
      predictionHorizon: lerp(fromConfig.predictionHorizon, toConfig.predictionHorizon, progress)
    };
  }

  /**
   * Get quality configuration for a specific level
   */
  private getQualityConfigForLevel(level: QualityLevel): QualityConfig {
    const baseConfigs: Record<QualityLevel, QualityConfig> = {
      [QualityLevel.ULTRA]: {
        level: QualityLevel.ULTRA,
        resolution: { width: 1920, height: 1080 },
        frameRate: 60,
        bitrate: 8000,
        compressionLevel: 95,
        syncPrecision: 50,
        bufferSize: 2000,
        predictionHorizon: 1000,
        maxCpuUsage: 80,
        maxMemoryUsage: 80,
        targetFrameTime: 16.67,
        enablePredictiveSync: true,
        enableNeuralEnhancement: true,
        enableMultiThreading: true,
        enableHardwareAcceleration: true
      },
      [QualityLevel.HIGH]: {
        level: QualityLevel.HIGH,
        resolution: { width: 1280, height: 720 },
        frameRate: 60,
        bitrate: 4000,
        compressionLevel: 85,
        syncPrecision: 75,
        bufferSize: 1500,
        predictionHorizon: 750,
        maxCpuUsage: 70,
        maxMemoryUsage: 70,
        targetFrameTime: 16.67,
        enablePredictiveSync: true,
        enableNeuralEnhancement: true,
        enableMultiThreading: true,
        enableHardwareAcceleration: true
      },
      [QualityLevel.MEDIUM]: {
        level: QualityLevel.MEDIUM,
        resolution: { width: 960, height: 540 },
        frameRate: 30,
        bitrate: 2000,
        compressionLevel: 75,
        syncPrecision: 100,
        bufferSize: 1000,
        predictionHorizon: 500,
        maxCpuUsage: 60,
        maxMemoryUsage: 60,
        targetFrameTime: 33.33,
        enablePredictiveSync: true,
        enableNeuralEnhancement: false,
        enableMultiThreading: true,
        enableHardwareAcceleration: false
      },
      [QualityLevel.LOW]: {
        level: QualityLevel.LOW,
        resolution: { width: 640, height: 360 },
        frameRate: 30,
        bitrate: 800,
        compressionLevel: 60,
        syncPrecision: 150,
        bufferSize: 500,
        predictionHorizon: 250,
        maxCpuUsage: 50,
        maxMemoryUsage: 50,
        targetFrameTime: 33.33,
        enablePredictiveSync: false,
        enableNeuralEnhancement: false,
        enableMultiThreading: false,
        enableHardwareAcceleration: false
      },
      [QualityLevel.ADAPTIVE]: {
        level: QualityLevel.ADAPTIVE,
        resolution: { width: 1280, height: 720 },
        frameRate: 30,
        bitrate: 2500,
        compressionLevel: 80,
        syncPrecision: 100,
        bufferSize: 1000,
        predictionHorizon: 500,
        maxCpuUsage: 65,
        maxMemoryUsage: 65,
        targetFrameTime: 33.33,
        enablePredictiveSync: true,
        enableNeuralEnhancement: true,
        enableMultiThreading: true,
        enableHardwareAcceleration: true
      }
    };

    return { ...baseConfigs[level] };
  }

  /**
   * Reduce quality by one level
   */
  private reduceQuality(config: QualityConfig): QualityConfig {
    const currentLevel = this.getQualityLevelFromConfig(config);
    switch (currentLevel) {
      case QualityLevel.ULTRA: return this.getQualityConfigForLevel(QualityLevel.HIGH);
      case QualityLevel.HIGH: return this.getQualityConfigForLevel(QualityLevel.MEDIUM);
      case QualityLevel.MEDIUM: return this.getQualityConfigForLevel(QualityLevel.LOW);
      default: return config; // Already at lowest
    }
  }

  /**
   * Improve quality by one level
   */
  private improveQuality(config: QualityConfig): QualityConfig {
    const currentLevel = this.getQualityLevelFromConfig(config);
    switch (currentLevel) {
      case QualityLevel.LOW: return this.getQualityConfigForLevel(QualityLevel.MEDIUM);
      case QualityLevel.MEDIUM: return this.getQualityConfigForLevel(QualityLevel.HIGH);
      case QualityLevel.HIGH: return this.getQualityConfigForLevel(QualityLevel.ULTRA);
      default: return config; // Already at highest
    }
  }

  /**
   * Check if quality change is significant enough to warrant adaptation
   */
  private isSignificantQualityChange(oldConfig: QualityConfig, newConfig: QualityConfig): boolean {
    const bitrateChange = Math.abs(oldConfig.bitrate - newConfig.bitrate) / oldConfig.bitrate;
    const resolutionChange = Math.abs(
      (oldConfig.resolution.width * oldConfig.resolution.height) - 
      (newConfig.resolution.width * newConfig.resolution.height)
    ) / (oldConfig.resolution.width * oldConfig.resolution.height);
    
    return bitrateChange > 0.2 || resolutionChange > 0.2; // 20% threshold
  }

  /**
   * Get quality level from configuration
   */
  private getQualityLevelFromConfig(config: QualityConfig): QualityLevel {
    return config.level;
  }

  /**
   * Get numeric quality score for analytics
   */
  private getQualityScore(level: QualityLevel): number {
    const scores = {
      [QualityLevel.LOW]: 25,
      [QualityLevel.MEDIUM]: 50,
      [QualityLevel.HIGH]: 75,
      [QualityLevel.ULTRA]: 100,
      [QualityLevel.ADAPTIVE]: 65
    };
    return scores[level];
  }

  /**
   * Estimate CPU usage (simplified simulation)
   */
  private estimateCpuUsage(): number {
    // Simulate CPU usage based on current quality and recent activity
    const baseUsage = this.getQualityScore(this.currentConfig.level) * 0.4;
    const randomVariation = (Math.random() - 0.5) * 20;
    return Math.max(0, Math.min(100, baseUsage + randomVariation));
  }

  /**
   * Calculate frame drop rate
   */
  private calculateFrameDropRate(): number {
    // Simulate based on performance
    const targetFrameTime = this.currentConfig.targetFrameTime;
    const actualFrameTime = performance.now() % 100; // Simplified
    return Math.max(0, ((actualFrameTime - targetFrameTime) / targetFrameTime) * 100);
  }

  /**
   * Estimate network latency
   */
  private estimateLatency(): number {
    // Simulate network latency
    return Math.random() * 100 + 50; // 50-150ms
  }

  /**
   * Get current frame rate
   */
  private getCurrentFrameRate(): number {
    return this.currentConfig.frameRate * (0.9 + Math.random() * 0.2); // ±10% variation
  }

  /**
   * Get buffer health
   */
  private getBufferHealth(): number {
    return Math.random() * 40 + 60; // 60-100%
  }

  /**
   * Get current sync drift
   */
  private getCurrentSyncDrift(): number {
    return Math.random() * this.currentConfig.syncPrecision * 0.8;
  }

  /**
   * Update analytics with current metrics
   */
  private updateAnalytics(metrics: SystemMetrics): void {
    const currentQualityScore = this.getQualityScore(this.currentConfig.level);
    
    // Update rolling average quality
    this.analytics.averageQuality = (this.analytics.averageQuality * 0.9) + (currentQualityScore * 0.1);
    
    // Update stability score based on recent adaptations
    const recentAdaptations = this.analytics.adaptations;
    this.analytics.stabilityScore = Math.max(0, 100 - recentAdaptations * 2);
    
    // Update user satisfaction (simplified model)
    this.analytics.userSatisfactionIndex = Math.min(100, 
      (this.analytics.averageQuality * 0.6) + 
      (this.analytics.stabilityScore * 0.3) +
      (Math.max(0, 100 - metrics.frameDropRate * 10) * 0.1)
    );
  }
}

export default AdaptiveQualityController;