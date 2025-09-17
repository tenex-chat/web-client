import { create } from "zustand";
import { persist } from "zustand/middleware";

export type InterruptionMode = "disabled" | "headphones";
export type InterruptionSensitivity = "low" | "medium" | "high";
export type VADMode = "disabled" | "auto" | "push-to-talk";

export interface CallAudioSettings {
  // Device selection
  inputDeviceId: string | null;
  outputDeviceId: string | null;

  // Audio processing
  inputVolume: number; // 0-100
  noiseSuppression: boolean;
  echoCancellation: boolean;
  voiceActivityDetection: boolean;
  vadSensitivity: number; // 0-100, lower = more sensitive

  // VAD mode for conversation flow
  vadMode: VADMode; // "disabled" = manual only, "auto" = VAD detects speech, "push-to-talk" = current behavior

  // Interruption settings
  interruptionMode: InterruptionMode;
  interruptionSensitivity: InterruptionSensitivity;
}

interface CallSettingsStore {
  audioSettings: CallAudioSettings;
  updateAudioSettings: (settings: Partial<CallAudioSettings>) => void;
  resetAudioSettings: () => void;
}

const defaultAudioSettings: CallAudioSettings = {
  inputDeviceId: null,
  outputDeviceId: null,
  inputVolume: 100,
  noiseSuppression: true,
  echoCancellation: true,
  voiceActivityDetection: true,
  vadSensitivity: 50,
  vadMode: "push-to-talk", // Default to current behavior
  interruptionMode: "disabled",
  interruptionSensitivity: "medium",
};

export const useCallSettings = create<CallSettingsStore>()(
  persist(
    (set) => ({
      audioSettings: defaultAudioSettings,

      updateAudioSettings: (settings) =>
        set((state) => ({
          audioSettings: { ...state.audioSettings, ...settings },
        })),

      resetAudioSettings: () => set({ audioSettings: defaultAudioSettings }),
    }),
    {
      name: "call-settings",
    },
  ),
);
