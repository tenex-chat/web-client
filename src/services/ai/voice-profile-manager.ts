import { VoiceProvider, Voice } from "./voice-discovery";

export interface VoiceProfile {
  id: string;
  name: string;
  voiceId: string;
  provider: VoiceProvider;
  characteristics: VoiceCharacteristics;
  tags: string[];
  preferredForAgentTypes?: string[];
  settings?: VoiceSettings;
}

export interface VoiceCharacteristics {
  gender?: "male" | "female" | "neutral";
  ageGroup?: "young" | "middle" | "mature" | "elderly";
  accent?: string;
  personality?: "professional" | "friendly" | "authoritative" | "casual" | "warm" | "energetic";
  tone?: "deep" | "medium" | "high";
  style?: "conversational" | "narrative" | "technical" | "expressive";
  useCase?: string[];
}

export interface VoiceSettings {
  speed?: number;
  pitch?: number;
  stability?: number; // ElevenLabs specific
  similarityBoost?: number; // ElevenLabs specific
  style?: number; // OpenAI specific
}

export interface AgentCharacteristics {
  role?: string;
  personality?: string;
  expertise?: string[];
  communicationStyle?: string;
  targetAudience?: string;
  preferredGender?: "male" | "female" | "neutral" | "any";
}

export interface VoiceAssignmentStrategy {
  type: "random" | "round-robin" | "characteristic-match" | "role-based" | "manual" | "deterministic";
  config?: Record<string, any>;
}

export class VoiceProfileManager {
  private profiles: Map<string, VoiceProfile> = new Map();
  private agentVoiceMapping: Map<string, string> = new Map(); // agentId -> profileId
  private roundRobinIndex: number = 0;
  private readonly STORAGE_KEY = "voice-profiles";
  private readonly MAPPING_KEY = "agent-voice-mapping";

  constructor() {
    this.loadProfiles();
    this.loadMappings();
    this.initializeDefaultProfiles();
  }

  private initializeDefaultProfiles() {
    // OpenAI Voices
    this.addProfile({
      id: "alloy-neutral",
      name: "Alloy (Neutral Professional)",
      voiceId: "alloy",
      provider: "openai",
      characteristics: {
        gender: "neutral",
        personality: "professional",
        tone: "medium",
        style: "conversational",
        useCase: ["general", "technical", "support"]
      },
      tags: ["default", "balanced", "professional"],
      preferredForAgentTypes: ["assistant", "support", "general"]
    });

    this.addProfile({
      id: "nova-female",
      name: "Nova (Warm Female)",
      voiceId: "nova",
      provider: "openai",
      characteristics: {
        gender: "female",
        ageGroup: "young",
        personality: "friendly",
        tone: "medium",
        style: "conversational",
        useCase: ["customer-service", "education", "friendly"]
      },
      tags: ["friendly", "approachable", "clear"],
      preferredForAgentTypes: ["tutor", "guide", "customer-service"]
    });

    this.addProfile({
      id: "echo-male",
      name: "Echo (Professional Male)",
      voiceId: "echo",
      provider: "openai",
      characteristics: {
        gender: "male",
        ageGroup: "middle",
        personality: "professional",
        tone: "medium",
        style: "technical",
        useCase: ["business", "technical", "presentation"]
      },
      tags: ["professional", "clear", "business"],
      preferredForAgentTypes: ["analyst", "developer", "technical"]
    });

    this.addProfile({
      id: "onyx-deep",
      name: "Onyx (Authoritative)",
      voiceId: "onyx",
      provider: "openai",
      characteristics: {
        gender: "male",
        ageGroup: "mature",
        personality: "authoritative",
        tone: "deep",
        style: "narrative",
        useCase: ["narration", "documentation", "leadership"]
      },
      tags: ["authoritative", "deep", "commanding"],
      preferredForAgentTypes: ["narrator", "leader", "expert"]
    });

    this.addProfile({
      id: "shimmer-expressive",
      name: "Shimmer (Expressive Female)",
      voiceId: "shimmer",
      provider: "openai",
      characteristics: {
        gender: "female",
        ageGroup: "young",
        personality: "energetic",
        tone: "high",
        style: "expressive",
        useCase: ["creative", "marketing", "entertainment"]
      },
      tags: ["expressive", "energetic", "creative"],
      preferredForAgentTypes: ["creative", "marketing", "social"]
    });

    this.addProfile({
      id: "fable-british",
      name: "Fable (British Accent)",
      voiceId: "fable",
      provider: "openai",
      characteristics: {
        gender: "male",
        ageGroup: "middle",
        accent: "british",
        personality: "warm",
        tone: "medium",
        style: "conversational",
        useCase: ["education", "storytelling", "cultural"]
      },
      tags: ["british", "distinctive", "cultured"],
      preferredForAgentTypes: ["educator", "storyteller", "cultural"]
    });
  }

  // Core profile management
  addProfile(profile: VoiceProfile): void {
    this.profiles.set(profile.id, profile);
    this.saveProfiles();
  }

  updateProfile(profileId: string, updates: Partial<VoiceProfile>): void {
    const existing = this.profiles.get(profileId);
    if (existing) {
      this.profiles.set(profileId, { ...existing, ...updates });
      this.saveProfiles();
    }
  }

  deleteProfile(profileId: string): void {
    this.profiles.delete(profileId);
    // Clean up any mappings using this profile
    for (const [agentId, mappedProfileId] of this.agentVoiceMapping) {
      if (mappedProfileId === profileId) {
        this.agentVoiceMapping.delete(agentId);
      }
    }
    this.saveProfiles();
    this.saveMappings();
  }

  getProfile(profileId: string): VoiceProfile | undefined {
    return this.profiles.get(profileId);
  }

  getAllProfiles(): VoiceProfile[] {
    return Array.from(this.profiles.values());
  }

  getProfilesByProvider(provider: VoiceProvider): VoiceProfile[] {
    return this.getAllProfiles().filter(p => p.provider === provider);
  }

  // Agent voice assignment
  assignVoiceToAgent(
    agentId: string,
    strategy: VoiceAssignmentStrategy,
    agentCharacteristics?: AgentCharacteristics
  ): VoiceProfile | undefined {
    let selectedProfile: VoiceProfile | undefined;

    switch (strategy.type) {
      case "random":
        selectedProfile = this.selectRandomVoice(agentCharacteristics);
        break;
      case "round-robin":
        selectedProfile = this.selectRoundRobinVoice(agentCharacteristics);
        break;
      case "characteristic-match":
        selectedProfile = this.selectByCharacteristics(agentCharacteristics);
        break;
      case "role-based":
        selectedProfile = this.selectByRole(agentCharacteristics?.role);
        break;
      case "manual":
        if (strategy.config?.profileId) {
          selectedProfile = this.getProfile(strategy.config.profileId);
        }
        break;
      case "deterministic":
        selectedProfile = this.selectDeterministicVoice(
          agentId,
          strategy.config?.voiceIds || [],
          agentCharacteristics
        );
        break;
    }

    if (selectedProfile) {
      this.agentVoiceMapping.set(agentId, selectedProfile.id);
      this.saveMappings();
    }

    return selectedProfile;
  }

  getAgentVoiceProfile(agentId: string): VoiceProfile | undefined {
    const profileId = this.agentVoiceMapping.get(agentId);
    return profileId ? this.getProfile(profileId) : undefined;
  }

  removeAgentVoiceMapping(agentId: string): void {
    this.agentVoiceMapping.delete(agentId);
    this.saveMappings();
  }

  // Voice selection strategies
  private selectRandomVoice(characteristics?: AgentCharacteristics): VoiceProfile | undefined {
    let candidates = this.getAllProfiles();
    
    // Filter by preferred gender if specified
    if (characteristics?.preferredGender && characteristics.preferredGender !== "any") {
      candidates = candidates.filter(p => 
        p.characteristics.gender === characteristics.preferredGender
      );
    }

    if (candidates.length === 0) return undefined;
    
    const randomIndex = Math.floor(Math.random() * candidates.length);
    return candidates[randomIndex];
  }

  private selectRoundRobinVoice(characteristics?: AgentCharacteristics): VoiceProfile | undefined {
    let candidates = this.getAllProfiles();
    
    // Filter by preferred gender if specified
    if (characteristics?.preferredGender && characteristics.preferredGender !== "any") {
      candidates = candidates.filter(p => 
        p.characteristics.gender === characteristics.preferredGender
      );
    }

    if (candidates.length === 0) return undefined;
    
    const selected = candidates[this.roundRobinIndex % candidates.length];
    this.roundRobinIndex++;
    return selected;
  }

  private selectByCharacteristics(characteristics?: AgentCharacteristics): VoiceProfile | undefined {
    if (!characteristics) {
      return this.selectRandomVoice();
    }

    const profiles = this.getAllProfiles();
    let bestMatch: VoiceProfile | undefined;
    let highestScore = 0;

    for (const profile of profiles) {
      let score = 0;

      // Match gender preference
      if (characteristics.preferredGender) {
        if (characteristics.preferredGender === "any") {
          score += 1;
        } else if (profile.characteristics.gender === characteristics.preferredGender) {
          score += 3;
        }
      }

      // Match personality
      if (characteristics.personality && profile.characteristics.personality) {
        if (this.personalityMatches(characteristics.personality, profile.characteristics.personality)) {
          score += 2;
        }
      }

      // Match role
      if (characteristics.role && profile.preferredForAgentTypes) {
        if (profile.preferredForAgentTypes.some(type => 
          characteristics.role?.toLowerCase().includes(type.toLowerCase())
        )) {
          score += 3;
        }
      }

      // Match communication style
      if (characteristics.communicationStyle && profile.characteristics.style) {
        if (characteristics.communicationStyle.toLowerCase().includes(profile.characteristics.style)) {
          score += 2;
        }
      }

      // Match expertise with use cases
      if (characteristics.expertise && profile.characteristics.useCase) {
        const expertiseMatch = characteristics.expertise.some(exp =>
          profile.characteristics.useCase?.some(uc =>
            exp.toLowerCase().includes(uc.toLowerCase()) ||
            uc.toLowerCase().includes(exp.toLowerCase())
          )
        );
        if (expertiseMatch) score += 2;
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = profile;
      }
    }

    return bestMatch || this.selectRandomVoice(characteristics);
  }

  private selectByRole(role?: string): VoiceProfile | undefined {
    if (!role) return this.selectRandomVoice();

    const profiles = this.getAllProfiles();
    
    // Try exact match first
    const exactMatch = profiles.find(p =>
      p.preferredForAgentTypes?.some(type =>
        type.toLowerCase() === role.toLowerCase()
      )
    );
    
    if (exactMatch) return exactMatch;

    // Try partial match
    const partialMatch = profiles.find(p =>
      p.preferredForAgentTypes?.some(type =>
        role.toLowerCase().includes(type.toLowerCase()) ||
        type.toLowerCase().includes(role.toLowerCase())
      )
    );

    return partialMatch || this.selectRandomVoice();
  }

  private selectDeterministicVoice(
    agentId: string,
    voiceIds: string[],
    characteristics?: AgentCharacteristics
  ): VoiceProfile | undefined {
    // If no voices provided, fall back to random selection
    if (!voiceIds || voiceIds.length === 0) {
      return this.selectRandomVoice(characteristics);
    }

    // Use the getDeterministicVoiceIndex function to get a consistent index
    const voiceIndex = getDeterministicVoiceIndex(agentId, voiceIds.length);
    const selectedVoiceId = voiceIds[voiceIndex];

    // Try to find the profile by voiceId
    const profiles = this.getAllProfiles();
    
    // First try exact match with the voiceId
    let selectedProfile = profiles.find(p => p.voiceId === selectedVoiceId);
    
    // If not found, try to find by profile ID (for custom profiles)
    if (!selectedProfile) {
      selectedProfile = this.getProfile(selectedVoiceId);
    }
    
    // If still not found, create a basic profile for the voice
    if (!selectedProfile && selectedVoiceId) {
      // Determine provider based on voice ID format or default to openai
      const provider = selectedVoiceId.startsWith('elevenlabs-') ? 'elevenlabs' : 'openai';
      
      selectedProfile = {
        id: `auto-${selectedVoiceId}`,
        name: selectedVoiceId,
        voiceId: selectedVoiceId,
        provider: provider,
        characteristics: {},
        tags: [selectedVoiceId],
      };
    }
    
    return selectedProfile;
  }

  private personalityMatches(agentPersonality: string, voicePersonality: string): boolean {
    const personalityMap: Record<string, string[]> = {
      professional: ["professional", "authoritative", "formal"],
      friendly: ["friendly", "warm", "casual", "approachable"],
      authoritative: ["authoritative", "commanding", "professional"],
      casual: ["casual", "friendly", "relaxed"],
      warm: ["warm", "friendly", "approachable"],
      energetic: ["energetic", "enthusiastic", "expressive"]
    };

    const agentTraits = personalityMap[agentPersonality.toLowerCase()] || [agentPersonality.toLowerCase()];
    const voiceTraits = personalityMap[voicePersonality.toLowerCase()] || [voicePersonality.toLowerCase()];

    return agentTraits.some(trait => voiceTraits.includes(trait));
  }

  // ElevenLabs voice import
  async importElevenLabsVoices(voices: Voice[]): Promise<void> {
    for (const voice of voices) {
      const characteristics = this.extractCharacteristicsFromVoice(voice);
      
      const profile: VoiceProfile = {
        id: `elevenlabs-${voice.id}`,
        name: voice.name,
        voiceId: voice.id,
        provider: "elevenlabs",
        characteristics,
        tags: this.generateTags(voice, characteristics),
        settings: {
          stability: 0.5,
          similarityBoost: 0.5
        }
      };

      this.addProfile(profile);
    }
  }

  private extractCharacteristicsFromVoice(voice: Voice): VoiceCharacteristics {
    const characteristics: VoiceCharacteristics = {};

    if (voice.labels) {
      if (voice.labels.gender) {
        characteristics.gender = voice.labels.gender as VoiceCharacteristics["gender"];
      }
      if (voice.labels.age) {
        characteristics.ageGroup = this.mapAgeToGroup(voice.labels.age);
      }
      if (voice.labels.accent) {
        characteristics.accent = voice.labels.accent;
      }
      if (voice.labels.useCase) {
        characteristics.useCase = [voice.labels.useCase];
      }
    }

    // Parse description for additional characteristics
    if (voice.description) {
      const desc = voice.description.toLowerCase();
      
      if (desc.includes("professional")) characteristics.personality = "professional";
      else if (desc.includes("friendly")) characteristics.personality = "friendly";
      else if (desc.includes("warm")) characteristics.personality = "warm";
      else if (desc.includes("energetic")) characteristics.personality = "energetic";
      
      if (desc.includes("deep")) characteristics.tone = "deep";
      else if (desc.includes("high")) characteristics.tone = "high";
      
      if (desc.includes("conversational")) characteristics.style = "conversational";
      else if (desc.includes("narrative")) characteristics.style = "narrative";
      else if (desc.includes("expressive")) characteristics.style = "expressive";
    }

    return characteristics;
  }

  private mapAgeToGroup(age: string): VoiceCharacteristics["ageGroup"] {
    const ageLower = age.toLowerCase();
    if (ageLower.includes("young") || ageLower.includes("teen")) return "young";
    if (ageLower.includes("middle") || ageLower.includes("adult")) return "middle";
    if (ageLower.includes("mature") || ageLower.includes("senior")) return "mature";
    if (ageLower.includes("elderly") || ageLower.includes("old")) return "elderly";
    return "middle";
  }

  private generateTags(voice: Voice, characteristics: VoiceCharacteristics): string[] {
    const tags: string[] = [];
    
    if (characteristics.gender) tags.push(characteristics.gender);
    if (characteristics.accent) tags.push(characteristics.accent);
    if (characteristics.personality) tags.push(characteristics.personality);
    if (characteristics.tone) tags.push(characteristics.tone);
    if (characteristics.style) tags.push(characteristics.style);
    if (voice.name) tags.push(voice.name.toLowerCase());
    
    return tags;
  }

  // Persistence
  private loadProfiles(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const profiles = JSON.parse(stored);
        this.profiles = new Map(Object.entries(profiles));
      }
    } catch (error) {
      console.error("Failed to load voice profiles:", error);
    }
  }

  private saveProfiles(): void {
    try {
      const obj = Object.fromEntries(this.profiles);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(obj));
    } catch (error) {
      console.error("Failed to save voice profiles:", error);
    }
  }

  private loadMappings(): void {
    try {
      const stored = localStorage.getItem(this.MAPPING_KEY);
      if (stored) {
        const mappings = JSON.parse(stored);
        this.agentVoiceMapping = new Map(Object.entries(mappings));
      }
    } catch (error) {
      console.error("Failed to load agent voice mappings:", error);
    }
  }

  private saveMappings(): void {
    try {
      const obj = Object.fromEntries(this.agentVoiceMapping);
      localStorage.setItem(this.MAPPING_KEY, JSON.stringify(obj));
    } catch (error) {
      console.error("Failed to save agent voice mappings:", error);
    }
  }

  // Bulk operations
  assignVoicesToMultipleAgents(
    agentIds: string[],
    strategy: VoiceAssignmentStrategy,
    agentCharacteristicsMap?: Map<string, AgentCharacteristics>
  ): Map<string, VoiceProfile> {
    const assignments = new Map<string, VoiceProfile>();

    for (const agentId of agentIds) {
      const characteristics = agentCharacteristicsMap?.get(agentId);
      const profile = this.assignVoiceToAgent(agentId, strategy, characteristics);
      if (profile) {
        assignments.set(agentId, profile);
      }
    }

    return assignments;
  }

  // Analytics and recommendations
  getVoiceUsageStatistics(): Map<string, number> {
    const stats = new Map<string, number>();
    
    for (const profileId of this.agentVoiceMapping.values()) {
      stats.set(profileId, (stats.get(profileId) || 0) + 1);
    }
    
    return stats;
  }

  recommendVoicesForAgent(characteristics: AgentCharacteristics, count: number = 3): VoiceProfile[] {
    const profiles = this.getAllProfiles();
    const scored: { profile: VoiceProfile; score: number }[] = [];

    for (const profile of profiles) {
      let score = 0;

      // Score based on various matches
      if (characteristics.preferredGender && profile.characteristics.gender === characteristics.preferredGender) {
        score += 3;
      }

      if (characteristics.personality && profile.characteristics.personality) {
        if (this.personalityMatches(characteristics.personality, profile.characteristics.personality)) {
          score += 2;
        }
      }

      if (characteristics.role && profile.preferredForAgentTypes) {
        const roleMatch = profile.preferredForAgentTypes.some(type =>
          characteristics.role?.toLowerCase().includes(type.toLowerCase())
        );
        if (roleMatch) score += 3;
      }

      scored.push({ profile, score });
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(s => s.profile);
  }
}

/**
 * Get a deterministic voice index based on the agent/thread/project ID
 * This ensures consistent voice assignment while distributing voices evenly
 */
export function getDeterministicVoiceIndex(identifier: string, voiceCount: number): number {
  if (!identifier || voiceCount <= 0) return 0;
  
  // Create a simple hash from the identifier
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    const char = identifier.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Ensure positive number and get index within bounds
  return Math.abs(hash) % voiceCount;
}

export const voiceProfileManager = new VoiceProfileManager();