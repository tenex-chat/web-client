import { useMemo } from 'react'
import { useProjectStatus } from '@/stores/projects'

/**
 * Gets all unique tools available in the project from all agents.
 * This is extracted from the project status (24010 event).
 */
export function useProjectAvailableTools(projectDTag?: string): string[] {
  const projectStatus = useProjectStatus(projectDTag)
  
  const availableTools = useMemo(() => {
    if (!projectStatus?.agents) return []
    
    // Collect all unique tools from all agents
    const toolSet = new Set<string>()
    
    projectStatus.agents.forEach(agent => {
      if (agent.tools) {
        agent.tools.forEach(tool => toolSet.add(tool))
      }
    })
    
    // Return sorted array of unique tools
    return Array.from(toolSet).sort()
  }, [projectStatus])
  
  return availableTools
}