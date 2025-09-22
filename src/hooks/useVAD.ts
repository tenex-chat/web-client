import { useState, useRef, useCallback, useEffect } from "react";
import { VADService } from "@/lib/audio/vad-service";
import { useAudioSettings } from "@/stores/ai-config-store";
import { AUDIO_CONFIG } from "@/lib/audio/audio-config";

interface UseVADOptions {
  enabled?: boolean;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onError?: (error: Error) => void;
  inputDeviceId?: string;
}

interface UseVADReturn {
  isActive: boolean;
  isListening: boolean;
  start: () => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  error: string | null;
}

export function useVAD(options: UseVADOptions = {}): UseVADReturn {
  const {
    enabled = true,
    onSpeechStart,
    onSpeechEnd,
    onError,
    inputDeviceId
  } = options;

  const { audioSettings } = useAudioSettings();
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const vadServiceRef = useRef<VADService | null>(null);
  const isPausedRef = useRef(false);

  const cleanup = useCallback(() => {
    if (vadServiceRef.current) {
      vadServiceRef.current.destroy();
      vadServiceRef.current = null;
    }
    setIsActive(false);
    setIsListening(false);
    isPausedRef.current = false;
  }, []);

  const initialize = useCallback(async () => {
    if (!enabled || vadServiceRef.current) return;

    try {
      const vadService = new VADService({
        onSpeechStart: () => {
          if (!isPausedRef.current) {
            setIsListening(true);
            onSpeechStart?.();
          }
        },
        onSpeechEnd: () => {
          setIsListening(false);
          onSpeechEnd?.();
        },
        onError: (err) => {
          console.error("VAD Error:", err);
          setError(err.message);
          onError?.(err);
          cleanup();
        },
        // Use optimized settings for natural speech from config
        positiveSpeechThreshold: AUDIO_CONFIG.VAD.POSITIVE_SPEECH_THRESHOLD,
        negativeSpeechThreshold: AUDIO_CONFIG.VAD.NEGATIVE_SPEECH_THRESHOLD,
        redemptionFrames: AUDIO_CONFIG.VAD.REDEMPTION_FRAMES,
        preSpeechPadFrames: AUDIO_CONFIG.VAD.PRE_SPEECH_PAD_FRAMES,
        minSpeechFrames: AUDIO_CONFIG.VAD.MIN_SPEECH_FRAMES,
      });

      vadServiceRef.current = vadService;
      await vadService.initialize(inputDeviceId || audioSettings?.inputDeviceId || undefined);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to initialize VAD";
      console.error("Failed to initialize VAD:", err);
      setError(errorMessage);
      cleanup();
    }
  }, [enabled, inputDeviceId, audioSettings?.inputDeviceId, onSpeechStart, onSpeechEnd, onError, cleanup]);

  const start = useCallback(async () => {
    if (!enabled) {
      setError("VAD is disabled");
      return;
    }

    if (!vadServiceRef.current) {
      await initialize();
    }

    if (vadServiceRef.current) {
      try {
        await vadServiceRef.current.start();
        setIsActive(true);
        setError(null);
        isPausedRef.current = false;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to start VAD";
        console.error("Failed to start VAD:", err);
        setError(errorMessage);
      }
    }
  }, [enabled, initialize]);

  const stop = useCallback(() => {
    if (vadServiceRef.current) {
      vadServiceRef.current.pause(); // Pause the VAD service
    }
    setIsActive(false);
    setIsListening(false);
    isPausedRef.current = false;
  }, []);

  const pause = useCallback(() => {
    if (vadServiceRef.current && isActive) {
      vadServiceRef.current.pause();
      isPausedRef.current = true;
      setIsListening(false);
    }
  }, [isActive]);

  const resume = useCallback(() => {
    if (vadServiceRef.current && isActive && isPausedRef.current) {
      vadServiceRef.current.resume();
      isPausedRef.current = false;
    }
  }, [isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Re-initialize if device changes
  useEffect(() => {
    if (enabled && isActive && vadServiceRef.current) {
      cleanup();
      initialize().then(() => {
        if (vadServiceRef.current) {
          vadServiceRef.current.start();
          setIsActive(true);
        }
      });
    }
  }, [inputDeviceId, audioSettings?.inputDeviceId]);

  return {
    isActive,
    isListening,
    start,
    stop,
    pause,
    resume,
    error,
  };
}