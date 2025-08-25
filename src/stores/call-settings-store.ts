import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type InterruptionMode = 'disabled' | 'headphones'
export type InterruptionSensitivity = 'low' | 'medium' | 'high'

export interface CallAudioSettings {
  // Device selection
  inputDeviceId: string | null
  outputDeviceId: string | null
  
  // Audio processing
  inputVolume: number // 0-100
  noiseSuppression: boolean
  echoCancellation: boolean
  voiceActivityDetection: boolean
  vadSensitivity: number // 0-100, lower = more sensitive
  
  // Interruption settings
  interruptionMode: InterruptionMode
  interruptionSensitivity: InterruptionSensitivity
}

interface CallSettingsStore {
  audioSettings: CallAudioSettings
  updateAudioSettings: (settings: Partial<CallAudioSettings>) => void
  resetAudioSettings: () => void
}

const defaultAudioSettings: CallAudioSettings = {
  inputDeviceId: null,
  outputDeviceId: null,
  inputVolume: 100,
  noiseSuppression: true,
  echoCancellation: true,
  voiceActivityDetection: true,
  vadSensitivity: 50,
  interruptionMode: 'disabled',
  interruptionSensitivity: 'medium',
}

export const useCallSettings = create<CallSettingsStore>()(
  persist(
    (set) => ({
      audioSettings: defaultAudioSettings,
      
      updateAudioSettings: (settings) =>
        set((state) => ({
          audioSettings: { ...state.audioSettings, ...settings },
        })),
      
      resetAudioSettings: () =>
        set({ audioSettings: defaultAudioSettings }),
    }),
    {
      name: 'call-settings',
    }
  )
)