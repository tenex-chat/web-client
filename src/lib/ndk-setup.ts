import NDK, { registerEventClass  } from "@nostr-dev-kit/ndk-hooks";
import NDKCacheDexie from '@nostr-dev-kit/ndk-cache-dexie'
import { DEFAULT_RELAYS } from './constants'
import { NDKProject } from './ndk-events/NDKProject'
import { NDKAgent } from './ndk-events/NDKAgent'
import { NDKTask } from './ndk-events/NDKTask'
import { NDKMCPTool } from './ndk-events/NDKMCPTool'

export function createNDK(explicitRelayUrls?: string[]) {
  // Setup cache
  const cache = new NDKCacheDexie({
    dbName: 'tenex-cache',
  })

  // Create NDK instance
  const ndk = new NDK({
    explicitRelayUrls: explicitRelayUrls || DEFAULT_RELAYS,
    cacheAdapter: cache,
    enableOutboxModel: false,
  })

  // Register custom event classes
  registerEventClass(NDKProject)
  registerEventClass(NDKAgent)
  registerEventClass(NDKTask)
  registerEventClass(NDKMCPTool)

  return ndk
}