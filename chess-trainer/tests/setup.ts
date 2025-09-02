/**
 * Test Setup Configuration
 * 
 * Global test setup for Vitest, including DOM polyfills
 * and mocks for browser APIs used in the chess trainer.
 */

import { vi } from 'vitest';

// Mock IndexedDB for database tests
import 'fake-indexeddb/auto';

// Mock Web Workers for engine tests
global.Worker = vi.fn().mockImplementation(() => ({
  postMessage: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  terminate: vi.fn(),
}));

// Mock OPFS (Origin Private File System) for file storage tests
Object.defineProperty(navigator, 'storage', {
  value: {
    getDirectory: vi.fn().mockResolvedValue({
      getFileHandle: vi.fn(),
      getDirectoryHandle: vi.fn(),
    }),
    persist: vi.fn().mockResolvedValue(true),
    persisted: vi.fn().mockResolvedValue(true),
    estimate: vi.fn().mockResolvedValue({
      usage: 1024 * 1024, // 1MB
      quota: 1024 * 1024 * 1024, // 1GB
    }),
  },
  writable: true,
});

// Mock performance.now for timing tests
global.performance = global.performance || {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByName: vi.fn(() => []),
  getEntriesByType: vi.fn(() => []),
} as any;

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: console.error, // Keep errors for debugging
  info: vi.fn(),
  debug: vi.fn(),
};