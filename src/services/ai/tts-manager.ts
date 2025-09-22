import { StreamingTTSPlayer } from "@/lib/audio/streaming-tts-player";
import { AUDIO_CONFIG } from "@/lib/audio/audio-config";
import { aiService } from "./ai-service";

export interface TTSOptions {
  voiceId: string;
  provider: "openai" | "elevenlabs";
  apiKey: string;
  playbackRate?: number;
  volume?: number;
  onProgress?: (currentTime: number, duration: number) => void;
  onError?: (error: Error) => void;
  onEnd?: () => void;
}

export class TTSManager {
  private currentPlayer: StreamingTTSPlayer | HTMLAudioElement | null = null;
  private progressInterval: NodeJS.Timer | null = null;

  /**
   * Play text-to-speech with appropriate strategy based on provider
   */
  async play(
    text: string,
    authorPubkey: string,
    options: TTSOptions
  ): Promise<void> {
    // Clean up any existing playback
    this.stop();

    const {
      voiceId,
      provider,
      apiKey,
      playbackRate = AUDIO_CONFIG.PLAYBACK.DEFAULT_RATE,
      volume = AUDIO_CONFIG.PLAYBACK.DEFAULT_VOLUME,
      onProgress,
      onError,
      onEnd
    } = options;

    try {
      if (provider === "elevenlabs") {
        await this.playWithStreaming(text, authorPubkey, {
          voiceId,
          provider,
          apiKey,
          playbackRate,
          volume,
          onProgress,
          onEnd
        });
      } else {
        await this.playWithBuffer(text, authorPubkey, {
          voiceId,
          provider,
          apiKey,
          playbackRate,
          volume,
          onProgress,
          onEnd
        });
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error("TTS playback failed");
      onError?.(err);
      throw err;
    }
  }

  /**
   * Play with streaming (for ElevenLabs)
   */
  private async playWithStreaming(
    text: string,
    _authorPubkey: string,
    options: Omit<TTSOptions, "onError">
  ): Promise<void> {
    const { voiceId, provider, apiKey, playbackRate, volume, onProgress, onEnd } = options;

    const player = new StreamingTTSPlayer();
    this.currentPlayer = player;

    // Apply settings
    player.setPlaybackRate(playbackRate!);
    player.setVolume(volume!);

    // Set up progress tracking
    if (onProgress) {
      this.progressInterval = setInterval(() => {
        if (player.playing) {
          const currentTime = player.getCurrentTime();
          const duration = player.getDuration();
          if (!isNaN(duration) && duration > 0) {
            onProgress(currentTime, duration);
          }
        }
      }, AUDIO_CONFIG.STREAMING.PROGRESS_UPDATE_INTERVAL_MS);
    }

    // Set up end callback
    player.onEnded(() => {
      this.cleanupProgress();
      onEnd?.();
    });

    let firstChunkReceived = false;

    // Start streaming
    await aiService.streamSpeak(
      text,
      voiceId,
      provider as "elevenlabs",
      apiKey,
      async (chunk) => {
        await player.addChunk(chunk);

        if (!firstChunkReceived) {
          firstChunkReceived = true;
          // Small delay to ensure buffering
          setTimeout(() => {
            player.play();
          }, AUDIO_CONFIG.STREAMING.INITIAL_PLAYBACK_DELAY_MS);
        }
      }
    );

    // Signal end of stream
    await player.endStream();
  }

  /**
   * Play with buffer (for OpenAI and other non-streaming providers)
   */
  private async playWithBuffer(
    text: string,
    _authorPubkey: string,
    options: Omit<TTSOptions, "onError">
  ): Promise<void> {
    const { voiceId, provider, apiKey, playbackRate, volume, onProgress, onEnd } = options;

    // Get the complete audio
    const audioBlob = await aiService.speak(text, voiceId, provider, apiKey);
    const audioUrl = URL.createObjectURL(audioBlob);

    const audio = new Audio(audioUrl);
    this.currentPlayer = audio;

    // Apply settings
    audio.playbackRate = playbackRate!;
    audio.volume = volume!;

    // Set up event listeners
    audio.addEventListener("loadedmetadata", () => {
      if (onProgress) {
        onProgress(0, audio.duration);
      }
    });

    if (onProgress) {
      audio.addEventListener("timeupdate", () => {
        onProgress(audio.currentTime, audio.duration);
      });
    }

    audio.addEventListener("ended", () => {
      URL.revokeObjectURL(audioUrl);
      onEnd?.();
    });

    audio.addEventListener("error", (e) => {
      URL.revokeObjectURL(audioUrl);
      throw new Error("Audio playback failed");
    });

    // Start playback
    await audio.play();
  }

  /**
   * Pause current playback
   */
  pause(): void {
    if (this.currentPlayer) {
      if (this.currentPlayer instanceof StreamingTTSPlayer) {
        this.currentPlayer.pause();
      } else {
        this.currentPlayer.pause();
      }
    }
  }

  /**
   * Resume current playback
   */
  resume(): void {
    if (this.currentPlayer) {
      if (this.currentPlayer instanceof StreamingTTSPlayer) {
        this.currentPlayer.resume();
      } else {
        this.currentPlayer.play();
      }
    }
  }

  /**
   * Stop current playback
   */
  stop(): void {
    this.cleanupProgress();

    if (this.currentPlayer) {
      if (this.currentPlayer instanceof StreamingTTSPlayer) {
        this.currentPlayer.stop();
      } else {
        this.currentPlayer.pause();
        this.currentPlayer.src = "";
      }
      this.currentPlayer = null;
    }
  }

  /**
   * Seek to specific time
   */
  seek(time: number): void {
    if (this.currentPlayer) {
      if (this.currentPlayer instanceof StreamingTTSPlayer) {
        this.currentPlayer.seek(time);
      } else {
        this.currentPlayer.currentTime = time;
      }
    }
  }

  /**
   * Update playback rate
   */
  setPlaybackRate(rate: number): void {
    const clampedRate = Math.max(
      AUDIO_CONFIG.PLAYBACK.MIN_RATE,
      Math.min(rate, AUDIO_CONFIG.PLAYBACK.MAX_RATE)
    );

    if (this.currentPlayer) {
      if (this.currentPlayer instanceof StreamingTTSPlayer) {
        this.currentPlayer.setPlaybackRate(clampedRate);
      } else {
        this.currentPlayer.playbackRate = clampedRate;
      }
    }
  }

  /**
   * Update volume
   */
  setVolume(volume: number): void {
    const clampedVolume = Math.max(
      AUDIO_CONFIG.PLAYBACK.MIN_VOLUME,
      Math.min(volume, AUDIO_CONFIG.PLAYBACK.MAX_VOLUME)
    );

    if (this.currentPlayer) {
      if (this.currentPlayer instanceof StreamingTTSPlayer) {
        this.currentPlayer.setVolume(clampedVolume);
      } else {
        this.currentPlayer.volume = clampedVolume;
      }
    }
  }

  /**
   * Get current playback state
   */
  getState() {
    if (!this.currentPlayer) {
      return { isPlaying: false, currentTime: 0, duration: 0 };
    }

    if (this.currentPlayer instanceof StreamingTTSPlayer) {
      return {
        isPlaying: this.currentPlayer.playing,
        currentTime: this.currentPlayer.getCurrentTime(),
        duration: this.currentPlayer.getDuration(),
      };
    } else {
      return {
        isPlaying: !this.currentPlayer.paused,
        currentTime: this.currentPlayer.currentTime,
        duration: this.currentPlayer.duration,
      };
    }
  }

  /**
   * Clean up progress tracking
   */
  private cleanupProgress(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  /**
   * Clean up all resources
   */
  cleanup(): void {
    this.stop();
  }
}

// Export singleton instance
export const ttsManager = new TTSManager();