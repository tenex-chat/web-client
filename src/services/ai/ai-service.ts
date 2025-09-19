import { generateText } from "ai";
import { providerRegistry, type ProviderConfig } from "./provider-registry";
import { voiceDiscovery } from "./voice-discovery";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

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

  async generateTitle(messages: string[]): Promise<string> {
    if (!this.currentConfig) {
      // Fallback to first message or default
      return messages[0]?.slice(0, 50) || "Untitled Conversation";
    }

    try {
      const provider = providerRegistry.getProvider(this.currentConfig.id);
      const model =
        this.currentConfig.model ||
        this.getDefaultModel(this.currentConfig.provider);

      const conversationPreview = messages.slice(0, 5).join("\n---\n");

      const { text: title } = await generateText({
        model: provider(model),
        prompt: `Generate a concise, descriptive title (max 50 characters) for this conversation. Return only the title, no quotes or additional text.

Conversation:
${conversationPreview}`,
        temperature: 0.7,
        maxTokens: 20,
      });

      return title.trim().slice(0, 50);
    } catch (error) {
      console.error("Title generation error:", error);
      // Fallback to first message or default
      return messages[0]?.slice(0, 50) || "Untitled Conversation";
    }
  }

  async transcribe(
    audio: Blob,
    provider: "whisper" | "elevenlabs" | "built-in-chrome",
    apiKey?: string,
  ): Promise<string> {
    switch (provider) {
      case "whisper": {
        const key =
          apiKey ||
          (this.currentConfig?.provider === "openai"
            ? this.currentConfig.apiKey
            : null);

        if (!key) {
          throw new Error("OpenAI API key required for Whisper transcription");
        }

        const formData = new FormData();
        formData.append("file", audio, "audio.webm");
        formData.append("model", "whisper-1");

        const response = await fetch(
          "https://api.openai.com/v1/audio/transcriptions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
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

      case "elevenlabs": {
        if (!apiKey) {
          throw new Error("ElevenLabs API key required for transcription");
        }
        
        return this.transcribeWithElevenLabs(audio, apiKey);
      }

      case "built-in-chrome": {
        // Use browser's built-in Web Speech API
        return this.transcribeWithWebSpeechAPI(audio);
      }

      default:
        throw new Error(`Unsupported STT provider: ${provider}`);
    }
  }

  private async transcribeWithElevenLabs(audio: Blob, apiKey: string): Promise<string> {
    try {
      // Initialize ElevenLabs client
      const elevenlabs = new ElevenLabsClient({ apiKey });

      // Convert Blob to File for the SDK
      const file = new File([audio], "audio.webm", { 
        type: audio.type || "audio/webm" 
      });

      // Use the ElevenLabs SDK for transcription
      const result = await elevenlabs.speechToText.convert({
        file: file,
        modelId: "scribe_v1",
        tagAudioEvents: false, // Don't tag audio events for now
        diarize: false, // Don't identify speakers for single-user mode
      });

      // Extract the transcribed text from the response
      // The response can be one of three types based on the union
      if ('text' in result && result.text) {
        // SpeechToTextChunkResponseModel
        return result.text;
      } else if ('transcripts' in result && result.transcripts) {
        // MultichannelSpeechToTextResponseModel - combine all channel transcripts
        return result.transcripts.map((t: any) => t.text || '').join(' ');
      } else if ('transcriptionId' in result && result.transcriptionId) {
        // SpeechToTextWebhookResponseModel - this means it was sent to webhook
        throw new Error("Transcription sent to webhook, not available immediately");
      } else {
        console.warn("Unexpected ElevenLabs response structure:", result);
        throw new Error("Unable to extract transcription from ElevenLabs response");
      }
    } catch (error) {
      console.error("ElevenLabs transcription error:", error);
      throw error;
    }
  }

  private async transcribeWithElevenLabsExperimental(audio: Blob, apiKey: string): Promise<string> {
    try {
      // Initialize ElevenLabs client
      const elevenlabs = new ElevenLabsClient({ apiKey });

      // Convert Blob to File for the SDK
      const file = new File([audio], "audio.webm", { 
        type: audio.type || "audio/webm" 
      });

      // Use the ElevenLabs SDK for transcription with experimental model
      const result = await elevenlabs.speechToText.convert({
        file: file,
        modelId: "scribe_v1_experimental",
        tagAudioEvents: false,
        diarize: false,
      });

      // Extract the transcribed text from the response
      if ('text' in result && result.text) {
        // SpeechToTextChunkResponseModel
        return result.text;
      } else if ('transcripts' in result && result.transcripts) {
        // MultichannelSpeechToTextResponseModel - combine all channel transcripts
        return result.transcripts.map((t: any) => t.text || '').join(' ');
      } else if ('transcriptionId' in result && result.transcriptionId) {
        // SpeechToTextWebhookResponseModel - this means it was sent to webhook
        throw new Error("Transcription sent to webhook, not available immediately");
      } else {
        console.warn("Unexpected ElevenLabs experimental response structure:", result);
        throw new Error("Unable to extract transcription from ElevenLabs experimental response");
      }
    } catch (error) {
      console.error("ElevenLabs experimental transcription error:", error);
      throw error;
    }
  }

  private async transcribeWithWebSpeechAPI(audio: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      // Check if Web Speech API is available
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        reject(new Error("Web Speech API not supported in this browser"));
        return;
      }

      // Convert blob to audio URL
      const audioUrl = URL.createObjectURL(audio);
      
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        URL.revokeObjectURL(audioUrl);
        resolve(transcript);
      };

      recognition.onerror = (event: any) => {
        URL.revokeObjectURL(audioUrl);
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      recognition.onend = () => {
        URL.revokeObjectURL(audioUrl);
      };

      // Note: Web Speech API typically works with microphone input
      // For pre-recorded audio, we might need a different approach
      // This is a simplified implementation
      reject(new Error("Built-in Chrome STT requires live microphone input, not pre-recorded audio"));
    });
  }

  async speak(
    text: string,
    voiceId: string,
    voiceProvider: "openai" | "elevenlabs",
    apiKey: string,
  ): Promise<Blob> {
    return voiceDiscovery.previewVoice(voiceProvider, voiceId, text, apiKey);
  }

  async streamSpeak(
    text: string,
    voiceId: string,
    voiceProvider: "openai" | "elevenlabs",
    apiKey: string,
    onChunk?: (chunk: Uint8Array) => void,
  ): Promise<Blob> {
    return voiceDiscovery.streamVoice(voiceProvider, voiceId, text, apiKey, onChunk);
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
