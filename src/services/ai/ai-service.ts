import { generateText } from "ai";
import { providerRegistry, type ProviderConfig } from "./provider-registry";
import { voiceDiscovery } from "./voice-discovery";

class AIService {
  private currentConfig: ProviderConfig | null = null;

  setProvider(config: ProviderConfig) {
    this.currentConfig = config;
    providerRegistry.createProvider(config);
  }

  async cleanText(text: string): Promise<string> {
    if (!this.currentConfig) {
      // Basic fallback cleanup without AI
      return text
        .trim()
        .replace(/\s+/g, " ")
        .replace(
          /([.!?])\s*([a-z])/g,
          (_, p1, p2) => `${p1} ${p2.toUpperCase()}`,
        );
    }

    try {
      const provider = providerRegistry.getProvider(this.currentConfig.id);
      const model =
        this.currentConfig.model ||
        this.getDefaultModel(this.currentConfig.provider);

      const { text: cleaned } = await generateText({
        model: provider(model),
        prompt: `You are a helpful assistant that cleans up voice transcriptions. Fix any grammar, punctuation, and capitalization issues. Remove filler words like 'um', 'uh', etc. Keep the meaning and tone exactly the same. Return only the cleaned text without any additional commentary.

Text to clean: ${text}`,
        temperature: 0.3,
        maxSteps: 1,
      });

      return cleaned;
    } catch (error) {
      console.error("Text cleanup error:", error);
      // Fallback to basic cleanup
      return text
        .trim()
        .replace(/\s+/g, " ")
        .replace(
          /([.!?])\s*([a-z])/g,
          (_, p1, p2) => `${p1} ${p2.toUpperCase()}`,
        );
    }
  }

  async transcribe(audio: Blob, openAIKey?: string): Promise<string> {
    const apiKey =
      openAIKey ||
      (this.currentConfig?.provider === "openai"
        ? this.currentConfig.apiKey
        : null);

    if (!apiKey) {
      throw new Error("OpenAI API key required for transcription");
    }

    const formData = new FormData();
    formData.append("file", audio, "audio.webm");
    formData.append("model", "whisper-1");

    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.text;
  }

  async speak(
    text: string,
    voiceId: string,
    voiceProvider: "openai" | "elevenlabs",
    apiKey: string,
  ): Promise<Blob> {
    return voiceDiscovery.previewVoice(voiceProvider, voiceId, text, apiKey);
  }

  private getDefaultModel(provider: string): string {
    switch (provider) {
      case "openai":
        return "gpt-4o-mini";
      case "anthropic":
        return "claude-3-haiku-20240307";
      case "google":
        return "gemini-1.5-flash";
      case "openrouter":
        return "openai/gpt-4o-mini";
      default:
        return "";
    }
  }
}

export const aiService = new AIService();
