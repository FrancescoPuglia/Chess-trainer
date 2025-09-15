/**
 * ♔ ENTERPRISE VITEST CONFIGURATION
 * 
 * Comprehensive testing configuration with performance monitoring,
 * coverage reporting, and quality gate integration.
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  
  test: {
    // Test Environment
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    
    // File Patterns
    include: [
      'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'coverage',
      '**/*.d.ts'
    ],

    // Performance Configuration
    testTimeout: 30000, // 30 seconds default
    hookTimeout: 10000, // 10 seconds for hooks
    teardownTimeout: 5000,
    
    // Parallel Execution
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
        isolate: true,
        minForks: 1,
        maxForks: 4
      }
    },
    
    // Coverage Configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'cobertura'],
      reportsDirectory: './coverage',
      
      // Coverage Thresholds
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      },
      
      // Include/Exclude Patterns
      include: [
        'src/**/*.{js,ts,jsx,tsx}',
        '!src/**/*.d.ts',
        '!src/**/*.test.{js,ts,jsx,tsx}',
        '!src/**/*.spec.{js,ts,jsx,tsx}'
      ],
      exclude: [
        'node_modules/',
        'tests/',
        'coverage/',
        'dist/',
        '**/*.config.*',
        '**/*.d.ts',
        '**/index.ts',
        'src/types/',
        'src/**/*.stories.*',
        'src/**/*.test.*',
        'src/**/*.spec.*'
      ],
      
      // Advanced Coverage Options
      all: true,
      clean: true,
      skipFull: false,
      
      // Report Generation
      watermarks: {
        statements: [50, 80],
        functions: [50, 80],
        branches: [50, 75],
        lines: [50, 80]
      }
    },
    
    // Reporting Configuration
    reporter: [
      'default',
      'verbose',
      'json',
      'html',
      'junit'
    ],
    
    outputFile: {
      json: './test-results/results.json',
      html: './test-results/results.html',
      junit: './test-results/junit.xml'
    },
    
    // Watch Mode Configuration
    watch: false,
    watchExclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'test-results/**'
    ],
    
    // Performance Monitoring
    logHeapUsage: true,
    slowTestThreshold: 5000, // 5 seconds
    
    // Retry Configuration
    retry: 1,
    bail: 5, // Stop after 5 failures
    
    // Environment Variables
    env: {
      NODE_ENV: 'test',
      VITEST: 'true'
    },
    
    // Global Configuration
    globalSetup: undefined,
    sequence: {
      shuffle: false,
      concurrent: true,
      setupFiles: 'parallel',
      hooks: 'stack'
    },
    
    // Mock Configuration
    clearMocks: true,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    
    // Advanced Features
    isolate: true,
    passWithNoTests: false,
    allowOnly: process.env.NODE_ENV !== 'ci',
    dangerouslyIgnoreUnhandledErrors: false,
    
    // Custom Matchers and Extensions
    expect: {
      requireAssertions: false,
      poll: {
        timeout: 10000,
        interval: 100
      }
    },
    
    // Test Categorization
    testNamePattern: undefined,
    grep: undefined,
    fakeTimers: {
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date']
    }
  },
  
  // Resolve Configuration
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tests': resolve(__dirname, './tests'),
      '@components': resolve(__dirname, './src/components'),
      '@modules': resolve(__dirname, './src/modules'),
      '@utils': resolve(__dirname, './src/utils'),
      '@types': resolve(__dirname, './src/types')
    }
  },
  
  // Define Configuration for Testing
  define: {
    __TEST__: true,
    __DEV__: false,
    __PROD__: false
  },
  
  // Optimizations for Testing
  optimizeDeps: {
    include: [
      'fake-indexeddb',
      '@testing-library/react',
      '@testing-library/user-event',
      '@testing-library/jest-dom'
    ]
  },
  
  // Build Configuration for Tests
  build: {
    sourcemap: true,
    minify: false,
    target: 'node14'
  },
  
  // Server Configuration for Testing
  server: {
    fs: {
      allow: ['..']
    }
  }
});