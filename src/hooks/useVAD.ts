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
    console.log(`[${performance.now().toFixed(2)}ms] [useVAD] cleanup() called`);
    if (vadServiceRef.current) {
      console.log(`[${performance.now().toFixed(2)}ms] [useVAD] Destroying VAD service`);
      vadServiceRef.current.destroy();
      vadServiceRef.current = null;
    }
    setIsActive(false);
    setIsListening(false);
    isPausedRef.current = false;
    console.log(`[${performance.now().toFixed(2)}ms] [useVAD] cleanup() complete`);
  }, []);

  const createVADCallbacks = useCallback(() => ({
    onSpeechStart: () => {
      const now = performance.now();
      console.log(`[${now.toFixed(2)}ms] [useVAD] onSpeechStart - isPaused:`, isPausedRef.current);
      if (!isPausedRef.current) {
        setIsListening(true);
        console.log(`[${now.toFixed(2)}ms] [useVAD] Calling user onSpeechStart callback`);
        onSpeechStart?.();
      }
    },
    onSpeechEnd: () => {
      const now = performance.now();
      console.log(`[${now.toFixed(2)}ms] [useVAD] onSpeechEnd`);
      setIsListening(false);
      console.log(`[${now.toFixed(2)}ms] [useVAD] Calling user onSpeechEnd callback`);
      onSpeechEnd?.();
    },
    onError: (err: Error) => {
      setError(err.message);
      onError?.(err);
      cleanup();
    }
  }), [onSpeechStart, onSpeechEnd, onError, cleanup]);

  const getVADSettings = useCallback(() => ({
    positiveSpeechThreshold: AUDIO_CONFIG.VAD.POSITIVE_SPEECH_THRESHOLD,
    negativeSpeechThreshold: AUDIO_CONFIG.VAD.NEGATIVE_SPEECH_THRESHOLD,
    redemptionFrames: AUDIO_CONFIG.VAD.REDEMPTION_FRAMES,
    preSpeechPadFrames: AUDIO_CONFIG.VAD.PRE_SPEECH_PAD_FRAMES,
    minSpeechFrames: AUDIO_CONFIG.VAD.MIN_SPEECH_FRAMES,
  }), []);

  const initialize = useCallback(async () => {
    console.log(`[${performance.now().toFixed(2)}ms] [useVAD] initialize() called - enabled:`, enabled, 'hasService:', !!vadServiceRef.current);
    if (!enabled || vadServiceRef.current) return;

    try {
      const callbacks = createVADCallbacks();
      const settings = getVADSettings();
      
      const vadService = new VADService({
        ...callbacks,
        ...settings
      });

      vadServiceRef.current = vadService;
      
      const deviceId = inputDeviceId || audioSettings?.inputDeviceId || undefined;
      await vadService.initialize(deviceId);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to initialize VAD";
      setError(errorMessage);
      cleanup();
    }
  }, [enabled, inputDeviceId, audioSettings?.inputDeviceId, createVADCallbacks, getVADSettings, cleanup]);

  const start = useCallback(async () => {
    console.log(`[${performance.now().toFixed(2)}ms] [useVAD] start() called - enabled:`, enabled, 'hasService:', !!vadServiceRef.current);
    if (!enabled) {
      setError("VAD is disabled");
      return;
    }

    if (!vadServiceRef.current) {
      console.log(`[${performance.now().toFixed(2)}ms] [useVAD] No VAD service, initializing...`);
      await initialize();
    }

    if (vadServiceRef.current) {
      try {
        console.log(`[${performance.now().toFixed(2)}ms] [useVAD] Starting VAD service`);
        await vadServiceRef.current.start();
        setIsActive(true);
        setError(null);
        isPausedRef.current = false;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to start VAD";
        setError(errorMessage);
      }
    }
  }, [enabled, initialize]);

  const stop = useCallback(() => {
    console.log(`[${performance.now().toFixed(2)}ms] [useVAD] stop() called`);
    if (vadServiceRef.current) {
      console.log(`[${performance.now().toFixed(2)}ms] [useVAD] Destroying VAD service from stop()`);
      vadServiceRef.current.destroy(); // Fully destroy the VAD service to release microphone
      vadServiceRef.current = null;
    }
    setIsActive(false);
    setIsListening(false);
    isPausedRef.current = false;
    console.log(`[${performance.now().toFixed(2)}ms] [useVAD] stop() complete`);
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
  }, [/* effect dep */ inputDeviceId, audioSettings?.inputDeviceId, enabled, isActive, cleanup, initialize]);

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