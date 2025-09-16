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

  // Initialize chessground - MODALITÀ CERTOSINO STAGING
  useEffect(() => {
    console.log('🔄 STAGE 1: Starting Chessground initialization');
    
    // STAGE 1: Verify DOM ref
    if (!boardRef.current) {
      console.error('❌ STAGE 1 FAILED: boardRef.current is null');
      return;
    }
    console.log('✅ STAGE 1 PASSED: boardRef.current exists');
    console.log('   - Element type:', boardRef.current.tagName);
    console.log('   - Element dimensions:', boardRef.current.offsetWidth, 'x', boardRef.current.offsetHeight);

    // STAGE 2: Generate legal moves
    console.log('🔄 STAGE 2: Generating legal moves');
    const dests = generateDests();
    console.log('✅ STAGE 2 PASSED: Generated dests for', dests.size, 'squares');

    // STAGE 3: Create config object
    console.log('🔄 STAGE 3: Creating Chessground config');
    const config = {
      orientation,
      coordinates,
      movable: {
        free: false,
        color: interactive ? 'both' : undefined,
        dests,
      },
      events: {
        move: (orig: string, dest: string) => {
          console.log('📱 MOVE EVENT:', orig, '→', dest);
          onMove?.(orig, dest);
        },
        select: (square: string | null) => {
          console.log('📱 SELECT EVENT:', square);
          onSelect?.(square);
        },
      },
    };
    console.log('✅ STAGE 3 PASSED: Config created');
    console.log('   - Orientation:', config.orientation);
    console.log('   - Coordinates:', config.coordinates);
    console.log('   - Interactive:', interactive);
    console.log('   - Dests size:', config.movable.dests.size);

    // STAGE 4: Create Chessground instance
    console.log('🔄 STAGE 4: Creating Chessground instance');
    try {
      chessgroundRef.current = Chessground(boardRef.current, config);
      console.log('✅ STAGE 4 PASSED: Chessground created');
      console.log('   - Instance:', chessgroundRef.current);
    } catch (error) {
      console.error('❌ STAGE 4 FAILED: Chessground creation error');
      console.error('   - Error:', error);
      return;
    }
    
    // STAGE 5: Verify DOM structure creation
    console.log('🔄 STAGE 5: Verifying DOM structure creation');
    setTimeout(() => {
      if (!boardRef.current) {
        console.error('❌ STAGE 5 FAILED: boardRef disappeared');
        return;
      }
      
      const cgWrap = boardRef.current.querySelector('.cg-wrap');
      const cgBoard = boardRef.current.querySelector('cg-board');
      const cgContainer = boardRef.current.querySelector('cg-container');
      const pieces = boardRef.current.querySelectorAll('piece');
      const squares = boardRef.current.querySelectorAll('square');
      
      console.log('✅ STAGE 5 RESULTS: DOM structure analysis');
      console.log('   - .cg-wrap found:', !!cgWrap);
      console.log('   - cg-board found:', !!cgBoard);
      console.log('   - cg-container found:', !!cgContainer);
      console.log('   - pieces found:', pieces.length);
      console.log('   - squares found:', squares.length);
      console.log('   - innerHTML length:', boardRef.current.innerHTML.length);
      console.log('   - First 200 chars of innerHTML:', boardRef.current.innerHTML.substring(0, 200));
      
      if (cgWrap) {
        console.log('   - cg-wrap classes:', cgWrap.className);
        console.log('   - cg-wrap style:', cgWrap.getAttribute('style'));
      }
      
      if (pieces.length === 0) {
        console.warn('⚠️ WARNING: No pieces found in DOM');
        console.log('   - This indicates pieces are not being rendered');
        console.log('   - Check FEN parsing and pieces.set() call');
      }
      
      // STAGE 6: Verify pieces are set
      console.log('🔄 STAGE 6: Manual pieces setting');
      if (chessgroundRef.current && chessInstance) {
        try {
          const pieces = new Map([
            ['a1', { color: 'white', role: 'rook' }],
            ['e1', { color: 'white', role: 'king' }],
            ['a8', { color: 'black', role: 'rook' }],
            ['e8', { color: 'black', role: 'king' }]
          ]);
          
          chessgroundRef.current.set({ pieces });
          console.log('✅ STAGE 6 PASSED: Manual pieces set for testing');
        } catch (error) {
          console.error('❌ STAGE 6 FAILED: Manual pieces setting error');
          console.error('   - Error:', error);
        }
      }
    }, 200);

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