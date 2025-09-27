import type { VADOptions, MicVADInstance } from "@ricky0123/vad-web";
import { audioResourceManager } from "./audio-resource-manager";
import { AUDIO_CONFIG } from "./audio-config";

export interface VADServiceOptions {
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onError?: (error: Error) => void;
  frameProcessor?: (audio: Float32Array) => void;
  // VAD sensitivity settings
  positiveSpeechThreshold?: number; // 0-1, default 0.9
  negativeSpeechThreshold?: number; // 0-1, default 0.7
  redemptionFrames?: number; // Number of frames to wait before ending speech
  preSpeechPadFrames?: number; // Number of frames to pad before speech
  minSpeechFrames?: number; // Minimum frames for valid speech
}

export class VADService {
  private vad: MicVADInstance | null = null;
  private isInitialized = false;
  private isListening = false;
  private options: VADServiceOptions;
  private initializationPromise: Promise<void> | null = null;
  private mediaStream: MediaStream | null = null;

  constructor(options: VADServiceOptions = {}) {
    this.options = options;
  }
  
  async initialize(deviceId?: string): Promise<void> {
    console.log(`[${performance.now().toFixed(2)}ms] [VAD-SERVICE] initialize() called with deviceId:`, deviceId, 'isInitialized:', this.isInitialized, 'hasInitPromise:', !!this.initializationPromise);

    // If already initialized, return immediately
    if (this.isInitialized) {
      console.log(`[${performance.now().toFixed(2)}ms] [VAD-SERVICE] Already initialized, skipping`);
      return;
    }

    // If initialization is in progress, wait for it
    if (this.initializationPromise) {
      console.log(`[${performance.now().toFixed(2)}ms] [VAD-SERVICE] Initialization already in progress, waiting...`);
      return this.initializationPromise;
    }

    // Create and store the initialization promise
    this.initializationPromise = this._doInitialize(deviceId);
    return this.initializationPromise;
  }

  private async _doInitialize(deviceId?: string): Promise<void> {
    try {
      
      const vadOptions: VADOptions = {
        onSpeechStart: () => {
          console.log(`[${performance.now().toFixed(2)}ms] [VAD-SERVICE] onSpeechStart triggered`);
          this.options.onSpeechStart?.();
        },
        onSpeechEnd: (audio: Float32Array) => {
          console.log(`[${performance.now().toFixed(2)}ms] [VAD-SERVICE] onSpeechEnd triggered, audio size:`, audio?.length);
          // Process the audio if needed
          this.options.frameProcessor?.(audio);
          this.options.onSpeechEnd?.();
        },
        onVADMisfire: () => {
          console.log(`[${performance.now().toFixed(2)}ms] [VAD-SERVICE] VAD Misfire - speech too short`);
          // VAD detected speech that was too short
        },
        // Sensitivity settings - use AUDIO_CONFIG values
        positiveSpeechThreshold: this.options.positiveSpeechThreshold ?? AUDIO_CONFIG.VAD.POSITIVE_SPEECH_THRESHOLD,
        negativeSpeechThreshold: this.options.negativeSpeechThreshold ?? AUDIO_CONFIG.VAD.NEGATIVE_SPEECH_THRESHOLD,
        redemptionMs: (this.options.redemptionFrames ?? AUDIO_CONFIG.VAD.REDEMPTION_FRAMES) * AUDIO_CONFIG.VAD.FRAME_MS,
        preSpeechPadMs: (this.options.preSpeechPadFrames ?? AUDIO_CONFIG.VAD.PRE_SPEECH_PAD_FRAMES) * AUDIO_CONFIG.VAD.FRAME_MS,
        minSpeechMs: (this.options.minSpeechFrames ?? AUDIO_CONFIG.VAD.MIN_SPEECH_FRAMES) * AUDIO_CONFIG.VAD.FRAME_MS,
        // Use specific device if provided through resource manager
        ...(deviceId && {
          stream: await (async () => {
            const stream = await audioResourceManager.getUserMedia(
              {
                audio: {
                  deviceId: { exact: deviceId },
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true,
                },
              },
              `vad-${deviceId}`
            );
            this.mediaStream = stream;
            return stream;
          })(),
        }),
      };

      console.log(`[${performance.now().toFixed(2)}ms] [VAD-SERVICE] Initializing with config:`, {
        positiveSpeechThreshold: vadOptions.positiveSpeechThreshold,
        negativeSpeechThreshold: vadOptions.negativeSpeechThreshold,
        redemptionMs: vadOptions.redemptionMs,
        preSpeechPadMs: vadOptions.preSpeechPadMs,
        minSpeechMs: vadOptions.minSpeechMs
      });

      // Initialize MicVAD
      const { MicVAD: MicVADClass } = await import("@ricky0123/vad-web");
      this.vad = await MicVADClass.new(vadOptions);

      // If we didn't provide a stream, MicVAD created its own
      // We need to track it for cleanup
      if (!deviceId && !this.mediaStream) {
        // MicVAD has created its own stream internally
        console.log(`[${performance.now().toFixed(2)}ms] [VAD-SERVICE] MicVAD created its own stream`);
      }

      this.isInitialized = true;
      console.log(`[${performance.now().toFixed(2)}ms] [VAD-SERVICE] Initialization complete`);
    } catch (error) {
      // Reset on failure
      this.initializationPromise = null;
      this.isInitialized = false;
      const err = error instanceof Error ? error : new Error(String(error));
      this.options.onError?.(err);
      throw err;
    }
  }
  
  async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (this.isListening || !this.vad) {
      return;
    }
    
    try {
      await this.vad.start();
      this.isListening = true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.options.onError?.(err);
      throw err;
    }
  }
  
  pause(): void {
    if (!this.vad || !this.isListening) {
      return;
    }
    
    this.vad.pause();
    this.isListening = false;
  }
  
  resume(): void {
    if (!this.vad || this.isListening) {
      return;
    }
    
    this.vad.start();
    this.isListening = true;
  }
  
  destroy(): void {
    console.log(`[${performance.now().toFixed(2)}ms] [VAD-SERVICE] destroy() called`);

    // First stop listening if active
    if (this.isListening && this.vad) {
      try {
        this.vad.pause();
      } catch (err) {
        console.error(`[${performance.now().toFixed(2)}ms] [VAD-SERVICE] Error pausing VAD:`, err);
      }
    }

    // Destroy the VAD instance - this should stop any internal streams
    if (this.vad) {
      try {
        // First try to access any stream the VAD might be using
        // The MicVAD instance might have a stream property we can stop
        const vadInternal = this.vad as any;
        if (vadInternal.stream && vadInternal.stream instanceof MediaStream) {
          console.log(`[${performance.now().toFixed(2)}ms] [VAD-SERVICE] Found internal VAD stream, stopping tracks`);
          vadInternal.stream.getTracks().forEach((track: MediaStreamTrack) => {
            track.stop();
            console.log(`[${performance.now().toFixed(2)}ms] [VAD-SERVICE] Stopped internal track:`, track.kind, track.label);
          });
        }

        this.vad.destroy();
      } catch (err) {
        console.error(`[${performance.now().toFixed(2)}ms] [VAD-SERVICE] Error destroying VAD:`, err);
      }
      this.vad = null;
    }

    // Release media stream if we have one
    if (this.mediaStream) {
      console.log(`[${performance.now().toFixed(2)}ms] [VAD-SERVICE] Stopping media stream tracks`);

      // Release from the resource manager cache if this is a deviceId-specific stream
      const deviceId = this.mediaStream.getAudioTracks()[0]?.getSettings()?.deviceId;
      if (deviceId) {
        audioResourceManager.releaseMediaStream(`vad-${deviceId}`);
      }

      // Stop all tracks
      this.mediaStream.getTracks().forEach(track => {
        track.stop();
        console.log(`[${performance.now().toFixed(2)}ms] [VAD-SERVICE] Stopped track:`, track.kind, track.label);
      });
      this.mediaStream = null;
    }

    // Reset state
    this.isInitialized = false;
    this.isListening = false;
    this.initializationPromise = null;

    console.log(`[${performance.now().toFixed(2)}ms] [VAD-SERVICE] destroy() complete`);
  }
  
  updateOptions(options: Partial<VADServiceOptions>): void {
    this.options = { ...this.options, ...options };
    
    // If VAD is already initialized, we'd need to recreate it
    // with new options (VAD doesn't support live updates)
    if (this.isInitialized && this.vad) {
      // VAD options changed after initialization - requires recreation for changes to take effect
    }
  }
  
  get isActive(): boolean {
    return this.isListening;
  }
  
  get initialized(): boolean {
    return this.isInitialized;
  }
}