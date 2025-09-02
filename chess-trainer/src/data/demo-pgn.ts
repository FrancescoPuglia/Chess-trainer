/**
 * Demo PGN Data for Testing
 * 
 * Contains sample chess games and positions for testing
 * the GameAPI and board functionality.
 */

export const DEMO_GAMES = {
  // Famous Queen's Gambit game
  queensGambit: {
    title: "Queen's Gambit Declined - Classical",
    pgn: `[Event "Demo Game"]
[Site "Chess Trainer"]
[Date "2024.01.01"]
[Round "1"]
[White "Demo Player"]
[Black "Demo Opponent"]
[Result "*"]
[ECO "D37"]
[Opening "Queen's Gambit Declined, Classical"]

1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 5. e3 O-O 6. Nf3 Nbd7 
7. Rc1 c6 8. Bd3 dxc4 9. Bxc4 Nd5 10. Bxe7 Qxe7 11. O-O Nxc3 
12. Rxc3 e5 13. dxe5 Nxe5 14. Nxe5 Qxe5 15. f4 Qe7 16. Qf3 Be6 
17. Bxe6 Qxe6 18. Rc4 Rad8 19. Re1 Rd2 20. b3 Rfd8 *`,
    description: "Classical Queen's Gambit Declined with typical piece play"
  },

  // Sicilian Defense
  sicilian: {
    title: "Sicilian Defense - Najdorf",
    pgn: `[Event "Demo Game"]
[Site "Chess Trainer"]
[Date "2024.01.01"]
[Round "2"]
[White "Demo Player"]
[Black "Demo Opponent"]
[Result "*"]
[ECO "B90"]
[Opening "Sicilian, Najdorf"]

1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 
6. Be3 e6 7. f3 b5 8. Qd2 Bb7 9. O-O-O Nbd7 10. h4 Rc8 
11. Kb1 h6 12. g4 Be7 13. Be2 Qc7 14. g5 hxg5 15. hxg5 Rxh1 
16. Rxh1 Nh7 17. f4 b4 18. Nd1 Nxg5 19. fxg5 Bxg5 *`,
    description: "Sharp Najdorf Sicilian with opposite-side castling"
  },

  // King's Indian Defense
  kingsIndian: {
    title: "King's Indian Defense - Classical",
    pgn: `[Event "Demo Game"]
[Site "Chess Trainer"]
[Date "2024.01.01"]
[Round "3"]
[White "Demo Player"]
[Black "Demo Opponent"]
[Result "*"]
[ECO "E97"]
[Opening "King's Indian, Classical"]

1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Nf3 O-O 
6. Be2 e5 7. O-O Nc6 8. d5 Ne7 9. Ne1 Nd7 10. Be3 f5 
11. f3 f4 12. Bf2 g5 13. Rc1 Ng6 14. c5 Nf6 15. cxd6 cxd6 
16. Nb5 Rf7 17. Rxc8+ Qxc8 18. Nxd6 Qd7 19. Nxf7 Qxf7 *`,
    description: "Classical King's Indian with typical pawn storm"
  },

  // Tactical puzzle
  tacticalPuzzle: {
    title: "Tactical Puzzle - Fork",
    pgn: `[Event "Tactical Puzzle"]
[Site "Chess Trainer"]
[Date "2024.01.01"]
[Round "?"]
[White "White to play"]
[Black "Find the fork"]
[Result "*"]
[FEN "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 1"]
[SetUp "1"]

1. Ng5 d6 2. Qh5 g6 3. Qf3 Nh5 4. Nxf7 *`,
    description: "White finds a knight fork winning material"
  },

  // Endgame study
  endgameStudy: {
    title: "Endgame Study - Rook vs Pawns",
    pgn: `[Event "Endgame Study"]
[Site "Chess Trainer"]
[Date "2024.01.01"]
[Round "?"]
[White "White to draw"]
[Black "Rook vs Pawns"]
[Result "*"]
[FEN "8/8/8/8/2k5/2p5/2P1K3/1r6 b - - 0 1"]
[SetUp "1"]

1... Rb2 2. Kf3 Rxc2 3. Kg4 Kd3 4. Kf5 c2 5. Ke5 Kd2 
6. Kd4 c1=Q 7. Ke4 Qc4+ 8. Kf5 Qf4+ 9. Kg6 Qg4+ 10. Kf7 *`,
    description: "Theoretical rook vs pawns endgame position"
  }
};

export const DEMO_POSITIONS = {
  // Starting position
  starting: {
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    description: "Starting position"
  },

  // Middle game position
  middlegame: {
    fen: "r1bq1rk1/pp2ppbp/2np1np1/8/3PP3/2N1BN2/PPP2PPP/R2QKB1R w KQ - 0 8",
    description: "Typical middlegame position from King's Indian Defense"
  },

  // Tactical position
  tactical: {
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 4",
    description: "Italian Game with tactical possibilities"
  },

  // Endgame position
  endgame: {
    fen: "8/8/4k3/8/8/4K3/4P3/8 w - - 0 1",
    description: "King and pawn vs king endgame"
  },

  // Complex middlegame
  complex: {
    fen: "r2q1rk1/1b2bppp/p2p1n2/1p6/3BP3/2NB1N2/PPP2PPP/R2Q1RK1 w - - 0 12",
    description: "Complex middlegame position with imbalanced material"
  }
};

/**
 * Utility function to get a random demo game
 */
export function getRandomDemoGame(): { title: string; pgn: string; description: string } {
  const games = Object.values(DEMO_GAMES);
  return games[Math.floor(Math.random() * games.length)];
}

/**
 * Utility function to get a random demo position
 */
export function getRandomDemoPosition(): { fen: string; description: string } {
  const positions = Object.values(DEMO_POSITIONS);
  return positions[Math.floor(Math.random() * positions.length)];
}

/**
 * Get a specific demo game by key
 */
export function getDemoGame(key: keyof typeof DEMO_GAMES) {
  return DEMO_GAMES[key];
}

/**
 * Get a specific demo position by key
 */
export function getDemoPosition(key: keyof typeof DEMO_POSITIONS) {
  return DEMO_POSITIONS[key];
}