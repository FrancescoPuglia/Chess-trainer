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

// Legacy PGN Types (will be replaced by enhanced versions)
export interface LegacyPGNGame {
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

// VideoSyncPoint is now an alias for SyncPoint to maintain compatibility
// The unified SyncPoint interface includes all required fields
export type VideoSyncPoint = SyncPoint;

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
  
  // FSRS-specific fields (for advanced scheduling)
  stability?: number;     // Days until 90% retention probability
  difficulty?: number;    // 1-10 scale, higher = more difficult
  reps?: number;         // Number of successful reviews
  lapses?: number;       // Number of failed reviews
  
  // Scheduling
  dueDate?: Date;
  lastReview?: Date;
  interval?: number;     // Current interval in days
  
  // Flags
  isLeech?: boolean;     // Marked as problematic card
  isSuspended?: boolean; // Temporarily disabled
  
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

// Enhanced types for VideoStudySession component
export interface StudyStats {
  duration: number; // seconds
  cardsCreated: number;
  reviewsCompleted: number;
  averageSyncDrift: number; // milliseconds
  syncPerformanceScore: number; // 0-1, percentage of syncs within target
  positionsStudied?: number;
  accuracyByTag?: Record<string, number>;
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

// ═══════════════════════════════════════════════════════════════
// ENTERPRISE STOCKFISH ENGINE INTEGRATION
// ═══════════════════════════════════════════════════════════════

/**
 * Enhanced engine system for enterprise chess applications
 */
export interface EngineSystemState {
  isInitialized: boolean;
  poolSize: number;
  activeAnalyses: number;
  queueLength: number;
  averageResponseTime: number;
  healthScore: number;
  lastError: Error | null;
}

/**
 * Engine analysis priority levels
 */
export type AnalysisPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Engine worker health status
 */
export type EngineWorkerHealth = 'healthy' | 'degraded' | 'failed';

/**
 * Advanced engine configuration
 */
export interface AdvancedEngineOptions extends EngineOptions {
  enableProgressiveDepth: boolean;
  enableTablebase: boolean;
  cacheSize: number;
  qualityThreshold: number;
  timeManagement: 'fixed' | 'adaptive' | 'tournament';
}

// ========================================
// DAY 2 ENTERPRISE TYPES - PGN + VIDEO + SYNC
// ========================================

// PGN Parser Types (Enhanced)
export interface PGNHeader {
  Event: string;
  Site: string;
  Date: string;
  Round: string;
  White: string;
  Black: string;
  Result: string;
  [key: string]: string; // Additional headers
}

export interface PGNComment {
  moveIndex: number;
  text: string;
  timestamp?: number; // For video sync
}

export interface PGNVariation {
  startMoveIndex: number;
  moves: string[];
  comment?: string;
}

export interface TrainingData {
  puzzlePositions: Array<{
    fen: string;
    solution: string;
    comment?: string;
  }>;
  keyMoments: Array<{
    moveIndex: number;
    comment: string;
    difficulty?: number;
  }>;
  mistakes: Array<{
    moveIndex: number;
    correctMove?: string;
    explanation?: string;
  }>;
  totalMoves: number;
  hasAnnotations: boolean;
}

export interface PGNGame {
  id: string;
  headers: PGNHeader;
  moves: ChessMove[];
  comments: PGNComment[];
  variations: PGNVariation[];
  result: string;
  trainingData?: TrainingData;
  metadata: {
    gameNumber: number;
    parsedAt: string;
    moveCount: number;
    commentCount: number;
    variationCount: number;
  };
}

export interface PGNParseError {
  type: 'error' | 'warning' | 'critical';
  message: string;
  line: number;
  column: number;
}

export interface PGNParseResult {
  success: boolean;
  games: PGNGame[];
  errors: PGNParseError[];
  metadata: {
    totalGames: number;
    parseTimeMs: number;
    warnings: PGNParseError[];
  };
}

// Video Player Configuration
export interface VideoPlayerConfig {
  seekThreshold: number;
  playbackRates: number[];
  keyboardShortcuts: boolean;
  showFrameInfo: boolean;
  maxBufferSize: number;
  preloadStrategy: 'auto' | 'metadata' | 'none';
}

// Video Player Types (Enterprise)
export interface VideoPlayerProps {
  src: string;
  syncPoints?: SyncPoint[];
  currentSyncIndex?: number;
  onTimeUpdate?: (currentTime: number) => void;
  onSyncPointReached?: (syncPoint: SyncPoint) => void;
  onError?: (error: Error) => void;
  config?: Partial<VideoPlayerConfig>;
  className?: string;
}

export interface VideoPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  playbackRate: number;
  volume: number;
  muted: boolean;
  isLoading: boolean;
  error: string | null;
  isFullscreen: boolean;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  fileSize: number;
  bitrate: number;
}

export interface VideoPlayerEvent {
  type: 'play' | 'pause' | 'seek' | 'error' | 'loaded';
  timestamp: number;
  data?: any;
}

// Sync Editor Configuration
export interface SyncEditorConfig {
  maxDriftMs: number;
  snapThreshold: number;
  showPreview: boolean;
  enableAutoSuggest: boolean;
  minSyncInterval: number;
  maxUndoSteps: number;
}

// Sync Editor Types (Professional)
export interface SyncEditorProps {
  videoSrc: string;
  moves: ChessMove[];
  initialSyncPoints?: SyncPoint[];
  onSyncPointsChange?: (syncPoints: SyncPoint[]) => void;
  onSave?: (syncPoints: SyncPoint[]) => void;
  onCancel?: () => void;
  config?: Partial<SyncEditorConfig>;
  className?: string;
}

export interface SyncEditorState {
  syncPoints: SyncPoint[];
  selectedPointIndex: number;
  currentVideoTime: number;
  isPlaying: boolean;
  isPreviewMode: boolean;
  validationResult: SyncValidationResult | null;
  isDirty: boolean;
}

export interface SyncPoint {
  id: string;            // Unique identifier
  timestamp: number;      // Video time in seconds
  moveIndex: number;      // Move index in game
  fen: string;           // Position FEN
  moveNumber: number;     // Display move number
  isWhiteMove: boolean;   // Is it white's move?
  description?: string;   // Optional description
  tolerance: number;      // Sync tolerance in seconds
}

// SyncPoint Factory Functions and Utilities
export interface CreateSyncPointOptions {
  timestamp: number;
  moveIndex: number;
  fen: string;
  moveNumber: number;
  isWhiteMove: boolean;
  description?: string;
  tolerance?: number;
  id?: string;
}

/**
 * ENTERPRISE FACTORY: Create a fully compliant SyncPoint
 * 
 * Ensures type safety and provides intelligent defaults for all required fields.
 * Used throughout the application to maintain SyncPoint consistency.
 * 
 * @param options - SyncPoint creation options
 * @returns Fully compliant SyncPoint with all required fields
 */
export function createSyncPoint(options: CreateSyncPointOptions): SyncPoint {
  return {
    id: options.id || `sync-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: options.timestamp,
    moveIndex: options.moveIndex,
    fen: options.fen,
    moveNumber: options.moveNumber,
    isWhiteMove: options.isWhiteMove,
    description: options.description,
    tolerance: options.tolerance || 0.5, // Default 500ms tolerance
  };
}

/**
 * ENTERPRISE UTILITY: Create SyncPoint from minimal data
 * 
 * For backward compatibility with existing code patterns.
 * Automatically infers missing fields where possible.
 */
export function createSyncPointFromBasics(
  timestamp: number,
  fen: string,
  moveIndex: number = -1,
  tolerance: number = 0.5
): SyncPoint {
  // Extract move number from FEN (6th field)
  const fenParts = fen.split(' ');
  const moveNumber = fenParts.length >= 6 ? parseInt(fenParts[5]) || 1 : 1;
  
  // Determine if white's move from FEN (2nd field)
  const isWhiteMove = fenParts.length >= 2 ? fenParts[1] === 'w' : true;

  return createSyncPoint({
    timestamp,
    moveIndex,
    fen,
    moveNumber,
    isWhiteMove,
    tolerance,
    description: `Auto-generated sync point at ${timestamp}s`,
  });
}

/**
 * ENTERPRISE TYPE GUARD: Validate SyncPoint completeness
 */
export function isValidSyncPoint(obj: any): obj is SyncPoint {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.timestamp === 'number' &&
    typeof obj.moveIndex === 'number' &&
    typeof obj.fen === 'string' &&
    typeof obj.moveNumber === 'number' &&
    typeof obj.isWhiteMove === 'boolean' &&
    typeof obj.tolerance === 'number' &&
    obj.tolerance > 0
  );
}

export interface SyncValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  maxDrift: number;       // Maximum drift in milliseconds
  syncPointCount: number;
}

export interface SyncImportResult {
  success: boolean;
  pointsImported: number;
  error?: string;
  warnings?: string[];
}

// File Upload Configuration
export interface FileUploaderConfig {
  maxFileSize: number;
  supportedTypes: SupportedFileType[];
  allowMultiple: boolean;
  useOPFS: boolean;
  validateContent: boolean;
  showPreview: boolean;
  autoUpload: boolean;
}

// File Upload Types (OPFS + Security)
export type SupportedFileType = 'video' | 'pgn' | 'image';

export interface FileUploaderProps {
  onFileUploaded?: (uploadedFile: UploadedFile) => void;
  onUploadProgress?: (progress: UploadProgressEvent) => void;
  onError?: (error: Error) => void;
  config?: Partial<FileUploaderConfig>;
  acceptedTypes?: SupportedFileType[];
  maxSize?: number;
  className?: string;
  disabled?: boolean;
}

export interface UploadedFile {
  file: File;
  result: FileUploadResult;
  validation: FileValidationResult;
}

export interface FileUploadResult {
  success: boolean;
  url: string;
  fileName: string;
  size: number;
  type: string;
  storage: 'memory' | 'opfs';
  content?: string;      // For text files
  metadata: {
    uploadedAt: string;
    originalName: string;
  };
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileType: SupportedFileType | null;
  sanitizedName: string;
}

export interface UploadProgressEvent {
  taskId: string;
  fileName: string;
  progress: number;      // 0-100
  bytesUploaded: number;
  totalBytes: number;
}

// Training Lesson Types (Enhanced)
export interface TrainingLesson {
  id: string;
  title: string;
  description: string;
  games: PGNGame[];
  moves: ChessMove[];
  analysis: GameAnalysis;
  syncPoints: SyncPoint[];
  hasVideo: boolean;
  videoSrc: string | null;
  createdAt: string;
  updatedAt: string;
  version: string;
  source: string;
  tags: string[];
  difficulty: number;
  estimatedDuration: number; // minutes
}

export interface GameAnalysis {
  totalGames: number;
  totalMoves: number;
  avgMovesPerGame: number;
  hasAnalysis: boolean;
  difficulty: number;
  keyPositions: number;
  themes: string[];
}

export interface LessonMetadata {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  version: string;
  source: string;
  tags: string[];
  difficulty: number;
  estimatedDuration: number;
}

// GameAPI Interface (Enhanced for PGN)
export interface IGameAPI {
  // Core chess logic
  reset(): void;
  loadFEN(fen: string): boolean;
  fen(): string;
  pgn(): string;
  turn(): Color;
  isCheck(): boolean;
  isCheckmate(): boolean;
  isStalemate(): boolean;
  isGameOver(): boolean;
  
  // Move operations
  move(moveInput: string | { from: Square; to: Square; promotion?: PieceSymbol }): ChessMove | null;
  moves(options?: { square?: Square; verbose?: boolean }): string[] | ChessMove[];
  undo(): ChessMove | null;
  
  // Position analysis
  inCheck(): boolean;
  inCheckmate(): boolean;
  inStalemate(): boolean;
  inDraw(): boolean;
  insufficientMaterial(): boolean;
  inThreefoldRepetition(): boolean;
  
  // Board representation
  board(): (ChessPiece | null)[][];
  get(square: Square): ChessPiece | null;
  put(piece: ChessPiece, square: Square): boolean;
  remove(square: Square): ChessPiece | null;
  
  // Game state
  history(options?: { verbose: boolean }): string[] | ChessMove[];
  getComment(): string;
  setComment(comment: string): void;
  
  // Validation
  validateFen(fen: string): { valid: boolean; error?: string };
  squareColor(square: Square): 'light' | 'dark';
}

// FSRS Types (Enhanced)
export interface FSRSCard {
  due: Date;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: CardState;
  last_review?: Date;
}

export type CardState = 'New' | 'Learning' | 'Review' | 'Relearning';
export type Grade = 0 | 1 | 2 | 3 | 4; // Again, Hard, Good, Easy

export interface FSRSParameters {
  w: number[];              // 19 parameters for FSRS v4
  request_retention: number; // Target retention rate
  maximum_interval: number;  // Maximum interval in days
  enable_fuzz: boolean;     // Add randomization to intervals
}

// Quality Gate Types (Enhanced)
export interface PerformanceBudget {
  ttiMs: number;           // Time to Interactive
  memoryMb: number;        // Memory usage
  bundleSizeKb: number;    // Bundle size
  renderTimeMs: number;    // Render time
  apiResponseMs: number;   // API response time
  errorRate: number;       // Error percentage
  
  // Engine-specific metrics
  stockfishInitMs: number; // Stockfish initialization time
  stockfishResponseMs: number; // Engine response time
  
  // Video-specific metrics
  videoLoadTimeMs: number; // Video loading time
  seekTimeMs: number;      // Video seek operation time
  
  // File operation metrics
  fileUploadMs: number;    // File upload time
  
  // Game validation metrics
  gameValidationMs: number; // Game/move validation time
  
  // Sync metrics
  syncDriftMs: number;     // Video sync drift tolerance
  
  // SRS metrics
  srsRatePerMinute: number; // SRS review rate
  
  // Analytics metrics
  moveAnalysisMs: number;   // Move analysis time
  positionAnalysisMs: number; // Position analysis time
  
  // Engine pool metrics
  enginePoolInitMs: number; // Engine pool initialization time
  
  // System metrics
  engineSystemInitMs: number; // Engine system initialization time
}

export interface QualityMetrics {
  healthScore: number;     // 0-100
  performance: Record<keyof PerformanceBudget, number>;
  errors: QualityIssue[];
  warnings: QualityIssue[];
  uptime: number;         // Percentage
  lastUpdate: string;
}

export interface QualityIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  timestamp: string;
  count: number;
  resolved: boolean;
}

// ═══════════════════════════════════════════════════════════════
// ENTERPRISE MOVE HISTORY & ANALYTICS SYSTEM
// ═══════════════════════════════════════════════════════════════

/**
 * Enhanced Move History System with enterprise-grade analytics
 * Supports real-time analytics, performance tracking, and historical analysis
 */
export interface MoveHistoryEntry {
  id: string;
  move: ChessMove;
  timestamp: Date;
  position: {
    fen: string;
    pgn: string;
    moveNumber: number;
    halfMoveNumber: number;
  };
  timing: {
    thinkTimeMs: number;        // Time spent thinking about this move
    cumulativeTimeMs: number;   // Total time since game start
  };
  analysis?: {
    classification: MoveClassification;
    complexity: MoveComplexity;
    themes: string[];           // tactical themes, strategic concepts
    evaluation?: number;        // engine evaluation (if available)
    isBlunder?: boolean;
    isBrilliant?: boolean;
  };
  metadata: {
    source: 'user' | 'demo' | 'imported' | 'study';
    context?: string;           // e.g., 'video-study', 'board-demo'
    sessionId?: string;
  };
}

export type MoveClassification = 
  | 'opening' 
  | 'middlegame' 
  | 'endgame' 
  | 'tactical' 
  | 'positional' 
  | 'forcing' 
  | 'quiet';

export type MoveComplexity = 
  | 'simple'      // Basic moves (1-2 candidate moves)
  | 'moderate'    // Standard moves (3-5 candidates)
  | 'complex'     // Advanced moves (5+ candidates, calculation required)
  | 'critical';   // Game-defining moves (must be calculated precisely)

/**
 * Real-time game analytics with comprehensive KPI tracking
 */
export interface GameAnalytics {
  // Session Information
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  duration: number;           // milliseconds
  
  // Move Statistics
  totalMoves: number;
  movesPerPhase: {
    opening: number;
    middlegame: number;
    endgame: number;
  };
  
  // Timing Analytics
  timing: {
    averageThinkTimeMs: number;
    medianThinkTimeMs: number;
    longestThinkTimeMs: number;
    thinkTimeStandardDeviation: number;
    timeDistribution: {
      fast: number;         // < 5 seconds
      normal: number;       // 5-15 seconds
      slow: number;         // 15-60 seconds
      deep: number;         // > 60 seconds
    };
  };
  
  // Pattern Recognition
  patterns: {
    tacticalMotifs: Record<string, number>;    // "pin": 3, "fork": 1, etc.
    strategicThemes: Record<string, number>;   // "central control": 5, etc.
    openings: Record<string, number>;          // Opening repertoire tracking
    endgames: Record<string, number>;          // Endgame patterns
  };
  
  // Performance Metrics
  performance: {
    complexityScore: number;        // Average complexity of positions faced
    accuracyScore?: number;         // If engine analysis available (0-100)
    consistencyScore: number;       // Time management consistency (0-100)
    improvementTrend: number;       // Recent improvement trend (-1 to 1)
  };
  
  // Quality Gate Integration
  qualityMetrics: {
    uiResponseTimeMs: number;
    syncAccuracyMs: number;         // For video study mode
    errorCount: number;
    warningCount: number;
  };
}

/**
 * Advanced analytics for study sessions and training
 */
export interface StudyAnalytics extends GameAnalytics {
  // Study-Specific Metrics
  studyMode: 'board-demo' | 'video-study' | 'analysis';
  
  // Video Study Integration (when applicable)
  videoSync?: {
    driftEvents: number;
    averageDriftMs: number;
    maxDriftMs: number;
    syncQualityScore: number;       // 0-100
  };
  
  // Learning Analytics
  learning: {
    conceptsEncountered: string[];
    repetitionCount: Record<string, number>;  // How many times each concept was seen
    masteryLevel: Record<string, number>;     // 0-1 mastery score per concept
    learningVelocity: number;                 // Rate of concept acquisition
  };
  
  // Comparative Analytics
  comparative: {
    previousSessions: StudyAnalytics[];
    improvementAreas: string[];
    strengthAreas: string[];
    recommendations: StudyRecommendation[];
  };
}

export interface StudyRecommendation {
  id: string;
  type: 'tactical' | 'positional' | 'opening' | 'endgame' | 'time-management';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  actionItems: string[];
  expectedImpact: number;         // 0-100 score
  estimatedTimeMinutes: number;
}

/**
 * Analytics Event System for real-time tracking
 */
export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  timestamp: Date;
  sessionId: string;
  data: Record<string, any>;
  metadata: {
    component: string;
    function: string;
    userId?: string;
  };
}

export type AnalyticsEventType = 
  | 'move_made'
  | 'position_analysis'
  | 'time_spent'
  | 'pattern_recognized'
  | 'error_occurred'
  | 'improvement_detected'
  | 'session_milestone'
  | 'sync_quality_change'
  | 'user_action'
  | 'performance_metric';

/**
 * Advanced piece information with tactical and positional analysis
 */
export interface PieceAnalysis {
  square: Square;
  piece: ChessPiece;
  
  // Basic Information
  canMove: boolean;
  legalMoves: Square[];
  attackedSquares: Square[];
  defendedSquares: Square[];
  
  // Tactical Analysis
  tactical: {
    isHanging: boolean;           // Undefended and attackable
    isDefended: boolean;
    isAttacking: boolean;
    isPinned: boolean;
    isSkewered: boolean;
    forkTargets: Square[];        // Squares this piece could fork
    discoveredAttackPotential: boolean;
  };
  
  // Positional Analysis
  positional: {
    mobility: number;             // Number of legal moves (0-27 for queen)
    centralization: number;       // 0-1 score for central placement
    activity: number;             // 0-1 overall activity score
    coordination: number;         // 0-1 coordination with other pieces
    safety: number;               // 0-1 safety score
  };
  
  // Advanced Concepts
  strategic: {
    controlsKey: boolean;         // Controls key squares (center, outposts)
    blocksPawn: boolean;          // Blocks enemy pawn advancement
    supportsPassedPawn: boolean;
    occupiesOutpost: boolean;
    weaknessCreated: Square[];    // Weaknesses this piece creates
    strengths: string[];          // Strategic strengths
  };
}

/**
 * Comprehensive sync integration for video study mode
 */
export interface VideoSyncIntegration {
  isActive: boolean;
  currentVideoTime: number;
  syncQuality: {
    driftMs: number;
    qualityScore: number;         // 0-100
    lastSyncTime: Date;
  };
  analytics: {
    syncEvents: number;
    averageDriftMs: number;
    worstDriftMs: number;
    perfectSyncs: number;         // Syncs with <100ms drift
  };
}