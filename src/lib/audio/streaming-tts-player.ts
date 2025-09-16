/**
 * Streaming TTS Player using Web Audio API for real-time audio playback
 * Handles progressive audio chunks and provides immediate playback
 */

export class StreamingTTSPlayer {
  private audioContext: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private audioChunks: Uint8Array[] = [];
  private isPlaying = false;
  private onEndCallback?: () => void;
  private playbackStarted = false;
  private nextPlayTime = 0;
  private audioQueue: AudioBuffer[] = [];
  private isProcessing = false;
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
            console.warn("MP3 codec not supported, using fallback");
          }

          this.sourceBuffer = this.mediaSource!.addSourceBuffer(mimeType);
          
          // Handle source buffer events
          this.sourceBuffer.addEventListener("updateend", () => {
            this.processPendingChunks();
          });

          this.sourceBuffer.addEventListener("error", (error) => {
            console.error("SourceBuffer error:", error);
          });

          resolve();
        } catch (error) {
          reject(error);
        }
      });

      this.mediaSource.addEventListener("sourceended", () => {
        console.log("MediaSource ended");
      });

      this.mediaSource.addEventListener("sourceclose", () => {
        console.log("MediaSource closed");
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
      }, 100);
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
      console.warn("MediaSource not in open state:", this.mediaSource?.readyState);
      return;
    }

    try {
      // Combine small chunks for better performance
      let combinedSize = 0;
      let chunksToAppend: Uint8Array[] = [];
      
      while (this.pendingChunks.length > 0 && combinedSize < 8192) { // 8KB threshold
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
      console.error("Error appending to source buffer:", error);
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
        console.warn("Error ending stream:", error);
      }
    }
  }

  /**
   * Wait for all pending chunks to be processed
   */
  private async waitForPendingChunks(): Promise<void> {
    const maxAttempts = 50; // 5 seconds timeout
    let attempts = 0;
    
    while ((this.pendingChunks.length > 0 || this.sourceBuffer?.updating) && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      console.warn("Timeout waiting for pending chunks to process");
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
      console.error("Error playing audio:", error);
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
        console.warn("Error removing source buffer:", error);
      }
      this.sourceBuffer = null;
    }

    if (this.mediaSource) {
      if (this.mediaSource.readyState === "open") {
        try {
          this.mediaSource.endOfStream();
        } catch (error) {
          console.warn("Error ending MediaSource:", error);
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
      this.audioElement.playbackRate = Math.max(0.25, Math.min(rate, 4));
    }
  }

  /**
   * Set volume (0 to 1)
   */
  setVolume(volume: number): void {
    if (this.audioElement) {
      this.audioElement.volume = Math.max(0, Math.min(volume, 1));
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

/**
 * Alternative implementation using AudioContext for browsers that don't support MediaSource well
 */
export class AudioContextStreamingPlayer {
  private audioContext: AudioContext;
  private audioChunks: Uint8Array[] = [];
  private isPlaying = false;
  private scheduledBuffers: AudioBufferSourceNode[] = [];
  private nextPlayTime = 0;
  private onEndCallback?: () => void;
  private outputDeviceId?: string;
  private destination: AudioDestinationNode | MediaStreamAudioDestinationNode;

  constructor(outputDeviceId?: string) {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.outputDeviceId = outputDeviceId;
    this.destination = this.audioContext.destination;
    
    // Note: AudioContext doesn't directly support setSinkId
    // This would require creating an audio element as a bridge
    if (outputDeviceId && outputDeviceId !== "default") {
      console.warn("Custom output device not fully supported with AudioContext fallback");
    }
  }

  async addChunk(chunk: Uint8Array): Promise<void> {
    this.audioChunks.push(chunk);
    
    // Decode and schedule the chunk
    try {
      const audioBuffer = await this.decodeAudioChunk(chunk);
      if (audioBuffer) {
        this.scheduleBuffer(audioBuffer);
      }
    } catch (error) {
      console.error("Error decoding audio chunk:", error);
    }
  }

  private async decodeAudioChunk(chunk: Uint8Array): Promise<AudioBuffer | null> {
    try {
      // For MP3, we need to accumulate enough data for a valid frame
      // This is a simplified approach - in production, you'd want proper MP3 frame parsing
      const buffer = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength);
      const audioBuffer = await this.audioContext.decodeAudioData(buffer);
      return audioBuffer;
    } catch (error) {
      // If decoding fails, it might be because we don't have a complete MP3 frame
      // In a real implementation, we'd buffer and combine chunks until we have valid frames
      console.warn("Audio decode failed, likely incomplete frame:", error);
      return null;
    }
  }

  private scheduleBuffer(audioBuffer: AudioBuffer): void {
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.destination);
    
    // Calculate when to play this buffer
    const currentTime = this.audioContext.currentTime;
    const playTime = Math.max(currentTime + 0.1, this.nextPlayTime);
    
    source.start(playTime);
    this.nextPlayTime = playTime + audioBuffer.duration;
    
    // Track the scheduled buffer
    this.scheduledBuffers.push(source);
    
    // Set playing state
    if (!this.isPlaying) {
      this.isPlaying = true;
    }
    
    // Handle end of this buffer
    source.onended = () => {
      this.scheduledBuffers = this.scheduledBuffers.filter(s => s !== source);
      if (this.scheduledBuffers.length === 0 && this.onEndCallback) {
        this.isPlaying = false;
        this.onEndCallback();
      }
    };
  }

  async endStream(): Promise<void> {
    // Nothing special needed for AudioContext
  }

  stop(): void {
    // Stop all scheduled buffers
    this.scheduledBuffers.forEach(source => {
      try {
        source.stop();
      } catch (error) {
        // Ignore errors from already stopped sources
      }
    });
    this.scheduledBuffers = [];
    this.audioChunks = [];
    this.isPlaying = false;
    this.nextPlayTime = 0;
  }

  onEnded(callback: () => void): void {
    this.onEndCallback = callback;
  }

  get playing(): boolean {
    return this.isPlaying;
  }
}