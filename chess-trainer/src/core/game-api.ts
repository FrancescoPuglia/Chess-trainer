/**
 * GameAPI - Abstraction layer for chess logic
 * 
 * This interface allows us to switch between chess.js and chessops
 * without affecting the rest of the application.
 * 
 * Current implementation: chess.js (proven, stable)
 * Future migration: chessops (TypeScript-native, faster)
 */

import { Chess } from 'chess.js';

import type { 
  ChessMove, 
  GamePosition, 
  Color, 
  Square, 
  PieceSymbol,
  ChessPiece 
} from '../types';

export interface IGameAPI {
  // Game state
  fen(): string;
  pgn(): string;
  turn(): Color;
  isGameOver(): boolean;
  isCheck(): boolean;
  isCheckmate(): boolean;
  isStalemate(): boolean;
  isDraw(): boolean;
  
  // Move handling
  move(move: string | { from: Square; to: Square; promotion?: PieceSymbol }): ChessMove | null;
  moves(options?: { square?: Square; verbose?: boolean }): string[] | ChessMove[];
  undo(): ChessMove | null;
  
  // Position manipulation
  load(fen: string): boolean;
  loadPgn(pgn: string): boolean;
  clear(): void;
  reset(): void;
  
  // Board inspection
  get(square: Square): ChessPiece | null;
  board(): (ChessPiece | null)[][];
  
  // Validation
  validateFen(fen: string): { valid: boolean; error?: string };
  
  // History and navigation
  history(options?: { verbose?: boolean }): string[] | ChessMove[];
  moveNumber(): number;
  
  // Position analysis
  inCheck(): boolean;
  inCheckmate(): boolean;
  inStalemate(): boolean;
  inDraw(): boolean;
  inThreefoldRepetition(): boolean;
  insufficientMaterial(): boolean;
  
  // Utility
  ascii(): string;
  clone(): IGameAPI;
  getPosition(): GamePosition;
}

/**
 * Chess.js implementation of GameAPI
 * 
 * Provides a consistent interface while using chess.js as the backend.
 * All methods are carefully typed and documented.
 */
export class ChessJSGameAPI implements IGameAPI {
  private chess: Chess;

  constructor(fen?: string) {
    this.chess = new Chess();
    if (fen) {
      this.chess.load(fen);
    }
  }

  // Game state methods
  fen(): string {
    return this.chess.fen();
  }

  pgn(): string {
    return this.chess.pgn();
  }

  turn(): Color {
    return this.chess.turn();
  }

  isGameOver(): boolean {
    return this.chess.isGameOver();
  }

  isCheck(): boolean {
    return this.chess.inCheck();
  }

  isCheckmate(): boolean {
    return this.chess.isCheckmate();
  }

  isStalemate(): boolean {
    return this.chess.isStalemate();
  }

  isDraw(): boolean {
    return this.chess.isDraw();
  }

  // Move handling methods
  move(moveInput: string | { from: Square; to: Square; promotion?: PieceSymbol }): ChessMove | null {
    try {
      const move = this.chess.move(moveInput);
      if (!move) return null;

      return {
        from: move.from as Square,
        to: move.to as Square,
        promotion: move.promotion as PieceSymbol | undefined,
        san: move.san,
        fen: this.chess.fen(),
        captured: move.captured as PieceSymbol | undefined,
        flags: move.flags
      };
    } catch (error) {
      console.warn('Invalid move attempted:', moveInput, error);
      return null;
    }
  }

  moves(options?: { square?: Square; verbose?: boolean }): string[] | ChessMove[] {
    const chessOptions: any = {};
    if (options?.square) chessOptions.square = options.square;
    if (options?.verbose) chessOptions.verbose = options.verbose;

    const moves = this.chess.moves(chessOptions);
    
    if (options?.verbose) {
      return (moves as any[]).map(move => ({
        from: move.from as Square,
        to: move.to as Square,
        promotion: move.promotion as PieceSymbol | undefined,
        san: move.san,
        fen: move.after, // chess.js provides this in verbose mode
        captured: move.captured as PieceSymbol | undefined,
        flags: move.flags
      }));
    }
    
    return moves;
  }

  undo(): ChessMove | null {
    const move = this.chess.undo();
    if (!move) return null;

    return {
      from: move.from as Square,
      to: move.to as Square,
      promotion: move.promotion as PieceSymbol | undefined,
      san: move.san,
      fen: this.chess.fen(),
      captured: move.captured as PieceSymbol | undefined,
      flags: move.flags
    };
  }

  // Position manipulation methods
  load(fen: string): boolean {
    try {
      const result = this.chess.load(fen);
      return result === true;
    } catch (error) {
      console.warn('Failed to load FEN:', fen, error);
      return false;
    }
  }

  loadPgn(pgn: string): boolean {
    try {
      const result = this.chess.loadPgn(pgn);
      return result === true;
    } catch (error) {
      console.warn('Failed to load PGN:', error);
      return false;
    }
  }

  clear(): void {
    this.chess.clear();
  }

  reset(): void {
    this.chess.reset();
  }

  // Board inspection methods
  get(square: Square): ChessPiece | null {
    const piece = this.chess.get(square);
    if (!piece) return null;
    
    return {
      type: piece.type as PieceSymbol,
      color: piece.color as Color
    };
  }

  board(): (ChessPiece | null)[][] {
    return this.chess.board().map(row =>
      row.map(cell => 
        cell ? { 
          type: cell.type as PieceSymbol, 
          color: cell.color as Color 
        } : null
      )
    );
  }

  // Validation methods
  validateFen(fen: string): { valid: boolean; error?: string } {
    try {
      const tempChess = new Chess();
      const isValid = tempChess.load(fen);
      return { valid: isValid === true };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Invalid FEN' 
      };
    }
  }

  // History and navigation methods
  history(options?: { verbose?: boolean }): string[] | ChessMove[] {
    const history = this.chess.history(options as any);
    
    if (options?.verbose) {
      return (history as any[]).map(move => ({
        from: move.from as Square,
        to: move.to as Square,
        promotion: move.promotion as PieceSymbol | undefined,
        san: move.san,
        fen: move.after || this.chess.fen(), // fallback to current FEN
        captured: move.captured as PieceSymbol | undefined,
        flags: move.flags
      }));
    }
    
    return history as string[];
  }

  moveNumber(): number {
    const fen = this.chess.fen();
    const parts = fen.split(' ');
    return parseInt(parts[5] || '1', 10);
  }

  // Position analysis methods
  inCheck(): boolean {
    return this.chess.inCheck();
  }

  inCheckmate(): boolean {
    return this.chess.isCheckmate();
  }

  inStalemate(): boolean {
    return this.chess.isStalemate();
  }

  inDraw(): boolean {
    return this.chess.isDraw();
  }

  inThreefoldRepetition(): boolean {
    return this.chess.isThreefoldRepetition();
  }

  insufficientMaterial(): boolean {
    return this.chess.isInsufficientMaterial();
  }

  // Utility methods
  ascii(): string {
    return this.chess.ascii();
  }

  clone(): IGameAPI {
    const clonedAPI = new ChessJSGameAPI();
    clonedAPI.chess.load(this.chess.fen());
    return clonedAPI;
  }

  getPosition(): GamePosition {
    return {
      fen: this.chess.fen(),
      pgn: this.chess.pgn(),
      moveNumber: this.moveNumber(),
      halfMoveNumber: parseInt(this.chess.fen().split(' ')[4] || '0', 10),
      turn: this.chess.turn(),
      inCheck: this.chess.inCheck(),
      inCheckmate: this.chess.isCheckmate(),
      inStalemate: this.chess.isStalemate(),
      inDraw: this.chess.isDraw(),
      isGameOver: this.chess.isGameOver()
    };
  }
}

/**
 * Factory function to create a new GameAPI instance
 * 
 * This allows us to switch implementations easily:
 * - Current: ChessJSGameAPI
 * - Future: ChessopsGameAPI (when we migrate)
 */
export function createGameAPI(fen?: string): IGameAPI {
  return new ChessJSGameAPI(fen);
}

/**
 * Utility functions for common chess operations
 */
export class ChessUtils {
  /**
   * Convert algebraic notation to coordinates
   */
  static squareToCoords(square: Square): [number, number] {
    const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = parseInt(square[1]) - 1;
    return [file, rank];
  }

  /**
   * Convert coordinates to algebraic notation
   */
  static coordsToSquare(file: number, rank: number): Square {
    const fileChar = String.fromCharCode('a'.charCodeAt(0) + file);
    return `${fileChar}${rank + 1}` as Square;
  }

  /**
   * Get the opposite color
   */
  static oppositeColor(color: Color): Color {
    return color === 'w' ? 'b' : 'w';
  }

  /**
   * Check if a square is light or dark
   */
  static isLightSquare(square: Square): boolean {
    const [file, rank] = ChessUtils.squareToCoords(square);
    return (file + rank) % 2 === 1;
  }

  /**
   * Generate a random valid FEN for testing
   */
  static generateRandomPosition(): string {
    const api = createGameAPI();
    
    // Make some random moves
    const numMoves = Math.floor(Math.random() * 20) + 10;
    for (let i = 0; i < numMoves; i++) {
      const moves = api.moves() as string[];
      if (moves.length === 0) break;
      
      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      api.move(randomMove);
      
      if (api.isGameOver()) break;
    }
    
    return api.fen();
  }
}

export default { createGameAPI, ChessJSGameAPI, ChessUtils };