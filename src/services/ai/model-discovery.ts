import { ProviderType } from "./provider-registry";

export interface Model {
  id: string;
  name: string;
  category?: string;
  contextLength?: number;
  pricing?: {
    prompt: number;
    completion: number;
  };
}

export class ModelDiscovery {
  private cache = new Map<string, { models: Model[]; timestamp: number }>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  async fetchModels(provider: ProviderType, apiKey: string): Promise<Model[]> {
    const cacheKey = `${provider}-${apiKey.slice(0, 8)}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.models;
    }

    try {
      const models = await this.fetchFromProvider(provider, apiKey);
      this.cache.set(cacheKey, { models, timestamp: Date.now() });
      return models;
    } catch (error) {
      console.error(`Failed to fetch models for ${provider}:`, error);
      throw error;
    }
  }

  private async fetchFromProvider(
    provider: ProviderType,
    apiKey: string,
  ): Promise<Model[]> {
    switch (provider) {
      case "openai":
        return this.fetchOpenAIModels(apiKey);
      case "openrouter":
        return this.fetchOpenRouterModels(apiKey);
      case "anthropic":
        return this.fetchAnthropicModels();
      case "google":
        return this.fetchGoogleModels();
      default:
        throw new Error(`Model discovery not implemented for ${provider}`);
    }
  }

  private async fetchOpenAIModels(apiKey: string): Promise<Model[]> {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();

    interface OpenAIModel {
      id: string;
      object?: string;
      created?: number;
      owned_by?: string;
    }

    return data.data
      .filter(
        (m: OpenAIModel) =>
          m.id.includes("gpt") ||
          m.id.includes("whisper") ||
          m.id.includes("tts"),
      )
      .map((m: OpenAIModel) => ({
        id: m.id,
        name: m.id,
        category: this.categorizeOpenAIModel(m.id),
      }))
      .sort((a: Model, b: Model) => {
        // Sort by category, then by name
        if (a.category !== b.category) {
          const order = ["Text Generation", "Speech", "Legacy"];
          return (
            order.indexOf(a.category || "") - order.indexOf(b.category || "")
          );
        }
        return a.name.localeCompare(b.name);
      });
  }

  private categorizeOpenAIModel(modelId: string): string {
    if (modelId.includes("whisper") || modelId.includes("tts")) {
      return "Speech";
    }
    if (modelId.includes("gpt-3.5") || modelId.includes("davinci")) {
      return "Legacy";
    }
    return "Text Generation";
  }

  private async fetchOpenRouterModels(apiKey: string): Promise<Model[]> {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();

    interface OpenRouterModel {
      id: string;
      name: string;
      pricing: {
        prompt: number;
        completion?: number;
      };
    }

    return data.data.map((m: OpenRouterModel) => ({
      id: m.id,
      name: `${m.name} ($${m.pricing.prompt}/1M tokens)`,
      contextLength: m.context_length,
      pricing: {
        prompt: parseFloat(m.pricing.prompt),
        completion: parseFloat(m.pricing.completion),
      },
    }));
  }

  private async fetchAnthropicModels(): Promise<Model[]> {
    // Anthropic doesn't have a public models endpoint
    // Return known models that we can update periodically
    return [
      {
        id: "claude-3-opus-20240229",
        name: "Claude 3 Opus",
        category: "Advanced",
      },
      {
        id: "claude-3-5-sonnet-20241022",
        name: "Claude 3.5 Sonnet",
        category: "Balanced",
      },
      {
        id: "claude-3-haiku-20240307",
        name: "Claude 3 Haiku",
        category: "Fast",
      },
    ];
  }

  private async fetchGoogleModels(): Promise<Model[]> {
    // Google doesn't have a simple public endpoint
    // Return known Gemini models
    return [
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", category: "Advanced" },
      {
        id: "gemini-1.5-pro-002",
        name: "Gemini 1.5 Pro 002",
        category: "Advanced",
      },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", category: "Fast" },
      {
        id: "gemini-1.5-flash-002",
        name: "Gemini 1.5 Flash 002",
        category: "Fast",
      },
    ];
  }

  clearCache() {
    this.cache.clear();
  }
}

export const modelDiscovery = new ModelDiscovery();
