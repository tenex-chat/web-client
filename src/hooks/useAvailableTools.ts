import { useMemo } from 'react'
import { useProjectsStore } from '@/stores/projects'

/**
 * Gets all unique tools from all project status events (24010)
 * These are the actual tools that agents have access to across all projects
 */
export function useAvailableTools(): string[] {
  const projectStatusMap = useProjectsStore(state => state.projectStatus)
  
  return useMemo(() => {
    const toolSet = new Set<string>()
    
    // Iterate through all project statuses
    projectStatusMap.forEach((status) => {
      if (!status?.statusEvent) return
      
      // Extract tools from status event tags
      // Tools are stored as ["tool", "tool_name"] or ["tool", "tool_name", "agent1", "agent2"]
      status.statusEvent.tags.forEach(tag => {
        if (tag[0] === 'tool' && tag[1]) {
          toolSet.add(tag[1])
        }
      })
      
      // Also get tools from agents in the status
      status.agents?.forEach(agent => {
        agent.tools?.forEach(tool => {
          toolSet.add(tool)
        })
      })
    })
    
    // Return sorted array of unique tools
    return Array.from(toolSet).sort()
  }, [projectStatusMap])
}