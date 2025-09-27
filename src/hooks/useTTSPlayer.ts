import { useCallback, useEffect, useRef } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
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
import { openAIApiKeyAtom } from "@/stores/ai-config-store";
import { extractTTSContent } from "@/lib/utils/extractTTSContent";
import { atomWithStorage } from "jotai/utils";
import { ttsManager } from "@/services/ai/tts-manager";

export function useTTSPlayer() {
  const { hasTTS, voiceSettings } = useAI();
  const openAIApiKey = useAtomValue(openAIApiKeyAtom);
  const currentMessageIdRef = useRef<string | null>(null);

  // State atoms
  const playbackRate = useAtomValue(ttsPlaybackRateAtom);
  const volume = useAtomValue(ttsVolumeAtom);
  const [autoPlayNext, setAutoPlayNext] = useAtom(ttsAutoPlayNextAtom);

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

  // Clean up on unmount
  useEffect(() => {
    return () => {
      ttsManager.cleanup();
    };
  }, []);

  // Note: Speech interruption has been removed from the TTS player.
  // Interruption should be handled at the application level (e.g., in CallView)
  // where VAD is already being used for STT, to avoid multiple VAD instances.

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
      ttsManager.stop();
      currentMessageIdRef.current = messageId;

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

        // Determine API key
        const apiKey = provider === "openai" ? openAIApiKey : voiceSettings.apiKey;

        if (!apiKey) {
          throw new Error(`${provider} API key required`);
        }

        // Use TTS manager for all playback
        await ttsManager.play(ttsContent, authorPubkey || messageId, {
          voiceId: _voiceId || voiceSettings.voiceIds?.[0] || "alloy",
          provider: provider || voiceSettings.provider,
          apiKey,
          playbackRate,
          volume,
          onProgress: (currentTime, duration) => {
            updateProgress(currentTime);
            if (!isNaN(duration) && duration > 0) {
              setDuration(duration);
            }
          },
          onError: (error) => {
            setError(error.message);
            setLoading(false);
            stopPlayback();
          },
          onEnd: () => {
            // Check if we should play next in queue
            if (autoPlayNext && queue.length > 0) {
              playNextInQueue();
            } else {
              stopPlayback();
            }
          },
        });

        setPlayingState({
          isPlaying: true,
          isPaused: false,
        });
        setLoading(false);
      } catch (error) {
        setError(error instanceof Error ? error.message : "TTS playback failed");
        setLoading(false);
        stopPlayback();
      }
    },
    [
      hasTTS,
      voiceSettings,
      openAIApiKey,
      playbackRate,
      volume,
      autoPlayNext,
      queue,
      setLoading,
      setError,
      setPlayingState,
      setDuration,
      updateProgress,
      stopPlayback,
      playNextInQueue,
    ]
  );

  const stop = useCallback(() => {
    ttsManager.stop();
    currentMessageIdRef.current = null;
    stopPlayback();
  }, [stopPlayback]);

  const pause = useCallback(() => {
    if (isPlaying) {
      ttsManager.pause();
      setPlayingState({
        isPlaying: false,
        isPaused: true,
      });
    }
  }, [isPlaying, setPlayingState]);

  const resume = useCallback(() => {
    if (isPaused) {
      ttsManager.resume();
      setPlayingState({
        isPlaying: true,
        isPaused: false,
      });
    }
  }, [isPaused, setPlayingState]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else if (isPaused) {
      resume();
    }
  }, [isPlaying, isPaused, pause, resume]);

  const seek = useCallback(
    (time: number) => {
      ttsManager.seek(time);
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
      ttsManager.setPlaybackRate(rate);
    },
    [setPlaybackRateAction]
  );

  const changeVolume = useCallback(
    (vol: number) => {
      setVolumeAction(vol);
      ttsManager.setVolume(vol);
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
    queueMessage,
    removeFromQueue,
    clearQueue,
  };
}