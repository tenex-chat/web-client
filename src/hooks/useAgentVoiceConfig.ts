import { useCallback, useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { voiceSettingsAtom, openAIApiKeyAtom } from "@/stores/ai-config-store";
import { voiceDiscovery, type Voice } from "@/services/ai/voice-discovery";
import { voiceProfileManager, getDeterministicVoiceIndex, type VoiceProfile, type AgentCharacteristics } from "@/services/ai/voice-profile-manager";

interface AgentVoiceConfig {
  voiceId: string;
  provider: "openai" | "elevenlabs";
  speed?: number;
  pitch?: number;
  profileId?: string; // Link to voice profile if using profile system
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
 * @param agentCharacteristics - Optional characteristics for intelligent voice assignment
 */
export function useAgentVoiceConfig(
  agentPubkey: string | undefined,
  agentCharacteristics?: AgentCharacteristics
) {
  const globalVoiceSettings = useAtomValue(voiceSettingsAtom);
  const openAIApiKey = useAtomValue(openAIApiKeyAtom);
  const [agentConfigs, setAgentConfigs] = useState<
    Map<string, AgentVoiceConfig>
  >(() => loadAgentVoiceConfigs());
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile | undefined>();
  const [availableProfiles, setAvailableProfiles] = useState<VoiceProfile[]>([]);

  // Get config for this specific agent
  const agentConfig = agentPubkey ? agentConfigs.get(agentPubkey) : undefined;
  
  // Check if agent has a voice profile assigned
  useEffect(() => {
    if (agentPubkey) {
      const profile = voiceProfileManager.getAgentVoiceProfile(agentPubkey);
      setVoiceProfile(profile);
      
      // If using profile, update config from profile
      if (profile) {
        setAgentConfigs((currentConfigs) => {
          const newConfigs = new Map(currentConfigs);
          newConfigs.set(agentPubkey, {
            voiceId: profile.voiceId,
            provider: profile.provider,
            speed: profile.settings?.speed,
            pitch: profile.settings?.pitch,
            profileId: profile.id,
          });
          return newConfigs;
        });
      }
    }
    
    // Load all available profiles
    setAvailableProfiles(voiceProfileManager.getAllProfiles());
  }, [agentPubkey]);

  // Determine the effective voice ID with multi-voice support and fallback chain
  const getEffectiveVoiceId = (): string => {
    // 1. First try: Agent-specific voice config
    if (agentConfig?.voiceId) {
      return agentConfig.voiceId;
    }
    
    // 2. Second try: Multi-voice deterministic selection
    // If multiple voices are configured, use deterministic assignment
    if (globalVoiceSettings.voiceIds && 
        globalVoiceSettings.voiceIds.length > 0 &&
        agentPubkey) {
      
      const voiceIds = globalVoiceSettings.voiceIds;
      // Always use deterministic assignment based on agent pubkey
      const index = getDeterministicVoiceIndex(agentPubkey, voiceIds.length);
      return voiceIds[index];
    }
    
    // 3. Third try: Global single voice setting
    if (globalVoiceSettings.voiceId) {
      return globalVoiceSettings.voiceId;
    }
    
    // 4. Ultimate fallback: Default voice
    return "alloy";
  };

  // Merge with global settings as fallback
  const effectiveConfig = {
    voiceId: getEffectiveVoiceId(),
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

      setAgentConfigs((currentConfigs) => {
        const existingConfig = currentConfigs.get(agentPubkey);
        const globalDefaults = {
          voiceId: globalVoiceSettings.voiceId || "alloy",
          provider: globalVoiceSettings.provider,
          speed: globalVoiceSettings.speed,
          pitch: 1.0,
        };

        const newConfig: AgentVoiceConfig = {
          voiceId: config.voiceId ?? existingConfig?.voiceId ?? globalDefaults.voiceId,
          provider: config.provider ?? existingConfig?.provider ?? globalDefaults.provider,
          speed: config.speed ?? existingConfig?.speed ?? globalDefaults.speed,
          pitch: config.pitch ?? existingConfig?.pitch ?? globalDefaults.pitch,
        };

        const newConfigs = new Map(currentConfigs);
        newConfigs.set(agentPubkey, newConfig);
        saveAgentVoiceConfigs(newConfigs);
        return newConfigs;
      });
    },
    [agentPubkey, globalVoiceSettings],
  );

  // Remove config for this agent (revert to global)
  const removeConfig = useCallback(() => {
    if (!agentPubkey) return;

    setAgentConfigs((currentConfigs) => {
      const newConfigs = new Map(currentConfigs);
      newConfigs.delete(agentPubkey);
      saveAgentVoiceConfigs(newConfigs);
      return newConfigs;
    });
  }, [agentPubkey]);

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

  // Intelligent voice assignment functions
  const assignVoiceByStrategy = useCallback(
    (strategy: "random" | "round-robin" | "characteristic-match" | "role-based" | "deterministic") => {
      if (!agentPubkey) return;
      
      // For deterministic strategy, pass the voice IDs from global settings
      const strategyConfig = strategy === "deterministic" 
        ? { 
            type: strategy as const, 
            config: { voiceIds: globalVoiceSettings.voiceIds || [] } 
          }
        : { type: strategy as const };
      
      const profile = voiceProfileManager.assignVoiceToAgent(
        agentPubkey,
        strategyConfig,
        agentCharacteristics
      );
      
      if (profile) {
        saveConfig({
          voiceId: profile.voiceId,
          provider: profile.provider,
          speed: profile.settings?.speed,
          pitch: profile.settings?.pitch,
          profileId: profile.id,
        });
        setVoiceProfile(profile);
      }
    },
    [agentPubkey, agentCharacteristics, saveConfig, globalVoiceSettings.voiceIds]
  );

  const assignVoiceProfile = useCallback(
    (profileId: string) => {
      if (!agentPubkey) return;
      
      const profile = voiceProfileManager.getProfile(profileId);
      if (profile) {
        voiceProfileManager.assignVoiceToAgent(
          agentPubkey,
          { type: "manual", config: { profileId } },
          agentCharacteristics
        );
        
        saveConfig({
          voiceId: profile.voiceId,
          provider: profile.provider,
          speed: profile.settings?.speed,
          pitch: profile.settings?.pitch,
          profileId: profile.id,
        });
        setVoiceProfile(profile);
      }
    },
    [agentPubkey, agentCharacteristics, saveConfig]
  );

  const getRecommendedVoices = useCallback(
    (count: number = 3) => {
      if (!agentCharacteristics) return [];
      return voiceProfileManager.recommendVoicesForAgent(agentCharacteristics, count);
    },
    [agentCharacteristics]
  );

  // Automatically apply deterministic voice assignment if multiple voices are configured
  useEffect(() => {
    if (agentPubkey && 
        globalVoiceSettings.voiceIds &&
        globalVoiceSettings.voiceIds.length > 0 &&
        !agentConfig) {
      // Auto-assign deterministic voice if not already configured
      assignVoiceByStrategy("deterministic");
    }
  }, [
    agentPubkey, 
    globalVoiceSettings.voiceIds,
    agentConfig,
    assignVoiceByStrategy
  ]);

  return {
    config: effectiveConfig,
    agentConfig,
    availableVoices,
    loadingVoices,
    saveConfig,
    removeConfig,
    testVoice,
    hasCustomConfig: !!agentConfig,
    // New profile-based features
    voiceProfile,
    availableProfiles,
    assignVoiceByStrategy,
    assignVoiceProfile,
    getRecommendedVoices,
  };
}
