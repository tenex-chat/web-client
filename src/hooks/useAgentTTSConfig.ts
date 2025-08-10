import { useMemo } from 'react'
import { useLLMConfig } from '@/stores/llmConfig'
import { getAgentVoiceConfig } from '@/lib/voice-config'

export interface AgentTTSOptions {
  apiKey: string
  voiceId: string
  style?: string
  rate?: number
  pitch?: number
  volume?: number
  enabled: boolean
  voiceName?: string
}

/**
 * Unified hook for getting TTS configuration with agent-specific overrides
 * Handles the merging of global TTS config with agent-specific voice settings
 * 
 * @param agentSlug - Optional agent identifier for agent-specific voice configuration
 * @returns TTS configuration options or null if TTS is not properly configured
 */
export function useAgentTTSConfig(agentSlug?: string): AgentTTSOptions | null {
  const { config: llmConfig } = useLLMConfig()
  
  return useMemo(() => {
    const ttsConfig = llmConfig?.tts
    
    // Check if base TTS configuration is valid
    if (!ttsConfig?.enabled || !ttsConfig?.apiKey || !ttsConfig?.voiceId) {
      return null
    }
    
    // Start with base TTS configuration
    let voiceId = ttsConfig.voiceId
    let voiceName: string | undefined
    
    // Apply agent-specific voice override if available
    if (agentSlug) {
      const agentVoiceConfig = getAgentVoiceConfig(agentSlug)
      if (agentVoiceConfig?.voiceId) {
        voiceId = agentVoiceConfig.voiceId
        voiceName = agentVoiceConfig.voiceName
      }
    }
    
    // Return merged configuration
    return {
      apiKey: ttsConfig.apiKey,
      voiceId: voiceId,
      style: ttsConfig.style || 'Conversational',
      rate: ttsConfig.rate || 1.0,
      pitch: ttsConfig.pitch || 1.0,
      volume: ttsConfig.volume || 1.0,
      enabled: true,
      voiceName: voiceName
    }
  }, [llmConfig, agentSlug])
}

/**
 * Get the display name for the current voice configuration
 * 
 * @param ttsOptions - The TTS configuration options
 * @returns Display name for the voice
 */
export function getVoiceDisplayName(ttsOptions: AgentTTSOptions | null): string {
  if (!ttsOptions?.voiceId) return 'Default'
  
  // Use the stored voice name if available
  if (ttsOptions.voiceName) {
    return ttsOptions.voiceName
  }
  
  // Fall back to extracting from voice ID
  const parts = ttsOptions.voiceId.split('/')
  return parts[parts.length - 1] || 'Default'
}