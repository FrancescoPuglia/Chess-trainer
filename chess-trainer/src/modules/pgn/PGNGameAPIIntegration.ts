/**
 * ♔ PGN-GAMEAPI INTEGRATION LAYER
 * 
 * Professional integration layer connecting PGN parsing with GameAPI
 * for seamless chess training workflow with enterprise error handling.
 * 
 * Features:
 * - Direct PGN → GameAPI integration
 * - Move validation and error recovery  
 * - Position analysis and metadata extraction
 * - Performance optimization for large PGN files
 * - Training data extraction and formatting
 */

import type { 
  PGNGame, 
  ChessMove, 
  TrainingLesson,
  GameAnalysis,
  PGNParseResult,
  LessonMetadata,
  IGameAPI,
  SyncPoint
} from '../../types/index.js';
import { PGNParser } from './PGNParser.js';
import { ChessJSGameAPI } from '../../core/game-api.js';
import { QualityGate } from '../../utils/QualityGate.js';

export interface PGNIntegrationConfig {
  validateMoves: boolean;           // Validate each move with GameAPI
  extractAnalysis: boolean;         // Extract engine analysis from comments
  generateSyncSuggestions: boolean; // Suggest sync points based on timing
  preserveVariations: boolean;      // Include variations in training data
  maxGamesPerLesson: number;        // Limit games per lesson
  autoCreateLessons: boolean;       // Auto-group games into lessons
}

export interface GameValidationResult {
  isValid: boolean;
  validMoves: number;
  totalMoves: number;
  errors: Array<{
    moveIndex: number;
    move: string;
    error: string;
  }>;
  recoveredPositions: ChessMove[];
}

export interface LessonCreationResult {
  success: boolean;
  lessons: TrainingLesson[];
  totalGames: number;
  validGames: number;
  errors: string[];
  performance: {
    parseTimeMs: number;
    validationTimeMs: number;
    totalTimeMs: number;
  };
}

/**
 * Professional PGN-GameAPI integration service
 */
export class PGNGameAPIIntegration {
  private parser: PGNParser;
  private gameAPI: IGameAPI;
  private qualityGate: QualityGate;
  private config: PGNIntegrationConfig;

  private static readonly DEFAULT_CONFIG: PGNIntegrationConfig = {
    validateMoves: true,
    extractAnalysis: true,
    generateSyncSuggestions: true,
    preserveVariations: true,
    maxGamesPerLesson: 10,
    autoCreateLessons: true,
  };

  constructor(
    gameAPI?: IGameAPI,
    config?: Partial<PGNIntegrationConfig>
  ) {
    this.gameAPI = gameAPI || new ChessJSGameAPI();
    this.config = { ...PGNGameAPIIntegration.DEFAULT_CONFIG, ...config };
    this.parser = new PGNParser(this.gameAPI, {
      preserveComments: this.config.extractAnalysis,
      parseVariations: this.config.preserveVariations,
    });
    this.qualityGate = new QualityGate();
  }

  /**
   * Process PGN content into training lessons
   */
  async processPGNToLessons(content: string): Promise<LessonCreationResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // Parse PGN content
      const parseStartTime = Date.now();
      const parseResult = await this.parser.parsePGN(content);
      const parseTimeMs = Date.now() - parseStartTime;

      if (!parseResult.success) {
        return {
          success: false,
          lessons: [],
          totalGames: 0,
          validGames: 0,
          errors: parseResult.errors.map(e => e.message),
          performance: {
            parseTimeMs,
            validationTimeMs: 0,
            totalTimeMs: Date.now() - startTime,
          },
        };
      }

      // Validate games with GameAPI
      const validationStartTime = Date.now();
      const validatedGames: Array<{ game: PGNGame; validation: GameValidationResult }> = [];
      
      for (const game of parseResult.games) {
        try {
          const validation = await this.validateGameMoves(game);
          validatedGames.push({ game, validation });

          if (!validation.isValid) {
            errors.push(`Game "${game.headers.Event || 'Unknown'}" has ${validation.errors.length} move errors`);
          }
        } catch (error) {
          errors.push(`Failed to validate game: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      const validationTimeMs = Date.now() - validationStartTime;
      const validGames = validatedGames.filter(vg => vg.validation.isValid).length;

      // Create training lessons
      const lessons = this.config.autoCreateLessons
        ? await this.createTrainingLessons(validatedGames)
        : await this.createSingleLesson(validatedGames);

      return {
        success: true,
        lessons,
        totalGames: parseResult.games.length,
        validGames,
        errors,
        performance: {
          parseTimeMs,
          validationTimeMs,
          totalTimeMs: Date.now() - startTime,
        },
      };

    } catch (error) {
      return {
        success: false,
        lessons: [],
        totalGames: 0,
        validGames: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        performance: {
          parseTimeMs: 0,
          validationTimeMs: 0,
          totalTimeMs: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Validate game moves using GameAPI
   */
  private async validateGameMoves(game: PGNGame): Promise<GameValidationResult> {
    const errors: Array<{ moveIndex: number; move: string; error: string }> = [];
    const recoveredPositions: ChessMove[] = [];
    
    this.gameAPI.reset();
    let validMoves = 0;

    for (let i = 0; i < game.moves.length; i++) {
      const move = game.moves[i];
      
      try {
        // Attempt to make the move
        const result = this.gameAPI.move(move.san);
        
        if (result) {
          validMoves++;
          recoveredPositions.push(result);
        } else {
          // Move failed - try to recover
          const recovery = await this.attemptMoveRecovery(move, i);
          if (recovery) {
            validMoves++;
            recoveredPositions.push(recovery);
          } else {
            errors.push({
              moveIndex: i,
              move: move.san,
              error: 'Invalid move notation',
            });
          }
        }
      } catch (error) {
        errors.push({
          moveIndex: i,
          move: move.san,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const isValid = errors.length === 0;
    
    if (isValid) {
      this.qualityGate.recordPerformance('gameValidationMs', Date.now());
    } else {
      this.qualityGate.recordIssue('warning', `Game validation failed: ${errors.length} errors`);
    }

    return {
      isValid,
      validMoves,
      totalMoves: game.moves.length,
      errors,
      recoveredPositions: recoveredPositions.length > 0 ? recoveredPositions : game.moves,
    };
  }

  /**
   * Attempt to recover from invalid moves
   */
  private async attemptMoveRecovery(move: ChessMove, moveIndex: number): Promise<ChessMove | null> {
    // Try common notation variations
    const variations = [
      move.san,
      move.san.replace('+', '').replace('#', ''), // Remove check/mate symbols
      move.san.replace('x', ''),                   // Remove capture symbol
      move.san.toLowerCase(),                       // Try lowercase
      move.san.toUpperCase(),                      // Try uppercase
    ];

    for (const variation of variations) {
      const result = this.gameAPI.move(variation);
      if (result) {
        this.qualityGate.recordIssue('info', `Recovered move ${moveIndex}: ${move.san} → ${variation}`);
        return result;
      }
    }

    // Try using FEN if available
    if (move.fen) {
      try {
        this.gameAPI.loadFEN(move.fen);
        const currentFEN = this.gameAPI.fen();
        if (currentFEN === move.fen) {
          // Create synthetic move data
          return {
            ...move,
            san: move.san,
            fen: move.fen,
          };
        }
      } catch (error) {
        // FEN recovery failed
      }
    }

    return null;
  }

  /**
   * Create training lessons from validated games
   */
  private async createTrainingLessons(
    validatedGames: Array<{ game: PGNGame; validation: GameValidationResult }>
  ): Promise<TrainingLesson[]> {
    const lessons: TrainingLesson[] = [];
    
    // Group games by event/tournament
    const gamesByEvent = new Map<string, Array<{ game: PGNGame; validation: GameValidationResult }>>();
    
    for (const validatedGame of validatedGames) {
      const event = validatedGame.game.headers.Event || 'Unknown Event';
      if (!gamesByEvent.has(event)) {
        gamesByEvent.set(event, []);
      }
      gamesByEvent.get(event)!.push(validatedGame);
    }

    // Create lesson for each event
    for (const [event, eventGames] of gamesByEvent) {
      const validGamesList = eventGames.filter(vg => vg.validation.isValid);
      
      if (validGamesList.length === 0) continue;

      // Split into smaller lessons if needed
      const chunks = this.chunkGames(validGamesList, this.config.maxGamesPerLesson);
      
      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];
        const lessonTitle = chunks.length > 1 
          ? `${event} - Part ${chunkIndex + 1}`
          : event;

        const lesson = await this.createLessonFromGames(
          lessonTitle,
          chunk.map(vg => ({ game: vg.game, moves: vg.validation.recoveredPositions }))
        );

        if (lesson) {
          lessons.push(lesson);
        }
      }
    }

    return lessons;
  }

  /**
   * Create single lesson from all games
   */
  private async createSingleLesson(
    validatedGames: Array<{ game: PGNGame; validation: GameValidationResult }>
  ): Promise<TrainingLesson[]> {
    const validGames = validatedGames
      .filter(vg => vg.validation.isValid)
      .map(vg => ({ game: vg.game, moves: vg.validation.recoveredPositions }));

    if (validGames.length === 0) return [];

    const lesson = await this.createLessonFromGames('Training Session', validGames);
    return lesson ? [lesson] : [];
  }

  /**
   * Create lesson from games data
   */
  private async createLessonFromGames(
    title: string,
    games: Array<{ game: PGNGame; moves: ChessMove[] }>
  ): Promise<TrainingLesson | null> {
    try {
      const totalMoves = games.reduce((sum, g) => sum + g.moves.length, 0);
      const avgMovesPerGame = Math.floor(totalMoves / games.length);

      // Extract training data
      const puzzlePositions = games.flatMap(g => g.game.trainingData?.puzzlePositions || []);
      const keyMoments = games.flatMap(g => g.game.trainingData?.keyMoments || []);
      
      // Generate suggested sync points if enabled
      const suggestedSyncPoints = this.config.generateSyncSuggestions
        ? this.generateSyncSuggestions(games)
        : [];

      // Create analysis data
      const analysis: GameAnalysis = {
        totalGames: games.length,
        totalMoves,
        avgMovesPerGame,
        hasAnalysis: games.some(g => g.game.comments.length > 0),
        difficulty: this.calculateDifficulty(games),
        keyPositions: puzzlePositions.length + keyMoments.length,
        themes: this.extractThemes(games),
      };

      const metadata: LessonMetadata = {
        id: this.generateLessonId(title),
        title,
        description: this.generateDescription(games),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0',
        source: 'pgn_import',
        tags: this.extractTags(games),
        difficulty: analysis.difficulty,
        estimatedDuration: Math.ceil(totalMoves * 0.1), // ~0.1 min per move
      };

      const lesson: TrainingLesson = {
        ...metadata,
        games: games.map(g => g.game),
        moves: games.flatMap(g => g.moves),
        analysis,
        syncPoints: suggestedSyncPoints,
        hasVideo: false, // Will be set when video is uploaded
        videoSrc: null,
      };

      return lesson;

    } catch (error) {
      this.qualityGate.recordError(error as Error, 'warning');
      return null;
    }
  }

  /**
   * Generate sync point suggestions based on game analysis
   */
  private generateSyncSuggestions(games: Array<{ game: PGNGame; moves: ChessMove[] }>): SyncPoint[] {
    const syncPoints: SyncPoint[] = [];
    
    // Assume 5 seconds per move on average for initial suggestions
    const avgTimePerMove = 5;
    let currentTime = 0;
    let moveIndex = 0;

    for (const gameData of games) {
      // Add sync point at game start
      if (gameData.moves.length > 0) {
        syncPoints.push({
          timestamp: currentTime,
          moveIndex,
          fen: gameData.moves[0].fen,
          moveNumber: 1,
          isWhiteMove: true,
        });
      }

      // Add sync points for key moments
      for (const keyMoment of gameData.game.trainingData?.keyMoments || []) {
        const timeOffset = keyMoment.moveIndex * avgTimePerMove;
        syncPoints.push({
          timestamp: currentTime + timeOffset,
          moveIndex: moveIndex + keyMoment.moveIndex,
          fen: gameData.moves[keyMoment.moveIndex]?.fen || gameData.moves[0].fen,
          moveNumber: Math.floor(keyMoment.moveIndex / 2) + 1,
          isWhiteMove: keyMoment.moveIndex % 2 === 0,
        });
      }

      currentTime += gameData.moves.length * avgTimePerMove;
      moveIndex += gameData.moves.length;
    }

    return syncPoints.slice(0, 20); // Limit to 20 suggestions
  }

  /**
   * Calculate lesson difficulty
   */
  private calculateDifficulty(games: Array<{ game: PGNGame; moves: ChessMove[] }>): number {
    let totalDifficulty = 0;
    let count = 0;

    for (const gameData of games) {
      // Base difficulty on move count and complexity
      const moveCount = gameData.moves.length;
      const hasAnalysis = gameData.game.comments.length > 0;
      const hasVariations = gameData.game.variations.length > 0;
      
      let gameDifficulty = Math.min(5, Math.floor(moveCount / 20)); // 1-5 based on length
      
      if (hasAnalysis) gameDifficulty += 1;
      if (hasVariations) gameDifficulty += 1;
      
      // Extract difficulty from comments
      for (const comment of gameData.game.comments) {
        const difficultyMatch = comment.text.match(/difficulty[:\s]*(\d+)/i);
        if (difficultyMatch) {
          gameDifficulty = Math.max(gameDifficulty, parseInt(difficultyMatch[1], 10));
        }
      }

      totalDifficulty += Math.min(5, gameDifficulty);
      count++;
    }

    return count > 0 ? Math.ceil(totalDifficulty / count) : 3;
  }

  /**
   * Extract themes from games
   */
  private extractThemes(games: Array<{ game: PGNGame; moves: ChessMove[] }>): string[] {
    const themes = new Set<string>();
    
    for (const gameData of games) {
      // Extract from headers
      const opening = gameData.game.headers.Opening;
      if (opening) {
        themes.add(opening);
      }

      // Extract from comments
      for (const comment of gameData.game.comments) {
        const text = comment.text.toLowerCase();
        
        if (text.includes('tactic')) themes.add('Tactics');
        if (text.includes('endgame')) themes.add('Endgame');
        if (text.includes('opening')) themes.add('Opening');
        if (text.includes('middlegame')) themes.add('Middlegame');
        if (text.includes('attack')) themes.add('Attack');
        if (text.includes('defense')) themes.add('Defense');
        if (text.includes('positional')) themes.add('Positional');
        if (text.includes('calculation')) themes.add('Calculation');
      }
    }

    return Array.from(themes).slice(0, 5); // Max 5 themes
  }

  /**
   * Extract tags from games
   */
  private extractTags(games: Array<{ game: PGNGame; moves: ChessMove[] }>): string[] {
    const tags = new Set<string>();
    
    for (const gameData of games) {
      // Add player names
      if (gameData.game.headers.White && gameData.game.headers.White !== 'Unknown') {
        tags.add(gameData.game.headers.White);
      }
      if (gameData.game.headers.Black && gameData.game.headers.Black !== 'Unknown') {
        tags.add(gameData.game.headers.Black);
      }

      // Add event
      if (gameData.game.headers.Event && gameData.game.headers.Event !== 'Unknown Event') {
        tags.add(gameData.game.headers.Event);
      }

      // Add year if available
      const year = gameData.game.headers.Date?.match(/(\d{4})/)?.[1];
      if (year) {
        tags.add(year);
      }
    }

    return Array.from(tags).slice(0, 10); // Max 10 tags
  }

  /**
   * Generate lesson description
   */
  private generateDescription(games: Array<{ game: PGNGame; moves: ChessMove[] }>): string {
    const totalMoves = games.reduce((sum, g) => sum + g.moves.length, 0);
    const avgMoves = Math.floor(totalMoves / games.length);
    
    const players = new Set<string>();
    const events = new Set<string>();
    
    for (const gameData of games) {
      if (gameData.game.headers.White !== 'Unknown') players.add(gameData.game.headers.White);
      if (gameData.game.headers.Black !== 'Unknown') players.add(gameData.game.headers.Black);
      if (gameData.game.headers.Event !== 'Unknown Event') events.add(gameData.game.headers.Event);
    }

    let description = `Training lesson with ${games.length} game${games.length > 1 ? 's' : ''} `;
    description += `(${totalMoves} moves, avg ${avgMoves} per game).`;

    if (events.size > 0) {
      description += ` From: ${Array.from(events).slice(0, 3).join(', ')}`;
    }

    if (players.size > 0) {
      description += `. Features games by: ${Array.from(players).slice(0, 5).join(', ')}`;
    }

    return description;
  }

  /**
   * Generate unique lesson ID
   */
  private generateLessonId(title: string): string {
    const timestamp = Date.now();
    const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `${cleanTitle}-${timestamp}`;
  }

  /**
   * Chunk games into smaller groups
   */
  private chunkGames<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

/**
 * Utility function for quick PGN to lesson conversion
 */
export async function convertPGNToLessons(
  content: string,
  config?: Partial<PGNIntegrationConfig>
): Promise<LessonCreationResult> {
  const integration = new PGNGameAPIIntegration(undefined, config);
  return integration.processPGNToLessons(content);
}

export default PGNGameAPIIntegration;