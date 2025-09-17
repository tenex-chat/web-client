// @ts-ignore - Type issues with the module
import { MicVAD } from "@ricky0123/vad-web";

// Define types
type RealTimeVADOptions = Parameters<typeof MicVAD.new>[0];

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
  private vad: InstanceType<typeof MicVAD> | null = null;
  private isInitialized = false;
  private isListening = false;
  private options: VADServiceOptions;
  private audioContext: AudioContext | null = null;
  
  constructor(options: VADServiceOptions = {}) {
    this.options = options;
  }
  
  async initialize(deviceId?: string): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    try {
      // Create audio context for audio processing
      this.audioContext = new AudioContext();
      
      const vadOptions: Partial<RealTimeVADOptions> = {
        onSpeechStart: () => {
          console.log(`VAD: Speech started - ${Date.now()}ms`);
          this.options.onSpeechStart?.();
        },
        onSpeechEnd: (audio: Float32Array) => {
          console.log(`VAD: Speech ended with audio length: ${audio.length} - ${Date.now()}ms`);
          // Process the audio if needed
          this.options.frameProcessor?.(audio);
          this.options.onSpeechEnd?.();
        },
        onVADMisfire: () => {
          console.log(`VAD: Misfire (too short) - ${Date.now()}ms`);
        },
        // Sensitivity settings
        positiveSpeechThreshold: this.options.positiveSpeechThreshold ?? 0.9,
        negativeSpeechThreshold: this.options.negativeSpeechThreshold ?? 0.7,
        redemptionMs: (this.options.redemptionFrames ?? 8) * 32, // Convert frames to ms (assuming ~32ms per frame)
        preSpeechPadMs: (this.options.preSpeechPadFrames ?? 4) * 32,
        minSpeechMs: (this.options.minSpeechFrames ?? 3) * 32,
        // Use specific device if provided
        ...(deviceId && {
          stream: await navigator.mediaDevices.getUserMedia({
            audio: {
              deviceId: { exact: deviceId },
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          }),
        }),
      };
      
      // Initialize MicVAD
      // @ts-ignore - Type issues with the module
      this.vad = await MicVAD.new(vadOptions);
      this.isInitialized = true;
      
      console.log(`VAD Service initialized successfully - ${Date.now()}ms`);
    } catch (error) {
      console.error("Failed to initialize VAD:", error);
      this.options.onError?.(error as Error);
      throw error;
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
      console.log(`VAD Service started listening - ${Date.now()}ms`);
    } catch (error) {
      console.error("Failed to start VAD:", error);
      this.options.onError?.(error as Error);
      throw error;
    }
  }
  
  pause(): void {
    if (!this.vad || !this.isListening) {
      return;
    }
    
    this.vad.pause();
    this.isListening = false;
    console.log(`VAD Service paused - ${Date.now()}ms`);
  }
  
  resume(): void {
    if (!this.vad || this.isListening) {
      return;
    }
    
    this.vad.start();
    this.isListening = true;
    console.log(`VAD Service resumed - ${Date.now()}ms`);
  }
  
  destroy(): void {
    if (this.vad) {
      this.vad.destroy();
      this.vad = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.isInitialized = false;
    this.isListening = false;
    console.log(`VAD Service destroyed - ${Date.now()}ms`);
  }
  
  updateOptions(options: Partial<VADServiceOptions>): void {
    this.options = { ...this.options, ...options };
    
    // If VAD is already initialized, we'd need to recreate it
    // with new options (VAD doesn't support live updates)
    if (this.isInitialized && this.vad) {
      console.warn("VAD options changed, but VAD is already initialized. Recreate VAD for changes to take effect.");
    }
  }
  
  get isActive(): boolean {
    return this.isListening;
  }
  
  get initialized(): boolean {
    return this.isInitialized;
  }
}