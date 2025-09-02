/**
 * ♔ CHESSGROUND BOARD COMPONENT - DAY 2 IMPLEMENTATION
 * 
 * Simplified chessground wrapper for Day 2 components.
 * Full implementation will be completed in later days.
 */

import React from 'react';

export interface ChessgroundBoardProps {
  fen: string;
  orientation: 'white' | 'black';
  viewOnly?: boolean;
  coordinates?: boolean;
  className?: string;
}

export const ChessgroundBoard: React.FC<ChessgroundBoardProps> = ({
  fen,
  orientation,
  viewOnly = false,
  coordinates = true,
  className = '',
}) => {
  return (
    <div className={`chessground-board ${className}`}>
      <div className="board-placeholder">
        <p>Chess Board</p>
        <p>FEN: {fen.substring(0, 20)}...</p>
        <p>Orientation: {orientation}</p>
        <p>View Only: {viewOnly ? 'Yes' : 'No'}</p>
        <p>Coordinates: {coordinates ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
};

export default ChessgroundBoard;