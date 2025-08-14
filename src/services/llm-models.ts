import { logger } from '@/lib/logger';

interface OpenRouterModel {
  id: string;
  name: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  architecture?: {
    modality: string;
  };
}

interface ProviderModels {
  [provider: string]: string[];
}

export const DEFAULT_MODELS = {
  openai: 'gpt-3.5-turbo',
  anthropic: 'claude-3-opus-20240229',
  google: 'gemini-pro',
  ollama: 'llama2',
  groq: 'mixtral-8x7b-32768',
  openrouter: 'auto',
} as const;

const PROVIDER_DEFAULTS: ProviderModels = {
  openai: ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
  google: ['gemini-pro', 'gemini-pro-vision'],
  ollama: ['llama2', 'mistral', 'codellama'],
  groq: ['mixtral-8x7b-32768', 'llama2-70b-4096'],
};

export async function fetchOpenRouterModels(): Promise<string[]> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models');
    if (!response.ok) {
      logger.warn('Failed to fetch OpenRouter models, using defaults');
      return ['auto'];
    }
    
    const data = await response.json();
    const models = data.data as OpenRouterModel[];
    
    // Sort by name and return model IDs
    return models
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(model => model.id);
  } catch (error) {
    logger.error('Error fetching OpenRouter models:', error);
    return ['auto'];
  }
}

export async function fetchProviderModels(provider: string, apiKey?: string): Promise<string[]> {
  switch (provider) {
    case 'openrouter':
      return fetchOpenRouterModels();
    
    case 'openai':
      if (apiKey) {
        try {
          const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            return data.data
              .filter((model: { id: string }) => model.id.includes('gpt'))
              .map((model: { id: string }) => model.id)
              .sort();
          }
        } catch (error) {
          logger.error('Error fetching OpenAI models:', error);
        }
      }
      return PROVIDER_DEFAULTS.openai;
    
    case 'anthropic':
      // Anthropic doesn't have a public models endpoint
      return PROVIDER_DEFAULTS.anthropic;
    
    case 'google':
      // Google doesn't have a simple models endpoint
      return PROVIDER_DEFAULTS.google;
    
    case 'ollama':
      // Could fetch from local Ollama instance if running
      try {
        const response = await fetch('http://localhost:11434/api/tags');
        if (response.ok) {
          const data = await response.json();
          return data.models?.map((model: { name: string }) => model.name) || PROVIDER_DEFAULTS.ollama;
        }
      } catch {
        // Ollama not running locally
      }
      return PROVIDER_DEFAULTS.ollama;
    
    case 'groq':
      // Groq doesn't have a public models endpoint
      return PROVIDER_DEFAULTS.groq;
    
    default:
      return [];
  }
}