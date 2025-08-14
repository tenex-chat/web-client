import { describe, it, expect } from 'vitest'
import { 
  transformAgentData, 
  getProjectDisplayName, 
  isAgentOnline,
  groupAgentsBy,
  createProjectGroups
} from './agentUtils'
import type { AgentInstance } from '@/types/agent'

describe('agentUtils', () => {
  describe('transformAgentData', () => {
    it('transforms agent data with all fields', () => {
      const agent = {
        pubkey: 'pubkey123',
        name: 'Agent Name',
        picture: 'https://example.com/pic.jpg',
        description: 'Test description',
        status: 'online',
        lastSeen: 1234567890
      }
      const project = {
        title: 'Project Title',
        dTag: 'project-dtag'
      }
      
      const result = transformAgentData(agent, project)
      
      expect(result).toEqual({
        pubkey: 'pubkey123',
        name: 'Agent Name',
        picture: 'https://example.com/pic.jpg',
        description: 'Test description',
        status: 'online',
        lastSeen: 1234567890,
        projectName: 'Project Title',
        projectDTag: 'project-dtag'
      })
    })
    
    it('uses pubkey slice as name fallback', () => {
      const agent = { pubkey: 'pubkey123456789' }
      const result = transformAgentData(agent)
      
      expect(result.name).toBe('pubkey12')
    })
    
    it('handles missing project data', () => {
      const agent = { pubkey: 'pubkey123', name: 'Agent' }
      const result = transformAgentData(agent)
      
      expect(result.projectName).toBeUndefined()
      expect(result.projectDTag).toBeUndefined()
    })
  })
  
  describe('getProjectDisplayName', () => {
    it('returns title when available', () => {
      const project = { title: 'My Project', dTag: 'dtag' }
      expect(getProjectDisplayName(project)).toBe('My Project')
    })
    
    it('falls back to dTag when title is missing', () => {
      const project = { dTag: 'project-dtag' }
      expect(getProjectDisplayName(project)).toBe('project-dtag')
    })
    
    it('returns Unknown Project when both are missing', () => {
      const project = {}
      expect(getProjectDisplayName(project)).toBe('Unknown Project')
    })
  })
  
  describe('isAgentOnline', () => {
    it('returns true for online agents from status', () => {
      const agent = { fromStatus: true, status: 'online' }
      expect(isAgentOnline(agent)).toBe(true)
    })
    
    it('returns false when fromStatus is false', () => {
      const agent = { fromStatus: false, status: 'online' }
      expect(isAgentOnline(agent)).toBe(false)
    })
    
    it('returns false when status is not online', () => {
      const agent = { fromStatus: true, status: 'offline' }
      expect(isAgentOnline(agent)).toBe(false)
    })
    
    it('returns false when both conditions are not met', () => {
      const agent = { fromStatus: false, status: 'offline' }
      expect(isAgentOnline(agent)).toBe(false)
    })
  })
  
  describe('groupAgentsBy', () => {
    it('groups agents by project name', () => {
      const agents: AgentInstance[] = [
        { pubkey: '1', name: 'Agent1', projectName: 'ProjectA' },
        { pubkey: '2', name: 'Agent2', projectName: 'ProjectB' },
        { pubkey: '3', name: 'Agent3', projectName: 'ProjectA' }
      ]
      
      const grouped = groupAgentsBy(agents, agent => agent.projectName)
      
      expect(grouped.size).toBe(2)
      expect(grouped.get('ProjectA')).toHaveLength(2)
      expect(grouped.get('ProjectB')).toHaveLength(1)
    })
    
    it('handles empty agent list', () => {
      const agents: AgentInstance[] = []
      const grouped = groupAgentsBy(agents, agent => agent.projectName)
      
      expect(grouped.size).toBe(0)
    })
  })
  
  describe('createProjectGroups', () => {
    it('creates sorted project groups with current project first', () => {
      const agentsMap = new Map<string, AgentInstance[]>([
        ['project-b', [
          { pubkey: '1', name: 'Agent1', projectName: 'Project B' }
        ]],
        ['project-a', [
          { pubkey: '2', name: 'Agent2', projectName: 'Project A' }
        ]],
        ['project-c', [
          { pubkey: '3', name: 'Agent3', projectName: 'Project C' }
        ]]
      ])
      
      const groups = createProjectGroups(agentsMap, 'project-c')
      
      expect(groups).toHaveLength(3)
      expect(groups[0].projectDTag).toBe('project-c')
      expect(groups[0].isCurrentProject).toBe(true)
      expect(groups[1].projectName).toBe('Project A')
      expect(groups[2].projectName).toBe('Project B')
    })
    
    it('skips empty agent groups', () => {
      const agentsMap = new Map<string, AgentInstance[]>([
        ['project-a', [{ pubkey: '1', name: 'Agent1', projectName: 'Project A' }]],
        ['project-empty', []]
      ])
      
      const groups = createProjectGroups(agentsMap)
      
      expect(groups).toHaveLength(1)
      expect(groups[0].projectDTag).toBe('project-a')
    })
  })
})