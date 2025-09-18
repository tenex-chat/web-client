import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import type { Voice, VoiceSettings, VoiceCategory } from "@elevenlabs/elevenlabs-js";
import { VoiceCharacteristics, VoiceProfile } from "./voice-profile-manager";

interface ElevenLabsVoiceMetadata {
  voice_id: string;
  name: string;
  description?: string;
  labels?: {
    age?: string;
    gender?: string;
    accent?: string;
    description?: string;
    use_case?: string;
    featured?: boolean;
    language?: string;
  };
  category?: VoiceCategory;
  available_for_tiers?: string[];
  samples?: Array<{
    sample_id: string;
    file_name: string;
    mime_type: string;
    size_bytes: number;
    hash: string;
  }>;
  fine_tuning?: {
    is_allowed_to_fine_tune: boolean;
    state: object;
    verification_failures: string[];
    verification_attempts_count: number;
    manual_verification_requested: boolean;
    slice_ids: string[];
    manual_verification?: object;
  };
  high_quality_base_model_ids?: string[];
}

export class ElevenLabsVoiceAnalyzer {
  private client: ElevenLabsClient | null = null;
  private voiceCache: Map<string, ElevenLabsVoiceMetadata> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private lastCacheUpdate: number = 0;

  constructor(private apiKey?: string) {
    if (apiKey) {
      this.client = new ElevenLabsClient({ apiKey });
    }
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    this.client = new ElevenLabsClient({ apiKey });
  }

  async fetchAllVoices(forceRefresh = false): Promise<ElevenLabsVoiceMetadata[]> {
    if (!this.client) {
      throw new Error("ElevenLabs API key not configured");
    }

    // Check cache
    if (!forceRefresh && 
        this.voiceCache.size > 0 && 
        Date.now() - this.lastCacheUpdate < this.CACHE_DURATION) {
      return Array.from(this.voiceCache.values());
    }

    try {
      const response = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: {
          "xi-api-key": this.apiKey!,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.statusText}`);
      }

      const data = await response.json();
      const voices = data.voices as ElevenLabsVoiceMetadata[];

      // Update cache
      this.voiceCache.clear();
      voices.forEach(voice => {
        this.voiceCache.set(voice.voice_id, voice);
      });
      this.lastCacheUpdate = Date.now();

      return voices;
    } catch (error) {
      console.error("Failed to fetch ElevenLabs voices:", error);
      throw error;
    }
  }

  async analyzeVoiceCharacteristics(voiceId: string): Promise<VoiceCharacteristics> {
    const voice = this.voiceCache.get(voiceId);
    if (!voice) {
      // Try to fetch if not in cache
      await this.fetchAllVoices();
      const fetchedVoice = this.voiceCache.get(voiceId);
      if (!fetchedVoice) {
        throw new Error(`Voice ${voiceId} not found`);
      }
      return this.extractCharacteristics(fetchedVoice);
    }
    return this.extractCharacteristics(voice);
  }

  private extractCharacteristics(voice: ElevenLabsVoiceMetadata): VoiceCharacteristics {
    const characteristics: VoiceCharacteristics = {};

    // Extract from labels
    if (voice.labels) {
      // Gender
      if (voice.labels.gender) {
        const genderMap: Record<string, VoiceCharacteristics["gender"]> = {
          male: "male",
          female: "female",
          neutral: "neutral",
        };
        characteristics.gender = genderMap[voice.labels.gender.toLowerCase()] || "neutral";
      }

      // Age group
      if (voice.labels.age) {
        characteristics.ageGroup = this.mapAgeToGroup(voice.labels.age);
      }

      // Accent
      if (voice.labels.accent) {
        characteristics.accent = voice.labels.accent;
      }

      // Use case
      if (voice.labels.use_case) {
        characteristics.useCase = [voice.labels.use_case];
      }

      // Parse description for additional characteristics
      if (voice.labels.description) {
        const desc = voice.labels.description.toLowerCase();
        
        // Personality
        if (desc.includes("professional") || desc.includes("formal")) {
          characteristics.personality = "professional";
        } else if (desc.includes("friendly") || desc.includes("warm")) {
          characteristics.personality = "friendly";
        } else if (desc.includes("authoritative") || desc.includes("commanding")) {
          characteristics.personality = "authoritative";
        } else if (desc.includes("casual") || desc.includes("relaxed")) {
          characteristics.personality = "casual";
        } else if (desc.includes("energetic") || desc.includes("enthusiastic")) {
          characteristics.personality = "energetic";
        }

        // Tone
        if (desc.includes("deep") || desc.includes("bass")) {
          characteristics.tone = "deep";
        } else if (desc.includes("high") || desc.includes("bright")) {
          characteristics.tone = "high";
        } else {
          characteristics.tone = "medium";
        }

        // Style
        if (desc.includes("conversational") || desc.includes("natural")) {
          characteristics.style = "conversational";
        } else if (desc.includes("narrative") || desc.includes("storytelling")) {
          characteristics.style = "narrative";
        } else if (desc.includes("technical") || desc.includes("clear")) {
          characteristics.style = "technical";
        } else if (desc.includes("expressive") || desc.includes("emotional")) {
          characteristics.style = "expressive";
        }
      }
    }

    // Additional analysis based on voice name patterns
    const nameLower = voice.name.toLowerCase();
    
    if (!characteristics.personality) {
      if (nameLower.includes("professional") || nameLower.includes("business")) {
        characteristics.personality = "professional";
      } else if (nameLower.includes("friendly") || nameLower.includes("casual")) {
        characteristics.personality = "friendly";
      }
    }

    return characteristics;
  }

  private mapAgeToGroup(age: string): VoiceCharacteristics["ageGroup"] {
    const ageLower = age.toLowerCase();
    
    if (ageLower.includes("young") || 
        ageLower.includes("teen") || 
        ageLower.includes("youth") ||
        ageLower.includes("20s")) {
      return "young";
    }
    
    if (ageLower.includes("middle") || 
        ageLower.includes("adult") ||
        ageLower.includes("30s") ||
        ageLower.includes("40s")) {
      return "middle";
    }
    
    if (ageLower.includes("mature") || 
        ageLower.includes("senior") ||
        ageLower.includes("50s") ||
        ageLower.includes("60s")) {
      return "mature";
    }
    
    if (ageLower.includes("elderly") || 
        ageLower.includes("old") ||
        ageLower.includes("70s") ||
        ageLower.includes("80s")) {
      return "elderly";
    }
    
    return "middle"; // Default
  }

  async generateVoiceProfiles(filterPredicate?: (voice: ElevenLabsVoiceMetadata) => boolean): Promise<VoiceProfile[]> {
    const voices = await this.fetchAllVoices();
    const profiles: VoiceProfile[] = [];

    for (const voice of voices) {
      // Apply filter if provided
      if (filterPredicate && !filterPredicate(voice)) {
        continue;
      }

      const characteristics = this.extractCharacteristics(voice);
      
      const profile: VoiceProfile = {
        id: `elevenlabs-${voice.voice_id}`,
        name: voice.name,
        voiceId: voice.voice_id,
        provider: "elevenlabs",
        characteristics,
        tags: this.generateTags(voice, characteristics),
        preferredForAgentTypes: this.suggestAgentTypes(characteristics),
        settings: {
          stability: 0.5,
          similarityBoost: 0.5,
          speed: 1.0,
        },
      };

      profiles.push(profile);
    }

    return profiles;
  }

  private generateTags(voice: ElevenLabsVoiceMetadata, characteristics: VoiceCharacteristics): string[] {
    const tags: string[] = [];
    
    // Add characteristic tags
    if (characteristics.gender) tags.push(characteristics.gender);
    if (characteristics.ageGroup) tags.push(characteristics.ageGroup);
    if (characteristics.accent) tags.push(characteristics.accent);
    if (characteristics.personality) tags.push(characteristics.personality);
    if (characteristics.tone) tags.push(characteristics.tone);
    if (characteristics.style) tags.push(characteristics.style);
    
    // Add label tags
    if (voice.labels?.language) tags.push(voice.labels.language);
    if (voice.labels?.featured) tags.push("featured");
    if (voice.category) tags.push(voice.category);
    
    // Add name-based tags
    tags.push(voice.name.toLowerCase().replace(/\s+/g, "-"));
    
    return [...new Set(tags)]; // Remove duplicates
  }

  private suggestAgentTypes(characteristics: VoiceCharacteristics): string[] {
    const suggestions: string[] = [];

    // Based on personality
    if (characteristics.personality === "professional") {
      suggestions.push("assistant", "analyst", "consultant", "advisor");
    } else if (characteristics.personality === "friendly") {
      suggestions.push("guide", "tutor", "support", "companion");
    } else if (characteristics.personality === "authoritative") {
      suggestions.push("expert", "leader", "instructor", "moderator");
    } else if (characteristics.personality === "casual") {
      suggestions.push("friend", "buddy", "peer", "collaborator");
    } else if (characteristics.personality === "energetic") {
      suggestions.push("motivator", "coach", "presenter", "entertainer");
    }

    // Based on style
    if (characteristics.style === "conversational") {
      suggestions.push("chatbot", "companion", "assistant");
    } else if (characteristics.style === "narrative") {
      suggestions.push("narrator", "storyteller", "guide");
    } else if (characteristics.style === "technical") {
      suggestions.push("developer", "technical-support", "instructor");
    } else if (characteristics.style === "expressive") {
      suggestions.push("creative", "artist", "performer");
    }

    // Based on use case
    if (characteristics.useCase) {
      characteristics.useCase.forEach(useCase => {
        const ucLower = useCase.toLowerCase();
        if (ucLower.includes("education")) {
          suggestions.push("teacher", "tutor", "educator");
        } else if (ucLower.includes("business")) {
          suggestions.push("professional", "executive", "manager");
        } else if (ucLower.includes("entertainment")) {
          suggestions.push("entertainer", "host", "presenter");
        } else if (ucLower.includes("customer")) {
          suggestions.push("support", "service", "representative");
        }
      });
    }

    return [...new Set(suggestions)]; // Remove duplicates
  }

  async findBestVoiceMatch(
    targetCharacteristics: Partial<VoiceCharacteristics>,
    topN: number = 5
  ): Promise<Array<{ voice: ElevenLabsVoiceMetadata; score: number }>> {
    const voices = await this.fetchAllVoices();
    const scoredVoices: Array<{ voice: ElevenLabsVoiceMetadata; score: number }> = [];

    for (const voice of voices) {
      const voiceCharacteristics = this.extractCharacteristics(voice);
      const score = this.calculateMatchScore(targetCharacteristics, voiceCharacteristics);
      scoredVoices.push({ voice, score });
    }

    // Sort by score descending
    scoredVoices.sort((a, b) => b.score - a.score);
    
    return scoredVoices.slice(0, topN);
  }

  private calculateMatchScore(
    target: Partial<VoiceCharacteristics>,
    voice: VoiceCharacteristics
  ): number {
    let score = 0;
    const weights = {
      gender: 3,
      ageGroup: 2,
      accent: 2,
      personality: 3,
      tone: 1,
      style: 2,
      useCase: 2,
    };

    // Gender match
    if (target.gender && voice.gender) {
      if (target.gender === voice.gender) {
        score += weights.gender;
      }
    }

    // Age group match
    if (target.ageGroup && voice.ageGroup) {
      if (target.ageGroup === voice.ageGroup) {
        score += weights.ageGroup;
      }
    }

    // Accent match
    if (target.accent && voice.accent) {
      if (target.accent.toLowerCase() === voice.accent.toLowerCase()) {
        score += weights.accent;
      }
    }

    // Personality match
    if (target.personality && voice.personality) {
      if (target.personality === voice.personality) {
        score += weights.personality;
      }
    }

    // Tone match
    if (target.tone && voice.tone) {
      if (target.tone === voice.tone) {
        score += weights.tone;
      }
    }

    // Style match
    if (target.style && voice.style) {
      if (target.style === voice.style) {
        score += weights.style;
      }
    }

    // Use case match
    if (target.useCase && voice.useCase) {
      const commonUseCases = target.useCase.filter(uc =>
        voice.useCase?.some(vuc =>
          vuc.toLowerCase().includes(uc.toLowerCase()) ||
          uc.toLowerCase().includes(vuc.toLowerCase())
        )
      );
      if (commonUseCases.length > 0) {
        score += weights.useCase * (commonUseCases.length / target.useCase.length);
      }
    }

    return score;
  }

  // Get voice categories available in the account
  async getAvailableCategories(): Promise<string[]> {
    const voices = await this.fetchAllVoices();
    const categories = new Set<string>();
    
    voices.forEach(voice => {
      if (voice.category) {
        categories.add(voice.category);
      }
    });
    
    return Array.from(categories);
  }

  // Get featured voices
  async getFeaturedVoices(): Promise<ElevenLabsVoiceMetadata[]> {
    const voices = await this.fetchAllVoices();
    return voices.filter(voice => voice.labels?.featured === true);
  }

  // Get voices by language
  async getVoicesByLanguage(language: string): Promise<ElevenLabsVoiceMetadata[]> {
    const voices = await this.fetchAllVoices();
    return voices.filter(voice => 
      voice.labels?.language?.toLowerCase() === language.toLowerCase()
    );
  }
}

export const elevenLabsVoiceAnalyzer = new ElevenLabsVoiceAnalyzer();