/**
 * FSRS Core - Enterprise-Grade Spaced Repetition System
 * 
 * Implements the Free Spaced Repetition Scheduler (FSRS) algorithm
 * with SM-2 fallback as specified in the technical plan.
 * 
 * Features:
 * - FSRS algorithm with configurable parameters
 * - SM-2 fallback for robustness
 * - Trouble cards and leech detection
 * - Performance monitoring
 * - Grade validation and normalization
 */

import logger from '../../utils/Logger';
import type { SRSCard, SRSReview, SRSParameters } from '../../types';

export type Grade = 0 | 1 | 2 | 3 | 4 | 5; // FSRS standard grading

// Using SRSCard from types instead of local FSRSCard interface

export interface FSRSParameters {
  // Core FSRS parameters (simplified version)
  requestRetention: number;    // Target retention rate (default: 0.9)
  maximumInterval: number;     // Max days between reviews (default: 36500)
  
  // Learning parameters
  learningSteps: number[];     // Minutes for learning phase [1, 10]
  graduatingInterval: number;  // Days when card graduates (default: 1)
  easyInterval: number;       // Days for easy cards (default: 4)
  
  // Difficulty adjustment
  initialDifficulty: number;   // Starting difficulty (default: 5)
  difficultyDecay: number;    // How fast difficulty changes (default: 0.05)
  
  // Leech detection
  leechThreshold: number;     // Lapses before marking as leech (default: 8)
  leechAction: 'suspend' | 'tag'; // What to do with leeches
}

export interface ReviewStats {
  totalCards: number;
  dueCards: number;
  newCards: number;
  learningCards: number;
  reviewCards: number;
  
  todayReviews: number;
  todayCorrect: number;
  currentAccuracy: number;
  
  averageInterval: number;
  averageDifficulty: number;
  leechCount: number;
}

export class FSRSCore {
  private parameters: FSRSParameters;
  private stats: ReviewStats;

  constructor(parameters: Partial<FSRSParameters> = {}) {
    this.parameters = {
      requestRetention: 0.9,
      maximumInterval: 36500, // ~100 years
      learningSteps: [1, 10], // 1 minute, 10 minutes
      graduatingInterval: 1,
      easyInterval: 4,
      initialDifficulty: 5,
      difficultyDecay: 0.05,
      leechThreshold: 8,
      leechAction: 'tag',
      ...parameters,
    };

    this.stats = {
      totalCards: 0,
      dueCards: 0,
      newCards: 0,
      learningCards: 0,
      reviewCards: 0,
      todayReviews: 0,
      todayCorrect: 0,
      currentAccuracy: 0,
      averageInterval: 0,
      averageDifficulty: 5,
      leechCount: 0,
    };
  }

  /**
   * Grade a card using FSRS algorithm
   * This is the core implementation matching the technical plan
   */
  gradeCard(card: SRSCard, grade: Grade): SRSCard {
    const now = new Date();
    const isNew = (card.reps ?? 0) === 0;
    
    // Validate grade
    if (grade < 0 || grade > 5 || !Number.isInteger(grade)) {
      throw new Error(`Invalid grade: ${grade}. Must be integer 0-5.`);
    }

    // Calculate elapsed time since last review
    const elapsedDays = card.lastReview 
      ? (now.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24)
      : 0;

    let updatedCard = { ...card };
    updatedCard.lastReview = now;
    updatedCard.updatedAt = now;

    // Handle different card states
    if (isNew) {
      updatedCard = this.handleNewCard(updatedCard, grade);
    } else {
      updatedCard = this.handleReviewCard(updatedCard, grade, elapsedDays);
    }

    // Update leech status
    updatedCard = this.updateLeechStatus(updatedCard);

    // Update statistics
    this.updateStats(grade >= 3);

    return updatedCard;
  }

  /**
   * Handle new card grading
   */
  private handleNewCard(card: SRSCard, grade: Grade): SRSCard {
    const updated = { ...card };
    
    // Initialize FSRS parameters for new cards
    updated.difficulty = this.parameters.initialDifficulty;
    updated.stability = this.calculateInitialStability(grade);

    if (grade >= 3) {
      // Card graduates immediately
      updated.reps = 1;
      updated.interval = grade === 5 ? this.parameters.easyInterval : this.parameters.graduatingInterval;
    } else {
      // Card enters learning phase
      updated.lapses = (updated.lapses ?? 0) + 1;
      updated.interval = this.parameters.learningSteps[0] / (24 * 60); // Convert minutes to days
    }

    updated.dueDate = this.calculateDueDate(updated.interval);
    return updated;
  }

  /**
   * Handle review card grading
   */
  private handleReviewCard(card: SRSCard, grade: Grade, elapsedDays: number): SRSCard {
    const updated = { ...card };

    if (grade < 3) {
      // Failed review - lapse
      updated.lapses = (updated.lapses ?? 0) + 1;
      updated.reps = 0; // Reset reps
      updated.stability = Math.max(1, (updated.stability ?? 1) * 0.5); // Reduce stability
      updated.interval = this.parameters.learningSteps[0] / (24 * 60);
    } else {
      // Successful review
      updated.reps = (updated.reps ?? 0) + 1;
      
      // Update difficulty (gets easier with good grades)
      const currentDifficulty = updated.difficulty ?? this.parameters.initialDifficulty;
      const difficultyChange = (3 - grade) * this.parameters.difficultyDecay;
      updated.difficulty = Math.max(1, Math.min(10, currentDifficulty + difficultyChange));
      
      // Update stability using FSRS formula (simplified)
      const stabilityIncrease = this.calculateStabilityIncrease(updated, grade, elapsedDays);
      updated.stability = Math.max(1, (updated.stability ?? 1) + stabilityIncrease);
      
      // Calculate new interval
      updated.interval = Math.min(updated.stability ?? 1, this.parameters.maximumInterval);
    }

    updated.dueDate = this.calculateDueDate(updated.interval ?? 1);
    return updated;
  }

  /**
   * Calculate initial stability for new cards based on grade
   */
  private calculateInitialStability(grade: Grade): number {
    const stabilityMap = [0.5, 0.6, 0.8, 1.0, 1.3, 1.6]; // Days for grades 0-5
    return stabilityMap[grade] || 1.0;
  }

  /**
   * Calculate stability increase using simplified FSRS formula
   */
  private calculateStabilityIncrease(card: SRSCard, grade: Grade, elapsedDays: number): number {
    // Simplified FSRS formula - in reality this would be more complex
    const stability = card.stability ?? 1;
    const difficulty = card.difficulty ?? this.parameters.initialDifficulty;
    
    const retrievabilityFactor = Math.max(0.1, 1 - (elapsedDays / stability));
    const gradeFactor = (grade - 3) * 0.15 + 1; // Positive for good grades
    const difficultyFactor = Math.max(0.5, 1 - (difficulty - 5) * 0.1);
    
    return Math.max(0.1, stability * 0.1 * retrievabilityFactor * gradeFactor * difficultyFactor);
  }

  /**
   * Calculate due date from interval
   */
  private calculateDueDate(intervalDays: number): Date {
    const due = new Date();
    due.setTime(due.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    return due;
  }

  /**
   * Update leech status based on lapses
   */
  private updateLeechStatus(card: SRSCard): SRSCard {
    const lapses = card.lapses ?? 0;
    const isLeech = card.isLeech ?? false;
    
    if (lapses >= this.parameters.leechThreshold && !isLeech) {
      const updated = { ...card };
      updated.isLeech = true;
      
      if (this.parameters.leechAction === 'suspend') {
        updated.isSuspended = true;
      } else {
        // Add leech tag
        if (!updated.tags.includes('leech')) {
          updated.tags = [...updated.tags, 'leech'];
        }
      }
      
      logger.warn('srs', 'Card marked as leech due to excessive failures', { cardId: card.id, lapses, threshold: this.config.leechThreshold }, { component: 'FSRSCore', function: 'scheduleCard' });
      return updated;
    }
    
    return card;
  }

  /**
   * Update review statistics
   */
  private updateStats(correct: boolean): void {
    this.stats.todayReviews += 1;
    if (correct) {
      this.stats.todayCorrect += 1;
    }
    
    this.stats.currentAccuracy = this.stats.todayReviews > 0 
      ? this.stats.todayCorrect / this.stats.todayReviews 
      : 0;
  }

  /**
   * Get cards due for review
   */
  getDueCards(cards: SRSCard[], limit?: number): SRSCard[] {
    const now = new Date();
    const dueCards = cards
      .filter(card => !(card.isSuspended ?? false) && (card.dueDate ?? new Date()) <= now)
      .sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0));
    
    return limit ? dueCards.slice(0, limit) : dueCards;
  }

  /**
   * Get new cards ready for learning
   */
  getNewCards(cards: SRSCard[], limit?: number): SRSCard[] {
    const newCards = cards
      .filter(card => !(card.isSuspended ?? false) && (card.reps ?? 0) === 0 && (card.lapses ?? 0) === 0)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    
    return limit ? newCards.slice(0, limit) : newCards;
  }

  /**
   * Get current statistics
   */
  getStats(cards: SRSCard[]): ReviewStats {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const stats: ReviewStats = {
      totalCards: cards.length,
      dueCards: cards.filter(c => !(c.isSuspended ?? false) && (c.dueDate ?? new Date()) <= now).length,
      newCards: cards.filter(c => !(c.isSuspended ?? false) && (c.reps ?? 0) === 0 && (c.lapses ?? 0) === 0).length,
      learningCards: cards.filter(c => !(c.isSuspended ?? false) && (c.reps ?? 0) === 0 && (c.lapses ?? 0) > 0).length,
      reviewCards: cards.filter(c => !(c.isSuspended ?? false) && (c.reps ?? 0) > 0).length,
      
      todayReviews: this.stats.todayReviews,
      todayCorrect: this.stats.todayCorrect,
      currentAccuracy: this.stats.currentAccuracy,
      
      averageInterval: cards.length > 0 
        ? cards.reduce((sum, c) => sum + (c.interval ?? 0), 0) / cards.length 
        : 0,
      averageDifficulty: cards.length > 0 
        ? cards.reduce((sum, c) => sum + (c.difficulty ?? 5), 0) / cards.length 
        : 5,
      leechCount: cards.filter(c => c.isLeech ?? false).length,
    };
    
    return stats;
  }

  /**
   * SM-2 fallback algorithm for compatibility
   */
  gradeSM2(card: SRSCard, grade: Grade): SRSCard {
    logger.warn('srs', 'Falling back to SM-2 algorithm due to insufficient FSRS data', {}, { component: 'FSRSCore', function: 'sm2Fallback' });
    
    const updated = { ...card };
    updated.lastReview = new Date();
    updated.updatedAt = new Date();

    if (grade < 3) {
      updated.reps = 0;
      updated.lapses = (updated.lapses ?? 0) + 1;
      updated.interval = 1;
    } else {
      const currentReps = updated.reps ?? 0;
      const currentInterval = updated.interval ?? 1;
      const currentDifficulty = updated.difficulty ?? 5;
      
      if (currentReps === 0) {
        updated.interval = 1;
      } else if (currentReps === 1) {
        updated.interval = 6;
      } else {
        // SM-2 formula: I(n) = I(n-1) * EF
        const easeFactor = Math.max(1.3, currentDifficulty / 10 + (0.1 * (5 - grade) * (0.08 + 0.02 * grade)));
        updated.interval = Math.round(currentInterval * easeFactor);
      }
      updated.reps = currentReps + 1;
    }

    updated.dueDate = this.calculateDueDate(updated.interval ?? 1);
    return this.updateLeechStatus(updated);
  }

  /**
   * Reset daily statistics (call this at midnight)
   */
  resetDailyStats(): void {
    this.stats.todayReviews = 0;
    this.stats.todayCorrect = 0;
    this.stats.currentAccuracy = 0;
  }

  /**
   * Get parameters (for debugging/customization)
   */
  getParameters(): FSRSParameters {
    return { ...this.parameters };
  }

  /**
   * Update parameters (be careful with this)
   */
  updateParameters(updates: Partial<FSRSParameters>): void {
    this.parameters = { ...this.parameters, ...updates };
  }
}

export default FSRSCore;