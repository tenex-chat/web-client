import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { useAtom, useAtomValue } from 'jotai'

export interface TTSConfig {
  enabled: boolean
  provider: 'murf'
  apiKey?: string
  voiceId?: string
  style?: string
  rate?: number
  pitch?: number
  volume?: number
}

export interface LLMProviderConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'local'
  apiKey?: string
  model: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  systemPrompt?: string
}

export interface LLMConfig {
  providers: LLMProviderConfig[]
  defaultProvider: string
  tts?: TTSConfig
}

// Default configuration
const defaultConfig: LLMConfig = {
  providers: [
    {
      provider: 'openai',
      model: 'gpt-4-turbo-preview',
      temperature: 0.7,
      maxTokens: 4096,
    },
    {
      provider: 'anthropic',
      model: 'claude-3-opus-20240229',
      temperature: 0.7,
      maxTokens: 4096,
    }
  ],
  defaultProvider: 'openai',
  tts: {
    enabled: false,
    provider: 'murf',
    style: 'Conversational',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  }
}

// Create persistent atom with localStorage
export const llmConfigAtom = atomWithStorage<LLMConfig>('llmConfig', defaultConfig)

// Derived atoms for easier access
export const currentProviderAtom = atom((get) => {
  const config = get(llmConfigAtom)
  return config.providers.find(p => p.provider === config.defaultProvider) || config.providers[0]
})

export const ttsConfigAtom = atom(
  (get) => get(llmConfigAtom).tts,
  (get, set, update: Partial<TTSConfig>) => {
    const config = get(llmConfigAtom)
    set(llmConfigAtom, {
      ...config,
      tts: {
        ...config.tts,
        ...update,
      } as TTSConfig
    })
  }
)

// Hook for accessing LLM config
export function useLLMConfig() {
  const [config, setConfig] = useAtom(llmConfigAtom)
  const tts = useAtomValue(ttsConfigAtom)
  
  return {
    config,
    setConfig,
    tts,
    murfApiKey: tts?.apiKey,
    defaultVoiceId: tts?.voiceId,
    isTTSEnabled: tts?.enabled || false
  }
}

// Hook for managing TTS config
export function useTTSConfig() {
  const [tts, setTTS] = useAtom(ttsConfigAtom)
  
  return {
    config: tts,
    setConfig: setTTS,
    isEnabled: tts?.enabled || false,
    apiKey: tts?.apiKey,
    voiceId: tts?.voiceId
  }
}