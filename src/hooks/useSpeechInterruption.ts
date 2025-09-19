import { useEffect, useRef, useCallback, useState } from "react";
import { SpeechDetector } from "@/lib/audio/speech-detector";
import { logger } from "@/lib/logger";

export interface SpeechInterruptionOptions {
  /** Time of continuous speech before stopping TTS completely (ms) */
  stopThreshold?: number;
  /** Time to wait after speech ends before resuming (ms) */
  resumeDelay?: number;
  /** Enable/disable the feature */
  enabled?: boolean;
  /** Voice activity threshold (0-1) */
  sensitivity?: number;
}

interface SpeechInterruptionCallbacks {
  onInterruptionStart?: () => void;
  onInterruptionEnd?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  onActivityLevel?: (level: number) => void;
}

export function useSpeechInterruption(
  isPlaying: boolean,
  options?: SpeechInterruptionOptions,
  callbacks?: SpeechInterruptionCallbacks
) {
  const [isInterrupted, setIsInterrupted] = useState(false);
  const [shouldStop, setShouldStop] = useState(false);
  const [activityLevel, setActivityLevel] = useState(0);
  const [isListening, setIsListening] = useState(false);
  
  const detectorRef = useRef<SpeechDetector | null>(null);
  const speechStartTimeRef = useRef<number | null>(null);
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stopTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Default options
  const stopThreshold = options?.stopThreshold ?? 2000; // Stop after 2 seconds of continuous speech
  const resumeDelay = options?.resumeDelay ?? 500; // Resume 500ms after speech ends
  const enabled = options?.enabled ?? true;
  const sensitivity = options?.sensitivity ?? 0.02;
  
  // Clean up timers
  const clearTimers = useCallback(() => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }, []);
  
  // Handle speech start
  const handleSpeechStart = useCallback(() => {
    logger.info("Speech interruption: User started speaking");
    
    // Clear any pending resume timer
    clearTimers();
    
    // Mark interruption start time
    speechStartTimeRef.current = Date.now();
    setIsInterrupted(true);
    setShouldStop(false);
    
    // Notify interruption started
    if (callbacks?.onInterruptionStart) {
      callbacks.onInterruptionStart();
    }
    
    // Set timer to stop completely after threshold
    stopTimerRef.current = setTimeout(() => {
      logger.info("Speech interruption: Stopping TTS (user spoke too long)");
      setShouldStop(true);
      
      if (callbacks?.onStop) {
        callbacks.onStop();
      }
    }, stopThreshold);
    
  }, [callbacks, clearTimers, stopThreshold]);
  
  // Handle speech end
  const handleSpeechEnd = useCallback(() => {
    logger.info("Speech interruption: User stopped speaking");
    
    // Clear stop timer since user stopped speaking
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    
    const speechDuration = speechStartTimeRef.current 
      ? Date.now() - speechStartTimeRef.current 
      : 0;
    
    // If user spoke for less than the stop threshold, plan to resume
    if (speechDuration < stopThreshold && !shouldStop) {
      logger.info(`Speech interruption: Planning to resume in ${resumeDelay}ms`);
      
      resumeTimerRef.current = setTimeout(() => {
        logger.info("Speech interruption: Resuming TTS");
        setIsInterrupted(false);
        
        if (callbacks?.onResume) {
          callbacks.onResume();
        }
        
        if (callbacks?.onInterruptionEnd) {
          callbacks.onInterruptionEnd();
        }
      }, resumeDelay);
    } else {
      // User spoke too long, don't resume
      logger.info("Speech interruption: Not resuming (user spoke too long)");
      setIsInterrupted(false);
      
      if (callbacks?.onInterruptionEnd) {
        callbacks.onInterruptionEnd();
      }
    }
    
    speechStartTimeRef.current = null;
    
  }, [callbacks, resumeDelay, shouldStop, stopThreshold]);
  
  // Handle activity level updates
  const handleActivityLevel = useCallback((level: number) => {
    setActivityLevel(level);
    if (callbacks?.onActivityLevel) {
      callbacks.onActivityLevel(level);
    }
  }, [callbacks]);
  
  // Start/stop speech detection based on TTS playback state
  useEffect(() => {
    if (!enabled) {
      return;
    }
    
    if (isPlaying && !detectorRef.current) {
      // Start speech detection
      logger.info("Starting speech detection for TTS interruption");
      
      detectorRef.current = new SpeechDetector({
        threshold: sensitivity,
        sampleInterval: 100,
        silenceTimeout: 800,
        minSpeechDuration: 200,
      });
      
      detectorRef.current.start(
        handleSpeechStart,
        handleSpeechEnd,
        handleActivityLevel
      ).then(() => {
        setIsListening(true);
        logger.info("Speech detection started successfully");
      }).catch((error) => {
        logger.error("Failed to start speech detection:", error);
        // Don't break TTS playback if speech detection fails
        // This might happen if mic permissions are denied
      });
      
    } else if (!isPlaying && detectorRef.current) {
      // Stop speech detection
      logger.info("Stopping speech detection");
      
      detectorRef.current.stop();
      detectorRef.current = null;
      setIsListening(false);
      setIsInterrupted(false);
      setShouldStop(false);
      clearTimers();
      speechStartTimeRef.current = null;
    }
    
    // Cleanup on unmount
    return () => {
      if (detectorRef.current) {
        detectorRef.current.stop();
        detectorRef.current = null;
      }
      clearTimers();
    };
    
  }, [isPlaying, enabled, sensitivity, handleSpeechStart, handleSpeechEnd, handleActivityLevel, clearTimers]);
  
  return {
    isInterrupted,
    shouldStop,
    activityLevel,
    isListening,
  };
}