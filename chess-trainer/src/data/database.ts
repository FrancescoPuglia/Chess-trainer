/**
 * Database Layer - IndexedDB with Dexie
 * 
 * Provides persistent storage for all chess training data:
 * - Videos and sync points (metadata only - files in OPFS)
 * - PGN games and studies
 * - SRS cards and reviews
 * - Goals, milestones, and tasks
 * - Analytics and KPIs
 * 
 * Design principles:
 * - Optimized for single-user performance
 * - Efficient indexing for complex queries
 * - Schema versioning for future migrations
 * - Type-safe with full TypeScript support
 */

import Dexie, { Table } from 'dexie';

import type { DatabaseSchema } from '../types';

export class ChessTrainerDB extends Dexie {
  // Video management
  videos!: Table<DatabaseSchema['videos'], string>;
  syncPoints!: Table<DatabaseSchema['syncPoints'], string>;

  // PGN and study data
  pgnGames!: Table<DatabaseSchema['pgnGames'], string>;
  studies!: Table<DatabaseSchema['studies'], string>;

  // Spaced Repetition System
  srsCards!: Table<DatabaseSchema['srsCards'], string>;
  srsReviews!: Table<DatabaseSchema['srsReviews'], string>;
  srsDecks!: Table<DatabaseSchema['srsDecks'], string>;

  // Planning and goals
  goals!: Table<DatabaseSchema['goals'], string>;
  milestones!: Table<DatabaseSchema['milestones'], string>;
  tasks!: Table<DatabaseSchema['tasks'], string>;

  // Analytics
  studySessions!: Table<DatabaseSchema['studySessions'], string>;
  kpis!: Table<DatabaseSchema['kpis'], string>;

  constructor() {
    super('ChessTrainerDB');

    // Schema version 1 - Initial setup
    this.version(1).stores({
      // Video tables
      videos: 'id, name, filename, duration, *tags, createdAt, updatedAt',
      syncPoints: 'id, timestamp, fen, moveNumber, tolerance',

      // PGN and study tables
      pgnGames: 'id, *tags, createdAt, updatedAt',
      studies: 'id, name, pgnGameId, *tags, createdAt, updatedAt',

      // SRS tables
      srsCards: 'id, type, fen, *tags, sourceVideoId, sourceStudyId, createdAt, updatedAt',
      srsReviews: 'id, cardId, rating, reviewedAt, nextDue, interval',
      srsDecks: 'id, name, algorithm, createdAt, updatedAt',

      // Planning tables
      goals: 'id, title, deadline, status, *tags, createdAt, updatedAt',
      milestones: 'id, goalId, weekNumber, deadline, status, createdAt, updatedAt',
      tasks: 'id, milestoneId, type, targetId, status, priority, dueDate, createdAt, updatedAt',

      // Analytics tables
      studySessions: 'id, startTime, endTime, duration, type, videoId, deckId, *tags',
      kpis: 'date, minutesStudied, videosCompleted, cardsReviewed, srsAccuracy, streak'
    });

    // Schema version 2 - Enhanced indexing (future)
    // this.version(2).stores({
    //   // Add compound indexes for complex queries
    //   srsReviews: 'id, cardId, rating, reviewedAt, nextDue, interval, [cardId+reviewedAt]',
    //   tasks: 'id, milestoneId, type, targetId, status, priority, dueDate, [milestoneId+status], [type+status]',
    // });
  }
}

// Global database instance
export const db = new ChessTrainerDB();

/**
 * Database service layer providing high-level operations
 */
export class DatabaseService {
  /**
   * Initialize database and request persistent storage
   */
  static async initialize(): Promise<void> {
    try {
      // Request persistent storage to prevent data eviction
      if ('storage' in navigator && 'persist' in navigator.storage) {
        const granted = await navigator.storage.persist();
        console.log('Persistent storage:', granted ? 'granted' : 'denied');
      }

      // Open database and run any pending upgrades
      await db.open();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get storage usage statistics
   */
  static async getStorageInfo(): Promise<{
    usage: number;
    quota: number;
    usagePercent: number;
    persistent: boolean;
  }> {
    if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
      return { usage: 0, quota: 0, usagePercent: 0, persistent: false };
    }

    try {
      const estimate = await navigator.storage.estimate();
      const persistent = await navigator.storage.persisted();
      
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const usagePercent = quota > 0 ? (usage / quota) * 100 : 0;

      return { usage, quota, usagePercent, persistent };
    } catch (error) {
      console.warn('Could not get storage estimate:', error);
      return { usage: 0, quota: 0, usagePercent: 0, persistent: false };
    }
  }

  /**
   * Backup all database data to JSON
   */
  static async exportData(): Promise<string> {
    try {
      const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        tables: {
          videos: await db.videos.toArray(),
          syncPoints: await db.syncPoints.toArray(),
          pgnGames: await db.pgnGames.toArray(),
          studies: await db.studies.toArray(),
          srsCards: await db.srsCards.toArray(),
          srsReviews: await db.srsReviews.toArray(),
          srsDecks: await db.srsDecks.toArray(),
          goals: await db.goals.toArray(),
          milestones: await db.milestones.toArray(),
          tasks: await db.tasks.toArray(),
          studySessions: await db.studySessions.toArray(),
          kpis: await db.kpis.toArray(),
        }
      };

      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Export failed:', error);
      throw new Error('Failed to export data');
    }
  }

  /**
   * Restore database from JSON backup
   */
  static async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);
      
      if (!data.version || !data.tables) {
        throw new Error('Invalid backup format');
      }

      // Clear existing data (with confirmation in UI)
      await db.transaction('rw', Object.values(db.tables), async () => {
        for (const table of Object.values(db.tables)) {
          await table.clear();
        }

        // Import data
        if (data.tables.videos) await db.videos.bulkAdd(data.tables.videos);
        if (data.tables.syncPoints) await db.syncPoints.bulkAdd(data.tables.syncPoints);
        if (data.tables.pgnGames) await db.pgnGames.bulkAdd(data.tables.pgnGames);
        if (data.tables.studies) await db.studies.bulkAdd(data.tables.studies);
        if (data.tables.srsCards) await db.srsCards.bulkAdd(data.tables.srsCards);
        if (data.tables.srsReviews) await db.srsReviews.bulkAdd(data.tables.srsReviews);
        if (data.tables.srsDecks) await db.srsDecks.bulkAdd(data.tables.srsDecks);
        if (data.tables.goals) await db.goals.bulkAdd(data.tables.goals);
        if (data.tables.milestones) await db.milestones.bulkAdd(data.tables.milestones);
        if (data.tables.tasks) await db.tasks.bulkAdd(data.tables.tasks);
        if (data.tables.studySessions) await db.studySessions.bulkAdd(data.tables.studySessions);
        if (data.tables.kpis) await db.kpis.bulkAdd(data.tables.kpis);
      });

      console.log('Data imported successfully');
    } catch (error) {
      console.error('Import failed:', error);
      throw new Error('Failed to import data');
    }
  }

  /**
   * Clean up old data based on retention policies
   */
  static async cleanup(retentionDays = 365): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    await db.transaction('rw', [db.studySessions, db.srsReviews, db.kpis], async () => {
      // Clean old study sessions
      await db.studySessions
        .where('startTime')
        .below(cutoffDate)
        .delete();

      // Clean old SRS reviews (but keep recent ones for statistics)
      await db.srsReviews
        .where('reviewedAt')
        .below(cutoffDate)
        .delete();

      // Clean old KPIs (but keep monthly aggregates)
      await db.kpis
        .where('date')
        .below(cutoffDate)
        .delete();
    });

    console.log(`Cleaned up data older than ${retentionDays} days`);
  }

  /**
   * Get database statistics for debugging
   */
  static async getStats(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {};
    
    for (const [tableName, table] of Object.entries(db.tables)) {
      try {
        stats[tableName] = await table.count();
      } catch (error) {
        console.warn(`Could not count ${tableName}:`, error);
        stats[tableName] = -1;
      }
    }

    return stats;
  }
}

/**
 * Utility functions for common database operations
 */
export class DatabaseUtils {
  /**
   * Generate a UUID v4
   */
  static generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Create a timestamped record
   */
  static withTimestamps<T>(record: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): T & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
  } {
    const now = new Date();
    return {
      ...record,
      id: DatabaseUtils.generateId(),
      createdAt: now,
      updatedAt: now,
    } as T & {
      id: string;
      createdAt: Date;
      updatedAt: Date;
    };
  }

  /**
   * Update timestamp on record
   */
  static updateTimestamp<T extends { updatedAt: Date }>(record: T): T {
    return {
      ...record,
      updatedAt: new Date(),
    };
  }

  /**
   * Sanitize tags array
   */
  static sanitizeTags(tags: string[]): string[] {
    return [...new Set(
      tags
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0 && tag.length <= 50)
    )];
  }

  /**
   * Safe JSON parse with fallback
   */
  static safeJsonParse<T>(json: string, fallback: T): T {
    try {
      return JSON.parse(json) as T;
    } catch {
      return fallback;
    }
  }
}

export default { db, DatabaseService, DatabaseUtils };