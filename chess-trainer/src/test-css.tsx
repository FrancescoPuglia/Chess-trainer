// Test component per verificare CSS chessground loading
import React from 'react';

// Import diretto CSS chessground
import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.cburnett.css';

export function TestCSS() {
  return (
    <div className="test-chessground">
      <h3>CSS Import Test</h3>
      
      {/* Test elementi con classi chessground */}
      <div className="cg-wrap" style={{ width: '200px', height: '200px', border: '2px solid red' }}>
        <cg-container>
          <cg-board>
            <div>Test Board Element</div>
          </cg-board>
        </cg-container>
      </div>
      
      <div style={{ marginTop: '10px', fontSize: '12px' }}>
        <p>Se vedi un quadrato rosso con contenuto, i CSS sono caricati.</p>
        <p>Se il layout è rotto, i CSS mancano.</p>
      </div>
    </div>
  );
}