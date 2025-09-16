import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { ProviderConfig } from "@/services/ai/provider-registry";

// Simplified AI configuration
export interface AIConfig {
  activeProvider?: ProviderConfig;
  voiceSettings: {
    enabled: boolean;
    provider: "openai" | "elevenlabs";
    voiceId?: string;
    apiKey?: string; // For ElevenLabs
    speed: number;
    autoSpeak: boolean;
  };
  sttSettings: {
    enabled: boolean;
    provider: "whisper" | "elevenlabs" | "built-in-chrome";
    model: string;
  };
}

// Default configuration
const defaultConfig: AIConfig = {
  activeProvider: undefined,
  voiceSettings: {
    enabled: false,
    provider: "openai",
    voiceId: "alloy",
    speed: 1.0,
    autoSpeak: false,
  },
  sttSettings: {
    enabled: false,
    provider: "whisper",
    model: "whisper-1",
  },
};

// Main storage atom
export const aiConfigAtom = atomWithStorage<AIConfig>(
  "ai-config-v2",
  defaultConfig,
);

// Active provider atom
export const activeProviderAtom = atom(
  (get) => get(aiConfigAtom).activeProvider,
  (get, set, provider: ProviderConfig | undefined) => {
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
