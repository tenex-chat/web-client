/**
 * Centralized audio resource manager to prevent resource exhaustion
 * and manage AudioContext instances efficiently
 */

export class AudioResourceManager {
  private static instance: AudioResourceManager | null = null;
  private audioContext: AudioContext | null = null;
  private activeStreams: Map<string, MediaStream> = new Map();
  private activeRecorders: Map<string, MediaRecorder> = new Map();
  private refCount = 0;

  private constructor() {}

  static getInstance(): AudioResourceManager {
    if (!AudioResourceManager.instance) {
      AudioResourceManager.instance = new AudioResourceManager();
    }
    return AudioResourceManager.instance;
  }

  /**
   * Get or create a shared AudioContext
   */
  async getAudioContext(): Promise<AudioContext> {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new AudioContext();
    }

    // Resume if suspended (common in browsers)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.refCount++;
    return this.audioContext;
  }

  /**
   * Release AudioContext reference
   */
  releaseAudioContext(): void {
    this.refCount--;

    // Close context when no longer needed
    if (this.refCount <= 0 && this.audioContext) {
      // Delay closing to allow for rapid re-use
      setTimeout(() => {
        if (this.refCount <= 0 && this.audioContext && this.audioContext.state !== 'closed') {
          this.audioContext.close();
          this.audioContext = null;
        }
      }, 1000);
    }
  }

  /**
   * Get user media with caching to prevent multiple permission requests
   */
  async getUserMedia(
    constraints: MediaStreamConstraints,
    cacheKey?: string
  ): Promise<MediaStream> {
    // If we have a cached stream with the same key, return it
    if (cacheKey && this.activeStreams.has(cacheKey)) {
      const existingStream = this.activeStreams.get(cacheKey)!;

      // Check if all tracks are still active
      const tracksActive = existingStream.getTracks().every(track => track.readyState === 'live');
      if (tracksActive) {
        return existingStream;
      }

      // Clean up dead stream
      this.releaseMediaStream(cacheKey);
    }

    // Create new stream
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    if (cacheKey) {
      this.activeStreams.set(cacheKey, stream);
    }

    return stream;
  }

  /**
   * Release a media stream
   */
  releaseMediaStream(cacheKey: string): void {
    const stream = this.activeStreams.get(cacheKey);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      this.activeStreams.delete(cacheKey);
    }
  }

  /**
   * Create a MediaRecorder with proper cleanup tracking
   */
  createMediaRecorder(
    stream: MediaStream,
    options: MediaRecorderOptions,
    recorderKey: string
  ): MediaRecorder {
    // Clean up any existing recorder with the same key
    this.releaseMediaRecorder(recorderKey);

    const recorder = new MediaRecorder(stream, options);
    this.activeRecorders.set(recorderKey, recorder);

    return recorder;
  }

  /**
   * Release a MediaRecorder
   */
  releaseMediaRecorder(recorderKey: string): void {
    const recorder = this.activeRecorders.get(recorderKey);
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
    }
    this.activeRecorders.delete(recorderKey);
  }

  /**
   * Clean up all resources
   */
  cleanup(): void {
    // Stop all streams
    this.activeStreams.forEach(stream => {
      stream.getTracks().forEach(track => track.stop());
    });
    this.activeStreams.clear();

    // Stop all recorders
    this.activeRecorders.forEach(recorder => {
      if (recorder.state === 'recording') {
        recorder.stop();
      }
    });
    this.activeRecorders.clear();

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.refCount = 0;
  }

  /**
   * Get current resource usage stats
   */
  getResourceStats() {
    return {
      audioContextState: this.audioContext?.state || 'closed',
      activeStreams: this.activeStreams.size,
      activeRecorders: this.activeRecorders.size,
      audioContextRefCount: this.refCount,
    };
  }
}

// Export singleton instance
export const audioResourceManager = AudioResourceManager.getInstance();