// Voice configuration management for agents
// Stores voice settings in localStorage keyed by agent slug

import { Storage } from './utils/storage';

export interface AgentVoiceConfig {
    voiceId: string;
    voiceName: string;
    language: string;
    gender: string;
}

const VOICE_CONFIG_PREFIX = "agent-voice-";

/**
 * Get the voice configuration for an agent
 * @param agentSlug The slug identifier for the agent (e.g., "project-manager")
 * @returns The voice configuration or null if not set
 */
export function getAgentVoiceConfig(agentSlug: string): AgentVoiceConfig | null {
    if (!agentSlug) return null;
    
    const config = Storage.getItem<AgentVoiceConfig>(`${VOICE_CONFIG_PREFIX}${agentSlug}`);
    if (!config) {
        return null;
    }
    
    return config;
}

/**
 * Save the voice configuration for an agent
 * @param agentSlug The slug identifier for the agent
 * @param config The voice configuration to save
 */
export function saveAgentVoiceConfig(agentSlug: string, config: AgentVoiceConfig): void {
    if (!agentSlug) {
        throw new Error("Agent slug is required to save voice configuration");
    }
    
    const success = Storage.setItem(`${VOICE_CONFIG_PREFIX}${agentSlug}`, config);
    if (!success) {
        throw new Error(`Failed to save voice config for agent: ${agentSlug}`);
    }
}

