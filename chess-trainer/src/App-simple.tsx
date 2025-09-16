import { useState, useEffect } from 'react';
import { ChessgroundBoard } from './components/ChessgroundBoard-simple';
import { TestCSS } from './test-css';
import { Chess } from 'chess.js';

// Simple types
type AppMode = 'board' | 'video';

function App() {
  const [chess] = useState(() => new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [mode, setMode] = useState<AppMode>('board');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simple initialization - just set loading to false
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  const handleMove = (from: string, to: string) => {
    try {
      const move = chess.move({ from, to });
      if (move) {
        setFen(chess.fen());
      }
    } catch (error) {
      console.log('Invalid move');
    }
  };

  const resetBoard = () => {
    chess.reset();
    setFen(chess.fen());
  };

  const undoMove = () => {
    chess.undo();
    setFen(chess.fen());
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p className="text-gray-600">Loading Chess Trainer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow border-b">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-blue-600">♔ Chess Trainer</h1>
            
            <div className="flex space-x-4">
              <button
                onClick={() => setMode('board')}
                className={`px-4 py-2 rounded ${
                  mode === 'board' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Chess Board
              </button>
              <button
                onClick={() => setMode('video')}
                className={`px-4 py-2 rounded ${
                  mode === 'video' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Video Study
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        
        {/* CSS Test Section - MODALITÀ CERTOSINO DEBUG */}
        <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h3 className="text-lg font-semibold mb-4">🔍 CSS Debug Test (MODALITÀ CERTOSINO)</h3>
          <TestCSS />
        </div>

        {mode === 'board' && (
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Chess Board */}
              <div className="card">
                <h2 className="text-xl font-semibold mb-4">Chess Board</h2>
                
                <div className="flex justify-center mb-4">
                  <ChessgroundBoard
                    fen={fen}
                    chessInstance={chess}
                    orientation="white"
                    interactive={true}
                    coordinates={true}
                    onMove={handleMove}
                    width={400}
                    height={400}
                    className="border rounded shadow"
                  />
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">
                    Turn: <span className="font-semibold">
                      {chess.turn() === 'w' ? 'White' : 'Black'}
                    </span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Move: {chess.moveNumber()}
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-4">
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Game Controls</h3>
                  
                  <div className="space-y-2">
                    <button
                      onClick={resetBoard}
                      className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200"
                    >
                      Reset Board
                    </button>
                    <button
                      onClick={undoMove}
                      className="w-full bg-blue-100 text-blue-700 px-4 py-2 rounded hover:bg-blue-200"
                    >
                      Undo Move
                    </button>
                  </div>
                </div>

                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Game Status</h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>In Check:</span>
                      <span className={chess.inCheck() ? 'text-red-600' : 'text-green-600'}>
                        {chess.inCheck() ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Checkmate:</span>
                      <span className={chess.isCheckmate() ? 'text-red-600' : 'text-green-600'}>
                        {chess.isCheckmate() ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Stalemate:</span>
                      <span className={chess.isStalemate() ? 'text-yellow-600' : 'text-green-600'}>
                        {chess.isStalemate() ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Move History</h3>
                  
                  <div className="text-sm font-mono bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
                    {chess.history().length > 0 ? (
                      chess.history().join(' ')
                    ) : (
                      <span className="text-gray-500">No moves yet</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {mode === 'video' && (
          <div className="max-w-4xl mx-auto">
            <div className="card text-center">
              <h2 className="text-xl font-semibold mb-4">Video Study Session</h2>
              <div className="bg-gray-100 p-8 rounded">
                <p className="text-gray-600 mb-4">Video study functionality coming soon!</p>
                <p className="text-sm text-gray-500">
                  This will include video synchronization with chess positions.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;