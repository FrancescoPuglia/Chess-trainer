/**
 * ♔ STOCKFISH WEBWORKER DEMO
 * 
 * Simplified Stockfish WebWorker implementation for testing and development.
 * In production, this should be replaced with the actual Stockfish WASM binary.
 * 
 * This demo worker responds to basic UCI commands and provides mock evaluations
 * for development and testing purposes.
 */

// Simple chess evaluation function for demo purposes
function mockEvaluation(fen, depth = 15) {
  // Extract position info from FEN
  const fenParts = fen.split(' ');
  const position = fenParts[0];
  const activeColor = fenParts[1];
  
  // Mock evaluation based on material count and position
  let evaluation = 0;
  
  // Simple material counting
  const pieces = {
    'P': 100, 'N': 320, 'B': 330, 'R': 500, 'Q': 900, 'K': 0,
    'p': -100, 'n': -320, 'b': -330, 'r': -500, 'q': -900, 'k': 0
  };
  
  for (const char of position) {
    if (pieces[char] !== undefined) {
      evaluation += pieces[char];
    }
  }
  
  // Add some randomness for realism
  evaluation += (Math.random() - 0.5) * 50;
  
  // Flip evaluation for black to move
  if (activeColor === 'b') {
    evaluation = -evaluation;
  }
  
  return Math.round(evaluation);
}

// Generate mock principal variation
function generateMockPV(fen, depth) {
  const commonMoves = [
    'e2e4', 'e7e5', 'g1f3', 'b8c6', 'd2d4', 'd7d6',
    'f1c4', 'f8e7', 'e1g1', 'e8g8', 'c2c3', 'a7a6'
  ];
  
  const pv = [];
  for (let i = 0; i < Math.min(depth, 8); i++) {
    const move = commonMoves[Math.floor(Math.random() * commonMoves.length)];
    pv.push(move);
  }
  
  return pv;
}

// Mock engine state
let isReady = false;
let isAnalyzing = false;
let currentPosition = '';
let engineOptions = {
  Hash: 16,
  Threads: 1,
  MultiPV: 1
};

// Handle incoming messages
self.onmessage = function(e) {
  const message = e.data;
  
  // Handle UCI protocol commands
  if (message === 'uci') {
    // Engine identification
    self.postMessage('id name Stockfish Demo');
    self.postMessage('id author Claude Code Demo');
    
    // Engine options
    self.postMessage('option name Hash type spin default 16 min 1 max 1024');
    self.postMessage('option name Threads type spin default 1 min 1 max 8');
    self.postMessage('option name MultiPV type spin default 1 min 1 max 10');
    
    self.postMessage('uciok');
    return;
  }
  
  if (message === 'isready') {
    isReady = true;
    self.postMessage('readyok');
    return;
  }
  
  if (message.startsWith('setoption')) {
    // Parse option setting
    const parts = message.split(' ');
    const nameIndex = parts.indexOf('name');
    const valueIndex = parts.indexOf('value');
    
    if (nameIndex >= 0 && valueIndex >= 0) {
      const optionName = parts[nameIndex + 1];
      const optionValue = parts[valueIndex + 1];
      engineOptions[optionName] = optionValue;
      
      console.log(`Set ${optionName} = ${optionValue}`);
    }
    return;
  }
  
  if (message.startsWith('position')) {
    // Parse position command
    if (message.includes('fen')) {
      const fenIndex = message.indexOf('fen') + 4;
      const fenEnd = message.indexOf(' moves');
      currentPosition = fenEnd > 0 
        ? message.substring(fenIndex, fenEnd).trim()
        : message.substring(fenIndex).trim();
    } else if (message.includes('startpos')) {
      currentPosition = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    }
    
    console.log(`Position set: ${currentPosition}`);
    return;
  }
  
  if (message.startsWith('go')) {
    if (!isReady) {
      self.postMessage('info string Engine not ready');
      return;
    }
    
    isAnalyzing = true;
    
    // Parse go command
    const parts = message.split(' ');
    let depth = 15;
    let movetime = 1000;
    
    const depthIndex = parts.indexOf('depth');
    if (depthIndex >= 0 && parts[depthIndex + 1]) {
      depth = parseInt(parts[depthIndex + 1]);
    }
    
    const movetimeIndex = parts.indexOf('movetime');
    if (movetimeIndex >= 0 && parts[movetimeIndex + 1]) {
      movetime = parseInt(parts[movetimeIndex + 1]);
    }
    
    console.log(`Starting analysis: depth=${depth}, movetime=${movetime}`);
    
    // Simulate progressive depth analysis
    let currentDepth = 1;
    const startTime = Date.now();
    let nodes = 0;
    
    const analyzeDepth = () => {
      if (!isAnalyzing || currentDepth > depth) {
        return;
      }
      
      const elapsedTime = Date.now() - startTime;
      nodes += Math.floor(Math.random() * 50000) + 10000;
      const nps = Math.floor(nodes / (elapsedTime / 1000));
      
      const evaluation = mockEvaluation(currentPosition, currentDepth);
      const pv = generateMockPV(currentPosition, currentDepth);
      
      // Send info line
      const scoreType = Math.abs(evaluation) > 500 ? 'mate' : 'cp';
      const scoreValue = scoreType === 'mate' 
        ? (evaluation > 0 ? Math.ceil(currentDepth / 2) : -Math.ceil(currentDepth / 2))
        : evaluation;
      
      const infoLine = `info depth ${currentDepth} score ${scoreType} ${scoreValue} nodes ${nodes} nps ${nps} time ${elapsedTime} pv ${pv.join(' ')}`;
      self.postMessage(infoLine);
      
      currentDepth++;
      
      // Continue analysis or finish
      if (currentDepth <= depth && elapsedTime < movetime) {
        setTimeout(analyzeDepth, Math.random() * 200 + 100); // 100-300ms per depth
      } else {
        // Send best move
        const bestMove = pv[0] || 'e2e4';
        self.postMessage(`bestmove ${bestMove}`);
        isAnalyzing = false;
        console.log(`Analysis complete: bestmove ${bestMove}`);
      }
    };
    
    // Start analysis
    setTimeout(analyzeDepth, 50);
    return;
  }
  
  if (message === 'stop') {
    if (isAnalyzing) {
      isAnalyzing = false;
      self.postMessage('bestmove (none)');
      console.log('Analysis stopped');
    }
    return;
  }
  
  if (message === 'quit') {
    self.close();
    return;
  }
  
  // Unknown command
  console.log(`Unknown command: ${message}`);
};

// Initialize
console.log('Stockfish Demo WebWorker initialized');
self.postMessage('Stockfish Demo Worker Ready');