import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export interface LLMConfig {
  id: string;
  provider: 'openai' | 'anthropic' | 'google' | 'openrouter' | 'groq' | 'ollama';
  apiKey: string;
  model: string;
  enabled: boolean;
  temperature?: number;
  maxTokens?: number;
  isDefault?: boolean;
}

export interface TTSConfig {
  enabled: boolean;
  autoRead: boolean;
  voice: string;
  speed: number;
  pitch: number;
}

// LLM configurations atom with localStorage persistence
export const llmConfigAtom = atomWithStorage<LLMConfig[]>('llm-configs', []);

// TTS configuration atom
export const ttsConfigAtom = atomWithStorage<TTSConfig>('tts-config', {
  enabled: false,
  autoRead: false,
  voice: 'alloy',
  speed: 1.0,
  pitch: 1.0,
});

// Get the default/active LLM configuration
export const activeLLMConfigAtom = atom<LLMConfig | null>((get) => {
  const configs = get(llmConfigAtom);
  return configs.find(c => c.isDefault && c.enabled) || configs.find(c => c.enabled) || null;
});

// Helper to get API key for a specific provider
export const getAPIKeyAtom = atom((get) => (provider: string) => {
  const configs = get(llmConfigAtom);
  const config = configs.find(c => c.provider === provider && c.enabled);
  return config?.apiKey;
});