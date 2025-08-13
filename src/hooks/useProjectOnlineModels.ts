import { useMemo } from 'react'
import { useProjectStatus } from '@/stores/projects'

export interface ModelOption {
  provider: string
  model: string
  label: string
}

/**
 * Fetches the available models for a project from the project status.
 * These are models that are currently available to work with the project.
 * 
 * This should be used in chat interfaces, model selectors, and anywhere you need
 * to interact with models that are actually available.
 */
export function useProjectOnlineModels(projectDTag?: string): ModelOption[] {
  const projectStatus = useProjectStatus(projectDTag)
  
  const onlineModels = useMemo(() => {
    if (!projectStatus?.models || projectStatus.models.length === 0) {
      return []
    }
    
    return projectStatus.models.map(model => {
      // Extract provider name from the provider string (e.g., "anthropic/claude-sonnet-4" -> "anthropic")
      const providerName = model.provider.split('/')[0]
      
      // Create a human-readable label
      const label = formatModelLabel(providerName, model.name)
      
      return {
        provider: providerName,
        model: model.name,
        label
      }
    })
  }, [projectStatus])
  
  return onlineModels
}

/**
 * Formats a model name into a human-readable label
 */
function formatModelLabel(provider: string, modelName: string): string {
  // Provider-specific formatting
  const providerLabel = provider.charAt(0).toUpperCase() + provider.slice(1)
  
  // Common model name transformations
  const formattedModel = modelName
    .replace(/-/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
    .replace(/Gpt/g, 'GPT')
    .replace(/Llama/g, 'Llama')
    .replace(/Claude/g, 'Claude')
    .replace(/Gemini/g, 'Gemini')
    .replace(/\d+(\.\d+)?/g, match => ` ${match}`)
    .replace(/\s+/g, ' ')
    .trim()
  
  return `${providerLabel} ${formattedModel}`
}