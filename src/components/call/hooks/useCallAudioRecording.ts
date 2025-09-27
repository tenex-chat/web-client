import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useAI } from "@/hooks/useAI";

interface UseCallAudioRecordingOptions {
  enabled: boolean;
  onTranscriptionComplete?: (text: string) => void;
  onTranscriptionStart?: () => void;
  onTranscriptionError?: (error: Error) => void;
}

interface UseCallAudioRecordingReturn {
  isRecording: boolean;
  isProcessing: boolean;
  transcript: string;
  audioLevel: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  clearTranscript: () => void;
}

export function useCallAudioRecording({
  enabled,
  onTranscriptionComplete,
  onTranscriptionStart,
  onTranscriptionError
}: UseCallAudioRecordingOptions): UseCallAudioRecordingReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const processingRef = useRef(false);
  
  const audioRecorder = useAudioRecorder();
  const { sttSettings, transcribe } = useAI();

  const clearTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  const startRecording = useCallback(async () => {
    const now = performance.now();
    console.log(`[${now.toFixed(2)}ms] [useCallAudioRecording] startRecording called`);
    if (!enabled || audioRecorder.isRecording || isProcessing) {
      console.log(`[${now.toFixed(2)}ms] [useCallAudioRecording] Recording skipped: enabled=${enabled}, isRecording=${audioRecorder.isRecording}, isProcessing=${isProcessing}`);
      return;
    }

    console.log(`[${now.toFixed(2)}ms] [useCallAudioRecording] Starting recording: provider=${sttSettings.provider}, enabled=${sttSettings.enabled}`);
    setTranscript('');
    await audioRecorder.startRecording();
    console.log(`[${performance.now().toFixed(2)}ms] [useCallAudioRecording] Recording started successfully`);
  }, [enabled, audioRecorder, isProcessing, sttSettings]);

  const processAudioBlob = async (blob: Blob): Promise<string | null> => {
    if (blob.size < 1000) {
      console.warn(`Audio too small: ${blob.size} bytes`);
      return null;
    }

    try {
      console.log(`Transcribing audio: size=${blob.size}, type=${blob.type}`);
      const text = await transcribe(blob);
      console.log(`Transcription result: "${text}"`);
      return text?.trim() || null;
    } catch (error) {
      console.error("Transcription failed:", error);
      throw error;
    }
  };

  const stopRecording = useCallback(async (): Promise<string | null> => {
    const now = performance.now();
    console.log(`[${now.toFixed(2)}ms] [useCallAudioRecording] stopRecording called`);
    if (!audioRecorder.isRecording || processingRef.current) {
      console.log(`[${now.toFixed(2)}ms] [useCallAudioRecording] Stop recording skipped: isRecording=${audioRecorder.isRecording}, processing=${processingRef.current}`);
      return null;
    }

    console.log(`[${now.toFixed(2)}ms] [useCallAudioRecording] Setting processing to true`);
    processingRef.current = true;
    setIsProcessing(true);
    onTranscriptionStart?.();

    try {
      const blob = await audioRecorder.stopRecording();
      
      if (!blob || !sttSettings.enabled) {
        return null;
      }

      const transcribedText = await processAudioBlob(blob);
      
      if (transcribedText) {
        setTranscript(transcribedText);
        onTranscriptionComplete?.(transcribedText);
      }
      
      return transcribedText;
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Transcription failed");
      console.error("Failed to process recording:", err);
      toast.error("Failed to transcribe audio");
      onTranscriptionError?.(err);
      return null;
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [audioRecorder, sttSettings.enabled, transcribe, onTranscriptionComplete, onTranscriptionStart, onTranscriptionError]);

  // Create a ref to access current audioRecorder in cleanup
  const audioRecorderRef = useRef(audioRecorder);
  useEffect(() => {
    audioRecorderRef.current = audioRecorder;
  }, [audioRecorder]);

  // Cleanup on unmount - ensure recording stops if component unmounts while recording
  useEffect(() => {
    return () => {
      if (audioRecorderRef.current.isRecording) {
        console.log(`[${performance.now().toFixed(2)}ms] [useCallAudioRecording] Component ACTUALLY unmounting - stopping recording`);
        audioRecorderRef.current.stopRecording().catch(err => {
          console.error('[useCallAudioRecording] Error stopping recording on unmount:', err);
        });
      }
    };
  }, []); // Empty deps - only cleanup on actual unmount

  return {
    isRecording: audioRecorder.isRecording,
    isProcessing,
    transcript,
    audioLevel: audioRecorder.audioLevel,
    startRecording,
    stopRecording,
    clearTranscript
  };
}