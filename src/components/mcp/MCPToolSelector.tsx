import { useState, useEffect } from 'react'
import { useSubscribe } from '@nostr-dev-kit/ndk-hooks'
import { NDKMCPTool } from '@/lib/ndk-events/NDKMCPTool'
import { ItemSelector } from '@/components/common/ItemSelector'
import { SelectableCard } from '@/components/common/SelectableCard'
import { Code2, Terminal, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { NDKKind } from '@nostr-dev-kit/ndk'

interface MCPToolSelectorProps {
  selectedTools: Array<{ eventId: string; name: string; selected: boolean }>
  onToolsChange: (tools: Array<{ eventId: string; name: string; selected: boolean }>) => void
}

export function MCPToolSelector({ selectedTools, onToolsChange }: MCPToolSelectorProps) {
  const [tools, setTools] = useState<NDKMCPTool[]>([])

  // Subscribe to MCP tools
  const { events } = useSubscribe(
    [{ kinds: [4200 as NDKKind], limit: 100 }],
    { closeOnEose: true }
  )

  useEffect(() => {
    if (events && events.length > 0) {
      const mcpTools = events.map(event => {
        const tool = new NDKMCPTool(event.ndk, event.rawEvent())
        return tool
      })
      setTools(mcpTools)
    }
  }, [events])

  const handleToggle = (toolId: string) => {
    const tool = tools.find(t => t.id === toolId)
    if (!tool) return

    const currentIndex = selectedTools.findIndex(t => t.eventId === toolId)
    if (currentIndex >= 0) {
      // Remove tool
      const newTools = selectedTools.filter(t => t.eventId !== toolId)
      onToolsChange(newTools)
    } else {
      // Add tool
      const newTools = [...selectedTools, {
        eventId: toolId,
        name: tool.name,
        selected: true
      }]
      onToolsChange(newTools)
    }
  }

  const renderTool = (tool: NDKMCPTool) => {
    const isSelected = selectedTools.some(t => t.eventId === tool.id)
    const capabilities = tool.capabilities || []

    return (
      <SelectableCard
        key={tool.id}
        item={tool}
        selected={isSelected}
        onClick={() => handleToggle(tool.id)}
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            {tool.command?.includes('mcp') ? (
              <Terminal className="h-5 w-5 text-muted-foreground" />
            ) : tool.command?.includes('code') ? (
              <Code2 className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Wrench className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium">{tool.name || 'Unnamed Tool'}</h4>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {tool.description || 'No description available'}
            </p>
            {tool.command && (
              <p className="text-xs text-muted-foreground mt-2 font-mono">
                {tool.command}
              </p>
            )}
            {capabilities.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {capabilities.slice(0, 3).map((cap, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {cap}
                  </Badge>
                ))}
                {capabilities.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{capabilities.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </SelectableCard>
    )
  }

  return (
    <ItemSelector
      items={tools}
      selectedItems={selectedTools.map(st => tools.find(t => t.id === st.eventId)).filter(Boolean) as NDKMCPTool[]}
      onItemsChange={(newTools) => {
        const updatedTools = newTools.map(t => ({
          eventId: t.id,
          name: t.name,
          selected: true
        }))
        onToolsChange(updatedTools)
      }}
      searchPlaceholder="Search MCP tools by name or command..."
      filterLabel="Filter Tools"
      emptyStateIcon={<Wrench className="h-12 w-12" />}
      emptyStateTitle="No MCP tools found"
      emptyStateDescription="MCP tools will appear here once they are created"
      renderCard={(tool) => renderTool(tool)}
      getItemId={(tool: NDKMCPTool) => tool.id}
      getItemTags={(tool: NDKMCPTool) => tool.capabilities || []}
      searchFilter={(tool: NDKMCPTool, searchTerm: string) => {
        const searchLower = searchTerm.toLowerCase()
        return (
          tool.name?.toLowerCase().includes(searchLower) ||
          tool.description?.toLowerCase().includes(searchLower) ||
          tool.command?.toLowerCase().includes(searchLower) ||
          (tool.capabilities || []).some(cap => cap.toLowerCase().includes(searchLower))
        )
      }}
    />
  )
}