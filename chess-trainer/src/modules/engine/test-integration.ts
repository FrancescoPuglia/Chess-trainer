/**
 * ♔ STOCKFISH ENGINE INTEGRATION TEST
 * 
 * Test rapido per verificare che il sistema engine funzioni correttamente
 * in modalità certosino senza dipendere dalla compilazione completa.
 */

import { createEngineSystem, DEFAULT_CONTEXTS } from './index';

/**
 * Test di integrazione enterprise per il sistema engine
 */
export async function testEngineIntegration(): Promise<boolean> {
  console.log('🔧 Starting Stockfish Engine Integration Test...');
  
  try {
    // Crea il sistema engine
    console.log('📦 Creating engine system...');
    const engineSystem = await createEngineSystem({
      engine: {
        depth: 10,
        maxAnalysisTimeMs: 2000,
        workerPath: '/stockfish/stockfish.js'
      },
      pool: {
        initialPoolSize: 1,
        maxPoolSize: 2
      }
    });

    // Inizializza il sistema
    console.log('🚀 Initializing engine system...');
    await engineSystem.initialize();

    // Testa analisi posizione
    console.log('🧠 Testing position analysis...');
    const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    
    const analysis = await engineSystem.analyzer.analyzePosition(
      startingFen,
      DEFAULT_CONTEXTS.TRAINING_BEGINNER
    );

    // Verifica risultati
    console.log('✅ Analysis Results:');
    console.log(`   Evaluation: ${analysis.evaluation.score.value} centipawns`);
    console.log(`   Best Move: ${analysis.evaluation.bestMove}`);
    console.log(`   Depth: ${analysis.evaluation.depth}`);
    console.log(`   Assessment: ${analysis.assessment.advantage} (${analysis.assessment.magnitude})`);
    console.log(`   Insights: ${analysis.insights.keyLearningPoints.length} learning points`);

    // Ottieni metriche
    const metrics = engineSystem.getMetrics();
    console.log('📊 System Metrics:');
    console.log(`   Pool Size: ${metrics.pool.totalEngines}`);
    console.log(`   Health Score: ${metrics.quality.healthScore}/100`);
    console.log(`   Performance Score: ${metrics.quality.performanceScore}/100`);

    // Cleanup
    console.log('🧹 Cleaning up...');
    await engineSystem.dispose();

    console.log('✅ Engine Integration Test PASSED!');
    return true;

  } catch (error) {
    console.error('❌ Engine Integration Test FAILED:', error);
    return false;
  }
}

// Esegui il test se chiamato direttamente
if (require.main === module) {
  testEngineIntegration()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}