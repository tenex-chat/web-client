import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export interface QueueItem {
  id: string;
  content: string;
  messageId: string;
  authorPubkey: string;
  voiceId?: string;
  voiceProvider?: string;
}

interface TTSPlayerState {
  currentAudio: HTMLAudioElement | null;
  isPlaying: boolean;
  isPaused: boolean;
  currentMessageId: string | null;
  currentContent: string | null;
  queue: QueueItem[];
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string | null;
  isInterrupted: boolean;
  interruptionReason: "user_speaking" | null;
}

// Persistent settings
export const ttsPlaybackRateAtom = atomWithStorage("tts-playback-rate", 1.0);
export const ttsVolumeAtom = atomWithStorage("tts-volume", 1.0);
export const ttsAutoPlayNextAtom = atomWithStorage("tts-auto-play-next", false);

// Player state
const initialState: TTSPlayerState = {
  currentAudio: null,
  isPlaying: false,
  isPaused: false,
  currentMessageId: null,
  currentContent: null,
  queue: [],
  currentTime: 0,
  duration: 0,
  isLoading: false,
  error: null,
  isInterrupted: false,
  interruptionReason: null,
};

export const ttsPlayerStateAtom = atom<TTSPlayerState>(initialState);

// Computed atoms
export const isPlayingAtom = atom((get) => get(ttsPlayerStateAtom).isPlaying);
export const isPausedAtom = atom((get) => get(ttsPlayerStateAtom).isPaused);
export const currentMessageIdAtom = atom((get) => get(ttsPlayerStateAtom).currentMessageId);
export const currentTimeAtom = atom((get) => get(ttsPlayerStateAtom).currentTime);
export const durationAtom = atom((get) => get(ttsPlayerStateAtom).duration);
export const queueAtom = atom((get) => get(ttsPlayerStateAtom).queue);
export const isLoadingAtom = atom((get) => get(ttsPlayerStateAtom).isLoading);
export const errorAtom = atom((get) => get(ttsPlayerStateAtom).error);
export const currentContentAtom = atom((get) => get(ttsPlayerStateAtom).currentContent);
export const isInterruptedAtom = atom((get) => get(ttsPlayerStateAtom).isInterrupted);
export const interruptionReasonAtom = atom((get) => get(ttsPlayerStateAtom).interruptionReason);

// Progress percentage (0-100)
export const progressPercentageAtom = atom((get) => {
  const duration = get(durationAtom);
  const currentTime = get(currentTimeAtom);
  if (!duration || duration === 0) return 0;
  return (currentTime / duration) * 100;
});

// Action atoms
export const setLoadingAtom = atom(null, (_get, set, isLoading: boolean) => {
  set(ttsPlayerStateAtom, (prev) => ({ ...prev, isLoading }));
});

export const setErrorAtom = atom(null, (_get, set, error: string | null) => {
  set(ttsPlayerStateAtom, (prev) => ({ ...prev, error }));
});

export const updateProgressAtom = atom(null, (_get, set, currentTime: number) => {
  set(ttsPlayerStateAtom, (prev) => ({ ...prev, currentTime }));
});

export const setDurationAtom = atom(null, (_get, set, duration: number) => {
  set(ttsPlayerStateAtom, (prev) => ({ ...prev, duration }));
});

export const setCurrentAudioAtom = atom(
  null,
  (_get, set, audio: HTMLAudioElement | null) => {
    set(ttsPlayerStateAtom, (prev) => ({ ...prev, currentAudio: audio }));
  }
);

export const setPlayingStateAtom = atom(
  null,
  (_get, set, updates: Partial<TTSPlayerState>) => {
    set(ttsPlayerStateAtom, (prev) => ({ ...prev, ...updates }));
  }
);

export const addToQueueAtom = atom(null, (_get, set, item: QueueItem) => {
  set(ttsPlayerStateAtom, (prev) => ({
    ...prev,
    queue: [...prev.queue, item],
  }));
});

export const removeFromQueueAtom = atom(null, (_get, set, id: string) => {
  set(ttsPlayerStateAtom, (prev) => ({
    ...prev,
    queue: prev.queue.filter((item) => item.id !== id),
  }));
});

export const clearQueueAtom = atom(null, (_get, set) => {
  set(ttsPlayerStateAtom, (prev) => ({ ...prev, queue: [] }));
});

export const stopPlaybackAtom = atom(null, (get, set) => {
  const state = get(ttsPlayerStateAtom);
  if (state.currentAudio) {
    state.currentAudio.pause();
    state.currentAudio.src = "";
  }
  set(ttsPlayerStateAtom, {
    ...initialState,
    queue: state.queue, // Preserve queue
  });
});

export const pausePlaybackAtom = atom(null, (get, set) => {
  const state = get(ttsPlayerStateAtom);
  if (state.currentAudio && state.isPlaying) {
    state.currentAudio.pause();
    set(ttsPlayerStateAtom, (prev) => ({
      ...prev,
      isPlaying: false,
      isPaused: true,
    }));
  }
});

export const resumePlaybackAtom = atom(null, (get, set) => {
  const state = get(ttsPlayerStateAtom);
  if (state.currentAudio && state.isPaused) {
    state.currentAudio.play();
    set(ttsPlayerStateAtom, (prev) => ({
      ...prev,
      isPlaying: true,
      isPaused: false,
    }));
  }
});

export const seekToAtom = atom(null, (get, set, time: number) => {
  const state = get(ttsPlayerStateAtom);
  if (state.currentAudio) {
    const clampedTime = Math.max(0, Math.min(time, state.duration));
    state.currentAudio.currentTime = clampedTime;
    set(updateProgressAtom, clampedTime);
  }
});

export const skipForwardAtom = atom(null, (get, set, seconds: number = 10) => {
  const state = get(ttsPlayerStateAtom);
  if (state.currentAudio) {
    const newTime = Math.min(state.currentTime + seconds, state.duration);
    set(seekToAtom, newTime);
  }
});

export const skipBackwardAtom = atom(null, (get, set, seconds: number = 10) => {
  const state = get(ttsPlayerStateAtom);
  if (state.currentAudio) {
    const newTime = Math.max(state.currentTime - seconds, 0);
    set(seekToAtom, newTime);
  }
});

export const setPlaybackRateAtom = atom(null, (get, set, rate: number) => {
  const state = get(ttsPlayerStateAtom);
  const clampedRate = Math.max(0.25, Math.min(rate, 4));
  set(ttsPlaybackRateAtom, clampedRate);
  if (state.currentAudio) {
    state.currentAudio.playbackRate = clampedRate;
  }
});

export const setVolumeAtom = atom(null, (get, set, volume: number) => {
  const state = get(ttsPlayerStateAtom);
  const clampedVolume = Math.max(0, Math.min(volume, 1));
  set(ttsVolumeAtom, clampedVolume);
  if (state.currentAudio) {
    state.currentAudio.volume = clampedVolume;
  }
});

// Play next item in queue
export const playNextInQueueAtom = atom(null, async (get, set) => {
  const state = get(ttsPlayerStateAtom);
  if (state.queue.length === 0) {
    // Stop playback if queue is empty
    if (state.currentAudio) {
      state.currentAudio.pause();
      state.currentAudio.src = "";
    }
    set(ttsPlayerStateAtom, {
      ...initialState,
      queue: state.queue, // Preserve queue
    });
    return null;
  }

  const [nextItem, ...remainingQueue] = state.queue;
  set(ttsPlayerStateAtom, (prev) => ({
    ...prev,
    queue: remainingQueue,
  }));

  return nextItem;
});

// Set interruption state
export const setInterruptionStateAtom = atom(
  null,
  (_get, set, isInterrupted: boolean, reason: "user_speaking" | null = null) => {
    set(ttsPlayerStateAtom, (prev) => ({
      ...prev,
      isInterrupted,
      interruptionReason: reason,
    }));
  }
);