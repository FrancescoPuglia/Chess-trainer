/**
 * Chess Trainer App - Main Application Component
 * 
 * High-level application structure with routing, state management,
 * and component orchestration. Follows the modular architecture
 * defined in the project plan.
 */

import React, { useState, useEffect, useRef } from 'react';

import Chessboard, { type ChessboardHandle } from './components/Chessboard';
import ErrorBoundary from './components/ErrorBoundary';
import { createGameAPI, type IGameAPI } from './core/game-api';
import { DatabaseService } from './data/database';
import type { ChessMove, GamePosition } from './types';
import qualityGate from './utils/QualityGate';

// Import Tailwind base styles
import './index.css';

function App() {
  // Core state
  const [gameAPI, setGameAPI] = useState<IGameAPI>(() => createGameAPI());
  const [position, setPosition] = useState<GamePosition>(() => gameAPI.getPosition());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [healthScore, setHealthScore] = useState(100);

  // Component refs
  const chessboardRef = useRef<ChessboardHandle>(null);

  /**
   * Initialize application
   */
  useEffect(() => {
    const initialize = async () => {
      const startTime = performance.now();
      
      try {
        setIsLoading(true);
        
        // Initialize database
        await DatabaseService.initialize();
        
        // Get storage info
        const storageInfo = await DatabaseService.getStorageInfo();
        console.log('Storage info:', storageInfo);
        
        // Record TTI performance
        const ttiTime = performance.now() - startTime;
        qualityGate.recordPerformance('ttiMs', ttiTime);
        
        setIsLoading(false);
      } catch (err) {
        console.error('App initialization failed:', err);
        
        if (err instanceof Error) {
          qualityGate.recordError(err, 'critical');
        }
        
        setError(err instanceof Error ? err.message : 'Initialization failed');
        setIsLoading(false);
      }
    };

    // Subscribe to quality metrics
    const unsubscribe = qualityGate.subscribe(metrics => {
      setHealthScore(metrics.health.score);
    });

    initialize();
    
    return unsubscribe;
  }, []);

  /**
   * Handle move made on board
   */
  const handleMove = (move: ChessMove) => {
    console.log('Move made:', move);
    
    // Update position state
    const newPosition = gameAPI.getPosition();
    setPosition(newPosition);
    
    // TODO: Add to move history
    // TODO: Update analytics
    // TODO: Sync with video if applicable
  };

  /**
   * Handle square selection
   */
  const handleSquareSelect = (square: string | null) => {
    console.log('Square selected:', square);
    // TODO: Show piece info, legal moves, etc.
  };

  /**
   * Load a demo position for testing
   */
  const loadDemoPosition = () => {
    // Load a famous position - Queen's Gambit Declined
    const demoPgn = '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 5. e3 O-O 6. Nf3 Nbd7 7. Rc1';
    
    if (gameAPI.loadPgn(demoPgn)) {
      const newPosition = gameAPI.getPosition();
      setPosition(newPosition);
      console.log('Demo position loaded:', newPosition);
    }
  };

  /**
   * Reset to starting position
   */
  const resetPosition = () => {
    gameAPI.reset();
    const newPosition = gameAPI.getPosition();
    setPosition(newPosition);
    console.log('Position reset');
  };

  /**
   * Test board navigation
   */
  const testNavigation = () => {
    // Make a few random moves for testing
    const moves = gameAPI.moves() as string[];
    if (moves.length > 0) {
      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      const move = gameAPI.move(randomMove);
      if (move) {
        handleMove(move);
      }
    }
  };

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-chess-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing Chess Trainer...</p>
        </div>
      </div>
    );
  }

  // Error screen
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Initialization Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => { window.location.reload(); }} 
            className="bg-chess-primary text-white px-4 py-2 rounded hover:bg-opacity-90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-chess-primary">♔ Chess Trainer</h1>
              <div className="ml-4 px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                Enterprise Grade
              </div>
              <div className={`ml-2 px-2 py-1 text-xs rounded-full ${
                healthScore >= 90 ? 'bg-green-100 text-green-800' :
                healthScore >= 75 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                Health: {healthScore}/100
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={loadDemoPosition}
                className="px-3 py-1 text-sm bg-chess-secondary text-chess-primary rounded hover:bg-opacity-80 transition-colors"
              >
                Load Demo
              </button>
              <button
                onClick={resetPosition}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                Reset
              </button>
              <button
                onClick={testNavigation}
                className="px-3 py-1 text-sm bg-chess-accent text-white rounded hover:bg-opacity-90 transition-colors"
              >
                Test Move
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Panel - Chessboard */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Chess Board</h2>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span>Turn:</span>
                  <span className={`font-medium ${position.turn === 'w' ? 'text-white bg-gray-800' : 'text-black bg-gray-200'} px-2 py-1 rounded`}>
                    {position.turn === 'w' ? 'White' : 'Black'}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-center">
                <Chessboard
                  ref={chessboardRef}
                  gameAPI={gameAPI}
                  orientation="white"
                  interactive={true}
                  showCoordinates={true}
                  showLastMove={true}
                  onMove={handleMove}
                  onSelect={handleSquareSelect}
                  width={480}
                  height={480}
                  className="border rounded-lg shadow-sm"
                />
              </div>
              
              {/* Position Status */}
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Move:</span>
                    <span className="ml-2 font-medium">#{position.moveNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className={`ml-2 font-medium ${
                      position.inCheckmate ? 'text-red-600' :
                      position.inCheck ? 'text-yellow-600' :
                      position.inStalemate ? 'text-blue-600' :
                      position.inDraw ? 'text-blue-600' :
                      'text-green-600'
                    }`}>
                      {position.inCheckmate ? 'Checkmate' :
                       position.inCheck ? 'Check' :
                       position.inStalemate ? 'Stalemate' :
                       position.inDraw ? 'Draw' :
                       'Active'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">FEN:</span>
                    <code className="ml-2 text-xs font-mono bg-white px-2 py-1 rounded break-all">
                      {position.fen}
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Controls and Info */}
          <div className="space-y-4">
            
            {/* Game Controls */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Game Controls</h3>
              
              <div className="space-y-3">
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      const undoneMove = gameAPI.undo();
                      if (undoneMove) {
                        const newPosition = gameAPI.getPosition();
                        setPosition(newPosition);
                        console.log('Move undone:', undoneMove);
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    ← Undo
                  </button>
                  <button
                    onClick={() => chessboardRef.current?.flip()}
                    className="flex-1 px-4 py-2 bg-chess-secondary text-chess-primary rounded hover:bg-opacity-80 transition-colors"
                  >
                    🔄 Flip Board
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => chessboardRef.current?.clearArrows()}
                    className="px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                  >
                    Clear Arrows
                  </button>
                  <button
                    onClick={() => chessboardRef.current?.clearHighlights()}
                    className="px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                  >
                    Clear Highlights
                  </button>
                </div>
              </div>
            </div>

            {/* Move History */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Move History</h3>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {position.pgn ? (
                  <pre className="text-sm font-mono whitespace-pre-wrap text-gray-700 bg-gray-50 p-3 rounded">
                    {position.pgn}
                  </pre>
                ) : (
                  <p className="text-gray-500 text-sm italic">No moves yet</p>
                )}
              </div>
            </div>

            {/* Development Stats */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Development Status</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Database</span>
                  <span className="text-sm font-medium text-green-600">✓ Ready</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">GameAPI</span>
                  <span className="text-sm font-medium text-green-600">✓ Chess.js</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Chessground</span>
                  <span className="text-sm font-medium text-green-600">✓ Integrated</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">60fps Performance</span>
                  <span className="text-sm font-medium text-yellow-600">⚡ Testing</span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-gray-500">
                  Day 1 Deliverable: PGN demo load and board navigation at 60fps ✨
                </p>
              </div>
            </div>

          </div>
        </div>
      </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
