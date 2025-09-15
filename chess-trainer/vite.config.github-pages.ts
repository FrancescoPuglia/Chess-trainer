/**
 * ♔ SIMPLIFIED VITE CONFIGURATION FOR GITHUB PAGES
 * 
 * Lightweight configuration for GitHub Pages deployment
 * without complex plugins and enterprise features.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  // GitHub Pages base URL
  base: '/Chess-trainer/',
  
  // Plugin configuration
  plugins: [
    react({
      // Basic React support
      include: "**/*.tsx",
    })
  ],

  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@modules': resolve(__dirname, './src/modules'),
      '@utils': resolve(__dirname, './src/utils'),
      '@types': resolve(__dirname, './src/types'),
      '@data': resolve(__dirname, './src/data'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@assets': resolve(__dirname, './src/assets')
    }
  },

  // Development server configuration
  server: {
    port: 3000,
    host: true,
    strictPort: true,
    cors: true
  },

  // Preview server configuration
  preview: {
    port: 4173,
    host: true,
    strictPort: true,
    cors: true
  },

  // Build configuration
  build: {
    // Output directory
    outDir: 'dist',
    
    // Asset directory
    assetsDir: 'assets',
    
    // Source maps
    sourcemap: false,
    
    // Minification
    minify: 'esbuild',
    
    // Target browsers
    target: ['es2020', 'chrome60', 'firefox60', 'safari11'],
    
    // CSS code splitting
    cssCodeSplit: true,
    
    // Asset inlining threshold
    assetsInlineLimit: 4096, // 4KB
    
    // Bundle size warnings
    chunkSizeWarningLimit: 1000, // 1MB
    
    // Rollup options
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      
      output: {
        // Simple chunk splitting
        manualChunks: {
          vendor: ['react', 'react-dom'],
          chess: ['chess.js', 'chessground'],
          utils: ['dexie']
        },
        
        // Simple asset naming
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js'
      }
    }
  },

  // Environment variable configuration
  define: {
    __APP_VERSION__: JSON.stringify('1.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __DEV__: JSON.stringify(false),
    __PROD__: JSON.stringify(true),
    __TEST__: JSON.stringify(false)
  },

  // CSS configuration
  css: {
    modules: {
      localsConvention: 'camelCase'
    }
  },

  // Asset processing
  assetsInclude: ['**/*.wasm'],

  // Logging
  logLevel: 'info',

  // Clear screen on rebuild
  clearScreen: false
});