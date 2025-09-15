/**
 * ♔ LIGHTHOUSE CONFIGURATION
 * 
 * Enterprise-grade performance monitoring and optimization configuration
 * for Chess Trainer application with strict performance budgets.
 */

module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:4173/',
        'http://localhost:4173/study',
        'http://localhost:4173/analysis',
        'http://localhost:4173/srs'
      ],
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Local:',
      startServerReadyTimeout: 30000,
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --headless',
        preset: 'desktop',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0
        },
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false
        },
        emulatedFormFactor: 'desktop',
        locale: 'en-US'
      }
    },
    assert: {
      assertions: {
        // Performance thresholds
        'categories:performance': ['error', { minScore: 0.85 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.90 }],
        'categories:seo': ['error', { minScore: 0.85 }],
        
        // Core Web Vitals
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 3000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'speed-index': ['error', { maxNumericValue: 3000 }],
        
        // Chess-specific performance metrics
        'interactive': ['error', { maxNumericValue: 4000 }],
        'server-response-time': ['error', { maxNumericValue: 600 }],
        
        // Progressive Web App requirements
        'installable-manifest': 'error',
        'apple-touch-icon': 'error',
        'themed-omnibox': 'error',
        
        // Security requirements
        'is-on-https': 'off', // Disabled for localhost testing
        'redirects-http': 'off', // Disabled for localhost testing
        
        // Accessibility requirements
        'color-contrast': 'error',
        'image-alt': 'error',
        'label': 'error',
        'link-name': 'error',
        'button-name': 'error',
        
        // Best practices
        'uses-https': 'off', // Disabled for localhost testing
        'uses-http2': 'warn',
        'no-vulnerable-libraries': 'error',
        'csp-xss': 'warn',
        
        // Performance optimizations
        'uses-text-compression': 'error',
        'uses-responsive-images': 'error',
        'efficient-animated-content': 'error',
        'unused-css-rules': 'warn',
        'unused-javascript': 'warn',
        'modern-image-formats': 'error',
        'uses-optimized-images': 'error',
        'uses-webp-images': 'warn',
        'uses-rel-preload': 'warn',
        'uses-rel-preconnect': 'warn',
        
        // Resource budgets
        'resource-summary:document:size': ['error', { maxNumericValue: 50000 }], // 50KB
        'resource-summary:script:size': ['error', { maxNumericValue: 1048576 }], // 1MB
        'resource-summary:stylesheet:size': ['error', { maxNumericValue: 204800 }], // 200KB
        'resource-summary:image:size': ['error', { maxNumericValue: 2097152 }], // 2MB
        'resource-summary:font:size': ['error', { maxNumericValue: 262144 }], // 256KB
        
        // Network efficiency
        'total-byte-weight': ['error', { maxNumericValue: 3145728 }], // 3MB
        'dom-size': ['error', { maxNumericValue: 1500 }],
        'bootup-time': ['error', { maxNumericValue: 2000 }],
        'mainthread-work-breakdown': ['error', { maxNumericValue: 3000 }]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};