import type { VADOptions, MicVADInstance } from "@ricky0123/vad-web";
import { audioResourceManager } from "./audio-resource-manager";

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
  
  constructor(options: VADServiceOptions = {}) {
    this.options = options;
  }
  
  async initialize(deviceId?: string): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    try {
      
      const vadOptions: VADOptions = {
        onSpeechStart: () => {
          this.options.onSpeechStart?.();
        },
        onSpeechEnd: (audio: Float32Array) => {
          // Process the audio if needed
          this.options.frameProcessor?.(audio);
          this.options.onSpeechEnd?.();
        },
        onVADMisfire: () => {
          // VAD detected speech that was too short
        },
        // Sensitivity settings
        positiveSpeechThreshold: this.options.positiveSpeechThreshold ?? 0.9,
        negativeSpeechThreshold: this.options.negativeSpeechThreshold ?? 0.7,
        redemptionMs: (this.options.redemptionFrames ?? 8) * 32, // Convert frames to ms (assuming ~32ms per frame)
        preSpeechPadMs: (this.options.preSpeechPadFrames ?? 4) * 32,
        minSpeechMs: (this.options.minSpeechFrames ?? 3) * 32,
        // Use specific device if provided through resource manager
        ...(deviceId && {
          stream: await audioResourceManager.getUserMedia(
            {
              audio: {
                deviceId: { exact: deviceId },
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            },
            `vad-${deviceId}`
          ),
        }),
      };
      
      // Initialize MicVAD
      const { MicVAD: MicVADClass } = await import("@ricky0123/vad-web");
      this.vad = await MicVADClass.new(vadOptions);
      this.isInitialized = true;
    } catch (error) {
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
    if (this.vad) {
      this.vad.destroy();
      this.vad = null;
    }
    
    // Release any cached streams
    // Note: VAD library manages its own audio context internally
    
    this.isInitialized = false;
    this.isListening = false;
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