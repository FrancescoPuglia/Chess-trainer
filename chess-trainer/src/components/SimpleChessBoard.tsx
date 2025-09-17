import React, { useEffect, useRef } from 'react';
import { Chessground } from 'chessground';

// Import ONLY base CSS
import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.cburnett.css';

interface SimpleChessBoardProps {
  width?: number;
  height?: number;
}

export const SimpleChessBoard: React.FC<SimpleChessBoardProps> = ({
  width = 400,
  height = 400
}) => {
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!boardRef.current) return;

    console.log('🚀 CREATING SIMPLE CHESSBOARD');

    // Create with minimal config
    const cg = Chessground(boardRef.current, {
      orientation: 'white',
      coordinates: true,
      viewOnly: true // Start as view-only for testing
    });

    // Set standard starting position MANUALLY
    const startingPieces = new Map([
      // White pieces
      ['a1', { color: 'white', role: 'rook' }],
      ['b1', { color: 'white', role: 'knight' }],
      ['c1', { color: 'white', role: 'bishop' }],
      ['d1', { color: 'white', role: 'queen' }],
      ['e1', { color: 'white', role: 'king' }],
      ['f1', { color: 'white', role: 'bishop' }],
      ['g1', { color: 'white', role: 'knight' }],
      ['h1', { color: 'white', role: 'rook' }],
      ['a2', { color: 'white', role: 'pawn' }],
      ['b2', { color: 'white', role: 'pawn' }],
      ['c2', { color: 'white', role: 'pawn' }],
      ['d2', { color: 'white', role: 'pawn' }],
      ['e2', { color: 'white', role: 'pawn' }],
      ['f2', { color: 'white', role: 'pawn' }],
      ['g2', { color: 'white', role: 'pawn' }],
      ['h2', { color: 'white', role: 'pawn' }],
      
      // Black pieces  
      ['a8', { color: 'black', role: 'rook' }],
      ['b8', { color: 'black', role: 'knight' }],
      ['c8', { color: 'black', role: 'bishop' }],
      ['d8', { color: 'black', role: 'queen' }],
      ['e8', { color: 'black', role: 'king' }],
      ['f8', { color: 'black', role: 'bishop' }],
      ['g8', { color: 'black', role: 'knight' }],
      ['h8', { color: 'black', role: 'rook' }],
      ['a7', { color: 'black', role: 'pawn' }],
      ['b7', { color: 'black', role: 'pawn' }],
      ['c7', { color: 'black', role: 'pawn' }],
      ['d7', { color: 'black', role: 'pawn' }],
      ['e7', { color: 'black', role: 'pawn' }],
      ['f7', { color: 'black', role: 'pawn' }],
      ['g7', { color: 'black', role: 'pawn' }],
      ['h7', { color: 'black', role: 'pawn' }]
    ]);

    console.log('🎯 SETTING 32 PIECES MANUALLY');
    cg.setPieces(startingPieces);

    console.log('✅ SIMPLE BOARD CREATED');

    return () => {
      cg.destroy?.();
    };
  }, []);

  return (
    <div style={{ width, height }}>
      <h3>🔬 TEST BOARD (32 pieces hardcoded)</h3>
      <div 
        ref={boardRef}
        style={{ 
          width: '100%', 
          height: '100%',
          border: '2px solid red' // Red border to see the container
        }}
      />
    </div>
  );
};