import { useMemo } from 'react'
import { useProjectStatus } from '@/stores/projects'

export interface ProjectOnlineAgent {
  pubkey: string
  slug: string        // Agent slug from the 24010 event
  model?: string      // Model slug from the 24010 event
  status?: string
  lastSeen?: number
  tools?: string[]
  isGlobal?: boolean
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
      slug: agent.name,  // The 'name' field from 24010 is actually the agent slug
      model: agent.model,
      status: agent.status,
      lastSeen: agent.lastSeen,
      tools: agent.tools,
      isGlobal: agent.isGlobal
    }))
  }, [projectStatus])
  
  return onlineAgents
}