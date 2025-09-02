/**
 * GameAPI Test Suite
 * 
 * Comprehensive tests for the chess game logic abstraction layer.
 * Tests both basic functionality and edge cases to ensure
 * reliable chess move validation and position handling.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { createGameAPI, ChessJSGameAPI, ChessUtils } from '../src/core/game-api';
import { DEMO_GAMES, DEMO_POSITIONS } from '../src/data/demo-pgn';
import type { IGameAPI } from '../src/core/game-api';

describe('GameAPI Core Functionality', () => {
  let gameAPI: IGameAPI;

  beforeEach(() => {
    gameAPI = createGameAPI();
  });

  test('should initialize with starting position', () => {
    expect(gameAPI.fen()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(gameAPI.turn()).toBe('w');
    expect(gameAPI.isGameOver()).toBe(false);
    expect(gameAPI.moveNumber()).toBe(1);
  });

  test('should make valid moves', () => {
    const move = gameAPI.move('e4');
    expect(move).toBeTruthy();
    expect(move?.san).toBe('e4');
    expect(move?.from).toBe('e2');
    expect(move?.to).toBe('e4');
    expect(gameAPI.turn()).toBe('b');
  });

  test('should reject invalid moves', () => {
    const invalidMove = gameAPI.move('e5'); // Can't move pawn two squares from e2 to e5
    expect(invalidMove).toBe(null);
    expect(gameAPI.turn()).toBe('w'); // Turn shouldn't change
  });

  test('should handle move objects', () => {
    const move = gameAPI.move({ from: 'e2', to: 'e4' });
    expect(move).toBeTruthy();
    expect(move?.san).toBe('e4');
  });

  test('should generate legal moves', () => {
    const moves = gameAPI.moves() as string[];
    expect(moves).toContain('e4');
    expect(moves).toContain('e3');
    expect(moves).toContain('Nf3');
    expect(moves.length).toBe(20); // 20 possible opening moves
  });

  test('should generate verbose moves', () => {
    const moves = gameAPI.moves({ verbose: true });
    expect(Array.isArray(moves)).toBe(true);
    expect(moves.length).toBe(20);
    
    const firstMove = moves[0] as any;
    expect(firstMove).toHaveProperty('from');
    expect(firstMove).toHaveProperty('to');
    expect(firstMove).toHaveProperty('san');
  });

  test('should undo moves', () => {
    const originalFen = gameAPI.fen();
    
    gameAPI.move('e4');
    expect(gameAPI.fen()).not.toBe(originalFen);
    
    const undoneMove = gameAPI.undo();
    expect(undoneMove).toBeTruthy();
    expect(gameAPI.fen()).toBe(originalFen);
  });

  test('should load PGN', () => {
    const success = gameAPI.loadPgn('1. e4 e5 2. Nf3 Nc6');
    expect(success).toBe(true);
    expect(gameAPI.moveNumber()).toBe(3); // Should be on move 3 (2... Nc6 played)
    expect(gameAPI.turn()).toBe('w');
  });

  test('should load FEN', () => {
    const middlegameFen = DEMO_POSITIONS.middlegame.fen;
    const success = gameAPI.load(middlegameFen);
    expect(success).toBe(true);
    expect(gameAPI.fen().split(' ')[0]).toBe(middlegameFen.split(' ')[0]); // Same position
  });

  test('should detect check', () => {
    // Load a position where white is in check
    gameAPI.load('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
    expect(gameAPI.inCheck()).toBe(true);
    expect(gameAPI.isCheck()).toBe(true);
  });

  test('should detect checkmate', () => {
    // Scholar's mate position
    gameAPI.loadPgn('1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#');
    expect(gameAPI.inCheckmate()).toBe(true);
    expect(gameAPI.isGameOver()).toBe(true);
  });

  test('should detect stalemate', () => {
    // Known stalemate position
    gameAPI.load('k7/8/1K6/8/8/8/8/1Q6 b - - 0 1');
    expect(gameAPI.inStalemate()).toBe(true);
    expect(gameAPI.isGameOver()).toBe(true);
  });

  test('should handle promotion', () => {
    // Set up position where pawn can promote
    gameAPI.load('8/P7/8/8/8/8/8/4K2k w - - 0 1');
    
    const move = gameAPI.move({ from: 'a7', to: 'a8', promotion: 'q' });
    expect(move).toBeTruthy();
    expect(move?.promotion).toBe('q');
    
    const piece = gameAPI.get('a8');
    expect(piece?.type).toBe('q');
    expect(piece?.color).toBe('w');
  });

  test('should clone correctly', () => {
    gameAPI.move('e4');
    gameAPI.move('e5');
    
    const cloned = gameAPI.clone();
    expect(cloned.fen()).toBe(gameAPI.fen());
    expect(cloned.pgn()).toBe(gameAPI.pgn());
    
    // Moves on clone shouldn't affect original
    cloned.move('Nf3');
    expect(cloned.fen()).not.toBe(gameAPI.fen());
  });

  test('should provide board representation', () => {
    const board = gameAPI.board();
    expect(board).toHaveLength(8);
    expect(board[0]).toHaveLength(8);
    
    // Check starting position pieces
    expect(board[0][0]?.type).toBe('r'); // Black rook on a8
    expect(board[0][0]?.color).toBe('b');
    expect(board[7][0]?.type).toBe('r'); // White rook on a1  
    expect(board[7][0]?.color).toBe('w');
  });

  test('should get pieces by square', () => {
    const piece = gameAPI.get('a1');
    expect(piece?.type).toBe('r');
    expect(piece?.color).toBe('w');
    
    const empty = gameAPI.get('e4');
    expect(empty).toBe(null);
  });

  test('should validate FEN', () => {
    const validFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const result = gameAPI.validateFen(validFen);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
    
    const invalidFen = 'invalid-fen-string';
    const badResult = gameAPI.validateFen(invalidFen);
    expect(badResult.valid).toBe(false);
    expect(badResult.error).toBeTruthy();
  });
});

describe('GameAPI Position Analysis', () => {
  let gameAPI: IGameAPI;

  beforeEach(() => {
    gameAPI = createGameAPI();
  });

  test('should provide complete position info', () => {
    const position = gameAPI.getPosition();
    
    expect(position.fen).toBeTruthy();
    expect(position.pgn).toBeTruthy();
    expect(position.moveNumber).toBe(1);
    expect(position.turn).toBe('w');
    expect(position.inCheck).toBe(false);
    expect(position.inCheckmate).toBe(false);
    expect(position.inStalemate).toBe(false);
    expect(position.isGameOver).toBe(false);
  });

  test('should track move history', () => {
    gameAPI.move('e4');
    gameAPI.move('e5');
    gameAPI.move('Nf3');
    
    const history = gameAPI.history() as string[];
    expect(history).toEqual(['e4', 'e5', 'Nf3']);
    
    const verboseHistory = gameAPI.history({ verbose: true });
    expect(verboseHistory).toHaveLength(3);
  });

  test('should detect threefold repetition', () => {
    // Create a position that repeats three times
    gameAPI.loadPgn('1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8');
    expect(gameAPI.inThreefoldRepetition()).toBe(true);
  });

  test('should detect insufficient material', () => {
    // King vs King
    gameAPI.load('8/8/8/8/8/8/4k3/4K3 w - - 0 1');
    expect(gameAPI.insufficientMaterial()).toBe(true);
    expect(gameAPI.isDraw()).toBe(true);
  });
});

describe('ChessUtils', () => {
  test('should convert square to coordinates', () => {
    expect(ChessUtils.squareToCoords('a1')).toEqual([0, 0]);
    expect(ChessUtils.squareToCoords('h8')).toEqual([7, 7]);
    expect(ChessUtils.squareToCoords('e4')).toEqual([4, 3]);
  });

  test('should convert coordinates to square', () => {
    expect(ChessUtils.coordsToSquare(0, 0)).toBe('a1');
    expect(ChessUtils.coordsToSquare(7, 7)).toBe('h8');
    expect(ChessUtils.coordsToSquare(4, 3)).toBe('e4');
  });

  test('should get opposite color', () => {
    expect(ChessUtils.oppositeColor('w')).toBe('b');
    expect(ChessUtils.oppositeColor('b')).toBe('w');
  });

  test('should identify light/dark squares', () => {
    expect(ChessUtils.isLightSquare('a1')).toBe(false); // Dark square
    expect(ChessUtils.isLightSquare('h1')).toBe(true);  // Light square
    expect(ChessUtils.isLightSquare('a8')).toBe(true);  // Light square
    expect(ChessUtils.isLightSquare('h8')).toBe(false); // Dark square
  });

  test('should generate random positions', () => {
    const randomFen = ChessUtils.generateRandomPosition();
    expect(typeof randomFen).toBe('string');
    
    const testAPI = createGameAPI(randomFen);
    expect(testAPI.validateFen(randomFen).valid).toBe(true);
  });
});

describe('Demo Data Integration', () => {
  let gameAPI: IGameAPI;

  beforeEach(() => {
    gameAPI = createGameAPI();
  });

  test('should load demo games', () => {
    const demo = DEMO_GAMES.queensGambit;
    const success = gameAPI.loadPgn(demo.pgn);
    expect(success).toBe(true);
    expect(gameAPI.moveNumber()).toBeGreaterThan(1);
  });

  test('should load demo positions', () => {
    const demo = DEMO_POSITIONS.middlegame;
    const success = gameAPI.load(demo.fen);
    expect(success).toBe(true);
    expect(gameAPI.fen().split(' ')[0]).toBe(demo.fen.split(' ')[0]);
  });

  test('should handle tactical positions', () => {
    const tactical = DEMO_POSITIONS.tactical;
    gameAPI.load(tactical.fen);
    
    const moves = gameAPI.moves() as string[];
    expect(moves.length).toBeGreaterThan(0);
    expect(gameAPI.isGameOver()).toBe(false);
  });

  test('should handle endgame positions', () => {
    const endgame = DEMO_POSITIONS.endgame;
    gameAPI.load(endgame.fen);
    
    expect(gameAPI.isGameOver()).toBe(false);
    const moves = gameAPI.moves() as string[];
    expect(moves.length).toBeGreaterThan(0);
  });
});

describe('Performance Tests', () => {
  test('should handle rapid move generation', () => {
    const gameAPI = createGameAPI();
    
    const startTime = performance.now();
    for (let i = 0; i < 1000; i++) {
      gameAPI.moves();
    }
    const endTime = performance.now();
    
    const timePerCall = (endTime - startTime) / 1000;
    expect(timePerCall).toBeLessThan(1); // Should be less than 1ms per call
  });

  test('should handle rapid position analysis', () => {
    const gameAPI = createGameAPI();
    gameAPI.loadPgn(DEMO_GAMES.queensGambit.pgn);
    
    const startTime = performance.now();
    for (let i = 0; i < 1000; i++) {
      gameAPI.getPosition();
    }
    const endTime = performance.now();
    
    const timePerCall = (endTime - startTime) / 1000;
    expect(timePerCall).toBeLessThan(0.1); // Should be very fast
  });
});

export {};