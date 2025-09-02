/**
 * Chessboard Component - Chessground Integration
 * 
 * High-performance chess board using Lichess's chessground library.
 * Provides smooth animations, drag-and-drop, and full chess UI.
 * 
 * Features:
 * - 60fps smooth animations
 * - Touch and mouse support
 * - Arrows and highlights
 * - Move validation integration with GameAPI
 * - Customizable themes and piece sets
 */

import { Chessground } from 'chessground';
import type { Api } from 'chessground/api';
import type { Config } from 'chessground/config';
import type { Key } from 'chessground/types';
import React, { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';

import type { IGameAPI } from '../core/game-api';
import type { ChessMove, Color, Square } from '../types';

// Import chessground CSS
import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.cburnett.css';

interface ChessboardProps {
  gameAPI?: IGameAPI;
  orientation?: Color;
  interactive?: boolean;
  showCoordinates?: boolean;
  showLastMove?: boolean;
  showCheck?: boolean;
  arrows?: { orig: Key; dest: Key; brush: string }[];
  highlights?: { square: Key; color: string }[];
  onMove?: (move: ChessMove) => void;
  onSelect?: (square: Square | null) => void;
  className?: string;
  width?: number;
  height?: number;
}

export interface ChessboardHandle {
  api: Api | null;
  playMove: (from: Square, to: Square) => boolean;
  setPosition: (fen: string) => void;
  clearArrows: () => void;
  setArrows: (arrows: { orig: Key; dest: Key; brush: string }[]) => void;
  highlight: (squares: Square[]) => void;
  clearHighlights: () => void;
  flip: () => void;
}

export const Chessboard = forwardRef<ChessboardHandle, ChessboardProps>(({
  gameAPI,
  orientation = 'white',
  interactive = true,
  showCoordinates = true,
  showLastMove = true,
  showCheck = true,
  arrows = [],
  highlights = [],
  onMove,
  onSelect,
  className = '',
  width,
  height
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  const gameRef = useRef<IGameAPI | undefined>(gameAPI);

  // Update game reference when prop changes
  useEffect(() => {
    gameRef.current = gameAPI;
  }, [gameAPI]);

  /**
   * Convert GameAPI position to chessground format
   */
  const getChessgroundPosition = useCallback(() => {
    if (!gameRef.current) return {};

    const position: Record<Key, string> = {};
    const board = gameRef.current.board();

    board.forEach((row, rankIndex) => {
      row.forEach((piece, fileIndex) => {
        if (piece) {
          const file = String.fromCharCode(97 + fileIndex); // a-h
          const rank = (8 - rankIndex).toString(); // 8-1
          const square = `${file}${rank}` as Key;
          const pieceSymbol = `${piece.color}${piece.type.toUpperCase()}`;
          position[square] = pieceSymbol;
        }
      });
    });

    return position;
  }, []);

  /**
   * Get legal moves for chessground
   */
  const getLegalMoves = useCallback((): Map<Key, Key[]> => {
    if (!gameRef.current || !interactive) return new Map();

    const moves = gameRef.current.moves({ verbose: true }) as ChessMove[];
    const legalMoves = new Map<Key, Key[]>();

    moves.forEach(move => {
      const from = move.from as Key;
      const to = move.to as Key;
      
      if (!legalMoves.has(from)) {
        legalMoves.set(from, []);
      }
      legalMoves.get(from)!.push(to);
    });

    return legalMoves;
  }, [interactive]);

  /**
   * Handle move attempts
   */
  const handleMove = useCallback((orig: Key, dest: Key): boolean => {
    if (!gameRef.current) return false;

    try {
      const move = gameRef.current.move({
        from: orig as Square,
        to: dest as Square
      });

      if (move) {
        onMove?.(move);
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn('Invalid move:', { orig, dest }, error);
      return false;
    }
  }, [onMove]);

  /**
   * Handle square selection
   */
  const handleSelect = useCallback((square: Key) => {
    onSelect?.(square as Square);
  }, [onSelect]);

  /**
   * Initialize chessground
   */
  useEffect(() => {
    if (!containerRef.current) return;

    const config: Config = {
      fen: gameRef.current?.fen() || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR',
      orientation,
      coordinates: showCoordinates,
      viewOnly: !interactive,
      movable: {
        free: false,
        color: interactive && gameRef.current ? gameRef.current.turn() : undefined,
        dests: getLegalMoves(),
        events: {
          after: handleMove
        }
      },
      selectable: {
        enabled: interactive
      },
      events: {
        select: handleSelect
      },
      highlight: {
        lastMove: showLastMove,
        check: showCheck
      },
      animation: {
        enabled: true,
        duration: 200
      },
      premovable: {
        enabled: false // Disable premoves for training
      },
      draggable: {
        enabled: interactive,
        showGhost: true,
        deleteOnDropOff: false
      }
    };

    // Create chessground instance
    apiRef.current = Chessground(containerRef.current, config);

    // Set initial position
    if (gameRef.current) {
      apiRef.current.set({
        fen: gameRef.current.fen(),
        movable: {
          color: gameRef.current.turn(),
          dests: getLegalMoves()
        }
      });
    }

    return () => {
      if (apiRef.current) {
        apiRef.current.destroy();
        apiRef.current = null;
      }
    };
  }, []); // Only run once on mount

  /**
   * Update position when GameAPI changes
   */
  useEffect(() => {
    if (!apiRef.current || !gameRef.current) return;

    const fen = gameRef.current.fen();
    const turn = gameRef.current.turn();
    const legalMoves = getLegalMoves();

    apiRef.current.set({
      fen,
      movable: {
        color: interactive ? turn : undefined,
        dests: legalMoves
      },
      turnColor: turn
    });
  }, [gameAPI, interactive, getLegalMoves]);

  /**
   * Update orientation
   */
  useEffect(() => {
    if (!apiRef.current) return;
    apiRef.current.set({ orientation });
  }, [orientation]);

  /**
   * Update arrows
   */
  useEffect(() => {
    if (!apiRef.current) return;
    apiRef.current.setShapes(arrows.map(arrow => ({
      orig: arrow.orig,
      dest: arrow.dest,
      brush: arrow.brush
    })));
  }, [arrows]);

  /**
   * Update highlights
   */
  useEffect(() => {
    if (!apiRef.current) return;
    
    const highlightMap: Record<Key, string> = {};
    highlights.forEach(({ square, color }) => {
      highlightMap[square] = color;
    });
    
    // Note: chessground doesn't have direct highlight API
    // We use CSS classes or shapes as workaround
    if (highlights.length > 0) {
      apiRef.current.setShapes(highlights.map(({ square, color }) => ({
        orig: square,
        brush: color
      })));
    }
  }, [highlights]);

  /**
   * Expose methods via ref
   */
  useImperativeHandle(ref, () => ({
    api: apiRef.current,
    
    playMove: (from: Square, to: Square): boolean => {
      if (!apiRef.current) return false;
      
      // Play move with animation
      apiRef.current.move(from as Key, to as Key);
      return true;
    },
    
    setPosition: (fen: string): void => {
      if (!apiRef.current) return;
      apiRef.current.set({ fen });
    },
    
    clearArrows: (): void => {
      if (!apiRef.current) return;
      apiRef.current.setShapes([]);
    },
    
    setArrows: (newArrows: { orig: Key; dest: Key; brush: string }[]): void => {
      if (!apiRef.current) return;
      apiRef.current.setShapes(newArrows);
    },
    
    highlight: (squares: Square[]): void => {
      if (!apiRef.current) return;
      const shapes = squares.map(square => ({
        orig: square as Key,
        brush: 'yellow'
      }));
      apiRef.current.setShapes(shapes);
    },
    
    clearHighlights: (): void => {
      if (!apiRef.current) return;
      apiRef.current.setShapes([]);
    },
    
    flip: (): void => {
      if (!apiRef.current) return;
      apiRef.current.toggleOrientation();
    }
  }), []);

  /**
   * Calculate board size
   */
  const boardSize = width || height || 400;
  const containerStyle: React.CSSProperties = {
    width: boardSize,
    height: boardSize,
    ...((width || height) && { 
      '--cg-square-size': `${Math.floor(boardSize / 8)}px` 
    } as any)
  };

  return (
    <div 
      ref={containerRef}
      className={`chessboard-container ${className}`}
      style={containerStyle}
    />
  );
});

Chessboard.displayName = 'Chessboard';

export default Chessboard;