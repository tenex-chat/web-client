import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

// ============================================
// TYPE DEFINITIONS
// ============================================

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'openrouter' | 'groq' | 'ollama'

export interface AIProviderConfig {
  id: string
  provider: AIProvider
  apiKey?: string
  model: string
  enabled: boolean
  temperature?: number
  maxTokens?: number
  isDefault?: boolean
}

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

export interface STTConfig {
  enabled: boolean
  provider: 'openai'
  model: string
}

// ============================================
// INTERNAL STORAGE FORMAT
// ============================================

// This is the internal storage format - components don't need to know about this
interface InternalStorage {
  providers: AIProviderConfig[]
  tts: TTSConfig
  stt: STTConfig
  autoTTS: boolean
}

// Default configuration
const defaultStorage: InternalStorage = {
  providers: [],
  tts: {
    enabled: false,
    provider: 'murf',
    style: 'Conversational',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  },
  stt: {
    enabled: false,
    provider: 'openai',
    model: 'whisper-1',
  },
  autoTTS: false,
}

// ============================================
// STORAGE ATOMS - Implementation details hidden
// ============================================

// Main storage atom - single source of truth
const storageAtom = atomWithStorage<InternalStorage>('ai-config', defaultStorage)

// ============================================
// PUBLIC ATOMS - Clean interfaces for components
// ============================================

// LLM Providers atom - for LLMSettings.tsx
export const llmProvidersAtom = atom(
  (get) => get(storageAtom).providers,
  (get, set, providers: AIProviderConfig[]) => {
    const storage = get(storageAtom)
    set(storageAtom, { ...storage, providers })
  }
)

// TTS Config atom - for TTSSettings.tsx and voice features
export const ttsConfigAtom = atom(
  (get) => get(storageAtom).tts,
  (get, set, tts: Partial<TTSConfig>) => {
    const storage = get(storageAtom)
    set(storageAtom, { 
      ...storage, 
      tts: { ...storage.tts, ...tts }
    })
  }
)

// STT Config atom - for STTSettings.tsx
export const sttConfigAtom = atom(
  (get) => get(storageAtom).stt,
  (get, set, stt: Partial<STTConfig>) => {
    const storage = get(storageAtom)
    set(storageAtom, { 
      ...storage, 
      stt: { ...storage.stt, ...stt }
    })
  }
)

// Auto-TTS atom - for chat interface
export const autoTTSAtom = atom(
  (get) => get(storageAtom).autoTTS,
  (get, set, autoTTS: boolean) => {
    const storage = get(storageAtom)
    set(storageAtom, { ...storage, autoTTS })
  }
)

// ============================================
// COMPUTED ATOMS - Derived values
// ============================================

// Get the default/active provider
export const activeProviderAtom = atom((get) => {
  const providers = get(storageAtom).providers
  return providers.find(p => p.isDefault && p.enabled) || 
         providers.find(p => p.enabled) || 
         null
})

// Get OpenAI provider specifically (needed for STT/TTS)
export const openAIProviderAtom = atom((get) => {
  const providers = get(storageAtom).providers
  return providers.find(p => p.provider === 'openai' && p.enabled)
})

// Get OpenAI API key (from provider or env)
export const openAIApiKeyAtom = atom((get) => {
  const openAI = get(openAIProviderAtom)
  return openAI?.apiKey || import.meta.env.VITE_OPENAI_API_KEY
})

// Get Murf API key (from TTS config or env)
export const murfApiKeyAtom = atom((get) => {
  const tts = get(storageAtom).tts
  return tts.apiKey || import.meta.env.VITE_MURF_API_KEY
})

// ============================================
// HOOKS - Single Responsibility
// ============================================

import { useAtom, useAtomValue } from 'jotai'

// Hook for AI provider management
export function useAIProviders() {
  const [providers, setProviders] = useAtom(llmProvidersAtom)
  const activeProvider = useAtomValue(activeProviderAtom)
  const openAIProvider = useAtomValue(openAIProviderAtom)
  
  return {
    providers,
    setProviders,
    activeProvider,
    openAIProvider,
    addProvider: (provider: AIProviderConfig) => {
      setProviders([...providers, provider])
    },
    updateProvider: (id: string, updates: Partial<AIProviderConfig>) => {
      setProviders(providers.map(p => 
        p.id === id ? { ...p, ...updates } : p
      ))
    },
    removeProvider: (id: string) => {
      setProviders(providers.filter(p => p.id !== id))
    },
    setDefaultProvider: (id: string) => {
      setProviders(providers.map(p => ({
        ...p,
        isDefault: p.id === id
      })))
    }
  }
}

// Hook for TTS configuration
export function useTTS() {
  const [config, setConfig] = useAtom(ttsConfigAtom)
  const apiKey = useAtomValue(murfApiKeyAtom)
  
  return {
    config,
    setConfig,
    apiKey,
    isEnabled: config.enabled,
    enable: () => setConfig({ ...config, enabled: true }),
    disable: () => setConfig({ ...config, enabled: false })
  }
}

// Hook for STT configuration
export function useSTT() {
  const [config, setConfig] = useAtom(sttConfigAtom)
  const openAIApiKey = useAtomValue(openAIApiKeyAtom)
  
  return {
    config,
    setConfig,
    openAIApiKey,
    isEnabled: config.enabled,
    enable: () => setConfig({ ...config, enabled: true }),
    disable: () => setConfig({ ...config, enabled: false })
  }
}

// Hook for auto-TTS toggle
export function useAutoTTS() {
  return useAtom(autoTTSAtom)
}

