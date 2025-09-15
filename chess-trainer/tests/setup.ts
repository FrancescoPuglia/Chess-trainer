/**
 * ♔ ENTERPRISE TEST SETUP
 * 
 * Comprehensive test environment configuration with enterprise-grade mocking,
 * performance monitoring, and debugging capabilities for chess training application.
 * 
 * Features:
 * - Complete browser API mocking for headless testing
 * - Database and storage system mocking with realistic behavior
 * - Performance measurement and quality gate integration
 * - Advanced debugging and logging for test failures
 * - Chess-specific test utilities and fixtures
 */

import { vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import 'fake-indexeddb/auto';

// Mock browser APIs
global.structuredClone = structuredClone || ((obj: any) => JSON.parse(JSON.stringify(obj)));

/**
 * Enhanced Web Worker mock for engine testing
 */
class MockWorker {
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: ErrorEvent) => void) | null = null;
  public onmessageerror: ((event: MessageEvent) => void) | null = null;

  constructor(private scriptURL: string, private options?: WorkerOptions) {}

  postMessage(message: any): void {
    // Simulate async behavior
    setTimeout(() => {
      if (this.scriptURL.includes('stockfish')) {
        this.handleStockfishMessage(message);
      } else if (this.scriptURL.includes('compression')) {
        this.handleCompressionMessage(message);
      } else {
        this.handleGenericMessage(message);
      }
    }, 1);
  }

  terminate(): void {
    this.onmessage = null;
    this.onerror = null;
    this.onmessageerror = null;
  }

  private handleStockfishMessage(message: any): void {
    const command = typeof message === 'string' ? message : message.command;
    let response = '';

    // Mock Stockfish responses based on common commands
    if (command === 'uci') {
      response = 'uciok';
    } else if (command === 'isready') {
      response = 'readyok';
    } else if (command.startsWith('position')) {
      response = 'info depth 1 score cp 0';
    } else if (command.startsWith('go')) {
      response = 'bestmove e2e4 ponder e7e5';
    }

    if (this.onmessage && response) {
      this.onmessage({ data: response } as MessageEvent);
    }
  }

  private handleCompressionMessage(message: any): void {
    const { type, data, options } = message;
    
    if (type === 'compress') {
      // Mock compression
      const compressed = `compressed_${JSON.stringify(data)}`;
      this.onmessage?.({ data: { type: 'compressed', data: compressed } } as MessageEvent);
    } else if (type === 'decompress') {
      // Mock decompression
      const decompressed = data.replace('compressed_', '');
      this.onmessage?.({ data: { type: 'decompressed', data: JSON.parse(decompressed) } } as MessageEvent);
    }
  }

  private handleGenericMessage(message: any): void {
    // Echo back message for generic workers
    setTimeout(() => {
      this.onmessage?.({ data: message } as MessageEvent);
    }, 1);
  }
}

// Enhanced OPFS (Origin Private File System) mock
class MockOPFS {
  private fileSystem = new Map<string, any>();
  private directories = new Set<string>();

  async getDirectory(): Promise<FileSystemDirectoryHandle> {
    return new MockFileSystemDirectoryHandle('');
  }

  createMockFile(path: string, content: any): void {
    this.fileSystem.set(path, content);
  }

  getMockFile(path: string): any {
    return this.fileSystem.get(path);
  }

  clear(): void {
    this.fileSystem.clear();
    this.directories.clear();
  }
}

class MockFileSystemDirectoryHandle {
  constructor(private path: string) {}

  async getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle> {
    const fullPath = this.path ? `${this.path}/${name}` : name;
    if (options?.create) {
      mockOPFS.directories.add(fullPath);
    }
    return new MockFileSystemDirectoryHandle(fullPath);
  }

  async getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle> {
    const fullPath = this.path ? `${this.path}/${name}` : name;
    return new MockFileSystemFileHandle(fullPath);
  }
}

class MockFileSystemFileHandle {
  constructor(private path: string) {}

  async createWritable(): Promise<FileSystemWritableFileStream> {
    return new MockFileSystemWritableFileStream(this.path);
  }

  async getFile(): Promise<File> {
    const content = mockOPFS.getMockFile(this.path) || '';
    return new File([content], this.path.split('/').pop() || 'file');
  }
}

class MockFileSystemWritableFileStream {
  constructor(private path: string) {}

  async write(data: any): Promise<void> {
    mockOPFS.createMockFile(this.path, data);
  }

  async close(): Promise<void> {
    // Mock close
  }
}

// Global instances
const mockOPFS = new MockOPFS();

/**
 * Enhanced Performance API mock with realistic timing
 */
class MockPerformance {
  private marks = new Map<string, number>();
  private measures = new Map<string, { start: number; duration: number }>();
  private startTime = Date.now();

  now(): number {
    return Date.now() - this.startTime + Math.random() * 0.1; // Add slight variance
  }

  mark(markName: string): void {
    this.marks.set(markName, this.now());
  }

  measure(measureName: string, startMark?: string, endMark?: string): void {
    const start = startMark ? this.marks.get(startMark) || 0 : 0;
    const end = endMark ? this.marks.get(endMark) || this.now() : this.now();
    this.measures.set(measureName, { start, duration: end - start });
  }

  clearMarks(markName?: string): void {
    if (markName) {
      this.marks.delete(markName);
    } else {
      this.marks.clear();
    }
  }

  clearMeasures(measureName?: string): void {
    if (measureName) {
      this.measures.delete(measureName);
    } else {
      this.measures.clear();
    }
  }

  getEntriesByName(name: string): PerformanceEntry[] {
    const measure = this.measures.get(name);
    if (measure) {
      return [{
        name,
        startTime: measure.start,
        duration: measure.duration,
        entryType: 'measure',
        toJSON: () => ({ name, startTime: measure.start, duration: measure.duration })
      } as PerformanceEntry];
    }
    return [];
  }
}

/**
 * Storage API mock with quota management
 */
class MockStorageManager {
  private quota = 1024 * 1024 * 1024; // 1GB
  private usage = 0;

  async estimate(): Promise<StorageEstimate> {
    return {
      quota: this.quota,
      usage: this.usage,
      usageDetails: {
        indexedDB: this.usage * 0.8,
        caches: this.usage * 0.2
      }
    };
  }

  async persist(): Promise<boolean> {
    return true; // Always grant persistence in tests
  }

  async persisted(): Promise<boolean> {
    return true;
  }

  setUsage(bytes: number): void {
    this.usage = bytes;
  }

  getDirectory(): Promise<FileSystemDirectoryHandle> {
    return mockOPFS.getDirectory();
  }
}

/**
 * MediaDevices mock for video processing tests
 */
class MockMediaDevices {
  async getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
    return new MediaStream();
  }

  async getDisplayMedia(constraints?: DisplayMediaStreamOptions): Promise<MediaStream> {
    return new MediaStream();
  }
}

/**
 * Comprehensive test environment setup
 */
beforeAll(() => {
  // Mock global APIs
  global.Worker = MockWorker as any;
  global.performance = new MockPerformance() as any;
  
  // Storage APIs
  const mockStorageManager = new MockStorageManager();
  Object.defineProperty(navigator, 'storage', {
    value: mockStorageManager,
    writable: true
  });

  // Media APIs
  Object.defineProperty(navigator, 'mediaDevices', {
    value: new MockMediaDevices(),
    writable: true
  });

  // Connection API mock
  Object.defineProperty(navigator, 'connection', {
    value: {
      downlink: 10,
      effectiveType: '4g',
      rtt: 100,
      saveData: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    },
    writable: true
  });

  // Memory API mock
  Object.defineProperty(performance, 'memory', {
    value: {
      totalJSHeapSize: 50 * 1024 * 1024, // 50MB
      usedJSHeapSize: 30 * 1024 * 1024,  // 30MB
      jsHeapSizeLimit: 2 * 1024 * 1024 * 1024 // 2GB
    },
    writable: true
  });

  // URL.createObjectURL mock
  global.URL.createObjectURL = vi.fn((object: any) => {
    return `mock://object-url/${Math.random().toString(36).substring(2)}`;
  });
  
  global.URL.revokeObjectURL = vi.fn();

  // Blob constructor mock
  if (!global.Blob) {
    global.Blob = class MockBlob {
      constructor(public parts: any[], public options?: BlobPropertyBag) {}
      slice(): Blob { return this; }
      stream(): ReadableStream { return new ReadableStream(); }
      text(): Promise<string> { return Promise.resolve('mock-text'); }
      arrayBuffer(): Promise<ArrayBuffer> { return Promise.resolve(new ArrayBuffer(0)); }
    } as any;
  }

  // File constructor mock
  if (!global.File) {
    global.File = class MockFile extends global.Blob {
      constructor(
        parts: any[], 
        public name: string, 
        options?: FilePropertyBag
      ) {
        super(parts, options);
      }
      
      get lastModified(): number { return Date.now(); }
      get webkitRelativePath(): string { return ''; }
    } as any;
  }

  // RequestAnimationFrame mock
  global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
    return setTimeout(() => callback(performance.now()), 16);
  });
  
  global.cancelAnimationFrame = vi.fn((handle: number) => {
    clearTimeout(handle);
  });

  // IntersectionObserver mock
  global.IntersectionObserver = vi.fn().mockImplementation((callback: IntersectionObserverCallback) => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    callback
  }));

  // ResizeObserver mock
  global.ResizeObserver = vi.fn().mockImplementation((callback: ResizeObserverCallback) => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    callback
  }));

  // MutationObserver mock
  global.MutationObserver = vi.fn().mockImplementation((callback: MutationCallback) => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn(() => []),
    callback
  }));

  // Canvas context mock
  HTMLCanvasElement.prototype.getContext = vi.fn((contextType: string) => {
    if (contextType === '2d') {
      return {
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        putImageData: vi.fn(),
        getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
        drawImage: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 100 })),
        canvas: { width: 300, height: 150 },
        save: vi.fn(),
        restore: vi.fn(),
        scale: vi.fn(),
        rotate: vi.fn(),
        translate: vi.fn(),
        transform: vi.fn(),
        setTransform: vi.fn()
      };
    }
    return null;
  });

  // HTMLCanvasElement.toDataURL mock
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  );

  // Video element mock
  HTMLVideoElement.prototype.load = vi.fn();
  HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  HTMLVideoElement.prototype.pause = vi.fn();
  
  Object.defineProperty(HTMLVideoElement.prototype, 'currentTime', {
    get: vi.fn(() => 0),
    set: vi.fn()
  });

  Object.defineProperty(HTMLVideoElement.prototype, 'duration', {
    get: vi.fn(() => 100)
  });

  Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
    get: vi.fn(() => 1920)
  });

  Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
    get: vi.fn(() => 1080)
  });

  // Audio context mock (for audio processing)
  global.AudioContext = vi.fn().mockImplementation(() => ({
    createOscillator: vi.fn(() => ({
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn()
    })),
    createGain: vi.fn(() => ({
      connect: vi.fn(),
      gain: { value: 1 }
    })),
    destination: {},
    close: vi.fn().mockResolvedValue(undefined)
  }));

  // Console method cleanup for cleaner test output
  global.console.info = vi.fn();
  global.console.debug = vi.fn();
  global.console.log = vi.fn();
  global.console.warn = vi.fn();
  global.console.error = vi.fn();

  console.log('🧪 Enterprise test environment initialized');
});

beforeEach(() => {
  // Reset mocks before each test
  vi.clearAllMocks();
  
  // Reset OPFS mock
  mockOPFS.clear();
  
  // Reset performance marks and measures
  if (global.performance.clearMarks) {
    global.performance.clearMarks();
    global.performance.clearMeasures();
  }
  
  // Reset storage usage
  if (navigator.storage && 'setUsage' in navigator.storage) {
    (navigator.storage as any).setUsage(0);
  }
});

afterEach(() => {
  // Cleanup after each test
  vi.restoreAllMocks();
});

afterAll(() => {
  console.log('🧹 Test environment cleanup completed');
});

/**
 * Test utilities for chess-specific testing
 */
export const TestUtils = {
  // Mock performance timing
  mockPerformance: (duration: number) => {
    const originalNow = performance.now;
    let callCount = 0;
    performance.now = vi.fn(() => {
      return callCount++ * duration;
    });
    return () => {
      performance.now = originalNow;
    };
  },

  // Mock file operations
  mockFile: (name: string, content: any, type = 'application/json') => {
    return new File([JSON.stringify(content)], name, { type });
  },

  // Mock video file
  mockVideoFile: (name: string, duration = 100) => {
    const file = new File(['mock-video-data'], name, { type: 'video/mp4' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB
    return file;
  },

  // Mock IndexedDB operations
  mockIndexedDB: {
    createObjectStore: (name: string, data: any[] = []) => {
      // This would interact with fake-indexeddb
      return Promise.resolve(data);
    },
    
    clear: () => {
      // Clear fake-indexeddb
      return Promise.resolve();
    }
  },

  // Mock engine operations
  mockStockfish: {
    isReady: () => Promise.resolve(true),
    evaluate: (fen: string) => Promise.resolve({
      evaluation: 0.1,
      bestMove: 'e2e4',
      depth: 10
    }),
    
    analyze: (fen: string, depth = 10) => Promise.resolve({
      evaluation: 0.1,
      principalVariation: ['e2e4', 'e7e5'],
      depth
    })
  },

  // Wait for async operations
  waitFor: (condition: () => boolean, timeout = 1000): Promise<void> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkCondition = () => {
        if (condition()) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for condition'));
        } else {
          setTimeout(checkCondition, 10);
        }
      };
      checkCondition();
    });
  },

  // Create test data
  createTestGame: () => ({
    id: 'test-game-1',
    pgn: '1. e4 e5 2. Nf3 Nc6',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    moves: ['e4', 'e5', 'Nf3', 'Nc6']
  }),

  createTestPosition: () => ({
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    evaluation: 0.1,
    bestMove: 'Bc4',
    threats: ['fork', 'pin']
  })
};

// Export for use in tests
export { MockWorker, MockOPFS, MockPerformance, MockStorageManager };