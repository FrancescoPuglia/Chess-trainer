import React, { useEffect, useRef } from 'react';
import { Chessground } from 'chessground';
import type { Api as ChessgroundApi } from 'chessground/api';

// Import chessground styles
import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.cburnett.css';

import { Chess } from 'chess.js';

interface ChessgroundBoardProps {
  fen: string;
  chessInstance: Chess; // Aggiunta chess.js instance
  orientation: 'white' | 'black';
  interactive?: boolean;
  coordinates?: boolean;
  onMove?: (from: string, to: string) => void;
  onSelect?: (square: string | null) => void;
  width?: number;
  height?: number;
  className?: string;
}

export function ChessgroundBoard({
  fen,
  chessInstance,
  orientation = 'white',
  interactive = true,
  coordinates = true,
  onMove,
  onSelect,
  width = 400,
  height = 400,
  className = ''
}: ChessgroundBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const chessgroundRef = useRef<ChessgroundApi | null>(null);

  // Generate legal moves for Chessground
  const generateDests = () => {
    const dests = new Map();
    if (!chessInstance) return dests;

    try {
      // Get all legal moves from chess.js
      const moves = chessInstance.moves({ verbose: true });
      
      // Group moves by source square
      moves.forEach((move) => {
        const from = move.from;
        const to = move.to;
        
        if (!dests.has(from)) {
          dests.set(from, []);
        }
        dests.get(from).push(to);
      });
      
      console.log('Generated dests for', dests.size, 'squares');
      return dests;
    } catch (error) {
      console.error('Error generating dests:', error);
      return dests;
    }
  };

  // Initialize chessground
  useEffect(() => {
    if (!boardRef.current) return;

    const config = {
      orientation,
      coordinates,
      movable: {
        free: false,
        color: interactive ? 'both' : undefined,
        dests: generateDests(),
      },
      events: {
        move: (orig: string, dest: string) => {
          onMove?.(orig, dest);
        },
        select: (square: string | null) => {
          onSelect?.(square);
        },
      },
    };

    chessgroundRef.current = Chessground(boardRef.current, config);

    return () => {
      chessgroundRef.current?.destroy();
    };
  }, [chessInstance]);

  // Update position and legal moves when FEN changes
  useEffect(() => {
    if (chessgroundRef.current && fen) {
      try {
        // Parse FEN to extract position
        const parts = fen.split(' ');
        const position = parts[0];
        
        // Convert FEN position to chessground format
        const pieces = new Map();
        const ranks = position.split('/');
        
        for (let rank = 0; rank < 8; rank++) {
          let file = 0;
          for (const char of ranks[rank]) {
            if (char >= '1' && char <= '8') {
              file += parseInt(char);
            } else {
              const square = String.fromCharCode(97 + file) + (8 - rank);
              const color = char === char.toUpperCase() ? 'white' : 'black';
              const piece = char.toLowerCase();
              pieces.set(square, { color, role: piece });
              file++;
            }
          }
        }

        console.log('Updating board with', pieces.size, 'pieces');
        chessgroundRef.current.set({ 
          pieces,
          movable: {
            dests: generateDests()
          }
        });
      } catch (error) {
        console.error('Error parsing FEN:', error);
      }
    }
  }, [fen, chessInstance]);

  // Update orientation
  useEffect(() => {
    if (chessgroundRef.current) {
      chessgroundRef.current.set({ orientation });
    }
  }, [orientation]);

  return (
    <div 
      className={`chessboard-container ${className}`}
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <div
        ref={boardRef}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}