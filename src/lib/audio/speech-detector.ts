/**
 * Speech Detector for monitoring microphone input and detecting speech activity
 * Used for implementing TTS interruption when user starts speaking
 */

export interface SpeechDetectorOptions {
  /** Threshold for voice detection (0-1, higher = louder required) */
  threshold?: number;
  /** How often to check for voice activity (ms) */
  sampleInterval?: number;
  /** Time of silence before considering speech ended (ms) */
  silenceTimeout?: number;
  /** Minimum speech duration to trigger detection (ms) */
  minSpeechDuration?: number;
}

export class SpeechDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private isListening = false;
  private checkInterval: NodeJS.Timer | null = null;
  private silenceTimer: NodeJS.Timer | null = null;
  private speechStartTime: number | null = null;
  
  // Configuration
  private threshold: number = 0.02; // Voice activity threshold
  private sampleInterval: number = 100; // Check every 100ms
  private silenceTimeout: number = 1000; // 1 second of silence ends speech
  private minSpeechDuration: number = 200; // Minimum 200ms to count as speech
  
  // Callbacks
  private onSpeechStart?: () => void;
  private onSpeechEnd?: () => void;
  private onActivityLevel?: (level: number) => void;
  
  constructor(options?: SpeechDetectorOptions) {
    if (options?.threshold !== undefined) this.threshold = options.threshold;
    if (options?.sampleInterval !== undefined) this.sampleInterval = options.sampleInterval;
    if (options?.silenceTimeout !== undefined) this.silenceTimeout = options.silenceTimeout;
    if (options?.minSpeechDuration !== undefined) this.minSpeechDuration = options.minSpeechDuration;
  }
  
  /**
   * Start listening for speech
   */
  async start(
    onSpeechStart?: () => void,
    onSpeechEnd?: () => void,
    onActivityLevel?: (level: number) => void
  ): Promise<void> {
    if (this.isListening) {
      console.warn("Speech detector already listening");
      return;
    }
    
    this.onSpeechStart = onSpeechStart;
    this.onSpeechEnd = onSpeechEnd;
    this.onActivityLevel = onActivityLevel;
    
    try {
      // Get microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      // Create audio context and analyser
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      
      // Connect microphone to analyser
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);
      
      // Start monitoring
      this.isListening = true;
      this.startMonitoring();
      
    } catch (error) {
      console.error("Failed to start speech detection:", error);
      this.cleanup();
      throw error;
    }
  }
  
  /**
   * Stop listening for speech
   */
  stop(): void {
    this.isListening = false;
    this.cleanup();
  }
  
  /**
   * Check if currently listening
   */
  get listening(): boolean {
    return this.isListening;
  }
  
  /**
   * Start monitoring audio levels
   */
  private startMonitoring(): void {
    if (!this.analyser) return;
    
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let isSpeaking = false;
    
    this.checkInterval = setInterval(() => {
      if (!this.analyser || !this.isListening) {
        if (this.checkInterval) {
          clearInterval(this.checkInterval);
          this.checkInterval = null;
        }
        return;
      }
      
      // Get frequency data
      this.analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume across relevant frequencies (human voice range)
      let sum = 0;
      const startFreq = 85; // ~300 Hz (human voice starts around here)
      const endFreq = 255; // ~1000 Hz (main voice frequencies)
      
      for (let i = startFreq; i < endFreq && i < bufferLength; i++) {
        sum += dataArray[i];
      }
      
      const average = sum / (endFreq - startFreq);
      const normalizedLevel = average / 255;
      
      // Report activity level
      if (this.onActivityLevel) {
        this.onActivityLevel(normalizedLevel);
      }
      
      // Check if this is speech
      const isVoiceDetected = normalizedLevel > this.threshold;
      
      if (isVoiceDetected && !isSpeaking) {
        // Speech started
        if (!this.speechStartTime) {
          this.speechStartTime = Date.now();
        }
        
        // Check if speech has been going for minimum duration
        if (Date.now() - this.speechStartTime >= this.minSpeechDuration) {
          isSpeaking = true;
          
          // Clear any pending silence timer
          if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
          }
          
          // Notify speech started
          if (this.onSpeechStart) {
            this.onSpeechStart();
          }
        }
      } else if (!isVoiceDetected && isSpeaking) {
        // Silence detected while speaking
        if (!this.silenceTimer) {
          this.silenceTimer = setTimeout(() => {
            // Speech ended
            isSpeaking = false;
            this.speechStartTime = null;
            this.silenceTimer = null;
            
            if (this.onSpeechEnd) {
              this.onSpeechEnd();
            }
          }, this.silenceTimeout);
        }
      } else if (!isVoiceDetected) {
        // Reset speech start time if we haven't reached minimum duration
        this.speechStartTime = null;
      }
      
    }, this.sampleInterval);
  }
  
  /**
   * Clean up resources
   */
  private cleanup(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }
    
    if (this.analyser) {
      this.analyser = null;
    }
    
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.speechStartTime = null;
  }
}