import { useMemo } from 'react'
import { useSubscribe } from '@nostr-dev-kit/ndk-hooks'
import { NDKMCPTool } from '@/lib/ndk-events/NDKMCPTool'
import type { NDKKind } from '@nostr-dev-kit/ndk-hooks'

export interface MCPServerInfo {
  id: string
  name: string
  description: string
  command?: string
}

export function useAvailableMCPServers(): MCPServerInfo[] {
  // Subscribe to MCP tool events (kind 4200)
  const { events } = useSubscribe(
    [{ kinds: [4200 as NDKKind], limit: 100 }],
    { closeOnEose: true }
  )

  const mcpServers = useMemo(() => {
    if (!events || events.length === 0) return []

    return events.map(event => {
      const tool = new NDKMCPTool(event.ndk, event.rawEvent())
      return {
        id: tool.id,
        name: tool.name || 'Unnamed MCP Server',
        description: tool.description || '',
        command: tool.command
      }
    }).sort((a, b) => a.name.localeCompare(b.name))
  }, [events])

  return mcpServers
}