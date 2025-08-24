import { nip19 } from 'nostr-tools'

interface EventPointer {
  id: string
  relays?: string[]
  author?: string
  kind?: number
}

interface AddressPointer {
  kind: number
  pubkey: string
  identifier: string
  relays?: string[]
}

interface ProfilePointer {
  pubkey: string
  relays?: string[]
}

type NostrEntityData = string | EventPointer | AddressPointer | ProfilePointer | Uint8Array

export interface NostrEntity {
  type: 'nevent' | 'naddr' | 'note' | 'npub' | 'nprofile'
  bech32: string
  data: NostrEntityData
}

/**
 * Parse text to find Nostr entity references (nostr:nevent1..., nostr:naddr1... or bare bech32 like npub1...)
 */
export function findNostrEntities(text: string): NostrEntity[] {
  // Match both nostr: prefixed and bare bech32 strings
  const regex = /(?:nostr:)?(nevent1|naddr1|note1|npub1|nprofile1)[\w]+/g
  const matches = text.match(regex) || []

  const entities: NostrEntity[] = []

  for (const match of matches) {
    const bech32 = match.replace('nostr:', '')

    try {
      const decoded = nip19.decode(bech32)

      entities.push({
        type: decoded.type as NostrEntity['type'],
        bech32,
        data: decoded.data,
      })
    } catch {
      // Failed to decode Nostr entity
    }
  }

  return entities
}

/**
 * Type guard to check if data is AddressPointer
 */
export function isAddressPointer(data: NostrEntityData): data is AddressPointer {
  return (
    typeof data === 'object' &&
    data !== null &&
    !(data instanceof Uint8Array) &&
    'identifier' in data &&
    'pubkey' in data &&
    'kind' in data
  )
}

/**
 * Type guard to check if data is EventPointer
 */
export function isEventPointer(data: NostrEntityData): data is EventPointer {
  return (
    typeof data === 'object' && 
    data !== null && 
    !(data instanceof Uint8Array) && 
    'id' in data
  )
}

/**
 * Type guard to check if data is ProfilePointer
 */
export function isProfilePointer(data: NostrEntityData): data is ProfilePointer {
  return (
    typeof data === 'object' &&
    data !== null &&
    !(data instanceof Uint8Array) &&
    'pubkey' in data &&
    !('id' in data) &&
    !('identifier' in data)
  )
}

/**
 * Get display information for a Nostr entity
 */
export function getEntityDisplayInfo(entity: NostrEntity): {
  title: string
  description: string
  icon: string
} {
  switch (entity.type) {
    case 'naddr':
      if (isAddressPointer(entity.data)) {
        if (entity.data.kind === 30023) {
          return {
            title: 'Article',
            description: entity.data.identifier || 'View article',
            icon: '📄',
          }
        }
        return {
          title: 'Parameterized Event',
          description: `Kind ${entity.data.kind}`,
          icon: '🔗',
        }
      }
      return {
        title: 'Parameterized Event',
        description: 'View event',
        icon: '🔗',
      }

    case 'nevent':
      if (isEventPointer(entity.data)) {
        // Check for known event kinds
        if (entity.data.kind === 1934) {
          return {
            title: 'Task',
            description: 'View task details',
            icon: '✅',
          }
        }
        if (entity.data.kind === 4200) {
          return {
            title: 'MCP Tool',
            description: 'View MCP tool',
            icon: '🔧',
          }
        }
        if (entity.data.kind === 1) {
          return {
            title: 'Note',
            description: 'View note',
            icon: '📝',
          }
        }
      }
      return {
        title: 'Event',
        description: 'View event',
        icon: '⚡',
      }

    case 'note':
      return {
        title: 'Note',
        description: 'View note',
        icon: '📝',
      }

    case 'npub':
      return {
        title: 'Profile',
        description: 'View profile',
        icon: '👤',
      }

    case 'nprofile':
      return {
        title: 'Profile',
        description: 'View profile',
        icon: '👤',
      }

    default:
      return {
        title: 'Unknown Entity',
        description: entity.type,
        icon: '❓',
      }
  }
}