import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'

export type ProviderType = 'openai' | 'anthropic' | 'google' | 'openrouter'

export interface ProviderConfig {
  id: string
  provider: ProviderType
  apiKey: string
  model?: string
  baseURL?: string
}

type AIProvider = ReturnType<typeof createOpenAI> | ReturnType<typeof createAnthropic> | ReturnType<typeof createOpenRouter>;

export class ProviderRegistry {
  private providers = new Map<string, AIProvider>()

  createProvider(config: ProviderConfig) {
    let provider: AIProvider

    switch (config.provider) {
      case 'openai':
        provider = createOpenAI({ 
          apiKey: config.apiKey,
          baseURL: config.baseURL 
        })
        break
        
      case 'anthropic':
        provider = createAnthropic({ 
          apiKey: config.apiKey,
          baseURL: config.baseURL 
        })
        break
        
      case 'google':
        provider = createGoogleGenerativeAI({ 
          apiKey: config.apiKey,
          baseURL: config.baseURL 
        })
        break
        
      case 'openrouter':
        provider = createOpenRouter({ 
          apiKey: config.apiKey,
          baseURL: config.baseURL 
        })
        break
        
      default:
        throw new Error(`Unknown provider: ${config.provider}`)
    }

    this.providers.set(config.id, { provider, config })
    return provider
  }

  getProvider(id: string) {
    const entry = this.providers.get(id)
    return entry?.provider
  }

  getConfig(id: string) {
    const entry = this.providers.get(id)
    return entry?.config
  }

  async testConnection(config: ProviderConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const provider = this.createProvider(config)
      const model = config.model || this.getDefaultModel(config.provider)
      
      await generateText({
        model: provider(model),
        prompt: 'Say "connected"',
        maxSteps: 1,
      })
      
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection failed' 
      }
    }
  }

  private getDefaultModel(provider: ProviderType): string {
    switch (provider) {
      case 'openai':
        return 'gpt-4o-mini'
      case 'anthropic':
        return 'claude-3-haiku-20240307'
      case 'google':
        return 'gemini-1.5-flash'
      case 'openrouter':
        return 'openai/gpt-4o-mini'
      default:
        return ''
    }
  }
}

export const providerRegistry = new ProviderRegistry()