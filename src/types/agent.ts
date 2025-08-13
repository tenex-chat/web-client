/**
 * Shared agent-related type definitions
 */

/**
 * Represents an agent instance with basic information
 */
export interface AgentInstance {
  pubkey: string
  name: string
  picture?: string
  description?: string
  projectName?: string
  projectDTag?: string
  status?: string
  lastSeen?: number
}

/**
 * Represents a group of agents within a project
 */
export interface ProjectGroup {
  projectName: string
  projectDTag: string
  agents: AgentInstance[]
  isCurrentProject?: boolean
}

/**
 * Extended agent data used in agent listings
 */
export interface AgentData extends AgentInstance {
  id?: string // Event ID for navigation
  role?: string
  useCriteria?: string[]
  fromStatus?: boolean
  fromNDK?: boolean
  fromProject?: boolean
}