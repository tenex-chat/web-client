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
 * If project looks like naddr1..., decode to a-coordinate if available via existing utilities
 * If project already matches /^\d+:[0-9a-f]{64}:.+$/, return as-is
 * Otherwise, return as-is (ensure publisher/subscriber use the same form)
 */
export function normalizeProjectA(project: string): string {
  // If already in a-coordinate format, return as-is
  if (/^\d+:[0-9a-f]{64}:.+$/.test(project)) {
    return project
  }
  
  // TODO: If project looks like naddr1..., decode to a-coordinate if available via existing utilities
  // For now, pass-through to ensure publisher/subscriber use the same form
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
  
  if (!projectId || !eId) return null
  
  // Collect all valid 'p' tags (agent pubkeys)
  const agentPubkeys: string[] = []
  ev.tags?.forEach(tag => {
    if (tag[0] === 'p' && tag[1]) {
      agentPubkeys.push(tag[1])
    }
  })
  
  // Dedupe and sort agent pubkeys
  const uniqueAgents = [...new Set(agentPubkeys)].sort()
  
  return {
    projectId,
    eId,
    agentPubkeys: uniqueAgents,
    createdAt: ev.created_at || 0,
    eventId: ev.id || ''
  }
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