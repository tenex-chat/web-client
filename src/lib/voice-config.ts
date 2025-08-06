// Voice configuration management for agents
// Stores voice settings in localStorage keyed by agent slug

import { logger } from './logger';

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
    
    try {
        const stored = localStorage.getItem(`${VOICE_CONFIG_PREFIX}${agentSlug}`);
        if (stored) {
            return JSON.parse(stored) as AgentVoiceConfig;
        }
    } catch (error) {
        logger.error("Failed to load voice config for agent:", agentSlug, error);
    }
    
    return null;
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
    
    try {
        localStorage.setItem(`${VOICE_CONFIG_PREFIX}${agentSlug}`, JSON.stringify(config));
    } catch (error) {
        logger.error("Failed to save voice config for agent:", agentSlug, error);
        throw error;
    }
}

/**
 * Remove the voice configuration for an agent
 * @param agentSlug The slug identifier for the agent
 */
export function removeAgentVoiceConfig(agentSlug: string): void {
    if (!agentSlug) return;
    
    try {
        localStorage.removeItem(`${VOICE_CONFIG_PREFIX}${agentSlug}`);
    } catch (error) {
        logger.error("Failed to remove voice config for agent:", agentSlug, error);
    }
}

/**
 * Get all saved voice configurations
 * @returns A map of agent slugs to their voice configurations
 */
export function getAllAgentVoiceConfigs(): Record<string, AgentVoiceConfig> {
    const configs: Record<string, AgentVoiceConfig> = {};
    
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(VOICE_CONFIG_PREFIX)) {
                const agentSlug = key.replace(VOICE_CONFIG_PREFIX, "");
                const value = localStorage.getItem(key);
                if (value) {
                    configs[agentSlug] = JSON.parse(value);
                }
            }
        }
    } catch (error) {
        logger.error("Failed to load all voice configs:", error);
    }
    
    return configs;
}