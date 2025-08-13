/**
 * Utility functions for agent data transformation and common operations
 */

import type { AgentInstance, ProjectGroup } from '@/types/agent'
import type { NDKProject } from '@/lib/ndk-events/NDKProject'

/**
 * Transforms raw agent data into a standardized AgentInstance format
 */
export function transformAgentData(agent: {
  pubkey: string
  name?: string
  picture?: string
  description?: string
  status?: string
  lastSeen?: number
}, project?: {
  title?: string
  dTag?: string
}): AgentInstance {
  return {
    pubkey: agent.pubkey,
    name: agent.name || agent.pubkey.slice(0, 8),
    picture: agent.picture,
    description: agent.description,
    status: agent.status,
    lastSeen: agent.lastSeen,
    projectName: project ? getProjectDisplayName(project) : undefined,
    projectDTag: project?.dTag
  }
}

/**
 * Gets a display name for a project with fallbacks
 */
export function getProjectDisplayName(project: {
  title?: string
  dTag?: string
} | NDKProject): string {
  return project.title || project.dTag || 'Unknown Project'
}

/**
 * Checks if an agent is online
 */
export function isAgentOnline(agent: {
  fromStatus?: boolean
  status?: string
}): boolean {
  return Boolean(agent.fromStatus && agent.status === 'online')
}

/**
 * Groups agents by a key function
 */
export function groupAgentsBy<K>(
  agents: AgentInstance[],
  keyFn: (agent: AgentInstance) => K
): Map<K, AgentInstance[]> {
  const groups = new Map<K, AgentInstance[]>()
  
  agents.forEach(agent => {
    const key = keyFn(agent)
    const group = groups.get(key) || []
    group.push(agent)
    groups.set(key, group)
  })
  
  return groups
}

/**
 * Creates project groups from agents
 */
export function createProjectGroups(
  agentsMap: Map<string, AgentInstance[]>,
  currentProjectDTag?: string
): ProjectGroup[] {
  const groups: ProjectGroup[] = []
  
  agentsMap.forEach((agents, projectDTag) => {
    if (agents.length === 0) return
    
    const projectName = agents[0].projectName || 'Unknown Project'
    groups.push({
      projectName,
      projectDTag,
      agents,
      isCurrentProject: projectDTag === currentProjectDTag
    })
  })
  
  return groups.sort((a, b) => {
    // Current project first
    if (a.isCurrentProject) return -1
    if (b.isCurrentProject) return 1
    // Then alphabetically
    return a.projectName.localeCompare(b.projectName)
  })
}