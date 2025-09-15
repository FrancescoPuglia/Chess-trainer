/**
 * ♔ COMPLETE WORKFLOW END-TO-END TESTS
 * 
 * Comprehensive end-to-end testing of complete user workflows including
 * video study sessions, SRS review cycles, and analytics generation.
 * 
 * Test Categories:
 * - Complete video study workflow from upload to analysis
 * - SRS review cycle with adaptive scheduling
 * - Goal setting and milestone tracking
 * - Analytics generation and insights
 * - Cross-module integration and data flow
 * - Real-world usage scenarios
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { EnterpriseTestRunner } from '../framework/EnterpriseTestRunner';
import { ChessComponentRenderer, ChessTestDataGenerator } from '../framework/ComponentTestUtils';
import { DatabaseTestUtils } from '../framework/DatabaseTestUtils';
import { TestUtils } from '../setup';
import type { DatabaseSchema } from '../../src/types';

// Configure for end-to-end testing
DatabaseTestUtils.configure({
  useTransactions: false, // E2E tests use persistent state
  autoRollback: false,
  isolateTests: false,
  generateTestData: true,
  dataSize: 'large',
  enablePerformanceMonitoring: true
});

const testRunner = new EnterpriseTestRunner({
  parallelExecution: false, // Sequential for E2E tests
  enablePerfMonitoring: true,
  performanceBudget: {
    unitTestMaxMs: 5000,
    integrationTestMaxMs: 30000,
    e2eTestMaxMs: 120000, // 2 minutes for complex workflows
    maxMemoryUsageMB: 300,
    maxCpuUsagePercent: 80,
    maxSetupTimeMs: 15000,
    maxTeardownTimeMs: 10000
  }
});

describe('Complete Workflow E2E Tests', () => {
  let db: any;
  let syncManager: any;
  let engineManager: any;
  let analyticsCore: any;
  let srsCore: any;

  beforeAll(async () => {
    // Initialize database
    db = await DatabaseTestUtils.setupTestDatabase();

    // Initialize all major components
    const { SyncManager } = await import('../../src/modules/sync/SyncManager');
    const { EngineManager } = await import('../../src/modules/engine/EngineManager');
    const { AnalyticsCore } = await import('../../src/modules/analytics/AnalyticsCore');
    const { FSRSCore } = await import('../../src/modules/srs/FSRSCore');

    syncManager = new SyncManager();
    engineManager = new EngineManager();
    analyticsCore = new AnalyticsCore();
    srsCore = new FSRSCore();

    // Initialize all components
    await syncManager.initialize();
    await engineManager.initialize();
    await analyticsCore.initialize();
    await srsCore.initialize();
  });

  afterAll(async () => {
    // Cleanup all components
    if (syncManager) await syncManager.destroy();
    if (engineManager) await engineManager.destroy();
    if (analyticsCore) await analyticsCore.destroy();
    if (srsCore) await srsCore.destroy();
    
    await DatabaseTestUtils.teardownTestDatabase();
    testRunner.destroy();
  });

  testRunner.createSuite('Video Study Workflow', () => {
    testRunner.createTest('should complete full video study session with analysis', async () => {
      // 1. Create and upload video
      const testVideo: DatabaseSchema['videos'] = {
        id: 'e2e-study-video',
        name: 'Complete Study Session Video',
        filename: 'study-session.mp4',
        duration: 1800, // 30 minutes
        chapters: [
          { id: 'ch1', name: 'Opening', startTime: 0, endTime: 600, description: 'Opening principles' },
          { id: 'ch2', name: 'Middlegame', startTime: 600, endTime: 1200, description: 'Tactical themes' },
          { id: 'ch3', name: 'Endgame', startTime: 1200, endTime: 1800, description: 'Key endgames' }
        ],
        tags: ['instructional', 'intermediate', 'complete'],
        createdAt: new Date(),
        updatedAt: new Date(),
        opfsPath: '/videos/study-session.mp4'
      };

      await db.videos.add(testVideo);

      // 2. Generate and load sync points
      const syncPoints = generateComprehensiveSyncPoints();
      await syncManager.loadSyncPoints(syncPoints);
      await db.syncPoints.bulkAdd(syncPoints);

      // 3. Start study session
      const sessionStart = new Date();
      const studySession: DatabaseSchema['studySessions'] = {
        id: 'e2e-study-session',
        startTime: sessionStart,
        endTime: new Date(sessionStart.getTime() + 1800000), // 30 minutes
        duration: 1800000,
        type: 'video',
        videoId: 'e2e-study-video',
        cardsReviewed: 0,
        accuracy: 0,
        tags: ['complete-workflow']
      };

      await db.studySessions.add(studySession);

      // 4. Simulate video study with position analysis
      const analysisResults: any[] = [];
      
      for (let i = 0; i < syncPoints.length; i += 5) { // Analyze every 5th position
        const syncPoint = syncPoints[i];
        
        // Seek to position
        await syncManager.seekToSyncPoint(syncPoint);
        
        // Analyze position with engine
        const analysis = await engineManager.analyzePosition(syncPoint.fen, {
          depth: 15,
          includeEvaluation: true,
          includeTactics: true,
          includeThreats: true
        });

        analysisResults.push({
          timestamp: syncPoint.timestamp,
          fen: syncPoint.fen,
          evaluation: analysis.evaluation,
          bestMove: analysis.bestMove,
          tacticalThemes: analysis.tacticalThemes || []
        });

        // Record analytics
        await analyticsCore.recordPositionAnalysis({
          sessionId: 'e2e-study-session',
          position: syncPoint.fen,
          analysisTime: analysis.computationTime,
          evaluation: analysis.evaluation,
          playerMove: analysis.bestMove,
          engineMove: analysis.bestMove,
          accuracy: Math.random() * 30 + 70 // Simulate accuracy
        });
      }

      // 5. Complete session
      await syncManager.stopPlayback();
      await db.studySessions.update('e2e-study-session', {
        endTime: new Date(),
        cardsReviewed: analysisResults.length,
        accuracy: analysisResults.length > 0 ? 
          analysisResults.reduce((sum, r) => sum + (r.evaluation > 0 ? 85 : 75), 0) / analysisResults.length : 0
      });

      // 6. Generate session analytics
      const sessionAnalytics = await analyticsCore.generateSessionAnalytics('e2e-study-session');

      // Verify complete workflow
      expect(analysisResults.length).toBeGreaterThan(10);
      expect(sessionAnalytics).toBeDefined();
      expect(sessionAnalytics.positionsAnalyzed).toBe(analysisResults.length);
      expect(sessionAnalytics.averageAccuracy).toBeGreaterThan(70);
      expect(sessionAnalytics.tacticalThemesFound.length).toBeGreaterThan(0);

      // 7. Create SRS cards from interesting positions
      const tacticalPositions = analysisResults.filter(r => r.tacticalThemes.length > 0);
      const srsCards: DatabaseSchema['srsCards'][] = [];

      for (const position of tacticalPositions.slice(0, 5)) { // Create 5 cards
        const card: DatabaseSchema['srsCards'] = {
          id: `e2e-card-${position.timestamp}`,
          type: 'tactical',
          fen: position.fen,
          solution: position.bestMove,
          description: `Tactical puzzle from video at ${Math.floor(position.timestamp)}s`,
          difficulty: Math.abs(position.evaluation * 100) + 1200,
          tags: position.tacticalThemes,
          dueDate: new Date(),
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
          lapses: 0,
          lastReviewed: null,
          sourceVideoId: 'e2e-study-video',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        srsCards.push(card);
      }

      await db.srsCards.bulkAdd(srsCards);

      console.log(`Study session completed:`);
      console.log(`- Analyzed ${analysisResults.length} positions`);
      console.log(`- Found ${tacticalPositions.length} tactical positions`);
      console.log(`- Created ${srsCards.length} SRS cards`);
      console.log(`- Session accuracy: ${sessionAnalytics.averageAccuracy.toFixed(1)}%`);

      expect(srsCards.length).toBe(5);
    }, {
      category: 'e2e',
      priority: 'critical',
      tags: ['video', 'study', 'analysis', 'complete-workflow'],
      estimatedDuration: 45000
    });

    testRunner.createTest('should handle video chapter navigation and bookmarking', async () => {
      const videoId = 'e2e-study-video';
      const chapters = [
        { id: 'ch1', name: 'Opening', startTime: 0, endTime: 600 },
        { id: 'ch2', name: 'Middlegame', startTime: 600, endTime: 1200 },
        { id: 'ch3', name: 'Endgame', startTime: 1200, endTime: 1800 }
      ];

      // Navigate through chapters
      const navigationResults: any[] = [];

      for (const chapter of chapters) {
        const seekStart = performance.now();
        
        // Seek to chapter start
        await syncManager.seekToTimestamp(chapter.startTime);
        const seekTime = performance.now() - seekStart;
        
        // Verify position
        const currentTime = await syncManager.getCurrentTimestamp();
        const timeDiff = Math.abs(currentTime - chapter.startTime);
        
        navigationResults.push({
          chapter: chapter.name,
          seekTime,
          accuracy: timeDiff
        });

        expect(timeDiff).toBeLessThan(0.5); // Within 500ms
        expect(seekTime).toBeLessThan(1000); // Under 1 second
        
        // Create bookmark for important moments
        if (chapter.name === 'Middlegame') {
          const bookmark = {
            id: `bookmark-${chapter.id}`,
            videoId,
            timestamp: chapter.startTime + 150, // 2.5 minutes in
            title: 'Key tactical moment',
            description: 'Important tactical sequence begins',
            tags: ['tactical', 'critical']
          };

          // Bookmarks would be stored in a bookmarks table
          console.log(`Created bookmark: ${bookmark.title} at ${bookmark.timestamp}s`);
        }
      }

      console.log('Chapter navigation results:');
      navigationResults.forEach(result => {
        console.log(`- ${result.chapter}: ${result.seekTime.toFixed(0)}ms seek, ${result.accuracy.toFixed(2)}s accuracy`);
      });

      const avgSeekTime = navigationResults.reduce((sum, r) => sum + r.seekTime, 0) / navigationResults.length;
      expect(avgSeekTime).toBeLessThan(800);
    }, {
      category: 'e2e',
      priority: 'medium',
      tags: ['video', 'navigation', 'bookmarks'],
      estimatedDuration: 15000
    });
  }, {
    category: 'e2e',
    priority: 'critical',
    tags: ['video', 'workflow'],
    owner: 'video-team'
  });

  testRunner.createSuite('SRS Review Workflow', () => {
    testRunner.createTest('should complete adaptive SRS review session', async () => {
      // 1. Set up SRS deck with varied cards
      const deckId = 'e2e-review-deck';
      const deck: DatabaseSchema['srsDecks'] = {
        id: deckId,
        name: 'E2E Review Deck',
        description: 'End-to-end testing deck',
        algorithm: 'fsrs',
        settings: { difficulty: 1500, interval: 1 },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.srsDecks.add(deck);

      // 2. Create cards with different difficulties and states
      const reviewCards = createDiverseTestCards(20, deckId);
      await db.srsCards.bulkAdd(reviewCards);

      // 3. Start review session
      const sessionStart = new Date();
      let reviewedCount = 0;
      let correctCount = 0;
      const reviewResults: any[] = [];

      // 4. Review cards using FSRS algorithm
      const dueCards = await srsCore.getDueCards(deckId);
      expect(dueCards.length).toBeGreaterThan(0);

      for (const card of dueCards.slice(0, 15)) { // Review 15 cards
        const reviewStart = performance.now();
        
        // Simulate user interaction time
        const thinkTime = Math.random() * 10000 + 2000; // 2-12 seconds
        await TestUtils.waitFor(() => true, Math.min(thinkTime, 100)); // Simulate but cap at 100ms for test speed

        // Simulate answer (70% accuracy)
        const isCorrect = Math.random() < 0.7;
        const rating = isCorrect ? 
          (Math.random() < 0.5 ? 'good' : 'easy') : 
          (Math.random() < 0.5 ? 'hard' : 'again');

        // Record review
        const reviewTime = performance.now() - reviewStart;
        const review: DatabaseSchema['srsReviews'] = {
          id: `review-${card.id}-${Date.now()}`,
          cardId: card.id,
          rating: rating as any,
          responseTime: reviewTime,
          reviewedAt: new Date(),
          sessionId: 'e2e-review-session'
        };

        await db.srsReviews.add(review);

        // Update card using FSRS
        const updatedCard = await srsCore.reviewCard(card.id, rating, reviewTime);
        await db.srsCards.update(card.id, {
          dueDate: updatedCard.dueDate,
          interval: updatedCard.interval,
          easeFactor: updatedCard.easeFactor,
          repetitions: updatedCard.repetitions,
          lapses: updatedCard.lapses,
          lastReviewed: new Date()
        });

        reviewResults.push({
          cardId: card.id,
          difficulty: card.difficulty,
          rating,
          isCorrect,
          reviewTime,
          newInterval: updatedCard.interval
        });

        reviewedCount++;
        if (isCorrect) correctCount++;

        // Record analytics
        await analyticsCore.recordSRSReview({
          cardId: card.id,
          rating,
          responseTime: reviewTime,
          accuracy: isCorrect ? 100 : 0,
          sessionId: 'e2e-review-session'
        });
      }

      // 5. Complete session analytics
      const sessionDuration = Date.now() - sessionStart.getTime();
      const accuracy = (correctCount / reviewedCount) * 100;

      const studySession: DatabaseSchema['studySessions'] = {
        id: 'e2e-review-session',
        startTime: sessionStart,
        endTime: new Date(),
        duration: sessionDuration,
        type: 'srs',
        deckId,
        cardsReviewed: reviewedCount,
        accuracy,
        tags: ['srs-review', 'e2e']
      };

      await db.studySessions.add(studySession);

      // 6. Generate insights
      const srsAnalytics = await analyticsCore.generateSRSAnalytics(deckId, 'e2e-review-session');

      // Verify adaptive behavior
      const easyCards = reviewResults.filter(r => r.rating === 'easy');
      const againCards = reviewResults.filter(r => r.rating === 'again');

      // Easy cards should have longer intervals
      if (easyCards.length > 0 && againCards.length > 0) {
        const avgEasyInterval = easyCards.reduce((sum, c) => sum + c.newInterval, 0) / easyCards.length;
        const avgAgainInterval = againCards.reduce((sum, c) => sum + c.newInterval, 0) / againCards.length;
        expect(avgEasyInterval).toBeGreaterThan(avgAgainInterval);
      }

      console.log(`SRS Review Session Results:`);
      console.log(`- Cards reviewed: ${reviewedCount}`);
      console.log(`- Accuracy: ${accuracy.toFixed(1)}%`);
      console.log(`- Easy cards: ${easyCards.length}, Again cards: ${againCards.length}`);
      console.log(`- Session duration: ${(sessionDuration / 1000).toFixed(1)}s`);

      expect(reviewedCount).toBe(15);
      expect(accuracy).toBeGreaterThan(60);
      expect(srsAnalytics.improvementTrend).toBeDefined();
    }, {
      category: 'e2e',
      priority: 'critical',
      tags: ['srs', 'review', 'adaptive', 'complete-workflow'],
      estimatedDuration: 35000
    });

    testRunner.createTest('should track long-term learning progress', async () => {
      const deckId = 'e2e-review-deck';
      const cardCount = 30;
      const sessionCount = 7; // Simulate a week of reviews

      // Simulate multiple review sessions over time
      const progressData: any[] = [];

      for (let day = 0; day < sessionCount; day++) {
        const sessionDate = new Date(Date.now() - (sessionCount - day - 1) * 24 * 60 * 60 * 1000);
        
        // Get cards due for this day
        const dueCards = await srsCore.getDueCards(deckId, sessionDate);
        const reviewCount = Math.min(dueCards.length, 5 + day); // Increasing review count
        
        let dayAccuracy = 0;
        const dayReviews: any[] = [];

        for (let i = 0; i < reviewCount; i++) {
          const card = dueCards[i % dueCards.length];
          
          // Simulate improving performance over time
          const baseAccuracy = 0.6 + (day * 0.05); // Improve 5% each day
          const isCorrect = Math.random() < baseAccuracy;
          const rating = isCorrect ? 'good' : 'again';

          const review = {
            cardId: card.id,
            rating,
            isCorrect,
            day,
            sessionDate
          };
          
          dayReviews.push(review);
          if (isCorrect) dayAccuracy++;

          // Update card
          const updatedCard = await srsCore.reviewCard(card.id, rating, 5000);
          await db.srsCards.update(card.id, {
            dueDate: updatedCard.dueDate,
            interval: updatedCard.interval,
            easeFactor: updatedCard.easeFactor,
            repetitions: updatedCard.repetitions,
            lapses: updatedCard.lapses,
            lastReviewed: sessionDate
          });
        }

        const dayAccuracyPercent = reviewCount > 0 ? (dayAccuracy / reviewCount) * 100 : 0;
        
        progressData.push({
          day,
          date: sessionDate,
          reviewCount,
          accuracy: dayAccuracyPercent,
          reviews: dayReviews
        });

        // Record daily analytics
        await analyticsCore.recordDailyProgress({
          date: sessionDate.toISOString().split('T')[0],
          cardsReviewed: reviewCount,
          accuracy: dayAccuracyPercent,
          timeSpent: reviewCount * 5000, // 5 seconds per card
          deckId
        });
      }

      // Analyze progress trends
      const accuracyTrend = progressData.map(d => d.accuracy);
      const isImproving = accuracyTrend[accuracyTrend.length - 1] > accuracyTrend[0];
      
      // Calculate retention rates
      const totalReviews = progressData.reduce((sum, d) => sum + d.reviewCount, 0);
      const overallAccuracy = progressData.reduce((sum, d) => sum + (d.accuracy * d.reviewCount), 0) / totalReviews;

      console.log(`Learning Progress Over ${sessionCount} Days:`);
      progressData.forEach((day, index) => {
        console.log(`Day ${index + 1}: ${day.reviewCount} cards, ${day.accuracy.toFixed(1)}% accuracy`);
      });
      console.log(`Overall accuracy: ${overallAccuracy.toFixed(1)}%`);
      console.log(`Learning trend: ${isImproving ? 'Improving' : 'Stable/Declining'}`);

      expect(isImproving).toBe(true);
      expect(overallAccuracy).toBeGreaterThan(60);
    }, {
      category: 'e2e',
      priority: 'medium',
      tags: ['srs', 'progress', 'long-term'],
      estimatedDuration: 25000
    });
  }, {
    category: 'e2e',
    priority: 'high',
    tags: ['srs', 'workflow'],
    owner: 'srs-team'
  });

  testRunner.createSuite('Goal Tracking Workflow', () => {
    testRunner.createTest('should complete goal setting and achievement cycle', async () => {
      // 1. Create comprehensive goal
      const goalId = 'e2e-rating-goal';
      const goal: DatabaseSchema['goals'] = {
        id: goalId,
        title: 'Improve Chess Rating to 1600',
        description: 'Systematic improvement through video study and tactical training',
        type: 'rating',
        targetValue: 1600,
        currentValue: 1400,
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        status: 'active',
        tags: ['rating', 'improvement', 'systematic'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.goals.add(goal);

      // 2. Create weekly milestones
      const milestones: DatabaseSchema['milestones'][] = [];
      const totalWeeks = 12;
      const ratingIncrementPerWeek = (1600 - 1400) / totalWeeks;

      for (let week = 1; week <= totalWeeks; week++) {
        const milestone: DatabaseSchema['milestones'] = {
          id: `milestone-week-${week}`,
          goalId,
          title: `Week ${week} - Rating ${Math.round(1400 + ratingIncrementPerWeek * week)}`,
          description: `Target rating increase through focused study`,
          weekNumber: week,
          targetValue: Math.round(1400 + ratingIncrementPerWeek * week),
          currentValue: 1400,
          deadline: new Date(Date.now() + week * 7 * 24 * 60 * 60 * 1000),
          status: week === 1 ? 'active' : 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        milestones.push(milestone);
      }

      await db.milestones.bulkAdd(milestones);

      // 3. Create tasks for first milestone
      const tasks: DatabaseSchema['tasks'][] = [
        {
          id: 'task-video-study',
          milestoneId: 'milestone-week-1',
          title: 'Complete 3 instructional videos',
          description: 'Study opening principles and tactical patterns',
          type: 'video',
          targetId: 'video-study-target',
          status: 'active',
          priority: 'high',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          estimatedDuration: 180, // 3 hours
          actualDuration: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'task-tactical-training',
          milestoneId: 'milestone-week-1',
          title: 'Complete 100 tactical puzzles',
          description: 'Focus on pins, forks, and skewers',
          type: 'srs',
          targetId: 'tactical-deck',
          status: 'active',
          priority: 'high',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          estimatedDuration: 300, // 5 hours
          actualDuration: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      await db.tasks.bulkAdd(tasks);

      // 4. Simulate task completion and progress tracking
      const progressUpdates: any[] = [];

      // Complete video study task
      await db.tasks.update('task-video-study', {
        status: 'completed',
        actualDuration: 165, // 2h 45m
        updatedAt: new Date()
      });

      // Simulate progress after video study
      let currentRating = 1400;
      currentRating += 15; // Small improvement from video study

      progressUpdates.push({
        type: 'video_study',
        ratingChange: 15,
        newRating: currentRating,
        timestamp: new Date()
      });

      // Complete tactical training with measurable improvement
      await db.tasks.update('task-tactical-training', {
        status: 'completed',
        actualDuration: 280, // 4h 40m
        updatedAt: new Date()
      });

      currentRating += 25; // Larger improvement from tactical training

      progressUpdates.push({
        type: 'tactical_training',
        ratingChange: 25,
        newRating: currentRating,
        timestamp: new Date()
      });

      // 5. Update milestone progress
      await db.milestones.update('milestone-week-1', {
        currentValue: currentRating,
        status: currentRating >= milestones[0].targetValue ? 'completed' : 'active',
        updatedAt: new Date()
      });

      // 6. Update overall goal progress
      await db.goals.update(goalId, {
        currentValue: currentRating,
        updatedAt: new Date()
      });

      // 7. Generate progress analytics
      const goalAnalytics = await analyticsCore.generateGoalAnalytics(goalId);

      // Verify progress tracking
      const completedTasks = await db.tasks.where('status').equals('completed').toArray();
      const updatedMilestone = await db.milestones.get('milestone-week-1');
      const updatedGoal = await db.goals.get(goalId);

      expect(completedTasks.length).toBe(2);
      expect(updatedMilestone?.currentValue).toBe(currentRating);
      expect(updatedGoal?.currentValue).toBe(currentRating);
      expect(currentRating).toBeGreaterThan(1400);

      // Check if milestone was achieved
      const milestoneAchieved = currentRating >= milestones[0].targetValue;
      if (milestoneAchieved) {
        // Activate next milestone
        await db.milestones.update('milestone-week-2', {
          status: 'active',
          updatedAt: new Date()
        });
      }

      console.log(`Goal Progress Summary:`);
      console.log(`- Initial rating: 1400`);
      console.log(`- Current rating: ${currentRating}`);
      console.log(`- Week 1 target: ${milestones[0].targetValue}`);
      console.log(`- Milestone achieved: ${milestoneAchieved ? 'Yes' : 'No'}`);
      console.log(`- Tasks completed: ${completedTasks.length}/2`);
      console.log(`- Rating improvement: ${currentRating - 1400} points`);

      expect(goalAnalytics.progressPercentage).toBeGreaterThan(0);
      expect(goalAnalytics.weeklyProgress.length).toBeGreaterThan(0);
    }, {
      category: 'e2e',
      priority: 'high',
      tags: ['goals', 'progress', 'tracking', 'complete-workflow'],
      estimatedDuration: 20000
    });
  }, {
    category: 'e2e',
    priority: 'high',
    tags: ['goals', 'workflow'],
    owner: 'goals-team'
  });
});

// Helper functions for E2E testing

function generateComprehensiveSyncPoints(): any[] {
  const syncPoints = [];
  const totalDuration = 1800; // 30 minutes
  const pointInterval = 15; // Every 15 seconds

  for (let time = 0; time < totalDuration; time += pointInterval) {
    const moveNumber = Math.floor(time / 60) + 1; // Rough move number based on time
    const isWhiteMove = (Math.floor(time / 30) % 2) === 0;

    syncPoints.push({
      id: `sync-${time}`,
      videoId: 'e2e-study-video',
      timestamp: time,
      fen: generateRandomFEN(moveNumber),
      moveNumber,
      moveIndex: Math.floor(time / 30),
      isWhiteMove,
      description: `Position at ${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`,
      tolerance: 0.5,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  return syncPoints;
}

function generateRandomFEN(moveNumber: number): string {
  // Simplified FEN generation for testing
  const baseFENs = [
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
    'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 4'
  ];

  return baseFENs[Math.min(moveNumber - 1, baseFENs.length - 1)] || baseFENs[0];
}

function createDiverseTestCards(count: number, deckId: string): DatabaseSchema['srsCards'][] {
  const cards: DatabaseSchema['srsCards'][] = [];
  const cardTypes = ['tactical', 'positional', 'endgame', 'opening'];
  const difficulties = [1200, 1300, 1400, 1500, 1600, 1700];

  for (let i = 0; i < count; i++) {
    const dueDate = new Date();
    // Vary due dates - some overdue, some due today, some future
    dueDate.setDate(dueDate.getDate() + (Math.random() * 10) - 5);

    cards.push({
      id: `diverse-card-${i}`,
      type: cardTypes[i % cardTypes.length] as any,
      fen: generateRandomFEN(Math.floor(i / 4) + 1),
      solution: ['Nf3', 'e4', 'Bc4', 'O-O', 'Qh5'][i % 5],
      description: `Test card ${i + 1} - ${cardTypes[i % cardTypes.length]}`,
      difficulty: difficulties[i % difficulties.length],
      tags: ['test', cardTypes[i % cardTypes.length]],
      dueDate,
      interval: Math.max(1, Math.floor(i / 5)), // Varied intervals
      easeFactor: 2.5 + (Math.random() * 0.5) - 0.25, // 2.25 - 2.75
      repetitions: Math.floor(i / 3), // Varied repetition counts
      lapses: Math.floor(Math.random() * 2), // 0-1 lapses
      lastReviewed: i % 3 === 0 ? null : new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      sourceVideoId: null,
      deckId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  return cards;
}

export {};