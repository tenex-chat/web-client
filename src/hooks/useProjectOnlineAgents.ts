import { useMemo } from 'react'
import { useProjectStatus } from '@/stores/projects'

export interface ProjectOnlineAgent {
  pubkey: string
  name: string
  status?: string
  lastSeen?: number
}

/**
 * Fetches the ONLINE agents for a project from the project status.
 * These are agents that are currently online and available to work with the project.
 * 
 * For CONFIGURED agents (project settings), use useProjectConfiguredAgents() instead!
 * 
 * This should be used in chat interfaces, agent selectors, and anywhere you need
 * to interact with agents that are actually available.
 */
export function useProjectOnlineAgents(projectDTag?: string): ProjectOnlineAgent[] {
  const projectStatus = useProjectStatus(projectDTag)
  
  const onlineAgents = useMemo(() => {
    if (!projectStatus?.agents) return []
    
    return projectStatus.agents.map(agent => ({
      pubkey: agent.pubkey,
      name: agent.name || agent.pubkey.slice(0, 8),
      status: agent.status,
      lastSeen: agent.lastSeen
    }))
  }, [projectStatus])
  
  return onlineAgents
}