declare module "@ricky0123/vad-web" {
  export interface VADOptions {
    onSpeechStart?: () => void;
    onSpeechEnd?: (audio: Float32Array) => void;
    onVADMisfire?: () => void;
    positiveSpeechThreshold?: number;
    negativeSpeechThreshold?: number;
    redemptionMs?: number;
    preSpeechPadMs?: number;
    minSpeechMs?: number;
    stream?: MediaStream;
  }

  export interface MicVADInstance {
    start(): Promise<void>;
    pause(): void;
    destroy(): void;
  }

  export class MicVAD {
    static new(options: VADOptions): Promise<MicVADInstance>;
  }
}