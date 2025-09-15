/**
 * ♔ ENTERPRISE VITE CONFIGURATION
 * 
 * Advanced production-ready build configuration with intelligent bundle splitting,
 * performance optimization, and comprehensive deployment strategies.
 * 
 * Features:
 * - Intelligent code splitting and chunk optimization
 * - Progressive Web App capabilities with Workbox
 * - Advanced asset optimization and compression
 * - Environment-specific configurations
 * - Bundle analysis and size monitoring
 * - Security headers and CSP configuration
 */

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ command, mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';
  const isDevelopment = mode === 'development';
  const isAnalyze = env.ANALYZE === 'true';
  
  // GitHub Pages deployment detection
  const isGitHubPages = env.GITHUB_PAGES === 'true' || env.VITE_GITHUB_PAGES === 'true';
  const baseUrl = isGitHubPages ? '/Chess-trainer/' : (env.VITE_BASE_URL || '/');

  return {
    // Base configuration - GitHub Pages compatible
    base: baseUrl,
    
    // Plugin configuration
    plugins: [
      // React plugin with optimizations
      react({
        // Enable fast refresh in development
        fastRefresh: isDevelopment,
        // Production optimizations
        babel: isProduction ? {
          plugins: [
            ['babel-plugin-react-remove-properties', { properties: ['data-testid'] }],
            ['transform-remove-console', { exclude: ['error', 'warn'] }]
          ]
        } : undefined
      }),
      
      // Note: splitVendorChunkPlugin removed for compatibility
      
      // PWA features temporarily disabled for GitHub Pages compatibility
      /*
      VitePWA({
        // PWA configuration will be restored after dependency resolution
      }),
      */
      
      // Bundle analyzer temporarily disabled for compatibility
      // ...(isAnalyze ? [visualizer(...)] : [])
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
      cors: true,
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin'
      }
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
      
      // Source maps for debugging
      sourcemap: isProduction ? 'hidden' : true,
      
      // Minification
      minify: isProduction ? 'esbuild' : false,
      
      // Target browsers
      target: ['es2022', 'chrome89', 'firefox89', 'safari15'],
      
      // CSS code splitting
      cssCodeSplit: true,
      
      // Asset inlining threshold
      assetsInlineLimit: 4096, // 4KB
      
      // Bundle size warnings
      chunkSizeWarningLimit: 1000, // 1MB
      
      // Rollup options for advanced bundle configuration
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html')
        },
        
        output: {
          // Manual chunk splitting for optimal caching
          manualChunks: (id) => {
            // Vendor chunks
            if (id.includes('node_modules')) {
              // Large UI libraries
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor';
              }
              
              // Chess-specific libraries
              if (id.includes('chess.js') || id.includes('chessground') || id.includes('stockfish')) {
                return 'chess-vendor';
              }
              
              // Chart and visualization libraries
              if (id.includes('chart.js') || id.includes('react-chartjs')) {
                return 'charts-vendor';
              }
              
              // Database and storage
              if (id.includes('dexie') || id.includes('workbox')) {
                return 'storage-vendor';
              }
              
              // PGN and parsing libraries
              if (id.includes('pgn-parser')) {
                return 'pgn-vendor';
              }
              
              // Remaining vendor code
              return 'vendor';
            }
            
            // Application code chunks
            if (id.includes('/src/modules/engine/')) {
              return 'engine-module';
            }
            
            if (id.includes('/src/modules/video/') || id.includes('/src/modules/sync/')) {
              return 'video-module';
            }
            
            if (id.includes('/src/modules/analytics/')) {
              return 'analytics-module';
            }
            
            if (id.includes('/src/modules/srs/')) {
              return 'srs-module';
            }
            
            if (id.includes('/src/data/') || id.includes('/src/utils/')) {
              return 'core-utils';
            }
            
            if (id.includes('/src/components/')) {
              return 'components';
            }
          },
          
          // Chunk naming strategy
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
            return `assets/[name]-[hash].js`;
          },
          
          // Asset naming strategy
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name!.split('.');
            const ext = info[info.length - 1];
            
            if (/\.(woff|woff2|eot|ttf|otf)$/.test(assetInfo.name!)) {
              return `assets/fonts/[name]-[hash][extname]`;
            }
            
            if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(assetInfo.name!)) {
              return `assets/images/[name]-[hash][extname]`;
            }
            
            if (ext === 'css') {
              return `assets/styles/[name]-[hash][extname]`;
            }
            
            return `assets/[name]-[hash][extname]`;
          }
        }
      },
      
      // ESBuild configuration
      esbuild: isProduction ? {
        drop: ['console', 'debugger'],
        legalComments: 'none',
        minifyIdentifiers: true,
        minifySyntax: true,
        minifyWhitespace: true
      } : undefined
    },

    // Optimization configuration
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'chess.js',
        'chessground',
        'dexie',
        'chart.js',
        'react-chartjs-2'
      ],
      exclude: [
        'stockfish' // Keep as external due to WebAssembly
      ]
    },

    // Worker configuration
    worker: {
      format: 'es',
      plugins: []
    },

    // Environment variable configuration
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __DEV__: JSON.stringify(isDevelopment),
      __PROD__: JSON.stringify(isProduction),
      __TEST__: JSON.stringify(false)
    },

    // CSS configuration
    css: {
      modules: {
        localsConvention: 'camelCase'
      },
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/styles/variables.scss";`
        }
      },
      postcss: {
        plugins: []
      }
    },

    // Asset processing
    assetsInclude: ['**/*.wasm'],

    // Logging
    logLevel: isProduction ? 'warn' : 'info',

    // Clear screen on rebuild
    clearScreen: false
  };
});
