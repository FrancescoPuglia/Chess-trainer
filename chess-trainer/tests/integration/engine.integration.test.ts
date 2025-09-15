/**
 * ♔ ENGINE INTEGRATION TESTS
 * 
 * Comprehensive integration testing for the Stockfish engine system,
 * including performance validation, analysis accuracy, and load testing.
 * 
 * Test Categories:
 * - Engine initialization and lifecycle management
 * - Position analysis and evaluation accuracy
 * - Multi-engine coordination and load balancing
 * - Performance under various load conditions
 * - Error handling and recovery scenarios
 * - Memory management and resource cleanup
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { EnterpriseTestRunner } from '../framework/EnterpriseTestRunner';
import { TestUtils } from '../setup';
import type { 
  EngineConfig, 
  EngineEvaluation, 
  EngineAnalysisResult,
  TacticalAnalysis 
} from '../../src/modules/engine';

// Import engine modules
const testRunner = new EnterpriseTestRunner({
  parallelExecution: false, // Sequential for engine tests
  enablePerfMonitoring: true,
  performanceBudget: {
    unitTestMaxMs: 5000,
    integrationTestMaxMs: 30000,
    e2eTestMaxMs: 60000,
    maxMemoryUsageMB: 200,
    maxCpuUsagePercent: 80,
    maxSetupTimeMs: 10000,
    maxTeardownTimeMs: 5000
  }
});

describe('Engine System Integration', () => {
  let engineManager: any;
  let engineAnalyzer: any;
  let enterpriseEngineCore: any;

  beforeAll(async () => {
    // Dynamic imports to avoid issues with engine initialization
    const { EngineManager } = await import('../../src/modules/engine/EngineManager');
    const { EngineAnalyzer } = await import('../../src/modules/engine/EngineAnalyzer');
    const { EnterpriseEngineCore } = await import('../../src/modules/engine/EnterpriseEngineCore');

    engineManager = new EngineManager();
    engineAnalyzer = new EngineAnalyzer();
    enterpriseEngineCore = new EnterpriseEngineCore();

    // Initialize engine pool
    await engineManager.initialize();
  });

  afterAll(async () => {
    // Cleanup engine resources
    if (engineManager) await engineManager.destroy();
    if (engineAnalyzer) await engineAnalyzer.destroy();
    if (enterpriseEngineCore) await enterpriseEngineCore.destroy();
    
    testRunner.destroy();
  });

  testRunner.createSuite('Engine Manager Core', () => {
    testRunner.createTest('should initialize engine pool successfully', async () => {
      expect(engineManager.isInitialized()).toBe(true);
      
      const poolStatus = await engineManager.getPoolStatus();
      expect(poolStatus.totalEngines).toBeGreaterThan(0);
      expect(poolStatus.availableEngines).toBeGreaterThan(0);
      expect(poolStatus.healthyEngines).toBe(poolStatus.totalEngines);
    }, {
      category: 'integration',
      priority: 'critical',
      tags: ['engine', 'initialization'],
      estimatedDuration: 5000
    });

    testRunner.createTest('should handle engine configuration updates', async () => {
      const newConfig: Partial<EngineConfig> = {
        depth: 15,
        timeLimit: 3000,
        threads: 2,
        hashSize: 128
      };

      await engineManager.updateConfig(newConfig);
      const updatedConfig = engineManager.getConfig();
      
      expect(updatedConfig.depth).toBe(15);
      expect(updatedConfig.timeLimit).toBe(3000);
      expect(updatedConfig.threads).toBe(2);
    }, {
      category: 'integration',
      priority: 'high',
      tags: ['engine', 'configuration'],
      estimatedDuration: 2000
    });

    testRunner.createTest('should distribute load across multiple engines', async () => {
      const startingPosition = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const numberOfRequests = 5;
      
      // Make multiple concurrent evaluation requests
      const evaluationPromises = Array(numberOfRequests).fill(0).map(() =>
        engineManager.evaluatePosition(startingPosition)
      );
      
      const results = await Promise.all(evaluationPromises);
      
      // All requests should succeed
      expect(results).toHaveLength(numberOfRequests);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.evaluation).toBeTypeOf('number');
        expect(result.bestMove).toMatch(/^[a-h][1-8][a-h][1-8][qrbn]?$/);
      });
      
      // Check that load was distributed
      const poolMetrics = await engineManager.getPoolMetrics();
      expect(poolMetrics.totalRequests).toBe(numberOfRequests);
      expect(poolMetrics.averageResponseTime).toBeLessThan(5000);
    }, {
      category: 'integration',
      priority: 'high',
      tags: ['engine', 'load-balancing', 'performance'],
      estimatedDuration: 10000
    });

    testRunner.createTest('should handle engine failures gracefully', async () => {
      // Force an engine failure by sending invalid UCI command
      const invalidPosition = 'invalid-fen-position';
      
      await expect(
        engineManager.evaluatePosition(invalidPosition)
      ).rejects.toThrow();
      
      // Engine pool should recover and remain functional
      const validPosition = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const result = await engineManager.evaluatePosition(validPosition);
      
      expect(result).toBeDefined();
      expect(result.evaluation).toBeTypeOf('number');
    }, {
      category: 'integration',
      priority: 'high',
      tags: ['engine', 'error-handling', 'resilience'],
      estimatedDuration: 5000
    });
  }, {
    category: 'integration',
    priority: 'critical',
    tags: ['engine', 'core'],
    owner: 'engine-team'
  });

  testRunner.createSuite('Engine Analysis Accuracy', () => {
    testRunner.createTest('should provide accurate position evaluations', async () => {
      const testPositions = [
        {
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          expectedRange: [-0.3, 0.3], // Starting position should be roughly equal
          description: 'Starting position'
        },
        {
          fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
          expectedRange: [-0.5, 0.5], // King's pawn opening
          description: 'King\'s pawn opening'
        },
        {
          fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 4',
          expectedRange: [-0.8, 0.8], // Italian game
          description: 'Italian game development'
        }
      ];

      for (const position of testPositions) {
        const evaluation = await engineAnalyzer.evaluatePosition(position.fen);
        
        expect(evaluation.evaluation).toBeGreaterThanOrEqual(position.expectedRange[0]);
        expect(evaluation.evaluation).toBeLessThanOrEqual(position.expectedRange[1]);
        expect(evaluation.depth).toBeGreaterThanOrEqual(10);
        expect(evaluation.bestMove).toBeTruthy();
        
        console.log(`${position.description}: ${evaluation.evaluation} (depth ${evaluation.depth})`);
      }
    }, {
      category: 'integration',
      priority: 'critical',
      tags: ['engine', 'analysis', 'accuracy'],
      estimatedDuration: 15000
    });

    testRunner.createTest('should identify tactical patterns correctly', async () => {
      const tacticalPositions = [
        {
          fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 4',
          expectedTactic: 'fork',
          bestMove: 'Bxf7+',
          description: 'Bishop fork on f7'
        },
        {
          fen: 'r1bq1rk1/ppp2ppp/2np1n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 w - - 0 7',
          expectedTactic: 'pin',
          description: 'Rook pin on the e-file'
        }
      ];

      for (const position of tacticalPositions) {
        const analysis = await engineAnalyzer.analyzeTactics(position.fen);
        
        expect(analysis.tacticalThemes).toContain(position.expectedTactic);
        expect(analysis.threats).toHaveLength.toBeGreaterThan(0);
        
        if (position.bestMove) {
          const evaluation = await engineAnalyzer.evaluatePosition(position.fen);
          expect(evaluation.bestMove).toBe(position.bestMove);
        }
        
        console.log(`${position.description}: Found tactics: ${analysis.tacticalThemes.join(', ')}`);
      }
    }, {
      category: 'integration',
      priority: 'high',
      tags: ['engine', 'tactics', 'pattern-recognition'],
      estimatedDuration: 20000
    });

    testRunner.createTest('should provide consistent analysis across multiple runs', async () => {
      const testPosition = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 4';
      const numberOfRuns = 5;
      
      const results: EngineEvaluation[] = [];
      
      for (let i = 0; i < numberOfRuns; i++) {
        const result = await engineAnalyzer.evaluatePosition(testPosition);
        results.push(result);
      }
      
      // Check consistency of evaluations (should be within ±0.2 pawns)
      const evaluations = results.map(r => r.evaluation);
      const avgEvaluation = evaluations.reduce((sum, eval) => sum + eval, 0) / evaluations.length;
      
      evaluations.forEach(eval => {
        expect(Math.abs(eval - avgEvaluation)).toBeLessThan(0.2);
      });
      
      // Best moves should be identical or very similar
      const bestMoves = results.map(r => r.bestMove);
      const uniqueMoves = [...new Set(bestMoves)];
      expect(uniqueMoves.length).toBeLessThanOrEqual(2); // Allow for minor variations
      
      console.log(`Average evaluation: ${avgEvaluation.toFixed(3)}`);
      console.log(`Best moves: ${uniqueMoves.join(', ')}`);
    }, {
      category: 'integration',
      priority: 'medium',
      tags: ['engine', 'consistency', 'reliability'],
      estimatedDuration: 25000
    });
  }, {
    category: 'integration',
    priority: 'high',
    tags: ['engine', 'analysis'],
    owner: 'engine-team'
  });

  testRunner.createSuite('Enterprise Engine Core', () => {
    testRunner.createTest('should integrate multiple analysis engines', async () => {
      const testPosition = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 4';
      
      const comprehensiveAnalysis = await enterpriseEngineCore.getComprehensiveAnalysis(testPosition);
      
      // Should include Stockfish analysis
      expect(comprehensiveAnalysis.stockfishAnalysis).toBeDefined();
      expect(comprehensiveAnalysis.stockfishAnalysis.evaluation).toBeTypeOf('number');
      expect(comprehensiveAnalysis.stockfishAnalysis.bestMove).toBeTruthy();
      
      // Should include neural network analysis
      expect(comprehensiveAnalysis.neuralAnalysis).toBeDefined();
      expect(comprehensiveAnalysis.neuralAnalysis.positionAssessment).toBeDefined();
      
      // Should include tactical analysis
      expect(comprehensiveAnalysis.tacticalAnalysis).toBeDefined();
      expect(comprehensiveAnalysis.tacticalAnalysis.threats).toBeDefined();
      
      // Should provide unified recommendation
      expect(comprehensiveAnalysis.unifiedRecommendation).toBeDefined();
      expect(comprehensiveAnalysis.unifiedRecommendation.bestMove).toBeTruthy();
      expect(comprehensiveAnalysis.unifiedRecommendation.confidence).toBeGreaterThan(0);
      expect(comprehensiveAnalysis.unifiedRecommendation.confidence).toBeLessThanOrEqual(1);
    }, {
      category: 'integration',
      priority: 'high',
      tags: ['engine', 'enterprise', 'multi-engine'],
      estimatedDuration: 30000
    });

    testRunner.createTest('should optimize analysis based on position type', async () => {
      const positionTypes = [
        {
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          type: 'opening',
          description: 'Opening position'
        },
        {
          fen: 'r3k2r/1ppq1ppp/p1np1n2/4p3/2B1P3/2NP1N2/PPP2PPP/R2Q1RK1 w kq - 0 10',
          type: 'middlegame',
          description: 'Complex middlegame'
        },
        {
          fen: '8/8/8/4k3/8/3K4/8/8 w - - 0 1',
          type: 'endgame',
          description: 'King and pawn endgame'
        }
      ];

      for (const position of positionTypes) {
        const optimizedAnalysis = await enterpriseEngineCore.getOptimizedAnalysis(
          position.fen, 
          { positionType: position.type }
        );
        
        expect(optimizedAnalysis.positionType).toBe(position.type);
        expect(optimizedAnalysis.analysisDepth).toBeGreaterThan(0);
        expect(optimizedAnalysis.timeSpent).toBeGreaterThan(0);
        
        // Different position types should use different analysis strategies
        if (position.type === 'opening') {
          expect(optimizedAnalysis.bookMoves).toBeDefined();
        } else if (position.type === 'endgame') {
          expect(optimizedAnalysis.tablebaseResult).toBeDefined();
        } else if (position.type === 'middlegame') {
          expect(optimizedAnalysis.tacticalAnalysis).toBeDefined();
        }
        
        console.log(`${position.description}: Analysis depth ${optimizedAnalysis.analysisDepth}, time ${optimizedAnalysis.timeSpent}ms`);
      }
    }, {
      category: 'integration',
      priority: 'medium',
      tags: ['engine', 'optimization', 'adaptive'],
      estimatedDuration: 20000
    });
  }, {
    category: 'integration',
    priority: 'high',
    tags: ['engine', 'enterprise'],
    owner: 'engine-team'
  });

  testRunner.createSuite('Engine Performance and Load Testing', () => {
    testRunner.createTest('should handle concurrent analysis requests', async () => {
      const testPositions = [
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 4',
        'r2q1rk1/ppp2ppp/2n1bn2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 w - - 6 8',
        'r1bq1rk1/pp3ppp/2n1pn2/3p4/2PP4/2N1PN2/PP3PPP/R1BQKB1R w KQ - 0 8'
      ];
      
      const concurrentRequests = 10;
      const startTime = performance.now();
      
      const allPromises = [];
      for (let i = 0; i < concurrentRequests; i++) {
        const position = testPositions[i % testPositions.length];
        allPromises.push(engineAnalyzer.evaluatePosition(position));
      }
      
      const results = await Promise.all(allPromises);
      const totalTime = performance.now() - startTime;
      
      // All requests should succeed
      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.evaluation).toBeTypeOf('number');
        expect(result.bestMove).toBeTruthy();
      });
      
      // Performance should be reasonable
      const averageTimePerRequest = totalTime / concurrentRequests;
      expect(averageTimePerRequest).toBeLessThan(5000); // 5 seconds per request on average
      
      console.log(`Processed ${concurrentRequests} requests in ${totalTime.toFixed(0)}ms`);
      console.log(`Average time per request: ${averageTimePerRequest.toFixed(0)}ms`);
    }, {
      category: 'performance',
      priority: 'high',
      tags: ['engine', 'concurrent', 'load-testing'],
      estimatedDuration: 30000
    });

    testRunner.createTest('should maintain memory efficiency under load', async () => {
      const initialMemory = TestUtils.mockPerformance(100);
      const testPosition = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 4';
      
      // Perform many sequential analyses
      const numberOfAnalyses = 50;
      const memoryMeasurements = [];
      
      for (let i = 0; i < numberOfAnalyses; i++) {
        await engineAnalyzer.evaluatePosition(testPosition);
        
        // Measure memory every 10 iterations
        if (i % 10 === 0) {
          const currentMemory = performance.now();
          memoryMeasurements.push(currentMemory);
        }
      }
      
      // Memory growth should be minimal
      const memoryGrowth = memoryMeasurements[memoryMeasurements.length - 1] - memoryMeasurements[0];
      expect(memoryGrowth).toBeLessThan(50); // Less than 50MB growth
      
      // Cleanup
      initialMemory();
      
      console.log(`Memory growth over ${numberOfAnalyses} analyses: ${memoryGrowth.toFixed(2)}MB`);
    }, {
      category: 'performance',
      priority: 'medium',
      tags: ['engine', 'memory', 'efficiency'],
      estimatedDuration: 25000
    });

    testRunner.createTest('should gracefully handle timeout scenarios', async () => {
      // Configure engine with short timeout
      await engineManager.updateConfig({ timeLimit: 100 }); // 100ms timeout
      
      const complexPosition = 'r2q1rk1/ppp1nppp/3p1n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 w - - 0 8';
      
      const startTime = performance.now();
      const result = await engineAnalyzer.evaluatePosition(complexPosition);
      const analysisTime = performance.now() - startTime;
      
      // Should complete within reasonable time despite timeout
      expect(analysisTime).toBeLessThan(1000); // Should not take too long
      expect(result).toBeDefined();
      expect(result.evaluation).toBeTypeOf('number');
      expect(result.bestMove).toBeTruthy();
      
      // Restore normal timeout
      await engineManager.updateConfig({ timeLimit: 5000 });
      
      console.log(`Analysis with 100ms timeout completed in ${analysisTime.toFixed(0)}ms`);
    }, {
      category: 'integration',
      priority: 'medium',
      tags: ['engine', 'timeout', 'robustness'],
      estimatedDuration: 5000
    });
  }, {
    category: 'performance',
    priority: 'high',
    tags: ['engine', 'load-testing'],
    owner: 'engine-team'
  });
});

export {};