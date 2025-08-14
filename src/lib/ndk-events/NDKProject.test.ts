import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NDKProject } from './NDKProject'
import NDK from '@nostr-dev-kit/ndk'

// Mock NDK - using a class that can be extended
vi.mock('@nostr-dev-kit/ndk', () => {
  class MockNDKEvent {
    kind = 31933
    content = ''
    tags: string[][] = []
    pubkey = 'test-pubkey'
    ndk: any = null
    
    publish = vi.fn()
    
    tagValue(tagName: string): string | undefined {
      const tag = this.tags.find(t => t[0] === tagName)
      return tag?.[1]
    }
    
    removeTag(tagName: string) {
      this.tags = this.tags.filter(tag => tag[0] !== tagName)
    }
    
    rawEvent() {
      return {
        kind: this.kind,
        content: this.content,
        tags: this.tags,
        pubkey: this.pubkey
      }
    }
  }
  
  return {
    default: vi.fn().mockImplementation(() => ({
      connect: vi.fn(),
      subscribe: vi.fn(),
      getUser: vi.fn()
    })),
    NDKEvent: MockNDKEvent,
    NDKKind: {}
  }
})

describe('NDKProject', () => {
  let ndk: NDK
  let project: NDKProject

  beforeEach(() => {
    ndk = new NDK()
    project = new NDKProject(ndk)
  })

  describe('Basic Properties', () => {
    it('should set and get title', () => {
      project.title = 'Test Project'
      expect(project.title).toBe('Test Project')
    })

    it('should set and get description', () => {
      project.description = 'A test project description'
      expect(project.description).toBe('A test project description')
    })

    it('should set and get picture', () => {
      project.picture = 'https://example.com/image.jpg'
      expect(project.picture).toBe('https://example.com/image.jpg')
    })

    it('should have correct event kind', () => {
      expect(project.kind).toBe(31933)
    })
  })

  describe('Agent Management', () => {
    it('should add agent tags', () => {
      project.addAgent('agent-event-id-1')
      project.addAgent('agent-event-id-2')
      
      const agents = project.agents
      expect(agents).toHaveLength(2)
      expect(agents[0]).toEqual({ ndkAgentEventId: 'agent-event-id-1' })
      expect(agents[1]).toEqual({ ndkAgentEventId: 'agent-event-id-2' })
    })

    it('should get agents from tags', () => {
      project.tags = [
        ['agent', 'event-id-1'],
        ['agent', 'event-id-2'],
        ['other', 'tag']
      ]
      
      const agents = project.agents
      expect(agents).toHaveLength(2)
      expect(agents[0].ndkAgentEventId).toBe('event-id-1')
    })
  })

  describe('MCP Tools Management', () => {
    it('should add MCP tool tags', () => {
      project.addMCPTool('tool-event-id-1')
      project.addMCPTool('tool-event-id-2')
      
      const tools = project.mcpTools
      expect(tools).toHaveLength(2)
      expect(tools).toContain('tool-event-id-1')
      expect(tools).toContain('tool-event-id-2')
    })

    it('should get MCP tools from tags', () => {
      project.tags = [
        ['mcp', 'tool1'],
        ['mcp', 'tool2'],
        ['agent', 'pubkey', 'name']
      ]
      
      const tools = project.mcpTools
      expect(tools).toHaveLength(2)
      expect(tools).toContain('tool1')
    })
  })

  describe('Rules Management', () => {
    it('should add rule tags', () => {
      project.addRule('rule-1', ['Agent1', 'Agent2'])
      project.addRule('rule-2', ['Agent3'])
      
      const rules = project.rules
      expect(rules).toHaveLength(2)
      expect(rules[0]).toEqual({
        id: 'rule-1',
        agentNames: ['Agent1', 'Agent2']
      })
    })

    it('should get rules from tags', () => {
      project.tags = [
        ['rule', 'rule1', 'Agent1', 'Agent2'],
        ['rule', 'rule2', 'Agent3']
      ]
      
      const rules = project.rules
      expect(rules).toHaveLength(2)
      expect(rules[0].agentNames).toEqual(['Agent1', 'Agent2'])
    })
  })

  describe('NIP-33 Support', () => {
    it('should generate correct d-tag', () => {
      project.title = 'My Project'
      const dTag = project.dTag
      expect(dTag).toBeTruthy()
      expect(typeof dTag).toBe('string')
    })

    it('should generate tag reference', () => {
      project.pubkey = 'test-pubkey'
      project.title = 'Test Project'
      
      const tagRef = project.nip33TagReference()
      expect(tagRef).toMatch(/^31933:test-pubkey:/)
    })

    it('should set project ID from NIP-33 tag reference', () => {
      const tagRef = '31933:pubkey123:d-tag-value'
      project.projectId = tagRef
      
      expect(project.tags).toContainEqual(['a', tagRef])
    })
  })

  describe('Repository Support', () => {
    it('should set and get repository URL', () => {
      project.repository = 'https://github.com/user/repo'
      expect(project.repository).toBe('https://github.com/user/repo')
    })

    it('should handle repository tag', () => {
      project.tags = [
        ['repo', 'https://github.com/test/repo']
      ]
      
      expect(project.repository).toBe('https://github.com/test/repo')
    })
  })

  describe('Hashtag Support', () => {
    it('should add hashtags', () => {
      project.addHashtag('nostr')
      project.addHashtag('bitcoin')
      
      const hashtags = project.hashtags
      expect(hashtags).toHaveLength(2)
      expect(hashtags).toContain('nostr')
      expect(hashtags).toContain('bitcoin')
    })

    it('should get hashtags from tags', () => {
      project.tags = [
        ['t', 'programming'],
        ['t', 'ai'],
        ['agent', 'pubkey', 'name']
      ]
      
      const hashtags = project.hashtags
      expect(hashtags).toHaveLength(2)
      expect(hashtags).toContain('programming')
    })
  })

  describe('Event Conversion', () => {
    it('should convert to event with all properties', () => {
      project.title = 'Test Project'
      project.description = 'Test Description'
      project.picture = 'https://example.com/image.jpg'
      project.repository = 'https://github.com/test/repo'
      project.addAgent('agent-event-id')
      project.addMCPTool('tool-id')
      project.addRule('rule-1', ['Agent Name'])
      project.addHashtag('test')
      
      // Check that properties are properly set via tags
      expect(project.kind).toBe(31933)
      expect(project.content).toBe('Test Description')
      expect(project.tags).toContainEqual(['title', 'Test Project'])
      expect(project.tags).toContainEqual(['picture', 'https://example.com/image.jpg'])
      expect(project.tags).toContainEqual(['repo', 'https://github.com/test/repo'])
      expect(project.tags).toContainEqual(['agent', 'agent-event-id'])
      expect(project.tags).toContainEqual(['mcp', 'tool-id'])
      expect(project.tags).toContainEqual(['t', 'test'])
    })
  })

  describe('Static Methods', () => {
    it('should create from event', () => {
      const mockEvent = {
        kind: 31933,
        content: 'Project description',
        tags: [
          ['title', 'My Project'],
          ['image', 'https://example.com/img.jpg'],
          ['agent', 'event-id-1'],
          ['mcp', 'tool1'],
          ['repo', 'https://github.com/repo']
        ],
        pubkey: 'author-pubkey'
      }
      
      const project = NDKProject.from(mockEvent as any)
      
      expect(project.title).toBe('My Project')
      expect(project.description).toBe('Project description')
      expect(project.picture).toBe('https://example.com/img.jpg')
      expect(project.agents).toHaveLength(1)
      expect(project.mcpTools).toContain('tool1')
      expect(project.repository).toBe('https://github.com/repo')
    })
  })
})