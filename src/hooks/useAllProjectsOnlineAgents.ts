import { useMemo } from 'react'
import { useProjectStatusMap, useProjectsMap } from '@/stores/projects'
import type { AgentInstance, ProjectGroup } from '@/types/agent'
import { transformAgentData, getProjectDisplayName } from '@/lib/utils/agentUtils'

// Re-export for backward compatibility
export type CrossProjectAgent = AgentInstance

/**
 * Fetches ONLINE agents from ALL projects the user has access to.
 * Includes project context for each agent to distinguish between agents
 * from different projects.
 * 
 * Useful for cross-project mentions and global agent discovery.
 */
export function useAllProjectsOnlineAgents(): AgentInstance[] {
  const projectStatusMap = useProjectStatusMap()
  const projectsMap = useProjectsMap()
  
  const allAgents = useMemo(() => {
    const agentsMap = new Map<string, AgentInstance>()
    
    // Iterate through all project statuses
    projectStatusMap.forEach((status, projectDTag) => {
      const project = projectsMap.get(projectDTag)
      if (!project || !status?.agents) return
      
      // Add each agent with project context
      status.agents.forEach(agent => {
        // Use pubkey as key to handle deduplication
        // If agent exists in multiple projects, keep the first occurrence
        // but track all projects they're in
        if (!agentsMap.has(agent.pubkey)) {
          agentsMap.set(agent.pubkey, transformAgentData(agent, project))
        }
      })
    })
    
    // Convert map to array and sort by name
    return Array.from(agentsMap.values()).sort((a, b) => 
      a.name.localeCompare(b.name)
    )
  }, [projectStatusMap, projectsMap])
  
  return allAgents
}

/**
 * Get agents grouped by project for UI display
 */
export function useAllProjectsOnlineAgentsGrouped() {
  const projectStatusMap = useProjectStatusMap()
  const projectsMap = useProjectsMap()
  
  const groupedAgents = useMemo(() => {
    const groups = new Map<string, {
      projectName: string
      projectDTag: string
      agents: CrossProjectAgent[]
    }>()
    
    projectStatusMap.forEach((status, projectDTag) => {
      const project = projectsMap.get(projectDTag)
      if (!project || !status?.agents || status.agents.length === 0) return
      
      const projectAgents = status.agents.map(agent => ({
        pubkey: agent.pubkey,
        name: agent.name || agent.pubkey.slice(0, 8),
        projectName: project.title || project.dTag || 'Unknown Project',
        projectDTag: project.dTag || '',
        status: agent.status,
        lastSeen: agent.lastSeen
      }))
      
      groups.set(projectDTag, {
        projectName: project.title || project.dTag || 'Unknown Project',
        projectDTag: project.dTag || '',
        agents: projectAgents
      })
    })
    
    return Array.from(groups.values()).sort((a, b) => 
      a.projectName.localeCompare(b.projectName)
    )
  }, [projectStatusMap, projectsMap])
  
  return groupedAgents
}