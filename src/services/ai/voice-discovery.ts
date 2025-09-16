import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export type VoiceProvider = "openai" | "elevenlabs";

export interface Voice {
  id: string;
  name: string;
  description?: string;
  labels?: {
    accent?: string;
    age?: string;
    gender?: string;
    useCase?: string;
  };
  previewUrl?: string;
}

export class VoiceDiscovery {
  private cache = new Map<string, { voices: Voice[]; timestamp: number }>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  async fetchVoices(provider: VoiceProvider, apiKey: string): Promise<Voice[]> {
    const cacheKey = `${provider}-${apiKey.slice(0, 8)}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.voices;
    }

    try {
      const voices = await this.fetchFromProvider(provider, apiKey);
      this.cache.set(cacheKey, { voices, timestamp: Date.now() });
      return voices;
    } catch (error) {
      console.error(`Failed to fetch voices for ${provider}:`, error);
      throw error;
    }
  }

  private async fetchFromProvider(
    provider: VoiceProvider,
    apiKey: string,
  ): Promise<Voice[]> {
    switch (provider) {
      case "openai":
        return this.fetchOpenAIVoices();
      case "elevenlabs":
        return this.fetchElevenLabsVoices(apiKey);
      default:
        throw new Error(`Voice discovery not implemented for ${provider}`);
    }
  }

  private async fetchOpenAIVoices(): Promise<Voice[]> {
    // OpenAI doesn't have an endpoint for voices, but we know what's available
    // These are the current OpenAI TTS voices
    return [
      {
        id: "alloy",
        name: "Alloy",
        description: "Neutral and balanced",
        labels: { gender: "neutral" },
      },
      {
        id: "echo",
        name: "Echo",
        description: "Male voice",
        labels: { gender: "male" },
      },
      {
        id: "fable",
        name: "Fable",
        description: "British accent",
        labels: { accent: "british", gender: "male" },
      },
      {
        id: "onyx",
        name: "Onyx",
        description: "Deep male voice",
        labels: { gender: "male", useCase: "narration" },
      },
      {
        id: "nova",
        name: "Nova",
        description: "Female voice",
        labels: { gender: "female" },
      },
      {
        id: "shimmer",
        name: "Shimmer",
        description: "Expressive female voice",
        labels: { gender: "female", useCase: "expressive" },
      },
    ];
  }

  private async fetchElevenLabsVoices(apiKey: string): Promise<Voice[]> {
    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.statusText}`);
    }

    const data = await response.json();

    interface ElevenLabsVoice {
      voice_id: string;
      name: string;
      labels?: {
        age?: string;
        gender?: string;
        accent?: string;
      };
      preview_url?: string;
    }

    return data.voices.map((v: ElevenLabsVoice) => ({
      id: v.voice_id,
      name: v.name,
      description:
        `${v.labels?.age || ""} ${v.labels?.gender || ""} ${v.labels?.accent || ""}`.trim(),
      labels: v.labels,
      previewUrl: v.preview_url,
    }));
  }

  async previewVoice(
    provider: VoiceProvider,
    voiceId: string,
    text: string,
    apiKey: string,
  ): Promise<Blob> {
    switch (provider) {
      case "openai":
        return this.previewOpenAIVoice(voiceId, text, apiKey);
      case "elevenlabs":
        return this.previewElevenLabsVoice(voiceId, text, apiKey);
      default:
        throw new Error(`Voice preview not implemented for ${provider}`);
    }
  }

  // Stream voice with progressive chunks for real-time playback
  async streamVoice(
    provider: VoiceProvider,
    voiceId: string,
    text: string,
    apiKey: string,
    onChunk?: (chunk: Uint8Array) => void,
  ): Promise<Blob> {
    switch (provider) {
      case "openai":
        // OpenAI doesn't support streaming in the same way, return full blob
        const blob = await this.previewOpenAIVoice(voiceId, text, apiKey);
        if (onChunk) {
          const arrayBuffer = await blob.arrayBuffer();
          onChunk(new Uint8Array(arrayBuffer));
        }
        return blob;
      case "elevenlabs":
        return this.streamElevenLabsVoice(voiceId, text, apiKey, onChunk);
      default:
        throw new Error(`Voice streaming not implemented for ${provider}`);
    }
  }

  private async previewOpenAIVoice(
    voiceId: string,
    text: string,
    apiKey: string,
  ): Promise<Blob> {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: voiceId,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI TTS error: ${response.statusText}`);
    }

    return response.blob();
  }

  private async previewElevenLabsVoice(
    voiceId: string,
    text: string,
    apiKey: string,
  ): Promise<Blob> {
    const client = new ElevenLabsClient({
      apiKey: apiKey,
    });

    try {
      // Use stream method with turbo model for lower latency
      const audioStream = await client.textToSpeech.stream(voiceId, {
        text: text,
        model_id: "eleven_turbo_v2_5",
        optimize_streaming_latency: 2,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      });

      // The stream method returns a ReadableStream directly
      if (!audioStream) {
        throw new Error("No audio stream received");
      }

      // Convert stream to Blob
      const chunks: Uint8Array[] = [];
      const reader = audioStream.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      return new Blob(chunks, { type: 'audio/mpeg' });
    } catch (error) {
      throw new Error(`ElevenLabs TTS error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // New method for true streaming with progressive playback
  async streamElevenLabsVoice(
    voiceId: string,
    text: string,
    apiKey: string,
    onChunk?: (chunk: Uint8Array) => void,
  ): Promise<Blob> {
    const client = new ElevenLabsClient({
      apiKey: apiKey,
    });

    try {
      // Use the streaming method from the SDK
      const audioStream = await client.textToSpeech.stream(voiceId, {
        text: text,
        model_id: "eleven_turbo_v2_5",
        optimize_streaming_latency: 3,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      });

      // The stream method returns a ReadableStream directly
      if (!audioStream) {
        throw new Error("No audio stream received");
      }

      const chunks: Uint8Array[] = [];
      const reader = audioStream.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);

        // Call the callback with each chunk for progressive playback
        if (onChunk) {
          onChunk(value);
        }
      }

      // Return the complete audio blob
      return new Blob(chunks, { type: 'audio/mpeg' });
    } catch (error) {
      throw new Error(`ElevenLabs streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

export const voiceDiscovery = new VoiceDiscovery();
