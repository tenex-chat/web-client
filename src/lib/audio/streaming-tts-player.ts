/**
 * Streaming TTS Player using Web Audio API for real-time audio playback
 * Handles progressive audio chunks and provides immediate playback
 */

import { AUDIO_CONFIG } from "./audio-config";

export class StreamingTTSPlayer {
  private audioChunks: Uint8Array[] = [];
  private isPlaying = false;
  private onEndCallback?: () => void;
  private playbackStarted = false;
  private mediaSource: MediaSource | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private sourceBuffer: SourceBuffer | null = null;
  private pendingChunks: Uint8Array[] = [];
  private streamEnded = false;
  private outputDeviceId?: string;

  constructor(outputDeviceId?: string) {
    this.outputDeviceId = outputDeviceId;
  }

  /**
   * Initialize the player with MediaSource Extensions for better streaming support
   */
  async initialize(): Promise<void> {
    if (this.audioElement) {
      return; // Already initialized
    }

    // Create MediaSource and audio element
    this.mediaSource = new MediaSource();
    this.audioElement = new Audio();
    this.audioElement.src = URL.createObjectURL(this.mediaSource);
    
    // Apply output device if set
    if (this.outputDeviceId && typeof this.audioElement.setSinkId === "function") {
      try {
        await this.audioElement.setSinkId(this.outputDeviceId);
      } catch (error) {
        console.warn("Failed to set audio output device:", error);
      }
    }

    // Set up MediaSource event handlers
    return new Promise((resolve, reject) => {
      if (!this.mediaSource) {
        reject(new Error("MediaSource not initialized"));
        return;
      }

      this.mediaSource.addEventListener("sourceopen", () => {
        try {
          // Use MP3 codec which is widely supported
          const mimeType = 'audio/mpeg';
          
          if (!MediaSource.isTypeSupported(mimeType)) {
            // Fallback to basic audio/mpeg without codecs
            // MP3 codec not supported, using fallback
          }

          this.sourceBuffer = this.mediaSource!.addSourceBuffer(mimeType);
          
          // Handle source buffer events
          this.sourceBuffer.addEventListener("updateend", () => {
            this.processPendingChunks();
          });

          this.sourceBuffer.addEventListener("error", () => {
            // SourceBuffer error
          });

          resolve();
        } catch (error) {
          reject(error);
        }
      });

      this.mediaSource.addEventListener("sourceended", () => {
        // MediaSource ended
      });

      this.mediaSource.addEventListener("sourceclose", () => {
        // MediaSource closed
      });
    });
  }

  /**
   * Add an audio chunk to the player
   * This will immediately start playback if this is the first chunk
   */
  async addChunk(chunk: Uint8Array): Promise<void> {
    this.audioChunks.push(chunk);
    
    if (!this.audioElement) {
      await this.initialize();
    }

    // Add chunk to pending queue
    this.pendingChunks.push(chunk);
    
    // Process chunks if not already processing
    this.processPendingChunks();

    // Start playback after first chunk is added
    if (!this.playbackStarted && this.audioElement) {
      this.playbackStarted = true;
      
      // Small delay to ensure first chunks are buffered
      setTimeout(() => {
        this.play();
      }, AUDIO_CONFIG.STREAMING.INITIAL_PLAYBACK_DELAY_MS);
    }
  }

  /**
   * Process pending chunks when source buffer is ready
   */
  private processPendingChunks(): void {
    if (!this.sourceBuffer || this.sourceBuffer.updating || this.pendingChunks.length === 0) {
      return;
    }

    // Check if MediaSource is still open
    if (this.mediaSource?.readyState !== "open") {
      if (this.streamEnded) {
        return; // Expected state when stream has ended
      }
      // MediaSource not in open state
      return;
    }

    try {
      // Combine small chunks for better performance
      let combinedSize = 0;
      const chunksToAppend: Uint8Array[] = [];

      while (this.pendingChunks.length > 0 && combinedSize < AUDIO_CONFIG.STREAMING.CHUNK_COMBINE_THRESHOLD) {
        const chunk = this.pendingChunks[0];
        combinedSize += chunk.length;
        chunksToAppend.push(this.pendingChunks.shift()!);
      }

      if (chunksToAppend.length > 0) {
        // Combine chunks into single buffer
        const totalLength = chunksToAppend.reduce((acc, chunk) => acc + chunk.length, 0);
        const combinedChunk = new Uint8Array(totalLength);
        let offset = 0;
        
        for (const chunk of chunksToAppend) {
          combinedChunk.set(chunk, offset);
          offset += chunk.length;
        }

        this.sourceBuffer.appendBuffer(combinedChunk);
      }
    } catch (error) {
      // Error appending to source buffer - chunks will be retried
      // Re-add chunks to queue to retry
      this.pendingChunks.unshift(...this.pendingChunks);
    }
  }

  /**
   * Signal that the stream has ended and close the MediaSource
   */
  async endStream(): Promise<void> {
    this.streamEnded = true;
    
    // Wait for pending chunks to be processed
    await this.waitForPendingChunks();
    
    // End the stream
    if (this.mediaSource?.readyState === "open" && this.sourceBuffer && !this.sourceBuffer.updating) {
      try {
        this.mediaSource.endOfStream();
      } catch (error) {
        // Error ending stream - expected when stream already ended
      }
    }
  }

  /**
   * Wait for all pending chunks to be processed
   */
  private async waitForPendingChunks(): Promise<void> {
    const maxAttempts = AUDIO_CONFIG.STREAMING.PENDING_CHUNKS_TIMEOUT_MS / AUDIO_CONFIG.STREAMING.PENDING_CHUNKS_CHECK_INTERVAL_MS;
    let attempts = 0;

    while ((this.pendingChunks.length > 0 || this.sourceBuffer?.updating) && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, AUDIO_CONFIG.STREAMING.PENDING_CHUNKS_CHECK_INTERVAL_MS));
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      // Timeout waiting for pending chunks to process
    }
  }

  /**
   * Start or resume playback
   */
  async play(): Promise<void> {
    if (!this.audioElement) {
      throw new Error("Player not initialized");
    }

    if (this.isPlaying) {
      return;
    }

    try {
      await this.audioElement.play();
      this.isPlaying = true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this.audioElement && this.isPlaying) {
      this.audioElement.pause();
      this.isPlaying = false;
    }
  }

  /**
   * Resume playback from current position
   */
  resume(): void {
    if (this.audioElement && !this.isPlaying) {
      this.audioElement.play().then(() => {
        this.isPlaying = true;
      }).catch(() => {
        // Error resuming playback
      });
    }
  }

  /**
   * Get current playback position in seconds
   */
  getCurrentTime(): number {
    return this.audioElement?.currentTime ?? 0;
  }

  /**
   * Get total duration in seconds
   */
  getDuration(): number {
    return this.audioElement?.duration ?? 0;
  }

  /**
   * Seek to specific time in seconds
   */
  seek(time: number): void {
    if (this.audioElement && !isNaN(this.audioElement.duration)) {
      this.audioElement.currentTime = Math.max(0, Math.min(time, this.audioElement.duration));
    }
  }

  /**
   * Stop playback and clean up resources
   */
  stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = "";
      this.audioElement = null;
    }

    if (this.sourceBuffer) {
      try {
        if (this.mediaSource?.readyState === "open") {
          this.mediaSource.removeSourceBuffer(this.sourceBuffer);
        }
      } catch (error) {
        // Error removing source buffer - can be ignored
      }
      this.sourceBuffer = null;
    }

    if (this.mediaSource) {
      if (this.mediaSource.readyState === "open") {
        try {
          this.mediaSource.endOfStream();
        } catch (error) {
          // Error ending MediaSource - can be ignored
        }
      }
      this.mediaSource = null;
    }

    this.audioChunks = [];
    this.pendingChunks = [];
    this.isPlaying = false;
    this.playbackStarted = false;
    this.streamEnded = false;
  }

  /**
   * Set playback speed
   */
  setPlaybackRate(rate: number): void {
    if (this.audioElement) {
      this.audioElement.playbackRate = Math.max(AUDIO_CONFIG.PLAYBACK.MIN_RATE, Math.min(rate, AUDIO_CONFIG.PLAYBACK.MAX_RATE));
    }
  }

  /**
   * Set volume (0 to 1)
   */
  setVolume(volume: number): void {
    if (this.audioElement) {
      this.audioElement.volume = Math.max(AUDIO_CONFIG.PLAYBACK.MIN_VOLUME, Math.min(volume, AUDIO_CONFIG.PLAYBACK.MAX_VOLUME));
    }
  }

  /**
   * Set callback for when playback ends
   */
  onEnded(callback: () => void): void {
    this.onEndCallback = callback;
    if (this.audioElement) {
      this.audioElement.onended = () => {
        this.isPlaying = false;
        if (this.onEndCallback) {
          this.onEndCallback();
        }
      };
    }
  }

  /**
   * Get current playback state
   */
  getState() {
    return {
      isPlaying: this.isPlaying,
      hasAudio: this.audioChunks.length > 0,
      isInitialized: !!this.audioElement,
      bufferedChunks: this.audioChunks.length,
      pendingChunks: this.pendingChunks.length,
    };
  }

  /**
   * Check if the player is currently playing
   */
  get playing(): boolean {
    return this.isPlaying;
  }

  /**
   * Get the audio element for additional control if needed
   */
  getAudioElement(): HTMLAudioElement | null {
    return this.audioElement;
  }
}

