/**
 * SyncManager - Enterprise-Grade Video↔Board Synchronization
 * 
 * Implements the exact algorithm specified in the technical plan:
 * - Binary search for timestamp→FEN mapping
 * - Hysteresis to prevent flickering (120ms tolerance)
 * - Throttled updates (200-250ms)
 * - Reverse seek (FEN→timestamp)
 * - Performance monitoring for <0.3s drift
 */

import { createGameAPI, type IGameAPI } from '../../core/game-api';
import type { VideoSyncPoint, ChessMove } from '../../types';
import { createSyncPoint } from '../../types';
import logger from '../../utils/Logger';

export interface SyncManagerConfig {
  hysteresisMs: number; // Default: 120ms
  throttleMs: number;   // Default: 200-250ms
  maxDriftMs: number;   // Default: 300ms (0.3s)
  debugMode: boolean;   // Enable performance logging
}

export interface SyncStats {
  totalSyncs: number;
  averageDriftMs: number;
  maxDriftMs: number;
  lastSyncTimestamp: number;
  performanceWarnings: number;
}

export class SyncManager {
  private syncPoints: VideoSyncPoint[] = [];
  private gameAPI: IGameAPI;
  private currentFen = '';
  private lastUpdateTime = 0;
  private config: SyncManagerConfig;
  private stats: SyncStats;
  private fenToTimeMap = new Map<string, number>();
  private throttleTimeout?: number;

  constructor(config: Partial<SyncManagerConfig> = {}) {
    this.config = {
      hysteresisMs: 120,
      throttleMs: 225, // Sweet spot between 200-250ms
      maxDriftMs: 300,
      debugMode: false,
      ...config,
    };

    this.stats = {
      totalSyncs: 0,
      averageDriftMs: 0,
      maxDriftMs: 0,
      lastSyncTimestamp: 0,
      performanceWarnings: 0,
    };

    this.gameAPI = createGameAPI();
    this.currentFen = this.gameAPI.fen();
  }

  /**
   * Set sync points (must be sorted by timestamp)
   * Builds reverse lookup map for FEN→timestamp
   */
  setSyncPoints(points: VideoSyncPoint[]): void {
    // Sort points by timestamp (defensive programming)
    this.syncPoints = [...points].sort((a, b) => a.timestamp - b.timestamp);
    
    // Build reverse lookup map (FEN → first occurrence timestamp)
    this.fenToTimeMap.clear();
    for (const point of this.syncPoints) {
      if (!this.fenToTimeMap.has(point.fen)) {
        this.fenToTimeMap.set(point.fen, point.timestamp);
      }
    }

    if (this.config.debugMode) {
      logger.info('sync', 'Sync points configured for video timeline', { count: this.syncPoints.length }, { component: 'SyncManager', function: 'setSyncPoints' });
    }
  }

  /**
   * Get FEN for timestamp using binary search + hysteresis
   * This is the CORE algorithm from the technical plan
   */
  fenForTime(timestampSeconds: number): string {
    const timestampMs = timestampSeconds * 1000;
    
    if (this.syncPoints.length === 0) {
      return this.currentFen;
    }

    // Binary search for the last point <= timestamp
    let left = 0;
    let right = this.syncPoints.length - 1;
    let bestIndex = -1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const midTime = this.syncPoints[mid].timestamp * 1000;

      if (midTime <= timestampMs) {
        bestIndex = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    if (bestIndex < 0) {
      return this.currentFen;
    }

    const candidatePoint = this.syncPoints[bestIndex];
    const candidateTime = candidatePoint.timestamp * 1000;
    const drift = Math.abs(timestampMs - candidateTime);

    // Hysteresis: only update if drift exceeds threshold AND FEN actually changed
    const shouldUpdate = drift > this.config.hysteresisMs && 
                        candidatePoint.fen !== this.currentFen;

    if (shouldUpdate) {
      this.updateStats(drift);
      this.currentFen = candidatePoint.fen;
      
      if (this.config.debugMode) {
        logger.debug('sync', 'Video sync position updated', { timestamp: timestampSeconds, drift, fen }, { component: 'SyncManager', function: 'fenForTime' });
      }
    }

    return this.currentFen;
  }

  /**
   * Throttled version of fenForTime for video onTimeUpdate events
   */
  fenForTimeThrottled(timestampSeconds: number, callback: (fen: string) => void): void {
    if (this.throttleTimeout) {
      window.clearTimeout(this.throttleTimeout);
    }

    this.throttleTimeout = window.setTimeout(() => {
      const fen = this.fenForTime(timestampSeconds);
      callback(fen);
      this.throttleTimeout = undefined;
    }, this.config.throttleMs);
  }

  /**
   * Reverse lookup: FEN → timestamp (for seek functionality)
   */
  timeForFen(fen: string): number | undefined {
    return this.fenToTimeMap.get(fen);
  }

  /**
   * Get all FENs that occur within a time range
   */
  getFensInTimeRange(startSeconds: number, endSeconds: number): VideoSyncPoint[] {
    return this.syncPoints.filter(
      point => point.timestamp >= startSeconds && point.timestamp <= endSeconds
    );
  }

  /**
   * Get the closest sync point to a timestamp
   */
  getClosestSyncPoint(timestampSeconds: number): VideoSyncPoint | undefined {
    if (this.syncPoints.length === 0) return undefined;

    let closest = this.syncPoints[0];
    let minDistance = Math.abs(closest.timestamp - timestampSeconds);

    for (const point of this.syncPoints) {
      const distance = Math.abs(point.timestamp - timestampSeconds);
      if (distance < minDistance) {
        minDistance = distance;
        closest = point;
      }
    }

    return closest;
  }

  /**
   * Update performance statistics
   */
  private updateStats(driftMs: number): void {
    this.stats.totalSyncs++;
    this.stats.lastSyncTimestamp = Date.now();
    
    // Update average drift (rolling average)
    this.stats.averageDriftMs = (
      (this.stats.averageDriftMs * (this.stats.totalSyncs - 1)) + driftMs
    ) / this.stats.totalSyncs;

    // Update max drift
    if (driftMs > this.stats.maxDriftMs) {
      this.stats.maxDriftMs = driftMs;
    }

    // Performance warning if drift exceeds target
    if (driftMs > this.config.maxDriftMs) {
      this.stats.performanceWarnings++;
      logger.warn('sync', 'High synchronization drift detected', { drift: driftMs, maxDrift: this.config.maxDriftMs }, { component: 'SyncManager', function: 'fenForTime' });
    }
  }

  /**
   * Get current synchronization statistics
   */
  getStats(): SyncStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics (useful for testing)
   */
  resetStats(): void {
    this.stats = {
      totalSyncs: 0,
      averageDriftMs: 0,
      maxDriftMs: 0,
      lastSyncTimestamp: 0,
      performanceWarnings: 0,
    };
  }

  /**
   * Check if sync performance meets quality standards
   */
  isPerformanceAcceptable(): boolean {
    return this.stats.averageDriftMs <= this.config.maxDriftMs &&
           this.stats.performanceWarnings / Math.max(this.stats.totalSyncs, 1) <= 0.1; // <10% warnings
  }

  /**
   * Generate sync points from PGN game automatically
   * This is a utility for creating sync points when editing
   */
  generateSyncPointsFromPGN(pgn: string, videoDurationSeconds: number): VideoSyncPoint[] {
    const tempGameAPI = createGameAPI();
    if (!tempGameAPI.loadPgn(pgn)) {
      throw new Error('Invalid PGN provided for sync point generation');
    }

    const history = tempGameAPI.history({ verbose: true }) as ChessMove[];
    const points: VideoSyncPoint[] = [];
    
    // Type guard to ensure we have ChessMove objects
    if (!history.length || typeof history[0] === 'string') {
      logger.warn('sync', 'Sync point generation failed - insufficient move history data', {}, { component: 'SyncManager', function: 'generateSyncPointsFromMoves' });
      return [];
    }
    
    // Add starting position
    tempGameAPI.reset();
    points.push(createSyncPoint({
      id: 'start',
      timestamp: 0,
      fen: tempGameAPI.fen(),
      moveNumber: 1,
      moveIndex: 0,
      isWhiteMove: true,
      description: 'Starting position',
      tolerance: this.config.hysteresisMs / 1000,
    }));

    // Generate points for each move (evenly distributed over video duration)
    const timePerMove = videoDurationSeconds / (history.length + 1);
    
    for (let i = 0; i < history.length; i++) {
      const move = history[i];
      const timestamp = (i + 1) * timePerMove;
      
      // Type guard - should not be needed after cast above, but for safety
      if (typeof move === 'string') continue;
      
      points.push(createSyncPoint({
        id: `move-${i + 1}`,
        timestamp,
        fen: move.fen,
        moveNumber: Math.floor((i + 1) / 2) + 1,
        moveIndex: i + 1,
        isWhiteMove: (i + 1) % 2 === 1,
        description: `After ${move.san}`,
        tolerance: this.config.hysteresisMs / 1000,
      }));
    }

    return points;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.throttleTimeout) {
      window.clearTimeout(this.throttleTimeout);
    }
    this.syncPoints = [];
    this.fenToTimeMap.clear();
  }
}

export default SyncManager;

// Re-export enhanced sync components
export { default as PredictiveSync } from './PredictiveSync';
export { default as AdaptiveQualityController, QualityLevel } from './AdaptiveQualityController';
export type { 
  PredictiveSyncConfig
} from './PredictiveSync';
export type { 
  QualityConfig,
  SystemMetrics,
  QualityStrategy
} from './AdaptiveQualityController';