import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useAI } from "./useAI";
import { useChromeSpeechRecognition } from "./useChromeSpeechRecognition";
import { useCallSettings } from "@/stores/call-settings-store";

interface UseUnifiedSTTOptions {
  onTranscript?: (transcript: string) => void;
  onSilenceDetected?: () => void;
  silenceTimeout?: number;
}

export function useUnifiedSTT(options: UseUnifiedSTTOptions = {}) {
  const { onTranscript, onSilenceDetected, silenceTimeout = 2000 } = options;

  // Core hooks
  const { transcribe: aiTranscribe, hasSTT, sttSettings } = useAI();
  const { audioSettings } = useCallSettings();
  const chromeSpeech = useChromeSpeechRecognition();

  // State
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Refs for MediaRecorder approach
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioBlobPromiseRef = useRef<Promise<Blob> | null>(null);
  const audioBlobResolveRef = useRef<((blob: Blob) => void) | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

  // Determine which provider to use
  const shouldUseChrome = sttSettings.enabled &&
                         sttSettings.provider === 'built-in-chrome' &&
                         chromeSpeech.isSupported;

  // Start recording with MediaRecorder (for ElevenLabs/Whisper)
  const startMediaRecording = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: audioSettings.inputDeviceId
          ? {
              deviceId: { exact: audioSettings.inputDeviceId },
              noiseSuppression: audioSettings.noiseSuppression,
              echoCancellation: audioSettings.echoCancellation,
              autoGainControl: audioSettings.voiceActivityDetection,
            }
          : {
              noiseSuppression: audioSettings.noiseSuppression,
              echoCancellation: audioSettings.echoCancellation,
              autoGainControl: audioSettings.voiceActivityDetection,
            },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Apply volume adjustment
      if (audioSettings.inputVolume < 100) {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const gainNode = audioContext.createGain();
        gainNode.gain.value = audioSettings.inputVolume / 100;
        const destination = audioContext.createMediaStreamDestination();
        source.connect(gainNode);
        gainNode.connect(destination);
        streamRef.current = destination.stream;
      }

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Create a promise that will resolve when recording stops
      audioBlobPromiseRef.current = new Promise<Blob>((resolve) => {
        audioBlobResolveRef.current = resolve;
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (audioBlobResolveRef.current) {
          audioBlobResolveRef.current(blob);
        }
      };

      mediaRecorder.start(1000);
      setIsListening(true);
      recordingStartTimeRef.current = Date.now();
      return true;
    } catch (error) {
      console.error("Failed to start media recording:", error);
      toast.error("Failed to access microphone");
      return false;
    }
  }, [audioSettings]);

  // Stop MediaRecorder
  const stopMediaRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Start listening (unified interface)
  const startListening = useCallback(async () => {
    if (shouldUseChrome) {
      // Use Chrome Speech Recognition
      chromeSpeech.startListening(onSilenceDetected);
      setIsListening(true);
      setTranscript("");
    } else {
      // Use MediaRecorder for ElevenLabs/Whisper
      const started = await startMediaRecording();
      if (started) {
        setTranscript("");
      }
    }
  }, [shouldUseChrome, chromeSpeech, onSilenceDetected, startMediaRecording]);

  // Stop listening and get transcript
  const stopListening = useCallback(async (): Promise<string | null> => {
    if (shouldUseChrome) {
      // Chrome Speech Recognition - return current transcript
      const finalTranscript = chromeSpeech.fullTranscript;
      chromeSpeech.stopListening();
      setIsListening(false);
      setTranscript(finalTranscript);
      return finalTranscript;
    } else {
      // Check if we've been recording for at least 500ms to avoid empty blobs
      const recordingDuration = recordingStartTimeRef.current
        ? Date.now() - recordingStartTimeRef.current
        : 0;

      if (recordingDuration < 500) {
        // Too short, just stop without transcribing
        stopMediaRecording();
        setIsListening(false);
        recordingStartTimeRef.current = null;
        return null;
      }

      // MediaRecorder - stop and transcribe
      setIsProcessing(true);
      stopMediaRecording();

      if (audioBlobPromiseRef.current) {
        try {
          const blob = await audioBlobPromiseRef.current;

          // Check blob size to avoid sending empty audio
          if (blob.size < 1000) {
            console.warn("Audio blob too small, skipping transcription");
            setTranscript("");
            setIsProcessing(false);
            audioBlobPromiseRef.current = null;
            audioBlobResolveRef.current = null;
            recordingStartTimeRef.current = null;
            return null;
          }

          const transcribedText = await aiTranscribe(blob);
          setTranscript(transcribedText || "");
          setIsProcessing(false);
          audioBlobPromiseRef.current = null;
          audioBlobResolveRef.current = null;
          recordingStartTimeRef.current = null;
          return transcribedText;
        } catch (error) {
          console.error("Transcription failed:", error);
          toast.error("Failed to transcribe audio");
          setIsProcessing(false);
          recordingStartTimeRef.current = null;
          return null;
        }
      }

      setIsProcessing(false);
      recordingStartTimeRef.current = null;
      return null;
    }
  }, [shouldUseChrome, chromeSpeech, stopMediaRecording, aiTranscribe]);

  // Reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript("");
    if (shouldUseChrome) {
      chromeSpeech.resetTranscript();
    }
    chunksRef.current = [];
    recordingStartTimeRef.current = null;
  }, [shouldUseChrome, chromeSpeech]);

  // Get current transcript (live for Chrome, empty for MediaRecorder until stop)
  const getCurrentTranscript = useCallback(() => {
    if (shouldUseChrome) {
      return chromeSpeech.fullTranscript;
    }
    return transcript;
  }, [shouldUseChrome, chromeSpeech.fullTranscript, transcript]);

  // Cleanup on unmount ONLY
  useEffect(() => {
    return () => {
      // Use refs to check current state to avoid closure issues
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []); // Empty deps - only run on unmount

  return {
    // State
    isListening,
    isProcessing,
    transcript: getCurrentTranscript(),

    // Provider info
    provider: shouldUseChrome ? 'chrome' : sttSettings.provider,
    isRealtime: shouldUseChrome, // Chrome provides real-time transcription

    // Actions
    startListening,
    stopListening,
    resetTranscript,

    // Status
    isSupported: shouldUseChrome ? chromeSpeech.isSupported : hasSTT,
    error: shouldUseChrome ? chromeSpeech.error : null,
  };
}