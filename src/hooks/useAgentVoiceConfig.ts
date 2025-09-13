import { useCallback, useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { voiceSettingsAtom, openAIApiKeyAtom } from "@/stores/ai-config-store";
import { voiceDiscovery, type Voice } from "@/services/ai/voice-discovery";

interface AgentVoiceConfig {
  voiceId: string;
  provider: "openai" | "elevenlabs";
  speed?: number;
  pitch?: number;
}

// Storage key for agent voice configs
const AGENT_VOICE_STORAGE_KEY = "agent-voice-configs";

// Load all agent voice configs from localStorage
function loadAgentVoiceConfigs(): Map<string, AgentVoiceConfig> {
  try {
    const stored = localStorage.getItem(AGENT_VOICE_STORAGE_KEY);
    if (!stored) return new Map();

    const configs = JSON.parse(stored);
    return new Map(Object.entries(configs));
  } catch {
    return new Map();
  }
}

// Save all agent voice configs to localStorage
function saveAgentVoiceConfigs(configs: Map<string, AgentVoiceConfig>) {
  try {
    const obj = Object.fromEntries(configs);
    localStorage.setItem(AGENT_VOICE_STORAGE_KEY, JSON.stringify(obj));
  } catch (error) {
    console.error("Failed to save agent voice configs:", error);
  }
}

/**
 * Hook to manage voice configuration for a specific agent
 * @param agentPubkey - The public key of the agent
 */
export function useAgentVoiceConfig(agentPubkey: string | undefined) {
  const globalVoiceSettings = useAtomValue(voiceSettingsAtom);
  const openAIApiKey = useAtomValue(openAIApiKeyAtom);
  const [agentConfigs, setAgentConfigs] = useState<
    Map<string, AgentVoiceConfig>
  >(() => loadAgentVoiceConfigs());
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);

  // Get config for this specific agent
  const agentConfig = agentPubkey ? agentConfigs.get(agentPubkey) : undefined;

  // Merge with global settings as fallback
  const effectiveConfig = {
    voiceId: agentConfig?.voiceId || globalVoiceSettings.voiceId || "alloy",
    provider: agentConfig?.provider || globalVoiceSettings.provider,
    speed: agentConfig?.speed || globalVoiceSettings.speed,
    pitch: agentConfig?.pitch || 1.0,
    enabled: globalVoiceSettings.enabled,
    apiKey:
      globalVoiceSettings.provider === "openai"
        ? openAIApiKey
        : globalVoiceSettings.apiKey,
  };

  // Load available voices based on provider
  useEffect(() => {
    async function loadVoices() {
      if (!effectiveConfig.apiKey) return;

      setLoadingVoices(true);
      try {
        const voices = await voiceDiscovery.fetchVoices(
          effectiveConfig.provider,
          effectiveConfig.apiKey,
        );
        setAvailableVoices(voices);
      } catch (error) {
        console.error("Failed to load voices:", error);
        setAvailableVoices([]);
      } finally {
        setLoadingVoices(false);
      }
    }

    loadVoices();
  }, [effectiveConfig.provider, effectiveConfig.apiKey]);

  // Save config for this agent
  const saveConfig = useCallback(
    (config: Partial<AgentVoiceConfig>) => {
      if (!agentPubkey) return;

      const newConfig: AgentVoiceConfig = {
        voiceId: config.voiceId || effectiveConfig.voiceId,
        provider: config.provider || effectiveConfig.provider,
        speed: config.speed || effectiveConfig.speed,
        pitch: config.pitch || effectiveConfig.pitch,
      };

      const newConfigs = new Map(agentConfigs);
      newConfigs.set(agentPubkey, newConfig);
      setAgentConfigs(newConfigs);
      saveAgentVoiceConfigs(newConfigs);
    },
    [agentPubkey, agentConfigs, effectiveConfig],
  );

  // Remove config for this agent (revert to global)
  const removeConfig = useCallback(() => {
    if (!agentPubkey) return;

    const newConfigs = new Map(agentConfigs);
    newConfigs.delete(agentPubkey);
    setAgentConfigs(newConfigs);
    saveAgentVoiceConfigs(newConfigs);
  }, [agentPubkey, agentConfigs]);

  // Test the voice
  const testVoice = useCallback(
    async (text: string = "Hello, this is a test of my voice.") => {
      if (!effectiveConfig.apiKey || !effectiveConfig.voiceId) {
        throw new Error("Voice not configured");
      }

      try {
        const audioBlob = await voiceDiscovery.previewVoice(
          effectiveConfig.provider,
          effectiveConfig.voiceId,
          text,
          effectiveConfig.apiKey,
        );

        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.playbackRate = effectiveConfig.speed || 1.0;
        await audio.play();

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
        };
      } catch (error) {
        console.error("Failed to test voice:", error);
        throw error;
      }
    },
    [effectiveConfig],
  );

  return {
    config: effectiveConfig,
    agentConfig,
    availableVoices,
    loadingVoices,
    saveConfig,
    removeConfig,
    testVoice,
    hasCustomConfig: !!agentConfig,
  };
}
