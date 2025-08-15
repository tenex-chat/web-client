import { NDKEvent, type NDKKind, type NostrEvent } from '@nostr-dev-kit/ndk'
import type NDK from '@nostr-dev-kit/ndk'
import { EVENT_KINDS } from '../constants'

export interface ProjectAgent {
  pubkey: string
  name: string
  role?: string
  status?: string
  lastSeen?: number
}

export interface ProjectModel {
  provider: string  // e.g., "anthropic/claude-sonnet-4"
  name: string      // e.g., "sonnet"
}

export interface ExecutionQueueItem {
  conversationId: string
  startTime?: number
  position?: number
}

export interface ExecutionQueue {
  active: ExecutionQueueItem | null
  waiting: ExecutionQueueItem[]
  totalWaiting: number
}

export class NDKProjectStatus extends NDKEvent {
  static kind: NDKKind = 24010 as NDKKind

  constructor(ndk?: NDK, rawEvent?: NostrEvent | NDKEvent) {
    super(ndk, rawEvent)
    this.kind = NDKProjectStatus.kind
    if (!this.tags) {
      this.tags = []
    }
    if (!this.content) {
      this.content = ''
    }
  }

  get projectId(): string | undefined {
    // Look for 'a' tag (NIP-33 reference)
    const aTag = this.tagValue('a')
    if (aTag) return aTag
    
    // Fallback to 'e' tag
    return this.tagValue('e')
  }

  set projectId(value: string | undefined) {
    this.removeTag('a')
    this.removeTag('e')
    
    if (value) {
      // If it's a NIP-33 reference (contains colons), use 'a' tag
      if (value.includes(':')) {
        this.tags.push(['a', value])
      } else {
        // Otherwise use 'e' tag for event ID
        this.tags.push(['e', value])
      }
    }
  }

  // The project is online if this event exists and is recent
  get isOnline(): boolean {
    if (!this.created_at) return false
    const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300
    return this.created_at > fiveMinutesAgo
  }

  get lastSeen(): Date | undefined {
    return this.created_at ? new Date(this.created_at * 1000) : undefined
  }

  get agents(): ProjectAgent[] {
    const agents: ProjectAgent[] = []
    for (const tag of this.tags) {
      if (tag[0] === 'agent' && tag[1]) {
        agents.push({
          pubkey: tag[1],
          name: tag[2] || 'Unknown',
          role: tag[3]
        })
      }
    }
    return agents
  }

  set agents(agentList: ProjectAgent[]) {
    // Remove existing agent tags
    this.tags = this.tags.filter(tag => tag[0] !== 'agent')
    
    // Add new agent tags
    for (const agent of agentList) {
      const tag = ['agent', agent.pubkey, agent.name]
      if (agent.role) tag.push(agent.role)
      this.tags.push(tag)
    }
  }

  get models(): ProjectModel[] {
    const models: ProjectModel[] = []
    for (const tag of this.tags) {
      if (tag[0] === 'model' && tag[1] && tag[2]) {
        models.push({
          provider: tag[1],
          name: tag[2]
        })
      }
    }
    return models
  }

  set models(modelList: ProjectModel[]) {
    // Remove existing model tags
    this.tags = this.tags.filter(tag => tag[0] !== 'model')
    
    // Add new model tags
    for (const model of modelList) {
      this.tags.push(['model', model.provider, model.name])
    }
  }

  get executionQueue(): ExecutionQueue {
    const queue: ExecutionQueue = {
      active: null,
      waiting: [],
      totalWaiting: 0
    }

    const queueTags = this.tags.filter(tag => tag[0] === 'execution-queue')
    let waitingPosition = 1

    for (const tag of queueTags) {
      if (tag[1]) {
        const conversationId = tag[1]
        const status = tag[2]

        if (status === 'active') {
          // Active conversation with optional start time
          queue.active = {
            conversationId,
            startTime: tag[3] ? parseInt(tag[3]) : undefined
          }
        } else {
          // Waiting conversation
          queue.waiting.push({
            conversationId,
            position: waitingPosition++
          })
        }
      }
    }

    queue.totalWaiting = queue.waiting.length
    return queue
  }

  set executionQueue(queue: ExecutionQueue) {
    // Remove existing execution-queue tags
    this.tags = this.tags.filter(tag => tag[0] !== 'execution-queue')

    // Add active conversation if exists
    if (queue.active) {
      const tag: string[] = ['execution-queue', queue.active.conversationId, 'active']
      if (queue.active.startTime) {
        tag.push(queue.active.startTime.toString())
      }
      this.tags.push(tag)
    }

    // Add waiting conversations
    for (const item of queue.waiting) {
      this.tags.push(['execution-queue', item.conversationId])
    }
  }

  static from(ndk: NDK, projectId: string, agents: ProjectAgent[], models: ProjectModel[]): NDKProjectStatus {
    const event = new NDKProjectStatus(ndk)
    event.projectId = projectId
    event.agents = agents
    event.models = models
    return event
  }
}