/**
 * ♔ DATABASE INTEGRATION TESTS
 * 
 * Comprehensive integration testing for the database layer including
 * performance testing, transaction management, and data integrity validation.
 * 
 * Test Categories:
 * - Database initialization and schema validation
 * - CRUD operations across all entities
 * - Complex queries and indexing performance
 * - Transaction management and rollback scenarios
 * - Data integrity and foreign key constraints
 * - Bulk operations and performance under load
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { EnterpriseTestRunner } from '../framework/EnterpriseTestRunner';
import { DatabaseTestUtils } from '../framework/DatabaseTestUtils';
import { TestUtils } from '../setup';
import type { DatabaseSchema } from '../../src/types';

// Configure database test environment
DatabaseTestUtils.configure({
  useTransactions: true,
  autoRollback: true,
  isolateTests: true,
  generateTestData: true,
  dataSize: 'medium',
  enablePerformanceMonitoring: true,
  queryTimeoutMs: 5000,
  bulkOperationTimeoutMs: 30000
});

const testRunner = new EnterpriseTestRunner({
  parallelExecution: false, // Sequential for database tests
  enablePerfMonitoring: true,
  performanceBudget: {
    unitTestMaxMs: 2000,
    integrationTestMaxMs: 15000,
    e2eTestMaxMs: 30000,
    maxMemoryUsageMB: 150,
    maxCpuUsagePercent: 70,
    maxSetupTimeMs: 10000,
    maxTeardownTimeMs: 5000
  }
});

describe('Database System Integration', () => {
  let db: any;

  beforeAll(async () => {
    db = await DatabaseTestUtils.setupTestDatabase();
  });

  afterAll(async () => {
    await DatabaseTestUtils.teardownTestDatabase();
    testRunner.destroy();
  });

  testRunner.createSuite('Database Schema and Initialization', () => {
    testRunner.createTest('should initialize database with correct schema', async () => {
      expect(db).toBeDefined();
      
      // Check that all required tables exist
      const requiredTables = [
        'videos', 'syncPoints', 'pgnGames', 'studies', 'srsCards', 
        'srsReviews', 'srsDecks', 'goals', 'milestones', 'tasks', 
        'studySessions', 'kpis'
      ];

      for (const tableName of requiredTables) {
        const table = db.table(tableName);
        expect(table).toBeDefined();
        expect(table.name).toBe(tableName);
      }
    }, {
      category: 'integration',
      priority: 'critical',
      tags: ['database', 'schema', 'initialization'],
      estimatedDuration: 2000
    });

    testRunner.createTest('should validate database schema integrity', async () => {
      const validation = await DatabaseTestUtils.validateSchema();
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      
      // Check that proper indexes exist
      expect(validation.indexAnalysis).toBeDefined();
      expect(validation.indexAnalysis.length).toBeGreaterThan(0);
      
      // Log any warnings for optimization opportunities
      if (validation.warnings.length > 0) {
        console.log('Schema warnings:', validation.warnings);
      }
    }, {
      category: 'integration',
      priority: 'high',
      tags: ['database', 'schema', 'validation'],
      estimatedDuration: 3000
    });

    testRunner.createTest('should handle database version migrations', async () => {
      // Test database version compatibility
      const currentVersion = await db.open();
      expect(currentVersion).toBeDefined();
      
      // Simulate migration scenario
      await db.close();
      const reopenedVersion = await db.open();
      expect(reopenedVersion).toBe(currentVersion);
    }, {
      category: 'integration',
      priority: 'medium',
      tags: ['database', 'migration', 'versioning'],
      estimatedDuration: 2000
    });
  }, {
    category: 'integration',
    priority: 'critical',
    tags: ['database', 'schema'],
    owner: 'database-team'
  });

  testRunner.createSuite('CRUD Operations', () => {
    testRunner.createTest('should perform basic CRUD operations on videos', async () => {
      await DatabaseTestUtils.withTransaction(async (testDb) => {
        // Create
        const newVideo: DatabaseSchema['videos'] = {
          id: 'test-video-crud',
          name: 'Test Video CRUD',
          filename: 'test-crud.mp4',
          duration: 1800,
          chapters: [],
          tags: ['test', 'crud'],
          createdAt: new Date(),
          updatedAt: new Date(),
          opfsPath: '/videos/test-crud.mp4'
        };

        await testDb.videos.add(newVideo);

        // Read
        const retrieved = await testDb.videos.get('test-video-crud');
        expect(retrieved).toBeDefined();
        expect(retrieved?.name).toBe('Test Video CRUD');
        expect(retrieved?.duration).toBe(1800);

        // Update
        await testDb.videos.update('test-video-crud', { 
          name: 'Updated Test Video',
          updatedAt: new Date()
        });

        const updated = await testDb.videos.get('test-video-crud');
        expect(updated?.name).toBe('Updated Test Video');

        // Delete
        await testDb.videos.delete('test-video-crud');
        const deleted = await testDb.videos.get('test-video-crud');
        expect(deleted).toBeUndefined();
      });
    }, {
      category: 'integration',
      priority: 'high',
      tags: ['database', 'crud', 'videos'],
      estimatedDuration: 3000
    });

    testRunner.createTest('should handle SRS card operations with dependencies', async () => {
      await DatabaseTestUtils.withTransaction(async (testDb) => {
        // Create dependent video first
        const video: DatabaseSchema['videos'] = {
          id: 'test-video-srs',
          name: 'SRS Test Video',
          filename: 'srs-test.mp4',
          duration: 900,
          chapters: [],
          tags: ['srs'],
          createdAt: new Date(),
          updatedAt: new Date(),
          opfsPath: '/videos/srs-test.mp4'
        };
        await testDb.videos.add(video);

        // Create SRS card
        const srsCard: DatabaseSchema['srsCards'] = {
          id: 'test-srs-card',
          type: 'tactical',
          fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 4',
          solution: 'Bxf7+',
          description: 'Test tactical fork',
          difficulty: 1400,
          tags: ['fork', 'tactics'],
          dueDate: new Date(),
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
          lapses: 0,
          lastReviewed: null,
          sourceVideoId: 'test-video-srs',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await testDb.srsCards.add(srsCard);

        // Verify the relationship
        const retrievedCard = await testDb.srsCards.get('test-srs-card');
        expect(retrievedCard?.sourceVideoId).toBe('test-video-srs');

        // Test cascading queries
        const cardsFromVideo = await testDb.srsCards
          .where('sourceVideoId')
          .equals('test-video-srs')
          .toArray();
        
        expect(cardsFromVideo).toHaveLength(1);
        expect(cardsFromVideo[0].id).toBe('test-srs-card');
      });
    }, {
      category: 'integration',
      priority: 'high',
      tags: ['database', 'srs', 'relationships'],
      estimatedDuration: 4000
    });

    testRunner.createTest('should handle complex goal and milestone hierarchies', async () => {
      await DatabaseTestUtils.withTransaction(async (testDb) => {
        // Create goal
        const goal: DatabaseSchema['goals'] = {
          id: 'test-goal-hierarchy',
          title: 'Test Goal Hierarchy',
          description: 'Testing hierarchical relationships',
          type: 'rating',
          targetValue: 1600,
          currentValue: 1400,
          deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          status: 'active',
          tags: ['test'],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        await testDb.goals.add(goal);

        // Create milestones
        const milestones: DatabaseSchema['milestones'][] = [];
        for (let i = 1; i <= 4; i++) {
          milestones.push({
            id: `test-milestone-${i}`,
            goalId: 'test-goal-hierarchy',
            title: `Milestone ${i}`,
            description: `Test milestone ${i}`,
            weekNumber: i,
            targetValue: 1400 + (i * 50),
            currentValue: 1400,
            deadline: new Date(Date.now() + (i * 7 * 24 * 60 * 60 * 1000)),
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
        await testDb.milestones.bulkAdd(milestones);

        // Create tasks for each milestone
        const tasks: DatabaseSchema['tasks'][] = [];
        for (let i = 1; i <= 4; i++) {
          for (let j = 1; j <= 3; j++) {
            tasks.push({
              id: `test-task-${i}-${j}`,
              milestoneId: `test-milestone-${i}`,
              title: `Task ${i}.${j}`,
              description: `Test task ${i}.${j}`,
              type: 'srs',
              targetId: `target-${i}-${j}`,
              status: 'pending',
              priority: 'medium',
              dueDate: new Date(Date.now() + (i * 7 + j) * 24 * 60 * 60 * 1000),
              estimatedDuration: 30,
              actualDuration: null,
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
        }
        await testDb.tasks.bulkAdd(tasks);

        // Test hierarchical queries
        const goalMilestones = await testDb.milestones
          .where('goalId')
          .equals('test-goal-hierarchy')
          .toArray();
        
        expect(goalMilestones).toHaveLength(4);

        const milestone1Tasks = await testDb.tasks
          .where('milestoneId')
          .equals('test-milestone-1')
          .toArray();
        
        expect(milestone1Tasks).toHaveLength(3);

        // Test complex query with multiple joins
        const totalTasks = await testDb.tasks
          .where('milestoneId')
          .startsWith('test-milestone-')
          .count();
        
        expect(totalTasks).toBe(12);
      });
    }, {
      category: 'integration',
      priority: 'medium',
      tags: ['database', 'hierarchy', 'goals'],
      estimatedDuration: 5000
    });
  }, {
    category: 'integration',
    priority: 'high',
    tags: ['database', 'crud'],
    owner: 'database-team'
  });

  testRunner.createSuite('Performance and Load Testing', () => {
    testRunner.createTest('should handle bulk insert operations efficiently', async () => {
      const startTime = performance.now();
      
      const metrics = await DatabaseTestUtils.performanceTest({
        bulkInsert: { table: 'srsCards', count: 1000 }
      });

      const totalTime = performance.now() - startTime;
      
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(metrics.queryCount).toBeGreaterThan(0);
      expect(metrics.averageQueryTime).toBeLessThan(1000);
      
      console.log(`Bulk insert performance: ${totalTime.toFixed(0)}ms for 1000 records`);
      console.log(`Average query time: ${metrics.averageQueryTime.toFixed(2)}ms`);
    }, {
      category: 'performance',
      priority: 'high',
      tags: ['database', 'bulk-insert', 'performance'],
      estimatedDuration: 12000
    });

    testRunner.createTest('should handle concurrent read operations', async () => {
      const concurrentQueries = 20;
      const startTime = performance.now();

      const queryPromises = Array(concurrentQueries).fill(0).map(async (_, index) => {
        return await DatabaseTestUtils.withTransaction(async (testDb) => {
          // Different types of queries to simulate real usage
          const queryType = index % 4;
          switch (queryType) {
            case 0:
              return await testDb.videos.limit(10).toArray();
            case 1:
              return await testDb.srsCards.where('type').equals('tactical').limit(5).toArray();
            case 2:
              return await testDb.studySessions.orderBy('startTime').reverse().limit(10).toArray();
            case 3:
              return await testDb.goals.where('status').equals('active').toArray();
            default:
              return [];
          }
        });
      });

      const results = await Promise.all(queryPromises);
      const totalTime = performance.now() - startTime;

      expect(results).toHaveLength(concurrentQueries);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });

      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      console.log(`Concurrent queries performance: ${totalTime.toFixed(0)}ms for ${concurrentQueries} queries`);
    }, {
      category: 'performance',
      priority: 'high',
      tags: ['database', 'concurrent', 'reads'],
      estimatedDuration: 8000
    });

    testRunner.createTest('should maintain performance with large datasets', async () => {
      // Test performance with progressively larger datasets
      const datasets = [100, 500, 1000, 2000];
      const performanceResults: any[] = [];

      for (const size of datasets) {
        const startTime = performance.now();
        
        // Generate and insert test data
        await DatabaseTestUtils.withTransaction(async (testDb) => {
          const testCards = Array(size).fill(0).map((_, i) => ({
            id: `perf-test-${size}-${i}`,
            type: 'tactical' as const,
            fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 4',
            solution: 'Bxf7+',
            description: `Performance test card ${i}`,
            difficulty: 1200 + (i % 800),
            tags: ['performance', 'test'],
            dueDate: new Date(),
            interval: 1,
            easeFactor: 2.5,
            repetitions: 0,
            lapses: 0,
            lastReviewed: null,
            createdAt: new Date(),
            updatedAt: new Date()
          }));

          await testDb.srsCards.bulkAdd(testCards);
          
          // Test query performance
          const queryStart = performance.now();
          await testDb.srsCards.where('id').startsWith(`perf-test-${size}-`).toArray();
          const queryTime = performance.now() - queryStart;
          
          performanceResults.push({
            size,
            insertTime: performance.now() - startTime,
            queryTime
          });
        });
      }

      // Analyze performance scaling
      performanceResults.forEach((result, index) => {
        console.log(`Dataset ${result.size}: Insert ${result.insertTime.toFixed(0)}ms, Query ${result.queryTime.toFixed(0)}ms`);
        
        // Query time should scale sub-linearly (thanks to indexing)
        if (index > 0) {
          const prevResult = performanceResults[index - 1];
          const sizeRatio = result.size / prevResult.size;
          const timeRatio = result.queryTime / prevResult.queryTime;
          
          // Query time should not increase linearly with data size
          expect(timeRatio).toBeLessThan(sizeRatio * 1.5);
        }
      });
    }, {
      category: 'performance',
      priority: 'medium',
      tags: ['database', 'scaling', 'performance'],
      estimatedDuration: 15000
    });
  }, {
    category: 'performance',
    priority: 'high',
    tags: ['database', 'performance'],
    owner: 'database-team'
  });

  testRunner.createSuite('Data Integrity and Transactions', () => {
    testRunner.createTest('should maintain data consistency during concurrent writes', async () => {
      const initialCount = await db.srsCards.count();
      const concurrentWrites = 10;

      const writePromises = Array(concurrentWrites).fill(0).map(async (_, index) => {
        return await DatabaseTestUtils.withTransaction(async (testDb) => {
          const card: DatabaseSchema['srsCards'] = {
            id: `concurrent-${index}`,
            type: 'tactical',
            fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 4',
            solution: 'Bxf7+',
            description: `Concurrent test card ${index}`,
            difficulty: 1300,
            tags: ['concurrent', 'test'],
            dueDate: new Date(),
            interval: 1,
            easeFactor: 2.5,
            repetitions: 0,
            lapses: 0,
            lastReviewed: null,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          await testDb.srsCards.add(card);
          return card.id;
        });
      });

      const results = await Promise.all(writePromises);
      const finalCount = await db.srsCards.where('id').startsWith('concurrent-').count();

      expect(results).toHaveLength(concurrentWrites);
      expect(finalCount).toBe(concurrentWrites);
      
      // Verify all cards were created with unique IDs
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(concurrentWrites);
    }, {
      category: 'integration',
      priority: 'high',
      tags: ['database', 'consistency', 'concurrency'],
      estimatedDuration: 6000
    });

    testRunner.createTest('should handle transaction rollback on errors', async () => {
      const initialVideoCount = await db.videos.count();

      try {
        await DatabaseTestUtils.withTransaction(async (testDb) => {
          // Add a valid video
          await testDb.videos.add({
            id: 'rollback-test-1',
            name: 'Rollback Test Video 1',
            filename: 'rollback1.mp4',
            duration: 600,
            chapters: [],
            tags: ['rollback'],
            createdAt: new Date(),
            updatedAt: new Date(),
            opfsPath: '/videos/rollback1.mp4'
          });

          // Add another valid video
          await testDb.videos.add({
            id: 'rollback-test-2',
            name: 'Rollback Test Video 2',
            filename: 'rollback2.mp4',
            duration: 800,
            chapters: [],
            tags: ['rollback'],
            createdAt: new Date(),
            updatedAt: new Date(),
            opfsPath: '/videos/rollback2.mp4'
          });

          // This should cause a constraint violation (duplicate ID)
          await testDb.videos.add({
            id: 'rollback-test-1', // Duplicate ID
            name: 'Duplicate Video',
            filename: 'duplicate.mp4',
            duration: 400,
            chapters: [],
            tags: ['duplicate'],
            createdAt: new Date(),
            updatedAt: new Date(),
            opfsPath: '/videos/duplicate.mp4'
          });
        });

        // Should not reach here
        expect(false).toBe(true);
      } catch (error) {
        // Transaction should have rolled back
        const finalVideoCount = await db.videos.count();
        expect(finalVideoCount).toBe(initialVideoCount);

        // Verify neither video was added
        const rollbackVideos = await db.videos.where('id').startsWith('rollback-test-').toArray();
        expect(rollbackVideos).toHaveLength(0);
      }
    }, {
      category: 'integration',
      priority: 'high',
      tags: ['database', 'transactions', 'rollback'],
      estimatedDuration: 4000
    });
  }, {
    category: 'integration',
    priority: 'high',
    tags: ['database', 'integrity'],
    owner: 'database-team'
  });
});

export {};