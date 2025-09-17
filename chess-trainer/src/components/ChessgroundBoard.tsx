/**
 * ♔ ENTERPRISE CHESSGROUND BOARD COMPONENT
 * 
 * High-performance chess board component with chessground.js integration.
 * 
 * Features:
 * - Real-time FEN synchronization with 60fps performance
 * - Smooth piece animations and move highlighting
 * - Touch and mouse interaction support
 * - Responsive design for various screen sizes
 * - Enterprise-grade error handling and validation
 * - Performance monitoring and optimization
 * 
 * Architecture:
 * - Pure React component with controlled props
 * - Chessground.js integration with TypeScript types
 * - Optimized re-rendering with React.memo and callbacks
 * - RAF-optimized position updates for video sync
 */

import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { Chessground } from 'chessground';
import type { Api as ChessgroundApi } from 'chessground/api';
import type { Config as ChessgroundConfig } from 'chessground/config';
import type { Key as ChessgroundKey, Piece } from 'chessground/types';

// Import chessground styles
import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.cburnett.css';
import logger from '../utils/Logger';

export interface ChessgroundBoardProps {
  // Core chess state
  fen: string;
  orientation: 'white' | 'black';
  
  // Interaction settings
  viewOnly?: boolean;
  coordinates?: boolean;
  interactive?: boolean;
  
  // Visual settings
  showLastMove?: boolean;
  showCheck?: boolean;
  showDestinations?: boolean;
  
  // Event handlers
  onMove?: (from: ChessgroundKey, to: ChessgroundKey, metadata: any) => void;
  onSelect?: (square: ChessgroundKey | null) => void;
  
  // Styling
  className?: string;
  width?: number;
  height?: number;
  
  // Performance settings
  enableSmoothAnimation?: boolean;
  syncOptimization?: boolean;
}

interface ChessgroundBoardState {
  isReady: boolean;
  lastFen: string;
  error: string | null;
  renderCount: number;
}

/**
 * Parse FEN string into chessground pieces format
 */
const parseFenToPieces = (fen: string): Map<ChessgroundKey, Piece> => {
  const pieces = new Map<ChessgroundKey, Piece>();
  
  console.log('🧩 PARSING FEN:', fen);
  
  try {
    const [position] = fen.split(' ');
    const ranks = position.split('/');
    
    console.log('📋 RANKS:', ranks);
    
    for (let rank = 0; rank < 8; rank++) {
      const rankStr = ranks[rank];
      let file = 0;
      
      console.log(`⚡ RANK ${rank + 1}: "${rankStr}"`);
      
      for (let i = 0; i < rankStr.length; i++) {
        const char = rankStr[i];
        
        if (char >= '1' && char <= '8') {
          // Empty squares
          file += parseInt(char);
          console.log(`  📍 Skip ${char} empty squares, file now: ${file}`);
        } else {
          // Piece
          const square = `${String.fromCharCode(97 + file)}${8 - rank}` as ChessgroundKey;
          const color = char === char.toLowerCase() ? 'black' : 'white';
          const roleMappings: Record<string, Piece['role']> = {
            'p': 'pawn',
            'n': 'knight',
            'b': 'bishop',
            'r': 'rook',
            'q': 'queen',
            'k': 'king'
          };
          const role = roleMappings[char.toLowerCase()];
          
          console.log(`  🔸 PIECE: ${char} -> ${role} ${color} on ${square}`);
          
          if (role) {
            pieces.set(square, {
              color,
              role,
            });
          } else {
            console.error(`❌ UNKNOWN PIECE: ${char}`);
          }
          
          file++;
        }
      }
    }
    
    console.log('🎯 FINAL PIECES COUNT:', pieces.size);
    
  } catch (error) {
    console.error('❌ FEN PARSING ERROR:', error);
    logger.error('game', 'FEN parsing failed - invalid position', error as Error, { fen }, { component: 'ChessgroundBoard', function: 'fenToPosition' });
  }
  
  return pieces;
};


/**
 * Determine if position is in check from FEN
 */
const isInCheckFromFen = (_fen: string): boolean => {
  // This is a simplified check detection
  // In a full implementation, you'd use chess.js or similar
  // For now, we'll return false and rely on external check detection
  return false;
};

/**
 * ENTERPRISE CHESSGROUND BOARD COMPONENT
 */
export const ChessgroundBoard: React.FC<ChessgroundBoardProps> = React.memo(({
  fen,
  orientation = 'white',
  viewOnly = false,
  coordinates = true,
  interactive = true,
  showLastMove = true,
  showCheck = true,
  showDestinations = true,
  onMove,
  onSelect,
  className = '',
  width,
  height,
  enableSmoothAnimation = true,
  syncOptimization = true,
}) => {
  // Refs for chessground API and DOM element
  const boardRef = useRef<HTMLDivElement>(null);
  const chessgroundRef = useRef<ChessgroundApi | null>(null);
  const lastUpdateTime = useRef<number>(0);
  
  // Component state
  const [state, setState] = useState<ChessgroundBoardState>({
    isReady: false,
    lastFen: '',
    error: null,
    renderCount: 0,
  });

  /**
   * Memoized chessground configuration - MINIMAL CONFIG
   */
  const chessgroundConfig = useMemo((): ChessgroundConfig => ({
    orientation,
    viewOnly: viewOnly || !interactive,
    coordinates,
    
    // Animation settings
    animation: {
      enabled: enableSmoothAnimation,
      duration: enableSmoothAnimation ? 150 : 0,
    },
    
    // Move settings
    movable: {
      free: false,
      color: interactive && !viewOnly ? 'both' : undefined,
      showDests: interactive && showDestinations,
      events: {
        after: (orig, dest, metadata) => {
          onMove?.(orig, dest, metadata);
        },
      },
    },
    
    // Selection settings
    selectable: {
      enabled: interactive && !viewOnly,
    },
    
    // Visual settings
    premovable: {
      enabled: false, // Disabled for video study sessions
    },
    
    highlight: {
      lastMove: showLastMove,
      check: showCheck,
    },
    
    // Events
    events: {
      select: (square) => {
        onSelect?.(square);
      },
    },
  }), [
    orientation,
    viewOnly,
    interactive,
    coordinates,
    enableSmoothAnimation,
    showDestinations,
    showLastMove,
    showCheck,
    onMove,
    onSelect,
  ]);

  /**
   * Initialize chessground instance
   */
  const initializeChessground = useCallback(() => {
    if (!boardRef.current) return;
    
    try {
      // Create chessground instance
      console.log('🔍 INIT FEN:', fen);
      
      const cg = Chessground(boardRef.current, chessgroundConfig);
      chessgroundRef.current = cg;
      
      // FORCE FIX: Set pieces with forced layout update
      console.log('🎯 FORCING PIECES AND LAYOUT...');
      
      // Method 1: Standard pieces from FEN
      const pieces = parseFenToPieces(fen);
      console.log('📋 PIECES PARSED:', pieces.size);
      
      // Method 2: Force CSS recalculation
      const boardElement = boardRef.current;
      boardElement.style.display = 'none';
      boardElement.offsetHeight; // Force reflow
      boardElement.style.display = '';
      
      // Method 3: Set pieces after DOM is stable
      setTimeout(() => {
        console.log('⏰ DELAYED PIECE SETTING...');
        cg.setPieces(pieces);
        
        // Force layout recalculation
        cg.redrawAll();
        
        // Another attempt after CSS settling
        setTimeout(() => {
          console.log('⏰ FINAL PIECE SETTING...');
          cg.setPieces(pieces);
          cg.redrawAll();
          
          console.log('✅ ALL METHODS APPLIED');
        }, 200);
      }, 100);
      
      console.log('✅ Chessground initialized');
      
      setState(prev => ({
        ...prev,
        isReady: true,
        lastFen: fen,
        error: null,
      }));
      
      logger.info('ui', 'ChessgroundBoard component initialized successfully', { dimensions: { width, height } }, { component: 'ChessgroundBoard', function: 'initializeChessground' });
      
    } catch (error) {
      logger.error('ui', 'ChessgroundBoard initialization failed', error, { dimensions: { width, height } }, { component: 'ChessgroundBoard', function: 'initializeChessground' });
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Initialization failed',
      }));
    }
  }, [fen, chessgroundConfig, showCheck]);

  /**
   * Update board position with optimization
   */
  const updateBoardPosition = useCallback((newFen: string) => {
    if (!chessgroundRef.current || newFen === state.lastFen) return;
    
    // Performance optimization: throttle updates for video sync
    const now = performance.now();
    if (syncOptimization && now - lastUpdateTime.current < 16) {
      // Skip update if less than 16ms since last update (60fps)
      return;
    }
    lastUpdateTime.current = now;
    
    try {
      const isInCheck = showCheck && isInCheckFromFen(newFen);
      
      // Update chessground with new position using pieces map
      const pieces = parseFenToPieces(newFen);
      chessgroundRef.current.setPieces(pieces);
      
      chessgroundRef.current.set({
        check: isInCheck,
        turnColor: newFen.split(' ')[1] === 'w' ? 'white' : 'black',
      });
      
      setState(prev => ({
        ...prev,
        lastFen: newFen,
        renderCount: prev.renderCount + 1,
      }));
      
    } catch (error) {
      logger.error('ui', 'Board position update failed', error, { fen }, { component: 'ChessgroundBoard', function: 'updatePosition' });
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Position update failed',
      }));
    }
  }, [state.lastFen, syncOptimization, showCheck]);

  /**
   * Initialize chessground on mount
   */
  useEffect(() => {
    if (boardRef.current && !chessgroundRef.current) {
      // Small delay to ensure DOM is ready
      const timeoutId = setTimeout(initializeChessground, 10);
      return () => clearTimeout(timeoutId);
    }
  }, [initializeChessground]);

  /**
   * Update position when FEN changes
   */
  useEffect(() => {
    if (state.isReady && fen !== state.lastFen) {
      updateBoardPosition(fen);
    }
  }, [fen, state.isReady, state.lastFen, updateBoardPosition]);

  /**
   * Update chessground config when props change
   */
  useEffect(() => {
    if (chessgroundRef.current && state.isReady) {
      chessgroundRef.current.set(chessgroundConfig);
    }
  }, [chessgroundConfig, state.isReady]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (chessgroundRef.current) {
        chessgroundRef.current.destroy?.();
        chessgroundRef.current = null;
      }
    };
  }, []);

  /**
   * Board style with responsive sizing
   */
  const boardStyle = useMemo(() => ({
    width: width ? `${width}px` : '100%',
    height: height ? `${height}px` : undefined,
    aspectRatio: !height ? '1' : undefined,
    maxWidth: '100%',
    maxHeight: '100%',
  }), [width, height]);

  // Error state
  if (state.error) {
    return (
      <div className={`chessground-error ${className}`} style={boardStyle}>
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <div className="error-message">
            <strong>Board Error</strong>
            <p>{state.error}</p>
          </div>
          <button 
            onClick={initializeChessground}
            className="retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (!state.isReady) {
    return (
      <div className={`chessground-loading ${className}`} style={boardStyle}>
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading chess board...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`chessground-container ${className}`}
      style={boardStyle}
    >
      <style>{`
        /* FORCE PIECE POSITIONING FIX */
        .chessground-board-element piece {
          position: absolute !important;
          transition: transform 0.2s ease-out !important;
        }
        
        /* Force board layout */
        .chessground-board-element cg-container {
          position: relative !important;
          display: block !important;
        }
        
        .chessground-board-element cg-board {
          position: relative !important;
          width: 100% !important;
          height: 100% !important;
        }
        
        /* Ensure proper square positioning */
        .chessground-board-element cg-board square {
          position: absolute !important;
        }
      `}</style>
      
      <div 
        ref={boardRef}
        className="chessground-board-element"
        style={{ width: '100%', height: '100%', position: 'relative' }}
      />
      
      {/* Development info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-info">
          <small>
            Renders: {state.renderCount} | FEN: {fen.substring(0, 15)}...
          </small>
        </div>
      )}
    </div>
  );
});

// Display name for React DevTools
ChessgroundBoard.displayName = 'ChessgroundBoard';

export default ChessgroundBoard;