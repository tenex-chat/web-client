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
import { useSpeechInterruption } from "@/hooks/useSpeechInterruption";
import { atomWithStorage } from "jotai/utils";

// Setting for enabling speech interruption
const speechInterruptionEnabledAtom = atomWithStorage("tts-speech-interruption-enabled", true);

export function useTTSPlayer() {
  const { speak, hasTTS } = useAI();
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    };
  }, []);

  // Handle speech interruption
  const { isInterrupted: isSpeechDetected, shouldStop } = useSpeechInterruption(
    isPlaying,
    {
      enabled: speechInterruptionEnabled && hasTTS,
      stopThreshold: 2000, // Stop after 2 seconds of continuous speech
      resumeDelay: 500, // Resume after 500ms of silence
      sensitivity: 0.02, // Voice activity threshold
    },
    {
      onInterruptionStart: () => {
        // User started speaking - pause TTS
        setInterruptionState(true, "user_speaking");
        pausePlaybackAction();
      },
      onInterruptionEnd: () => {
        // User stopped speaking
        setInterruptionState(false, null);
      },
      onResume: () => {
        // Resume TTS playback
        if (!shouldStop) {
          resumePlaybackAction();
        }
      },
      onStop: () => {
        // User spoke too long - stop TTS completely
        stop();
      },
    }
  );

  const play = useCallback(
    async (
      content: string,
      messageId: string,
      authorPubkey?: string
    ) => {
      if (!hasTTS || !content) {
        console.warn("TTS not available or no content provided");
        return;
      }

      // Stop current playback if any
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }

      const ttsContent = extractTTSContent(content);
      if (!ttsContent) {
        console.warn("No TTS content extracted");
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

        // Get audio blob from AI service
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
            const nextItem = await playNextInQueue();
            if (nextItem) {
              await play(
                nextItem.content,
                nextItem.messageId,
                nextItem.authorPubkey
              );
            }
          } else {
            stopPlayback();
          }
        });

        audio.addEventListener("error", (e) => {
          console.error("Audio playback error:", e);
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
      } catch (error) {
        console.error("TTS playback failed:", error);
        setError(error instanceof Error ? error.message : "TTS playback failed");
        setLoading(false);
        stopPlayback();
      }
    },
    [
      hasTTS,
      speak,
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
    stopPlayback();
  }, [stopPlayback]);

  const pause = useCallback(() => {
    if (playerState.currentAudio && isPlaying) {
      playerState.currentAudio.pause();
      setPlayingState({
        isPlaying: false,
        isPaused: true,
      });
    }
  }, [playerState.currentAudio, isPlaying, setPlayingState]);

  const resume = useCallback(() => {
    if (playerState.currentAudio && isPaused) {
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
    },
    [setPlaybackRateAction]
  );

  const changeVolume = useCallback(
    (vol: number) => {
      setVolumeAction(vol);
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