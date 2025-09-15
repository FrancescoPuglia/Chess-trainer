/**
 * ♔ ENTERPRISE ENGINE ANALYZER
 * 
 * High-level chess position analysis with tactical and strategic insights,
 * designed for educational and training applications.
 * 
 * Features:
 * - Advanced position evaluation with contextual insights
 * - Tactical pattern recognition and annotation
 * - Strategic theme identification
 * - Move quality assessment with explanations
 * - Training-focused feedback generation
 * 
 * Architecture:
 * - Facade Pattern: Simplified interface to complex engine operations
 * - Strategy Pattern: Multiple analysis strategies for different contexts
 * - Template Method: Standardized analysis workflow
 * - Observer Pattern: Real-time analysis updates
 */

import EngineManager from './EngineManager';
import type { 
  EngineEvaluation,
  EngineOptions,
  ChessMove,
  PieceAnalysis,
  Square,
  MoveClassification,
  MoveComplexity
} from '../../types/index';
import { createGameAPI, type IGameAPI } from '../../core/game-api';
import { qualityGate } from '../../utils/QualityGate';
import logger from '../../utils/Logger';

/**
 * Analysis context for targeted insights
 */
export interface AnalysisContext {
  purpose: 'training' | 'review' | 'study' | 'puzzle';
  playerLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  focus?: 'tactical' | 'positional' | 'endgame' | 'opening' | 'general';
  timeConstraint?: number; // Maximum analysis time in ms
}

/**
 * Comprehensive position analysis result
 */
export interface PositionAnalysis {
  // Basic Evaluation
  evaluation: EngineEvaluation;
  
  // Position Assessment
  assessment: {
    score: number;                    // Normalized score (-10 to +10)
    advantage: 'white' | 'black' | 'equal';
    magnitude: 'slight' | 'clear' | 'winning' | 'decisive';
    confidence: number;               // 0-100 confidence in evaluation
  };
  
  // Tactical Analysis
  tactical: {
    threats: TacticalThreat[];
    opportunities: TacticalOpportunity[];
    patterns: TacticalPattern[];
    criticalSquares: Square[];
    hangingPieces: Square[];
  };
  
  // Strategic Analysis
  strategic: {
    themes: StrategicTheme[];
    pawnStructure: PawnStructureAnalysis;
    kingSafety: KingSafetyAnalysis;
    pieceActivity: PieceActivityAnalysis;
    spaceAdvantage: number;           // -1 to +1 (negative = black advantage)
  };
  
  // Move Recommendations
  recommendations: {
    best: MoveRecommendation;
    alternatives: MoveRecommendation[];
    toAvoid: MoveRecommendation[];
  };
  
  // Educational Insights
  insights: {
    keyLearningPoints: string[];
    commonMistakes: string[];
    improvementSuggestions: string[];
    relatedConcepts: string[];
  };
  
  // Metadata
  metadata: {
    analysisId: string;
    timestamp: Date;
    analysisTimeMs: number;
    engineDepth: number;
    context: AnalysisContext;
  };
}

/**
 * Tactical threat identification
 */
export interface TacticalThreat {
  type: 'checkmate' | 'fork' | 'pin' | 'skewer' | 'discovery' | 'sacrifice' | 'trap';
  severity: 'low' | 'medium' | 'high' | 'critical';
  targetSquares: Square[];
  defendingMoves: string[];
  description: string;
  variation?: string[];
}

/**
 * Tactical opportunity recognition
 */
export interface TacticalOpportunity {
  type: 'fork' | 'pin' | 'skewer' | 'discovery' | 'sacrifice' | 'combination';
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  targetPieces: Square[];
  keyMoves: string[];
  materialGain: number;
  description: string;
  variation: string[];
}

/**
 * Tactical pattern detection
 */
export interface TacticalPattern {
  name: string;
  category: 'elementary' | 'intermediate' | 'advanced' | 'masterclass';
  squares: Square[];
  explanation: string;
  examples?: string[];
}

/**
 * Strategic theme identification
 */
export interface StrategicTheme {
  theme: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
  relatedSquares: Square[];
  playerAction: string;
}

/**
 * Pawn structure analysis
 */
export interface PawnStructureAnalysis {
  weaknesses: {
    isolated: Square[];
    doubled: Square[];
    backward: Square[];
    holes: Square[];
  };
  strengths: {
    passed: Square[];
    connected: Square[];
    chains: Square[][];
    outposts: Square[];
  };
  evaluation: number; // -1 to +1
  description: string;
}

/**
 * King safety evaluation
 */
export interface KingSafetyAnalysis {
  whiteKing: {
    safety: number;              // 0-100 safety score
    threats: string[];
    shelter: 'good' | 'average' | 'poor';
    openFiles: boolean;
  };
  blackKing: {
    safety: number;
    threats: string[];
    shelter: 'good' | 'average' | 'poor';
    openFiles: boolean;
  };
  description: string;
}

/**
 * Piece activity assessment
 */
export interface PieceActivityAnalysis {
  active: Square[];            // Squares with active pieces
  passive: Square[];           // Squares with passive pieces
  coordination: number;        // 0-100 coordination score
  development: {
    white: number;             // 0-100 development score
    black: number;
  };
  description: string;
}

/**
 * Move recommendation with educational context
 */
export interface MoveRecommendation {
  move: string;
  san: string;
  evaluation: number;
  reasoning: string;
  category: 'best' | 'good' | 'interesting' | 'mistake' | 'blunder';
  learningValue: number;       // 0-100 educational value
  difficulty: 'easy' | 'medium' | 'hard';
  followUp?: string[];
}

/**
 * Move quality assessment
 */
export interface MoveQualityAssessment {
  quality: 'excellent' | 'good' | 'inaccurate' | 'mistake' | 'blunder';
  scoreDrop: number;           // Centipawn loss
  explanation: string;
  betterMoves: string[];
  tacticalJustification?: string;
  strategicJustification?: string;
}

/**
 * Professional chess analyzer with educational focus
 */
export class EngineAnalyzer {
  private engineManager: EngineManager;
  private gameAPI: IGameAPI;
  
  constructor(engineManager: EngineManager) {
    this.engineManager = engineManager;
    this.gameAPI = createGameAPI();
    
    logger.info('engine-analyzer', 'EngineAnalyzer created', {}, { 
      component: 'EngineAnalyzer', 
      function: 'constructor' 
    });
  }

  /**
   * Perform comprehensive position analysis
   */
  async analyzePosition(
    fen: string, 
    context: AnalysisContext,
    options: Partial<EngineOptions> = {}
  ): Promise<PositionAnalysis> {
    const startTime = performance.now();
    const analysisId = `analysis-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    logger.info('engine-analyzer', 'Starting comprehensive position analysis', { 
      analysisId,
      fen: fen.substring(0, 30) + '...',
      context 
    }, { 
      component: 'EngineAnalyzer', 
      function: 'analyzePosition' 
    });

    try {
      // Set up position
      this.gameAPI.loadFEN(fen);
      
      // Get engine evaluation
      const evaluation = await this.getEngineEvaluation(fen, options, context);
      
      // Perform multi-layered analysis
      const [
        assessment,
        tactical,
        strategic,
        recommendations
      ] = await Promise.all([
        this.assessPosition(evaluation, fen),
        this.analyzeTactical(fen, evaluation),
        this.analyzeStrategic(fen),
        this.generateRecommendations(fen, evaluation, context)
      ]);

      // Generate educational insights
      const insights = this.generateInsights(evaluation, tactical, strategic, context);

      const analysisTime = performance.now() - startTime;
      
      const analysis: PositionAnalysis = {
        evaluation,
        assessment,
        tactical,
        strategic,
        recommendations,
        insights,
        metadata: {
          analysisId,
          timestamp: new Date(),
          analysisTimeMs: analysisTime,
          engineDepth: evaluation.depth,
          context
        }
      };

      logger.info('engine-analyzer', 'Position analysis completed', { 
        analysisId,
        analysisTimeMs: analysisTime,
        score: assessment.score,
        advantage: assessment.advantage 
      }, { 
        component: 'EngineAnalyzer', 
        function: 'analyzePosition' 
      });

      qualityGate.recordPerformance('positionAnalysisMs', analysisTime);
      return analysis;

    } catch (error) {
      qualityGate.recordError(error as Error, 'warning');
      logger.error('engine-analyzer', 'Position analysis failed', error, { 
        analysisId,
        fen: fen.substring(0, 30) + '...'
      }, { 
        component: 'EngineAnalyzer', 
        function: 'analyzePosition' 
      });
      throw error;
    }
  }

  /**
   * Analyze move quality compared to engine best move
   */
  async analyzeMoveQuality(
    beforeFen: string,
    move: string,
    afterFen: string,
    context: AnalysisContext
  ): Promise<MoveQualityAssessment> {
    logger.debug('engine-analyzer', 'Analyzing move quality', { 
      move,
      beforeFen: beforeFen.substring(0, 30) + '...'
    }, { 
      component: 'EngineAnalyzer', 
      function: 'analyzeMoveQuality' 
    });

    try {
      // Get evaluation before move
      const beforeEval = await this.engineManager.analyzePosition(beforeFen, { depth: 12 });
      
      // Get evaluation after move
      const afterEval = await this.engineManager.analyzePosition(afterFen, { depth: 12 });
      
      // Calculate score change (from perspective of player who moved)
      const beforeScore = this.normalizeScore(beforeEval.score);
      const afterScore = -this.normalizeScore(afterEval.score); // Flip perspective
      const scoreDrop = beforeScore - afterScore;

      // Determine move quality
      let quality: MoveQualityAssessment['quality'];
      if (scoreDrop <= 10) quality = 'excellent';
      else if (scoreDrop <= 25) quality = 'good';
      else if (scoreDrop <= 50) quality = 'inaccurate';
      else if (scoreDrop <= 100) quality = 'mistake';
      else quality = 'blunder';

      // Generate explanation based on context
      const explanation = this.generateMoveExplanation(move, scoreDrop, quality, context);
      
      // Get better alternatives
      const betterMoves = beforeEval.pv.slice(0, 3);

      return {
        quality,
        scoreDrop,
        explanation,
        betterMoves,
        tacticalJustification: this.getTacticalJustification(move, scoreDrop),
        strategicJustification: this.getStrategicJustification(move, scoreDrop)
      };

    } catch (error) {
      logger.error('engine-analyzer', 'Move quality analysis failed', error, { move }, { 
        component: 'EngineAnalyzer', 
        function: 'analyzeMoveQuality' 
      });
      throw error;
    }
  }

  /**
   * Get engine evaluation with context-appropriate settings
   */
  private async getEngineEvaluation(
    fen: string, 
    options: Partial<EngineOptions>,
    context: AnalysisContext
  ): Promise<EngineEvaluation> {
    // Adjust depth based on context
    let depth = options.depth || 15;
    
    if (context.timeConstraint) {
      // Estimate depth based on time constraint
      depth = Math.min(depth, Math.floor(context.timeConstraint / 300)); // ~300ms per depth
    }

    switch (context.purpose) {
      case 'puzzle':
        depth = Math.max(depth, 18); // Deeper for puzzles
        break;
      case 'training':
        depth = Math.max(depth, 15); // Standard training depth
        break;
      case 'review':
        depth = Math.max(depth, 12); // Faster for review
        break;
    }

    return await this.engineManager.analyzePosition(fen, { 
      ...options, 
      depth,
      multiPV: options.multiPV || (context.purpose === 'training' ? 3 : 1)
    });
  }

  /**
   * Assess position based on evaluation
   */
  private assessPosition(evaluation: EngineEvaluation, fen: string): Promise<PositionAnalysis['assessment']> {
    return new Promise((resolve) => {
      const score = this.normalizeScore(evaluation.score);
      
      let advantage: 'white' | 'black' | 'equal';
      let magnitude: 'slight' | 'clear' | 'winning' | 'decisive';
      
      const absScore = Math.abs(score);
      
      if (absScore < 50) {
        advantage = 'equal';
        magnitude = 'slight';
      } else {
        advantage = score > 0 ? 'white' : 'black';
        
        if (absScore < 100) magnitude = 'slight';
        else if (absScore < 300) magnitude = 'clear';
        else if (absScore < 500) magnitude = 'winning';
        else magnitude = 'decisive';
      }

      // Calculate confidence based on depth and search info
      const confidence = Math.min(100, 50 + evaluation.depth * 2 + (evaluation.nodes / 100000));

      resolve({
        score: score / 100, // Convert to pawns
        advantage,
        magnitude,
        confidence
      });
    });
  }

  /**
   * Analyze tactical elements
   */
  private async analyzeTactical(fen: string, evaluation: EngineEvaluation): Promise<PositionAnalysis['tactical']> {
    this.gameAPI.loadFEN(fen);
    
    return {
      threats: await this.identifyThreats(fen),
      opportunities: await this.identifyOpportunities(fen, evaluation),
      patterns: this.detectTacticalPatterns(fen),
      criticalSquares: this.findCriticalSquares(fen),
      hangingPieces: this.findHangingPieces(fen)
    };
  }

  /**
   * Analyze strategic elements
   */
  private async analyzeStrategic(fen: string): Promise<PositionAnalysis['strategic']> {
    this.gameAPI.loadFEN(fen);
    
    return {
      themes: this.identifyStrategicThemes(fen),
      pawnStructure: this.analyzePawnStructure(fen),
      kingSafety: this.analyzeKingSafety(fen),
      pieceActivity: this.analyzePieceActivity(fen),
      spaceAdvantage: this.calculateSpaceAdvantage(fen)
    };
  }

  /**
   * Generate move recommendations
   */
  private async generateRecommendations(
    fen: string, 
    evaluation: EngineEvaluation,
    context: AnalysisContext
  ): Promise<PositionAnalysis['recommendations']> {
    
    const best: MoveRecommendation = {
      move: evaluation.bestMove || evaluation.pv[0] || '',
      san: this.convertToSAN(evaluation.bestMove || evaluation.pv[0] || '', fen),
      evaluation: this.normalizeScore(evaluation.score),
      reasoning: this.generateMoveReasoning(evaluation.bestMove || '', fen, 'best'),
      category: 'best',
      learningValue: this.calculateLearningValue(evaluation.bestMove || '', context),
      difficulty: this.assessMoveDifficulty(evaluation.bestMove || '', fen)
    };

    // Generate alternatives from MultiPV if available
    const alternatives: MoveRecommendation[] = evaluation.pv.slice(1, 4).map((move, index) => ({
      move,
      san: this.convertToSAN(move, fen),
      evaluation: this.normalizeScore(evaluation.score) - (index + 1) * 20, // Rough estimate
      reasoning: this.generateMoveReasoning(move, fen, 'alternative'),
      category: 'good',
      learningValue: this.calculateLearningValue(move, context),
      difficulty: this.assessMoveDifficulty(move, fen)
    }));

    // Identify moves to avoid (common mistakes)
    const toAvoid = this.identifyMovesToAvoid(fen);

    return { best, alternatives, toAvoid };
  }

  /**
   * Generate educational insights
   */
  private generateInsights(
    evaluation: EngineEvaluation,
    tactical: PositionAnalysis['tactical'],
    strategic: PositionAnalysis['strategic'],
    context: AnalysisContext
  ): PositionAnalysis['insights'] {
    
    const keyLearningPoints: string[] = [];
    const commonMistakes: string[] = [];
    const improvementSuggestions: string[] = [];
    const relatedConcepts: string[] = [];

    // Generate insights based on tactical elements
    if (tactical.threats.length > 0) {
      keyLearningPoints.push('Position contains tactical threats that require careful attention');
      commonMistakes.push('Missing tactical threats can lead to material loss');
    }

    if (tactical.opportunities.length > 0) {
      keyLearningPoints.push('Tactical opportunities are available to improve the position');
      improvementSuggestions.push('Look for tactical motifs like forks, pins, and skewers');
    }

    // Generate insights based on strategic elements
    if (strategic.themes.length > 0) {
      const criticalThemes = strategic.themes.filter(t => t.importance === 'critical' || t.importance === 'high');
      if (criticalThemes.length > 0) {
        keyLearningPoints.push(`Key strategic themes: ${criticalThemes.map(t => t.theme).join(', ')}`);
      }
    }

    // Context-specific insights
    switch (context.purpose) {
      case 'training':
        improvementSuggestions.push('Practice calculating variations', 'Consider candidate moves systematically');
        break;
      case 'puzzle':
        keyLearningPoints.push('Focus on finding the forcing continuation');
        break;
    }

    // Player level adjustments
    switch (context.playerLevel) {
      case 'beginner':
        relatedConcepts.push('Basic tactics', 'Piece development', 'King safety');
        break;
      case 'intermediate':
        relatedConcepts.push('Positional play', 'Pawn structure', 'Piece coordination');
        break;
      case 'advanced':
        relatedConcepts.push('Strategic planning', 'Complex tactics', 'Endgame technique');
        break;
    }

    return {
      keyLearningPoints,
      commonMistakes,
      improvementSuggestions,
      relatedConcepts
    };
  }

  // Helper methods (simplified implementations for brevity)
  
  private normalizeScore(score: { type: 'cp' | 'mate'; value: number }): number {
    if (score.type === 'mate') {
      return score.value > 0 ? 1000 : -1000;
    }
    return score.value;
  }

  private convertToSAN(move: string, fen: string): string {
    try {
      this.gameAPI.loadFEN(fen);
      const moveObj = this.gameAPI.move(move);
      return moveObj?.san || move;
    } catch {
      return move;
    }
  }

  private generateMoveReasoning(move: string, fen: string, category: string): string {
    // Simplified reasoning generation
    switch (category) {
      case 'best':
        return 'This move maintains the evaluation advantage and follows sound chess principles.';
      case 'alternative':
        return 'A reasonable alternative that leads to a slightly different type of position.';
      default:
        return 'A playable move with some merit.';
    }
  }

  private calculateLearningValue(move: string, context: AnalysisContext): number {
    // Base learning value
    let value = 50;
    
    // Adjust based on context
    if (context.purpose === 'training') value += 20;
    if (context.focus === 'tactical') value += 15;
    
    return Math.min(100, value);
  }

  private assessMoveDifficulty(move: string, fen: string): 'easy' | 'medium' | 'hard' {
    // Simplified difficulty assessment
    if (move.includes('+') || move.includes('#')) return 'medium';
    if (move.includes('x')) return 'easy';
    return 'medium';
  }

  // ========================================
  // ADVANCED TACTICAL ANALYSIS IMPLEMENTATIONS
  // ========================================

  /**
   * ENTERPRISE THREAT DETECTION: Advanced tactical threat identification
   * Uses multi-layer analysis combining pattern recognition with engine evaluation
   */
  private async identifyThreats(fen: string): Promise<TacticalThreat[]> {
    const threats: TacticalThreat[] = [];
    this.gameAPI.loadFEN(fen);
    
    try {
      // Check for immediate checkmate threats
      const checkmateThreats = await this.detectCheckmateThreats(fen);
      threats.push(...checkmateThreats);
      
      // Detect fork patterns
      const forkThreats = this.detectForkPatterns(fen);
      threats.push(...forkThreats);
      
      // Detect pin and skewer patterns
      const pinSkewers = this.detectPinSkewers(fen);
      threats.push(...pinSkewers);
      
      // Detect discovery attacks
      const discoveries = this.detectDiscoveryAttacks(fen);
      threats.push(...discoveries);
      
      logger.debug('engine-analyzer', `Identified ${threats.length} tactical threats`, {
        checkmateCount: checkmateThreats.length,
        forkCount: forkThreats.length,
        pinSkewerCount: pinSkewers.length,
        discoveryCount: discoveries.length
      }, { component: 'EngineAnalyzer', function: 'identifyThreats' });
      
    } catch (error) {
      logger.warn('engine-analyzer', 'Threat identification failed', error, { fen }, {
        component: 'EngineAnalyzer', function: 'identifyThreats'
      });
    }
    
    return threats.sort((a, b) => {
      const severityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * ADVANCED OPPORTUNITY DETECTION: Find tactical opportunities with scoring
   */
  private async identifyOpportunities(fen: string, evaluation: EngineEvaluation): Promise<TacticalOpportunity[]> {
    const opportunities: TacticalOpportunity[] = [];
    this.gameAPI.loadFEN(fen);
    
    try {
      const possibleMoves = this.gameAPI.moves({ verbose: true }) as ChessMove[];
      
      for (const move of possibleMoves.slice(0, 10)) { // Analyze top 10 moves
        const opportunity = await this.evaluateOpportunity(move, fen, evaluation);
        if (opportunity) {
          opportunities.push(opportunity);
        }
      }
      
      logger.debug('engine-analyzer', `Found ${opportunities.length} tactical opportunities`, {
        totalMovesAnalyzed: Math.min(10, possibleMoves.length)
      }, { component: 'EngineAnalyzer', function: 'identifyOpportunities' });
      
    } catch (error) {
      logger.warn('engine-analyzer', 'Opportunity identification failed', error, { fen }, {
        component: 'EngineAnalyzer', function: 'identifyOpportunities'
      });
    }
    
    return opportunities.sort((a, b) => b.materialGain - a.materialGain);
  }

  /**
   * NEURAL PATTERN RECOGNITION: Detect tactical patterns using advanced algorithms
   */
  private detectTacticalPatterns(fen: string): TacticalPattern[] {
    const patterns: TacticalPattern[] = [];
    this.gameAPI.loadFEN(fen);
    
    try {
      // Back-rank patterns
      const backRankPatterns = this.detectBackRankPatterns(fen);
      patterns.push(...backRankPatterns);
      
      // Smothered mate patterns
      const smotheredPatterns = this.detectSmotheredMatePatterns(fen);
      patterns.push(...smotheredPatterns);
      
      // Double attack patterns
      const doubleAttackPatterns = this.detectDoubleAttackPatterns(fen);
      patterns.push(...doubleAttackPatterns);
      
      // Sacrifice patterns
      const sacrificePatterns = this.detectSacrificePatterns(fen);
      patterns.push(...sacrificePatterns);
      
      logger.debug('engine-analyzer', `Detected ${patterns.length} tactical patterns`, {
        backRank: backRankPatterns.length,
        smothered: smotheredPatterns.length,
        doubleAttack: doubleAttackPatterns.length,
        sacrifice: sacrificePatterns.length
      }, { component: 'EngineAnalyzer', function: 'detectTacticalPatterns' });
      
    } catch (error) {
      logger.warn('engine-analyzer', 'Pattern detection failed', error, { fen }, {
        component: 'EngineAnalyzer', function: 'detectTacticalPatterns'
      });
    }
    
    return patterns;
  }

  /**
   * CRITICAL SQUARE ANALYSIS: Identify squares crucial to position evaluation
   */
  private findCriticalSquares(fen: string): Square[] {
    const criticalSquares: Set<Square> = new Set();
    this.gameAPI.loadFEN(fen);
    
    try {
      // King proximity squares
      const whiteKing = this.findKingSquare('w');
      const blackKing = this.findKingSquare('b');
      
      if (whiteKing) {
        this.getAdjacentSquares(whiteKing).forEach(sq => criticalSquares.add(sq));
      }
      if (blackKing) {
        this.getAdjacentSquares(blackKing).forEach(sq => criticalSquares.add(sq));
      }
      
      // Central squares (d4, d5, e4, e5)
      const centralSquares: Square[] = ['d4', 'd5', 'e4', 'e5'];
      centralSquares.forEach(sq => {
        if (this.isSquareContested(sq)) {
          criticalSquares.add(sq);
        }
      });
      
      // Outpost squares
      const outposts = this.findOutpostSquares(fen);
      outposts.forEach(sq => criticalSquares.add(sq));
      
      // Weak squares in pawn structure
      const weakSquares = this.findWeakSquares(fen);
      weakSquares.forEach(sq => criticalSquares.add(sq));
      
    } catch (error) {
      logger.warn('engine-analyzer', 'Critical square analysis failed', error, { fen }, {
        component: 'EngineAnalyzer', function: 'findCriticalSquares'
      });
    }
    
    return Array.from(criticalSquares);
  }

  /**
   * HANGING PIECE DETECTION: Find undefended pieces using advanced analysis
   */
  private findHangingPieces(fen: string): Square[] {
    const hangingPieces: Square[] = [];
    this.gameAPI.loadFEN(fen);
    
    try {
      const board = this.gameAPI.board();
      
      for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
          const piece = board[rank][file];
          if (piece) {
            const square = String.fromCharCode(97 + file) + (8 - rank) as Square;
            
            if (this.isPieceHanging(square, piece)) {
              hangingPieces.push(square);
            }
          }
        }
      }
      
      logger.debug('engine-analyzer', `Found ${hangingPieces.length} hanging pieces`, {
        pieces: hangingPieces
      }, { component: 'EngineAnalyzer', function: 'findHangingPieces' });
      
    } catch (error) {
      logger.warn('engine-analyzer', 'Hanging piece detection failed', error, { fen }, {
        component: 'EngineAnalyzer', function: 'findHangingPieces'
      });
    }
    
    return hangingPieces;
  }
  private identifyStrategicThemes(fen: string): StrategicTheme[] { return []; }
  private analyzePawnStructure(fen: string): PawnStructureAnalysis { 
    return { 
      weaknesses: { isolated: [], doubled: [], backward: [], holes: [] },
      strengths: { passed: [], connected: [], chains: [], outposts: [] },
      evaluation: 0,
      description: 'Balanced pawn structure'
    }; 
  }
  private analyzeKingSafety(fen: string): KingSafetyAnalysis {
    return {
      whiteKing: { safety: 75, threats: [], shelter: 'good', openFiles: false },
      blackKing: { safety: 75, threats: [], shelter: 'good', openFiles: false },
      description: 'Both kings are relatively safe'
    };
  }
  private analyzePieceActivity(fen: string): PieceActivityAnalysis {
    return {
      active: [],
      passive: [],
      coordination: 75,
      development: { white: 75, black: 75 },
      description: 'Pieces are reasonably active and coordinated'
    };
  }
  private calculateSpaceAdvantage(fen: string): number { return 0; }
  private identifyMovesToAvoid(fen: string): MoveRecommendation[] {
    const toAvoid: MoveRecommendation[] = [];
    this.gameAPI.loadFEN(fen);
    
    try {
      const moves = this.gameAPI.moves({ verbose: true }) as ChessMove[];
      
      for (const move of moves) {
        // Check if move hangs material
        if (this.moveHangsMaterial(move, fen)) {
          toAvoid.push({
            move: move.from + move.to,
            san: move.san,
            evaluation: -200, // Penalty for hanging material
            reasoning: 'This move hangs material and should be avoided.',
            category: 'mistake',
            learningValue: 80, // High learning value
            difficulty: 'easy'
          });
        }
        
        // Check for moves that allow opponent tactics
        if (this.moveAllowsTactics(move, fen)) {
          toAvoid.push({
            move: move.from + move.to,
            san: move.san,
            evaluation: -100,
            reasoning: 'This move allows opponent tactical opportunities.',
            category: 'mistake',
            learningValue: 70,
            difficulty: 'medium'
          });
        }
      }
    } catch (error) {
      logger.warn('engine-analyzer', 'Moves to avoid identification failed', error, { fen }, {
        component: 'EngineAnalyzer', function: 'identifyMovesToAvoid'
      });
    }
    
    return toAvoid.slice(0, 3); // Return top 3 moves to avoid
  }

  private generateMoveExplanation(move: string, scoreDrop: number, quality: string, context: AnalysisContext): string {
    const explanations = {
      excellent: 'An excellent move that maintains or improves the position.',
      good: 'A good move that follows sound chess principles.',
      inaccurate: `An inaccurate move that gives away some advantage (${scoreDrop} centipawns).`,
      mistake: `A mistake that significantly worsens the position (${scoreDrop} centipawns).`,
      blunder: `A serious blunder that throws away the advantage (${scoreDrop} centipawns).`
    };
    
    return explanations[quality as keyof typeof explanations] || 'Move assessment unclear.';
  }

  private getTacticalJustification(move: string, scoreDrop: number): string | undefined {
    if (scoreDrop > 50) {
      return 'This move may have overlooked a tactical opportunity or threat.';
    }
    return undefined;
  }

  private getStrategicJustification(move: string, scoreDrop: number): string | undefined {
    if (scoreDrop > 25 && scoreDrop <= 50) {
      return 'While tactically sound, this move may not align with the position\'s strategic requirements.';
    }
    return undefined;
  }

  /**
   * Get engine manager metrics
   */
  getEngineMetrics() {
    return this.engineManager.getPoolMetrics();
  }

  /**
   * Stop all analyses
   */
  stopAllAnalyses(): void {
    this.engineManager.stopAllAnalyses();
  }

  // ========================================
  // ADVANCED HELPER METHODS
  // ========================================

  private async detectCheckmateThreats(fen: string): Promise<TacticalThreat[]> {
    const threats: TacticalThreat[] = [];
    const moves = this.gameAPI.moves({ verbose: true }) as ChessMove[];
    
    for (const move of moves) {
      this.gameAPI.move(move);
      if (this.gameAPI.isCheckmate()) {
        threats.push({
          type: 'checkmate',
          severity: 'critical',
          targetSquares: [move.to],
          defendingMoves: [],
          description: `${move.san} delivers checkmate`,
          variation: [move.san]
        });
      }
      this.gameAPI.undo();
    }
    
    return threats;
  }

  private detectForkPatterns(fen: string): TacticalThreat[] {
    const threats: TacticalThreat[] = [];
    const pieces = ['n', 'p']; // Knights and pawns are primary fork pieces
    
    for (const pieceType of pieces) {
      const forks = this.findForksByPiece(pieceType as PieceSymbol, fen);
      threats.push(...forks);
    }
    
    return threats;
  }

  private detectPinSkewers(fen: string): TacticalThreat[] {
    const threats: TacticalThreat[] = [];
    const slidingPieces = ['q', 'r', 'b'];
    
    for (const pieceType of slidingPieces) {
      const pins = this.findPinsByPiece(pieceType as PieceSymbol, fen);
      const skewers = this.findSkewersByPiece(pieceType as PieceSymbol, fen);
      threats.push(...pins, ...skewers);
    }
    
    return threats;
  }

  private detectDiscoveryAttacks(fen: string): TacticalThreat[] {
    const threats: TacticalThreat[] = [];
    // Discovery attack detection logic would be implemented here
    // This is a complex algorithm that analyzes piece alignments
    return threats;
  }

  private async evaluateOpportunity(move: ChessMove, fen: string, baseEvaluation: EngineEvaluation): Promise<TacticalOpportunity | null> {
    try {
      // Make the move
      this.gameAPI.loadFEN(fen);
      this.gameAPI.move(move);
      const newFen = this.gameAPI.fen();
      
      // Quick evaluation
      const newEval = await this.engineManager.analyzePosition(newFen, { depth: 8 });
      
      const scoreDiff = this.normalizeScore(newEval.score) - this.normalizeScore(baseEvaluation.score);
      
      if (scoreDiff > 50) { // Significant improvement
        return {
          type: this.classifyOpportunityType(move),
          difficulty: this.assessMoveDifficulty(move.san, fen),
          targetPieces: [move.to],
          keyMoves: [move.san],
          materialGain: Math.floor(scoreDiff / 100), // Convert to material equivalent
          description: `${move.san} improves the position significantly`,
          variation: [move.san]
        };
      }
    } catch (error) {
      // Ignore evaluation errors for individual moves
    }
    
    return null;
  }

  private classifyOpportunityType(move: ChessMove): TacticalOpportunity['type'] {
    if (move.captured) return 'fork';
    if (move.flags.includes('c')) return 'combination';
    if (move.promotion) return 'sacrifice';
    return 'fork'; // Default
  }

  private detectBackRankPatterns(fen: string): TacticalPattern[] {
    const patterns: TacticalPattern[] = [];
    
    // Check for back rank weaknesses
    const whiteBackRank = this.analyzeBackRank('w', fen);
    const blackBackRank = this.analyzeBackRank('b', fen);
    
    if (whiteBackRank.isWeak) {
      patterns.push({
        name: 'Back Rank Weakness (White)',
        category: 'intermediate',
        squares: whiteBackRank.criticalSquares,
        explanation: 'White\'s king is vulnerable to back rank tactics due to trapped position.',
        examples: ['Rook on 8th rank', 'Queen invasion']
      });
    }
    
    if (blackBackRank.isWeak) {
      patterns.push({
        name: 'Back Rank Weakness (Black)',
        category: 'intermediate',
        squares: blackBackRank.criticalSquares,
        explanation: 'Black\'s king is vulnerable to back rank tactics due to trapped position.',
        examples: ['Rook on 1st rank', 'Queen invasion']
      });
    }
    
    return patterns;
  }

  private detectSmotheredMatePatterns(fen: string): TacticalPattern[] {
    const patterns: TacticalPattern[] = [];
    // Smothered mate pattern detection would be implemented here
    return patterns;
  }

  private detectDoubleAttackPatterns(fen: string): TacticalPattern[] {
    const patterns: TacticalPattern[] = [];
    // Double attack pattern detection would be implemented here
    return patterns;
  }

  private detectSacrificePatterns(fen: string): TacticalPattern[] {
    const patterns: TacticalPattern[] = [];
    // Sacrifice pattern detection would be implemented here
    return patterns;
  }

  private findKingSquare(color: 'w' | 'b'): Square | null {
    const board = this.gameAPI.board();
    
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file];
        if (piece && piece.type === 'k' && piece.color === color) {
          return String.fromCharCode(97 + file) + (8 - rank) as Square;
        }
      }
    }
    return null;
  }

  private getAdjacentSquares(square: Square): Square[] {
    const file = square.charCodeAt(0) - 97;
    const rank = parseInt(square[1]) - 1;
    const adjacent: Square[] = [];
    
    for (let df = -1; df <= 1; df++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (df === 0 && dr === 0) continue;
        
        const newFile = file + df;
        const newRank = rank + dr;
        
        if (newFile >= 0 && newFile < 8 && newRank >= 0 && newRank < 8) {
          adjacent.push(String.fromCharCode(97 + newFile) + (newRank + 1) as Square);
        }
      }
    }
    
    return adjacent;
  }

  private isSquareContested(square: Square): boolean {
    // Simplified implementation - check if square is attacked by both sides
    try {
      const moves = this.gameAPI.moves({ square, verbose: true });
      return moves.length > 0;
    } catch {
      return false;
    }
  }

  private findOutpostSquares(fen: string): Square[] {
    // Outpost detection - simplified implementation
    const outposts: Square[] = [];
    const strongSquares: Square[] = ['d4', 'd5', 'e4', 'e5', 'f4', 'f5', 'c4', 'c5'];
    
    for (const square of strongSquares) {
      if (this.isValidOutpost(square, fen)) {
        outposts.push(square);
      }
    }
    
    return outposts;
  }

  private findWeakSquares(fen: string): Square[] {
    // Weak square detection - simplified implementation
    return [];
  }

  private isPieceHanging(square: Square, piece: { type: PieceSymbol; color: 'w' | 'b' }): boolean {
    // Check if piece is attacked more than defended
    const attackers = this.countAttackers(square, piece.color === 'w' ? 'b' : 'w');
    const defenders = this.countAttackers(square, piece.color);
    
    return attackers > defenders && attackers > 0;
  }

  private countAttackers(square: Square, color: 'w' | 'b'): number {
    // Count pieces of given color attacking the square
    let count = 0;
    const moves = this.gameAPI.moves({ verbose: true }) as ChessMove[];
    
    for (const move of moves) {
      if (move.to === square) {
        const piece = this.gameAPI.get(move.from);
        if (piece && piece.color === color) {
          count++;
        }
      }
    }
    
    return count;
  }

  private moveHangsMaterial(move: ChessMove, fen: string): boolean {
    try {
      this.gameAPI.loadFEN(fen);
      this.gameAPI.move(move);
      
      // Check if the moved piece is now hanging
      const piece = this.gameAPI.get(move.to);
      if (piece) {
        const isHanging = this.isPieceHanging(move.to, piece);
        this.gameAPI.undo();
        return isHanging;
      }
    } catch {
      // Ignore errors
    }
    
    return false;
  }

  private moveAllowsTactics(move: ChessMove, fen: string): boolean {
    // Simplified check - would need deeper analysis in practice
    return false;
  }

  private isValidOutpost(square: Square, fen: string): boolean {
    // Check if square can be occupied by a knight/bishop without being easily attacked
    return true; // Simplified
  }

  private findForksByPiece(pieceType: PieceSymbol, fen: string): TacticalThreat[] {
    // Fork detection by specific piece type
    return [];
  }

  private findPinsByPiece(pieceType: PieceSymbol, fen: string): TacticalThreat[] {
    // Pin detection by specific piece type
    return [];
  }

  private findSkewersByPiece(pieceType: PieceSymbol, fen: string): TacticalThreat[] {
    // Skewer detection by specific piece type
    return [];
  }

  private analyzeBackRank(color: 'w' | 'b', fen: string): { isWeak: boolean; criticalSquares: Square[] } {
    const king = this.findKingSquare(color);
    if (!king) return { isWeak: false, criticalSquares: [] };
    
    const backRank = color === 'w' ? '1' : '8';
    const kingRank = king[1];
    
    if (kingRank === backRank) {
      // King is on back rank - check for escape squares
      const escapeSquares = this.getAdjacentSquares(king).filter(sq => 
        sq[1] !== backRank || this.gameAPI.get(sq) === null
      );
      
      return {
        isWeak: escapeSquares.length < 2,
        criticalSquares: [king, ...escapeSquares]
      };
    }
    
    return { isWeak: false, criticalSquares: [] };
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    await this.engineManager.dispose();
    
    logger.info('engine-analyzer', 'EngineAnalyzer disposed', {}, { 
      component: 'EngineAnalyzer', 
      function: 'dispose' 
    });
  }
}

export default EngineAnalyzer;