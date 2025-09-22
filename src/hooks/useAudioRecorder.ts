import { useState, useRef, useCallback, useEffect } from "react";
import { useAudioSettings } from "@/stores/ai-config-store";

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

  // Cleanup function
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStream(null);
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    analyserRef.current = null;
    setIsRecording(false);
    setAudioLevel(0);
  }, []);

  // Audio level monitoring
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current || !isRecording) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    
    const updateLevel = () => {
      if (!analyserRef.current || !isRecording) return;

      analyserRef.current.getFloatTimeDomainData(dataArray);
      
      // Calculate RMS (root mean square) for better level indication
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / bufferLength);
      const level = Math.min(1, rms * 5); // Scale and clamp to 0-1
      
      setAudioLevel(level);
      
      // Call callback if provided
      if (onDataAvailable) {
        onDataAvailable(dataArray);
      }

      if (isRecording) {
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      }
    };

    updateLevel();
  }, [isRecording, onDataAvailable]);

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

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;
      setStream(mediaStream);

      // Set up audio analysis
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;

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

      // Set up MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(mediaStream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setError("Recording failed");
        cleanup();
      };

      // Start recording
      recorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      monitorAudioLevel();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to start recording";
      console.error("Failed to start recording:", err);
      setError(errorMessage);
      cleanup();
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
      startRecording();
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