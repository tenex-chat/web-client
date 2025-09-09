import type NDK from '@nostr-dev-kit/ndk-hooks'
import { NDKEvent } from '@nostr-dev-kit/ndk-hooks'

/**
 * Contract-aligned helpers for kinds 24133/24134
 * Kind 24133: Operations Status (incoming only)
 * Kind 24134: Stop Request (outgoing only)
 */

export interface Kind24133Snapshot {
  projectId: string
  eId: string
  agentPubkeys: string[]
  createdAt: number
  eventId: string
}


/**
 * Normalize project ID to consistent a-coordinate format
 * Trust NDK for validation - just return as-is to ensure publisher/subscriber use the same form
 */
export function normalizeProjectA(project: string): string {
  // Trust NDK validation - no manual hex checks
  // Just pass through to ensure consistency between publisher and subscriber
  return project
}

/**
 * Parse kind 24133 (Operations Status) according to contract
 * Tags: a = project id, e = subject event id, p (0..n) = agent pubkeys
 * Content must be empty
 */
export function parseKind24133(ev: NDKEvent): Kind24133Snapshot | null {
  if (ev.kind !== 24133) return null
  
  const projectId = ev.tagValue('a')
  const eId = ev.tagValue('e')
  
  // DEBUG: Log raw event data
  console.log('DEBUG parseKind24133 - Raw event:', {
    kind: ev.kind,
    id: ev.id?.slice(0, 8),
    created_at: ev.created_at,
    projectId,
    eId,
    tags: ev.tags,
    content: ev.content,
    pubkey: ev.pubkey?.slice(0, 8)
  })
  // END DEBUG
  
  if (!projectId || !eId) {
    // DEBUG: Log why parsing failed
    console.log('DEBUG parseKind24133 - Missing required tags:', { projectId, eId })
    // END DEBUG
    return null
  }
  
  // Collect all valid 'p' tags (agent pubkeys)
  const agentPubkeys: string[] = []
  ev.tags?.forEach(tag => {
    if (tag[0] === 'p' && tag[1]) {
      agentPubkeys.push(tag[1])
    }
  })
  
  // Dedupe and sort agent pubkeys
  const uniqueAgents = [...new Set(agentPubkeys)].sort()
  
  const result = {
    projectId,
    eId,
    agentPubkeys: uniqueAgents,
    createdAt: ev.created_at || 0,
    eventId: ev.id || ''
  }
  
  // DEBUG: Log parsed result
  console.log('DEBUG parseKind24133 - Parsed snapshot:', {
    ...result,
    agentPubkeys: result.agentPubkeys.map(pk => pk.slice(0, 8))
  })
  // END DEBUG
  
  return result
}

/**
 * Publish kind 24134 (Stop Request) according to contract
 * Tags: a = project id, e (1..n) = target event ids
 * Content must be empty
 */
export async function publishKind24134(
  ndk: NDK, 
  { projectId, eIds }: { projectId: string; eIds: string[] }
): Promise<void> {
  const normalizedProjectId = normalizeProjectA(projectId)
  
  // Use provided event IDs - trust NDK validation
  if (eIds.length === 0) return
  
  const event = new NDKEvent(ndk)
  event.kind = 24134
  event.content = '' // Must be empty per contract
  
  // Build tags
  event.tags = [['a', normalizedProjectId]]
  
  // Add each event ID as 'e' tag
  eIds.forEach(eId => {
    event.tags.push(['e', eId])
  })
  
  await event.sign()
  await event.publish()
}