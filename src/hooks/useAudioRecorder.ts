import { useState, useRef, useCallback, useEffect } from "react";
import { useAudioSettings } from "@/stores/ai-config-store";
import { audioResourceManager } from "@/lib/audio/audio-resource-manager";
import { AUDIO_CONFIG } from "@/lib/audio/audio-config";

interface UseAudioRecorderOptions {
  onDataAvailable?: (data: Float32Array) => void;
  autoStart?: boolean;
  deviceId?: string | null;
}

interface UseAudioRecorderReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  audioLevel: number;
  error: string | null;
  stream: MediaStream | null;
}

export function useAudioRecorder(options: UseAudioRecorderOptions = {}): UseAudioRecorderReturn {
  const { onDataAvailable, autoStart = false, deviceId } = options;
  const { audioSettings } = useAudioSettings();

  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderId = useRef<string>(`recorder-${Date.now()}`);
  const streamCacheKeyRef = useRef<string>("");

  // Cleanup function
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }

    if (streamRef.current && streamCacheKeyRef.current) {
      // Release stream through resource manager
      audioResourceManager.releaseMediaStream(streamCacheKeyRef.current);
      streamRef.current = null;
      streamCacheKeyRef.current = "";
      setStream(null);
    }

    if (audioContextRef.current) {
      audioResourceManager.releaseAudioContext();
      audioContextRef.current = null;
    }

    if (mediaRecorderRef.current) {
      audioResourceManager.releaseMediaRecorder(recorderId.current);
      mediaRecorderRef.current = null;
    }

    analyserRef.current = null;
    setIsRecording(false);
    setAudioLevel(0);
  }, []);

  // Audio level monitoring
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);

    const updateLevel = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getFloatTimeDomainData(dataArray);

      // Calculate RMS (root mean square) for better level indication
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / bufferLength);
      const level = Math.min(1, rms * AUDIO_CONFIG.RECORDING.RMS_SCALE_FACTOR); // Scale and clamp to 0-1

      setAudioLevel(level);

      // Call callback if provided
      if (onDataAvailable) {
        onDataAvailable(dataArray);
      }

      // Continue animation loop while recording
      if (mediaRecorderRef.current?.state === 'recording' && analyserRef.current) {
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      } else {
        // Stop animation and reset level
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = 0;
        }
        setAudioLevel(0);
      }
    };

    updateLevel();
  }, [onDataAvailable]);

  const startRecording = useCallback(async () => {
    try {
      cleanup(); // Clean up any existing recording
      setError(null);
      chunksRef.current = [];

      // Get user media with specified device or default
      const constraints: MediaStreamConstraints = {
        audio: deviceId ? {
          deviceId: { exact: deviceId },
          noiseSuppression: audioSettings.noiseSuppression,
          echoCancellation: audioSettings.echoCancellation,
          autoGainControl: audioSettings.voiceActivityDetection,
        } : {
          noiseSuppression: audioSettings.noiseSuppression,
          echoCancellation: audioSettings.echoCancellation,
          autoGainControl: audioSettings.voiceActivityDetection,
        }
      };

      // Get media stream through resource manager
      const cacheKey = `input-${deviceId || 'default'}`;
      const mediaStream = await audioResourceManager.getUserMedia(
        constraints,
        cacheKey
      );
      streamRef.current = mediaStream;
      streamCacheKeyRef.current = cacheKey;
      setStream(mediaStream);

      // Get shared audio context
      audioContextRef.current = await audioResourceManager.getAudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = AUDIO_CONFIG.RECORDING.FFT_SIZE;
      analyserRef.current.smoothingTimeConstant = AUDIO_CONFIG.RECORDING.SMOOTHING_TIME_CONSTANT;

      const source = audioContextRef.current.createMediaStreamSource(mediaStream);
      
      // Apply volume adjustment if needed
      if (audioSettings.inputVolume < 100) {
        const gainNode = audioContextRef.current.createGain();
        gainNode.gain.value = audioSettings.inputVolume / 100;
        source.connect(gainNode);
        gainNode.connect(analyserRef.current);
      } else {
        source.connect(analyserRef.current);
      }

      // Set up MediaRecorder through resource manager
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = audioResourceManager.createMediaRecorder(
        mediaStream,
        { mimeType },
        recorderId.current
      );
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        const error = event as ErrorEvent;
        setError(`Recording failed: ${error.message || 'Unknown error'}`);
        cleanup();
      };

      // Start recording
      recorder.start(AUDIO_CONFIG.RECORDING.CHUNK_INTERVAL_MS);
      setIsRecording(true);

      // Start monitoring audio levels
      monitorAudioLevel();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to start recording";
      setError(errorMessage);
      cleanup();
      throw err;
    }
  }, [audioSettings, deviceId, cleanup, monitorAudioLevel]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== "recording") {
      return null;
    }

    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current!;
      
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = chunksRef.current.length > 0 
          ? new Blob(chunksRef.current, { type: mimeType })
          : null;
        
        cleanup();
        resolve(blob);
      };

      recorder.stop();
    });
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Auto-start if requested
  useEffect(() => {
    if (autoStart && !isRecording) {
      startRecording().catch(error => {
        setError(error.message || "Failed to auto-start recording");
      });
    }
  }, [autoStart]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    audioLevel,
    error,
    stream,
  };
}