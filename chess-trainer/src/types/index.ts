// Core Chess Types
export type Color = 'w' | 'b';
export type PieceSymbol = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type Square = 
  | 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'a6' | 'a7' | 'a8'
  | 'b1' | 'b2' | 'b3' | 'b4' | 'b5' | 'b6' | 'b7' | 'b8'
  | 'c1' | 'c2' | 'c3' | 'c4' | 'c5' | 'c6' | 'c7' | 'c8'
  | 'd1' | 'd2' | 'd3' | 'd4' | 'd5' | 'd6' | 'd7' | 'd8'
  | 'e1' | 'e2' | 'e3' | 'e4' | 'e5' | 'e6' | 'e7' | 'e8'
  | 'f1' | 'f2' | 'f3' | 'f4' | 'f5' | 'f6' | 'f7' | 'f8'
  | 'g1' | 'g2' | 'g3' | 'g4' | 'g5' | 'g6' | 'g7' | 'g8'
  | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'h7' | 'h8';

export interface ChessPiece {
  type: PieceSymbol;
  color: Color;
}

export interface ChessMove {
  from: Square;
  to: Square;
  promotion?: PieceSymbol;
  san: string;
  fen: string;
  captured?: PieceSymbol;
  flags: string;
}

export interface GamePosition {
  fen: string;
  pgn: string;
  moveNumber: number;
  halfMoveNumber: number;
  turn: Color;
  inCheck: boolean;
  inCheckmate: boolean;
  inStalemate: boolean;
  inDraw: boolean;
  isGameOver: boolean;
}

// PGN and Study Types
export interface PGNGame {
  id: string;
  headers: Record<string, string>;
  moves: PGNMove[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PGNMove {
  san: string;
  fen: string;
  moveNumber: number;
  comment?: string;
  annotations?: string[];
  variations?: PGNMove[][];
  nags?: number[];
}

export interface Study {
  id: string;
  name: string;
  description?: string;
  pgnGameId: string;
  positions: StudyPosition[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface StudyPosition {
  id: string;
  fen: string;
  comment?: string;
  moveNumber: number;
  tags: string[];
  syncPoints?: VideoSyncPoint[];
}

// Video Types
export interface Video {
  id: string;
  name: string;
  filename: string;
  duration: number;
  chapters?: VideoChapter[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  opfsPath?: string; // Origin Private File System path
}

export interface VideoChapter {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  description?: string;
}

export interface VideoSyncPoint {
  id: string;
  timestamp: number; // seconds
  fen: string;
  moveNumber: number;
  description?: string;
  tolerance: number; // sync tolerance in seconds
}

// SRS (Spaced Repetition System) Types
export interface SRSCard {
  id: string;
  type: 'move' | 'plan';
  fen: string;
  solution: string | PlanSolution;
  tags: string[];
  sourceVideoId?: string;
  sourceTimestamp?: number;
  sourceStudyId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanSolution {
  keyPoints: string[];
  explanation: string;
  rubricPoints: RubricPoint[];
}

export interface RubricPoint {
  id: string;
  description: string;
  weight: number;
  required: boolean;
}

export interface SRSReview {
  id: string;
  cardId: string;
  rating: number; // 0-5 scale
  responseTime: number; // milliseconds
  reviewedAt: Date;
  nextDue: Date;
  interval: number; // days
  easeFactor: number;
  stability?: number; // FSRS
  difficulty?: number; // FSRS
}

export interface SRSDeck {
  id: string;
  name: string;
  description?: string;
  cardIds: string[];
  algorithm: 'SM2' | 'FSRS';
  parameters: SRSParameters;
  createdAt: Date;
  updatedAt: Date;
}

export interface SRSParameters {
  // SM-2 Parameters
  sm2?: {
    easeFactor: number;
    minEaseFactor: number;
    maxEaseFactor: number;
    easyBonus: number;
    hardPenalty: number;
  };
  // FSRS Parameters
  fsrs?: {
    w: number[]; // 17 parameters array
    requestRetention: number;
    maximumInterval: number;
    enableFuzz: boolean;
  };
}

// Planner Types
export interface Goal {
  id: string;
  title: string;
  description?: string;
  deadline: Date;
  milestones: Milestone[];
  tags: string[];
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface Milestone {
  id: string;
  goalId: string;
  title: string;
  description?: string;
  weekNumber: number;
  tasks: Task[];
  deadline: Date;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  milestoneId: string;
  title: string;
  description?: string;
  type: 'video' | 'study' | 'srs' | 'custom';
  targetId?: string; // video/study/deck id
  estimatedMinutes: number;
  actualMinutes?: number;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Analytics Types
export interface StudySession {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // minutes
  type: 'video' | 'srs' | 'engine' | 'mixed';
  videoId?: string;
  deckId?: string;
  cardsReviewed?: number;
  accuracy?: number; // percentage
  tags: string[];
}

export interface KPI {
  date: Date;
  minutesStudied: number;
  videosCompleted: number;
  cardsReviewed: number;
  srsAccuracy: number;
  streak: number;
  tags: Record<string, number>; // minutes per tag
}

// Engine Types
export interface EngineEvaluation {
  depth: number;
  score: {
    type: 'cp' | 'mate';
    value: number;
  };
  pv: string[]; // principal variation
  bestMove?: string;
  nodes: number;
  nps: number; // nodes per second
  time: number; // milliseconds
}

export interface EngineOptions {
  depth: number;
  multiPV: number;
  threads: number;
  hash: number; // MB
}

// Integration Types (Lichess)
export interface LichessProfile {
  id: string;
  username: string;
  perfs: Record<string, LichessPerfStat>;
  profile?: {
    country?: string;
    location?: string;
    bio?: string;
  };
}

export interface LichessPerfStat {
  games: number;
  rating: number;
  rd: number; // rating deviation
  prog: number; // rating progress
}

export interface LichessGame {
  id: string;
  rated: boolean;
  variant: string;
  speed: string;
  perf: string;
  createdAt: number;
  lastMoveAt: number;
  status: string;
  players: {
    white: LichessPlayer;
    black: LichessPlayer;
  };
  opening?: {
    eco: string;
    name: string;
    ply: number;
  };
  moves?: string;
  pgn?: string;
  clock?: {
    initial: number;
    increment: number;
    totalTime: number;
  };
}

export interface LichessPlayer {
  user?: {
    name: string;
    id: string;
  };
  rating?: number;
  ratingDiff?: number;
}

export interface LichessRatingHistory {
  name: string; // perf type
  points: [number, number, number, number][]; // [year, month, day, rating]
}

// Utility Types
export interface DatabaseSchema {
  videos: Video;
  pgnGames: PGNGame;
  studies: Study;
  srsCards: SRSCard;
  srsReviews: SRSReview;
  srsDecks: SRSDeck;
  goals: Goal;
  milestones: Milestone;
  tasks: Task;
  studySessions: StudySession;
  kpis: KPI;
  syncPoints: VideoSyncPoint;
}

export type DatabaseTables = keyof DatabaseSchema;

export interface AppState {
  currentVideo?: Video;
  currentPosition?: GamePosition;
  currentDeck?: SRSDeck;
  currentGoal?: Goal;
  engineEvaluation?: EngineEvaluation;
  syncEnabled: boolean;
  engineEnabled: boolean;
}

// Feature Flags
export interface FeatureFlags {
  stockfish: boolean;
  lichessOAuth: boolean;
  fsrsAdvanced: boolean;
  videoSync: boolean;
  analytics: boolean;
}