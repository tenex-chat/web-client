import { useMemo } from 'react'
import { useSubscribe } from '@nostr-dev-kit/ndk-hooks'
import { NDKMCPTool } from '@/lib/ndk-events/NDKMCPTool'
import type { NDKKind } from '@nostr-dev-kit/ndk-hooks'

export function useAvailableMCPServers(): NDKMCPTool[] {
  // Subscribe to MCP tool events (kind 4200)
  const { events } = useSubscribe(
    [{ kinds: [4200 as NDKKind]}]
  )

  const mcpServers = useMemo(() => {
    if (!events || events.length === 0) return []

    return events
      .map(event => NDKMCPTool.from(event))
      .sort((a, b) => (a.name || 'Unnamed').localeCompare(b.name || 'Unnamed'))
  }, [events])

  return mcpServers
}