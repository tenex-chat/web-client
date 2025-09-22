import { useCallback, useEffect, useRef } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  ttsPlayerStateAtom,
  ttsPlaybackRateAtom,
  ttsVolumeAtom,
  ttsAutoPlayNextAtom,
  isPlayingAtom,
  isPausedAtom,
  currentMessageIdAtom,
  currentTimeAtom,
  durationAtom,
  queueAtom,
  isLoadingAtom,
  errorAtom,
  progressPercentageAtom,
  currentContentAtom,
  isInterruptedAtom,
  interruptionReasonAtom,
  setLoadingAtom,
  setErrorAtom,
  updateProgressAtom,
  setDurationAtom,
  setCurrentAudioAtom,
  setPlayingStateAtom,
  addToQueueAtom,
  removeFromQueueAtom,
  clearQueueAtom,
  stopPlaybackAtom,
  seekToAtom,
  skipForwardAtom,
  skipBackwardAtom,
  setPlaybackRateAtom,
  setVolumeAtom,
  playNextInQueueAtom,
  setInterruptionStateAtom,
  pausePlaybackAtom,
  resumePlaybackAtom,
  type QueueItem,
} from "@/stores/tts-player-store";
import { useAI } from "@/hooks/useAI";
import { extractTTSContent } from "@/lib/utils/extractTTSContent";
import { useVAD } from "@/hooks/useVAD";
import { atomWithStorage } from "jotai/utils";
import { StreamingTTSPlayer } from "@/lib/audio/streaming-tts-player";
import { AUDIO_CONFIG } from "@/lib/audio/audio-config";

// Setting for enabling speech interruption
const speechInterruptionEnabledAtom = atomWithStorage("tts-speech-interruption-enabled", true);

export function useTTSPlayer() {
  const { speak, streamSpeak, hasTTS } = useAI();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamingPlayerRef = useRef<StreamingTTSPlayer | null>(null);

  // State atoms
  const playerState = useAtomValue(ttsPlayerStateAtom);
  const playbackRate = useAtomValue(ttsPlaybackRateAtom);
  const volume = useAtomValue(ttsVolumeAtom);
  const [autoPlayNext, setAutoPlayNext] = useAtom(ttsAutoPlayNextAtom);
  const [speechInterruptionEnabled, setSpeechInterruptionEnabled] = useAtom(speechInterruptionEnabledAtom);

  // Read-only atoms
  const isPlaying = useAtomValue(isPlayingAtom);
  const isPaused = useAtomValue(isPausedAtom);
  const currentMessageId = useAtomValue(currentMessageIdAtom);
  const currentTime = useAtomValue(currentTimeAtom);
  const duration = useAtomValue(durationAtom);
  const queue = useAtomValue(queueAtom);
  const isLoading = useAtomValue(isLoadingAtom);
  const error = useAtomValue(errorAtom);
  const progressPercentage = useAtomValue(progressPercentageAtom);
  const currentContent = useAtomValue(currentContentAtom);
  const isInterrupted = useAtomValue(isInterruptedAtom);
  const interruptionReason = useAtomValue(interruptionReasonAtom);

  // Action atoms
  const setLoading = useSetAtom(setLoadingAtom);
  const setError = useSetAtom(setErrorAtom);
  const updateProgress = useSetAtom(updateProgressAtom);
  const setDuration = useSetAtom(setDurationAtom);
  const setCurrentAudio = useSetAtom(setCurrentAudioAtom);
  const setPlayingState = useSetAtom(setPlayingStateAtom);
  const addToQueue = useSetAtom(addToQueueAtom);
  const removeFromQueue = useSetAtom(removeFromQueueAtom);
  const clearQueue = useSetAtom(clearQueueAtom);
  const stopPlayback = useSetAtom(stopPlaybackAtom);
  const seekTo = useSetAtom(seekToAtom);
  const skipForward = useSetAtom(skipForwardAtom);
  const skipBackward = useSetAtom(skipBackwardAtom);
  const setPlaybackRateAction = useSetAtom(setPlaybackRateAtom);
  const setVolumeAction = useSetAtom(setVolumeAtom);
  const playNextInQueue = useSetAtom(playNextInQueueAtom);
  const setInterruptionState = useSetAtom(setInterruptionStateAtom);
  const pausePlaybackAction = useSetAtom(pausePlaybackAtom);
  const resumePlaybackAction = useSetAtom(resumePlaybackAtom);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      if (streamingPlayerRef.current) {
        streamingPlayerRef.current.stop();
        streamingPlayerRef.current = null;
      }
    };
  }, []);

  // Handle speech interruption using VAD
  const speechStartTimeRef = useRef<number | null>(null);
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const vad = useVAD({
    enabled: speechInterruptionEnabled && hasTTS && isPlaying,
    onSpeechStart: () => {
      // User started speaking - pause TTS
      speechStartTimeRef.current = Date.now();
      setInterruptionState(true, "user_speaking");
      pausePlaybackAction();
      
      // Clear any pending resume timer
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = null;
      }
    },
    onSpeechEnd: () => {
      // User stopped speaking
      setInterruptionState(false, null);
      
      const speechDuration = speechStartTimeRef.current 
        ? Date.now() - speechStartTimeRef.current 
        : 0;
      
      // If user spoke for too long, stop TTS completely
      if (speechDuration >= AUDIO_CONFIG.INTERRUPTION.STOP_THRESHOLD_MS) {
        stop();
      } else {
        // Otherwise, resume after delay
        resumeTimerRef.current = setTimeout(() => {
          resumePlaybackAction();
        }, AUDIO_CONFIG.INTERRUPTION.RESUME_DELAY_MS);
      }
      
      speechStartTimeRef.current = null;
    },
  });
  
  // Start/stop VAD based on playback state
  useEffect(() => {
    if (speechInterruptionEnabled && hasTTS && isPlaying) {
      vad.start();
    } else {
      vad.pause();
    }
    
    return () => {
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = null;
      }
    };
  }, [speechInterruptionEnabled, hasTTS, isPlaying, vad]);

  const play = useCallback(
    async (
      content: string,
      messageId: string,
      authorPubkey?: string,
      _voiceId?: string,
      provider?: "openai" | "elevenlabs"
    ) => {
      if (!hasTTS || !content) {
        return;
      }

      // Stop current playback if any
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      if (streamingPlayerRef.current) {
        streamingPlayerRef.current.stop();
        streamingPlayerRef.current = null;
      }

      const ttsContent = extractTTSContent(content);
      if (!ttsContent) {
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setPlayingState({
          currentMessageId: messageId,
          currentContent: ttsContent,
          isPlaying: false,
          isPaused: false,
          currentTime: 0,
          duration: 0,
        });

        // Use streaming for ElevenLabs, regular speak for OpenAI
        if (provider === "elevenlabs") {
          // Initialize streaming player
          const streamingPlayer = new StreamingTTSPlayer();
          streamingPlayerRef.current = streamingPlayer;

          // Apply current settings
          streamingPlayer.setPlaybackRate(playbackRate);
          streamingPlayer.setVolume(volume);

          // Track playback time updates
          const updateInterval = setInterval(() => {
            if (streamingPlayer.playing) {
              updateProgress(streamingPlayer.getCurrentTime());
              const duration = streamingPlayer.getDuration();
              if (!isNaN(duration) && duration > 0) {
                setDuration(duration);
              }
            }
          }, AUDIO_CONFIG.STREAMING.PROGRESS_UPDATE_INTERVAL_MS);

          // Set up event listener for when playback ends
          streamingPlayer.onEnded(() => {
            // Cleanup interval
            clearInterval(updateInterval);
            
            // Check if we should play next in queue
            if (autoPlayNext && queue.length > 0) {
              playNextInQueue();
            } else {
              stopPlayback();
            }
          });

          let firstChunkReceived = false;

          // Start streaming with chunk callback
          await streamSpeak(
            ttsContent,
            authorPubkey || messageId,
            async (chunk) => {
              // Add chunk to player for immediate playback
              await streamingPlayer.addChunk(chunk);
              
              if (!firstChunkReceived) {
                firstChunkReceived = true;
                setPlayingState({
                  isPlaying: true,
                  isPaused: false,
                });
                setLoading(false);
              }
            }
          );

          // Signal end of stream
          await streamingPlayer.endStream();

        } else {
          // Fallback to non-streaming for OpenAI or other providers
          const audioBlob = await speak(ttsContent, authorPubkey || messageId);
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);

          // Apply current settings
          audio.playbackRate = playbackRate;
          audio.volume = volume;

          // Set up event listeners
          audio.addEventListener("loadedmetadata", () => {
            setDuration(audio.duration);
          });

          audio.addEventListener("timeupdate", () => {
            updateProgress(audio.currentTime);
          });

          audio.addEventListener("ended", async () => {
            URL.revokeObjectURL(audioUrl);

            // Check if we should play next in queue
            if (autoPlayNext && queue.length > 0) {
              playNextInQueue();
            } else {
              stopPlayback();
            }
          });

          audio.addEventListener("error", (e) => {
            setError("Playback failed");
            URL.revokeObjectURL(audioUrl);
            stopPlayback();
          });

          // Store reference and start playback
          audioRef.current = audio;
          setCurrentAudio(audio);
          await audio.play();

          setPlayingState({
            isPlaying: true,
            isPaused: false,
          });
          setLoading(false);
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : "TTS playback failed");
        setLoading(false);
        stopPlayback();
      }
    },
    [
      hasTTS,
      speak,
      streamSpeak,
      playbackRate,
      volume,
      autoPlayNext,
      queue,
      setLoading,
      setError,
      setPlayingState,
      setDuration,
      updateProgress,
      setCurrentAudio,
      stopPlayback,
      playNextInQueue,
    ]
  );

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (streamingPlayerRef.current) {
      streamingPlayerRef.current.stop();
      streamingPlayerRef.current = null;
    }
    stopPlayback();
  }, [stopPlayback]);

  const pause = useCallback(() => {
    if (streamingPlayerRef.current && isPlaying) {
      streamingPlayerRef.current.pause();
      setPlayingState({
        isPlaying: false,
        isPaused: true,
      });
    } else if (playerState.currentAudio && isPlaying) {
      playerState.currentAudio.pause();
      setPlayingState({
        isPlaying: false,
        isPaused: true,
      });
    }
  }, [playerState.currentAudio, isPlaying, setPlayingState]);

  const resume = useCallback(() => {
    if (streamingPlayerRef.current && isPaused) {
      streamingPlayerRef.current.resume();
      setPlayingState({
        isPlaying: true,
        isPaused: false,
      });
    } else if (playerState.currentAudio && isPaused) {
      playerState.currentAudio.play();
      setPlayingState({
        isPlaying: true,
        isPaused: false,
      });
    }
  }, [playerState.currentAudio, isPaused, setPlayingState]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else if (isPaused) {
      resume();
    }
  }, [isPlaying, isPaused, pause, resume]);

  const seek = useCallback(
    (time: number) => {
      seekTo(time);
    },
    [seekTo]
  );

  const skipForwardHandler = useCallback(
    (seconds?: number) => {
      skipForward(seconds);
    },
    [skipForward]
  );

  const skipBackwardHandler = useCallback(
    (seconds?: number) => {
      skipBackward(seconds);
    },
    [skipBackward]
  );

  const changePlaybackRate = useCallback(
    (rate: number) => {
      setPlaybackRateAction(rate);
      // Update streaming player if active
      if (streamingPlayerRef.current) {
        streamingPlayerRef.current.setPlaybackRate(rate);
      }
    },
    [setPlaybackRateAction]
  );

  const changeVolume = useCallback(
    (vol: number) => {
      setVolumeAction(vol);
      // Update streaming player if active
      if (streamingPlayerRef.current) {
        streamingPlayerRef.current.setVolume(vol);
      }
    },
    [setVolumeAction]
  );

  const queueMessage = useCallback(
    (item: Omit<QueueItem, "id">) => {
      const queueItem: QueueItem = {
        ...item,
        id: `${item.messageId}-${Date.now()}`,
      };
      addToQueue(queueItem);
    },
    [addToQueue]
  );

  return {
    // State
    isPlaying,
    isPaused,
    currentMessageId,
    currentTime,
    duration,
    queue,
    isLoading,
    error,
    progressPercentage,
    currentContent,
    playbackRate,
    volume,
    autoPlayNext,
    hasTTS,
    isInterrupted,
    interruptionReason,
    speechInterruptionEnabled,

    // Actions
    play,
    stop,
    pause,
    resume,
    togglePlayPause,
    seek,
    skipForward: skipForwardHandler,
    skipBackward: skipBackwardHandler,
    setPlaybackRate: changePlaybackRate,
    setVolume: changeVolume,
    setAutoPlayNext,
    setSpeechInterruptionEnabled,
    queueMessage,
    removeFromQueue,
    clearQueue,
  };
}