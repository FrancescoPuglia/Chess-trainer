/**
 * ♔ ENTERPRISE VIDEO PLAYER COMPONENT
 * 
 * Advanced video player with precise timestamp controls, sync integration,
 * and performance optimization for chess training platform.
 * 
 * Features:
 * - Frame-accurate seeking with RAF optimization
 * - Custom controls with keyboard shortcuts
 * - Sync integration with chess board
 * - OPFS video file support
 * - Performance monitoring
 * - Accessibility compliance
 */

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import type { 
  VideoPlayerProps, 
  VideoPlayerState, 
  VideoMetadata,
  VideoSyncPoint
} from '../types/index.js';
import { QualityGate } from '../utils/QualityGate.js';
import logger from '../utils/Logger';

export interface VideoPlayerConfig {
  seekThreshold: number;      // Min seek distance in seconds (default: 0.5)
  playbackRates: number[];    // Available playback speeds
  keyboardShortcuts: boolean; // Enable keyboard controls
  showFrameInfo: boolean;     // Show technical frame info
  maxBufferSize: number;      // Max buffer in seconds
  preloadStrategy: 'auto' | 'metadata' | 'none';
}

/**
 * Enterprise video player with sync capabilities
 */
export const VideoPlayer = React.forwardRef<HTMLVideoElement, VideoPlayerProps>(({
  src,
  syncPoints = [],
  currentSyncIndex = -1,
  onTimeUpdate,
  onSyncPointReached,
  onError,
  config = {},
  className = '',
  ...props
}, ref) => {
  // Refs - use forwarded ref or create internal ref
  const videoRef = useRef<HTMLVideoElement>(null);
  const actualVideoRef = (ref as React.RefObject<HTMLVideoElement>) || videoRef;
  // const canvasRef = useRef<HTMLCanvasElement>(null); // For future use
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const qualityGate = useRef(new QualityGate()).current;

  // State
  const [state, setState] = useState<VideoPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    buffered: 0,
    playbackRate: 1,
    volume: 1,
    muted: false,
    isLoading: true,
    error: null,
    isFullscreen: false,
  });

  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [showControls, setShowControls] = useState(true);

  // Configuration with defaults
  const playerConfig: VideoPlayerConfig = useMemo(() => ({
    seekThreshold: 0.5,
    playbackRates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2],
    keyboardShortcuts: true,
    showFrameInfo: false,
    maxBufferSize: 30,
    preloadStrategy: 'metadata',
    ...config,
  }), [config]);

  /**
   * Initialize video element and event listeners
   */
  useEffect(() => {
    const video = actualVideoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      const videoMetadata: VideoMetadata = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        fps: 30, // Will be detected from video if possible
        codec: '', // Can be extracted from video
        fileSize: 0, // Will be set from file
        bitrate: 0, // Calculated if available
      };

      setMetadata(videoMetadata);
      setState(prev => ({
        ...prev,
        duration: video.duration,
        isLoading: false,
      }));

      qualityGate.recordPerformance('videoLoadTimeMs', Date.now());
    };

    const handleTimeUpdate = () => {
      if (rafRef.current) return; // Already scheduled

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        
        const currentTime = video.currentTime;
        
        setState(prev => ({
          ...prev,
          currentTime,
          buffered: video.buffered.length > 0 ? video.buffered.end(0) : 0,
        }));

        // Check for sync point reached
        const syncPoint = findNearestSyncPoint(currentTime, syncPoints);
        if (syncPoint && onSyncPointReached) {
          const timeDiff = Math.abs(currentTime - syncPoint.timestamp);
          if (timeDiff <= 0.3) { // Within 300ms tolerance
            onSyncPointReached(syncPoint);
          }
        }

        onTimeUpdate?.(currentTime);
      });
    };

    const handlePlay = () => setState(prev => ({ ...prev, isPlaying: true }));
    const handlePause = () => setState(prev => ({ ...prev, isPlaying: false }));
    const handleVolumeChange = () => setState(prev => ({ 
      ...prev, 
      volume: video.volume,
      muted: video.muted,
    }));

    const handleError = () => {
      const error = new Error(`Video error: ${video.error?.message || 'Unknown error'}`);
      setState(prev => ({ ...prev, error: error.message, isLoading: false }));
      onError?.(error);
      qualityGate.recordError(error, 'critical');
    };

    const handleRateChange = () => {
      setState(prev => ({ ...prev, playbackRate: video.playbackRate }));
    };

    // Event listeners
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('error', handleError);
    video.addEventListener('ratechange', handleRateChange);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('error', handleError);
      video.removeEventListener('ratechange', handleRateChange);
      
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [src, syncPoints, onTimeUpdate, onSyncPointReached, onError]);

  /**
   * Keyboard shortcut handler
   */
  useEffect(() => {
    if (!playerConfig.keyboardShortcuts) return;

    const handleKeydown = (event: KeyboardEvent) => {
      const video = actualVideoRef.current;
      if (!video || !containerRef.current?.contains(event.target as Node)) return;

      switch (event.code) {
        case 'Space':
          event.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          seek(video.currentTime - (event.shiftKey ? 10 : 5));
          break;
        case 'ArrowRight':
          event.preventDefault();
          seek(video.currentTime + (event.shiftKey ? 10 : 5));
          break;
        case 'ArrowUp':
          event.preventDefault();
          setVolume(Math.min(1, state.volume + 0.1));
          break;
        case 'ArrowDown':
          event.preventDefault();
          setVolume(Math.max(0, state.volume - 0.1));
          break;
        case 'KeyM':
          event.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          event.preventDefault();
          toggleFullscreen();
          break;
        case 'Comma':
          event.preventDefault();
          frameStep(-1);
          break;
        case 'Period':
          event.preventDefault();
          frameStep(1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [playerConfig.keyboardShortcuts, state.volume]);

  /**
   * Player control methods
   */
  const togglePlayPause = useCallback(() => {
    const video = actualVideoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(error => {
        logger.error('video', 'Video playback failed to start', error, {}, { component: 'VideoPlayer', function: 'play' });
        qualityGate.recordError(error, 'warning');
      });
    } else {
      video.pause();
    }
  }, []);

  const seek = useCallback((time: number) => {
    const video = actualVideoRef.current;
    if (!video) return;

    const clampedTime = Math.max(0, Math.min(time, video.duration));
    const timeDiff = Math.abs(video.currentTime - clampedTime);

    // Only seek if difference is significant
    if (timeDiff >= playerConfig.seekThreshold) {
      video.currentTime = clampedTime;
      qualityGate.recordPerformance('seekTimeMs', Date.now());
    }
  }, [playerConfig.seekThreshold]);

  const setVolume = useCallback((volume: number) => {
    const video = actualVideoRef.current;
    if (!video) return;

    video.volume = Math.max(0, Math.min(1, volume));
  }, []);

  const toggleMute = useCallback(() => {
    const video = actualVideoRef.current;
    if (!video) return;

    video.muted = !video.muted;
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    const video = actualVideoRef.current;
    if (!video) return;

    video.playbackRate = rate;
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setState(prev => ({ ...prev, isFullscreen: false }));
      } else {
        await container.requestFullscreen();
        setState(prev => ({ ...prev, isFullscreen: true }));
      }
    } catch (error) {
      logger.error('video', 'Fullscreen mode toggle failed', error, {}, { component: 'VideoPlayer', function: 'toggleFullscreen' });
      qualityGate.recordError(error as Error, 'warning');
    }
  }, []);

  const frameStep = useCallback((direction: 1 | -1) => {
    const video = actualVideoRef.current;
    if (!video || !metadata) return;

    const frameTime = 1 / (metadata.fps || 30);
    const newTime = video.currentTime + (frameTime * direction);
    seek(newTime);
  }, [metadata, seek]);

  /**
   * Sync point utilities
   */
  const jumpToSyncPoint = useCallback((index: number) => {
    if (index >= 0 && index < syncPoints.length) {
      seek(syncPoints[index].timestamp);
    }
  }, [syncPoints, seek]);

  /**
   * Format time for display
   */
  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  /**
   * Progress bar click handler
   */
  const handleProgressClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = event.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * state.duration;
    seek(newTime);
  }, [state.duration, seek]);

  if (state.error) {
    return (
      <div className={`video-player-error ${className}`}>
        <div className="error-message">
          <h3>Video Error</h3>
          <p>{state.error}</p>
          <button onClick={() => setState(prev => ({ ...prev, error: null }))}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`video-player ${className} ${state.isFullscreen ? 'fullscreen' : ''}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      {...props}
    >
      <video
        ref={actualVideoRef}
        src={src}
        preload={playerConfig.preloadStrategy}
        className="video-player__video"
        playsInline
      />

      {state.isLoading && (
        <div className="video-player__loading">
          <div className="loading-spinner"></div>
          <p>Loading video...</p>
        </div>
      )}

      {showControls && (
        <div className="video-player__controls">
          {/* Progress bar */}
          <div className="progress-container">
            <div 
              className="progress-bar"
              onClick={handleProgressClick}
            >
              <div 
                className="progress-fill"
                style={{ width: `${(state.currentTime / state.duration) * 100}%` }}
              />
              <div 
                className="buffer-fill"
                style={{ width: `${(state.buffered / state.duration) * 100}%` }}
              />
              
              {/* Sync point markers */}
              {syncPoints.map((point, index) => (
                <div
                  key={index}
                  className={`sync-marker ${index === currentSyncIndex ? 'active' : ''}`}
                  style={{ left: `${(point.timestamp / state.duration) * 100}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    jumpToSyncPoint(index);
                  }}
                  title={`Sync point: ${formatTime(point.timestamp)}`}
                />
              ))}
            </div>
          </div>

          {/* Control buttons */}
          <div className="controls-row">
            <div className="controls-left">
              <button 
                className="control-btn play-pause"
                onClick={togglePlayPause}
                aria-label={state.isPlaying ? 'Pause' : 'Play'}
              >
                {state.isPlaying ? '⏸️' : '▶️'}
              </button>

              <div className="volume-control">
                <button 
                  className="control-btn mute"
                  onClick={toggleMute}
                  aria-label={state.muted ? 'Unmute' : 'Mute'}
                >
                  {state.muted ? '🔇' : '🔊'}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={state.muted ? 0 : state.volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="volume-slider"
                />
              </div>

              <div className="time-display">
                <span>{formatTime(state.currentTime)}</span>
                <span className="separator">/</span>
                <span>{formatTime(state.duration)}</span>
              </div>
            </div>

            <div className="controls-right">
              <select
                value={state.playbackRate}
                onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                className="playback-rate"
                title="Playback Speed"
              >
                {playerConfig.playbackRates.map(rate => (
                  <option key={rate} value={rate}>
                    {rate}x
                  </option>
                ))}
              </select>

              <button 
                className="control-btn fullscreen"
                onClick={toggleFullscreen}
                aria-label="Toggle Fullscreen"
              >
                {state.isFullscreen ? '⏹️' : '⛶'}
              </button>
            </div>
          </div>

          {/* Debug info */}
          {playerConfig.showFrameInfo && metadata && (
            <div className="frame-info">
              <span>FPS: {metadata.fps}</span>
              <span>Resolution: {metadata.width}x{metadata.height}</span>
              <span>Frame: {Math.floor(state.currentTime * metadata.fps)}</span>
            </div>
          )}
        </div>
      )}

      {/* Sync point overlay */}
      {currentSyncIndex >= 0 && currentSyncIndex < syncPoints.length && (
        <div className="sync-overlay">
          <div className="sync-info">
            <h4>Position {currentSyncIndex + 1}</h4>
            <p>{syncPoints[currentSyncIndex].fen}</p>
          </div>
        </div>
      )}
    </div>
  );
});

// Display name for React DevTools
VideoPlayer.displayName = 'VideoPlayer';

/**
 * Find the nearest sync point to a given timestamp
 */
function findNearestSyncPoint(timestamp: number, syncPoints: VideoSyncPoint[]): VideoSyncPoint | null {
  if (syncPoints.length === 0) return null;

  let nearest = syncPoints[0];
  let minDistance = Math.abs(timestamp - nearest.timestamp);

  for (const point of syncPoints) {
    const distance = Math.abs(timestamp - point.timestamp);
    if (distance < minDistance) {
      nearest = point;
      minDistance = distance;
    }
  }

  return nearest;
}

export default VideoPlayer;