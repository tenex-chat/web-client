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
      // Just use the slug directly - no formatting
      return {
        provider: model.name,  // slug
        model: model.name,     // slug
        label: model.name      // slug - show it as-is
      }
    })
  }, [projectStatus])
  
  return onlineModels
}

