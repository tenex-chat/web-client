/**
 * Shared agent-related type definitions
 */

export interface AgentInstance {
		pubkey: string;
		slug: string;
    projectName?: string
    projectDTag?: string
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