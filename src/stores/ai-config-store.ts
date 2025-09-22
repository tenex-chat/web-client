import { atom, useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { ProviderConfig } from "@/services/ai/provider-registry";

// Extended provider config with a user-friendly name
export interface LLMConfig extends ProviderConfig {
  name: string; // User-defined name (e.g., "My OpenAI Key", "Work GPT")
}

// Audio configuration types
export type InterruptionMode = "disabled" | "headphones";
export type InterruptionSensitivity = "low" | "medium" | "high";
export type VADMode = "disabled" | "auto" | "push-to-talk";

// Unified AI and audio configuration
export interface AIConfig {
  activeProvider?: ProviderConfig;
  voiceSettings: {
    enabled: boolean;
    provider: "openai" | "elevenlabs";
    voiceIds: string[]; // Array of voice IDs (single element for single voice, multiple for multi-voice)
    apiKey?: string; // For ElevenLabs
    speed: number;
    autoSpeak: boolean;
  };
  sttSettings: {
    enabled: boolean;
    provider: "whisper" | "elevenlabs";
    model: string;
  };
  audioSettings: {
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
    vadMode: VADMode;
    // Interruption settings
    interruptionMode: InterruptionMode;
    interruptionSensitivity: InterruptionSensitivity;
  };
}

// Default configuration
const defaultConfig: AIConfig = {
  activeProvider: undefined,
  voiceSettings: {
    enabled: false,
    provider: "openai",
    voiceIds: ["alloy"], // Default to alloy voice
    speed: 1.0,
    autoSpeak: false,
  },
  sttSettings: {
    enabled: false,
    provider: "whisper",
    model: "whisper-1",
  },
  audioSettings: {
    inputDeviceId: null,
    outputDeviceId: null,
    inputVolume: 100,
    noiseSuppression: true,
    echoCancellation: true,
    voiceActivityDetection: true,
    vadSensitivity: 50,
    vadMode: "push-to-talk",
    interruptionMode: "disabled",
    interruptionSensitivity: "medium",
  },
};

// Main storage atom (kept for backwards compatibility during transition)
export const aiConfigAtom = atomWithStorage<AIConfig>(
  "ai-config-v2",
  defaultConfig,
);

// NEW: Atom to hold all saved LLM configurations
export const llmConfigsAtom = atomWithStorage<LLMConfig[]>("llm-configs", []);

// NEW: Atom to hold the ID of the currently active configuration
export const activeLLMConfigIdAtom = atomWithStorage<string | null>(
  "active-llm-config-id",
  null,
);

// NEW: Derived atom to get the full active configuration object
export const activeLLMConfigAtom = atom<LLMConfig | null>((get) => {
  const configs = get(llmConfigsAtom);
  const activeId = get(activeLLMConfigIdAtom);
  
  if (!activeId) {
    // If no active ID, default to the first config in the list
    if (configs.length > 0) return configs[0];
    return null;
  }
  
  return configs.find(config => config.id === activeId) ?? null;
});

// Active provider atom (updated to use new LLM config system)
export const activeProviderAtom = atom(
  (get) => {
    // Try to get from new LLM config system first
    const llmConfig = get(activeLLMConfigAtom);
    if (llmConfig) {
      return llmConfig as ProviderConfig;
    }
    // Fall back to old system for backwards compatibility
    return get(aiConfigAtom).activeProvider;
  },
  (get, set, provider: ProviderConfig | undefined) => {
    // For backwards compatibility, also update the old atom
    const config = get(aiConfigAtom);
    set(aiConfigAtom, { ...config, activeProvider: provider });
  },
);

// Voice settings atom
export const voiceSettingsAtom = atom(
  (get) => get(aiConfigAtom).voiceSettings,
  (get, set, settings: Partial<AIConfig["voiceSettings"]>) => {
    const config = get(aiConfigAtom);
    set(aiConfigAtom, {
      ...config,
      voiceSettings: { ...config.voiceSettings, ...settings },
    });
  },
);

// STT settings atom
export const sttSettingsAtom = atom(
  (get) => get(aiConfigAtom).sttSettings,
  (get, set, settings: Partial<AIConfig["sttSettings"]>) => {
    const config = get(aiConfigAtom);
    set(aiConfigAtom, {
      ...config,
      sttSettings: { ...config.sttSettings, ...settings },
    });
  },
);

// Audio settings atom
export const audioSettingsAtom = atom(
  (get) => get(aiConfigAtom).audioSettings,
  (get, set, settings: Partial<AIConfig["audioSettings"]>) => {
    const config = get(aiConfigAtom);
    set(aiConfigAtom, {
      ...config,
      audioSettings: { ...config.audioSettings, ...settings },
    });
  },
);

// UI-specific LLM configurations
export interface UILLMConfigs {
  titleGeneration?: string; // ID of LLM config to use for title generation
  promptRewrite?: string; // ID of LLM config to use for prompt rewriting (future)
  messageCleanup?: string; // ID of LLM config to use for message cleanup (future)
  summaries?: string; // ID of LLM config to use for summaries (future)
}

// Atom for UI-specific LLM configurations
export const uiLLMConfigsAtom = atomWithStorage<UILLMConfigs>(
  "ui-llm-configs",
  {}
);

// Derived atom to get the actual LLM config for title generation
export const titleGenerationLLMAtom = atom<LLMConfig | null>((get) => {
  const configs = get(llmConfigsAtom);
  const uiConfigs = get(uiLLMConfigsAtom);
  
  if (uiConfigs.titleGeneration) {
    const config = configs.find(c => c.id === uiConfigs.titleGeneration);
    if (config) return config;
  }
  
  // Fallback to active LLM config
  return get(activeLLMConfigAtom);
});

// Derived atom to get the actual LLM config for summaries
export const summaryLLMAtom = atom<LLMConfig | null>((get) => {
  const configs = get(llmConfigsAtom);
  const uiConfigs = get(uiLLMConfigsAtom);
  
  if (uiConfigs.summaries) {
    const config = configs.find(c => c.id === uiConfigs.summaries);
    if (config) return config;
  }
  
  // Fallback to active LLM config
  return get(activeLLMConfigAtom);
});

// Helper atom to get/set OpenAI API key for voice settings
export const openAIApiKeyAtom = atom(
  (get) => {
    const activeProvider = get(activeProviderAtom);
    const voiceSettings = get(voiceSettingsAtom);

    // If active provider is OpenAI, use its key
    if (activeProvider?.provider === "openai") {
      return activeProvider.apiKey;
    }

    // Otherwise, check if we have a stored OpenAI key for voice
    if (voiceSettings.provider === "openai" && voiceSettings.apiKey) {
      return voiceSettings.apiKey;
    }

    return undefined;
  },
  (get, set, apiKey: string | undefined) => {
    const config = get(aiConfigAtom);
    // Store the OpenAI API key in voice settings
    set(aiConfigAtom, {
      ...config,
      voiceSettings: {
        ...config.voiceSettings,
        apiKey: apiKey,
      },
    });
  },
);

// Hook for audio settings (replaces useCallSettings)
export function useAudioSettings() {
  const [audioSettings, setAudioSettings] = useAtom(audioSettingsAtom);

  const updateAudioSettings = (settings: Partial<AIConfig["audioSettings"]>) => {
    setAudioSettings(settings);
  };

  const resetAudioSettings = () => {
    setAudioSettings(defaultConfig.audioSettings);
  };

  return {
    audioSettings,
    updateAudioSettings,
    resetAudioSettings,
  };
}
