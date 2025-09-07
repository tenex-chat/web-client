import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NDKProject } from '@/lib/ndk-events/NDKProject'
import { Button } from '@/components/ui/button'
import { useEvent, useNDK } from '@nostr-dev-kit/ndk-hooks'
import { Wrench, X, Plus, Code2, Terminal, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { AddToolsToProjectDialog } from '@/components/dialogs/AddToolsToProjectDialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { NDKMCPTool } from '@/lib/ndk-events/NDKMCPTool'
import { Badge } from '@/components/ui/badge'

// Component to display tool info with real-time subscription
function ToolDisplay({ 
  toolEventId,
  onRemove,
  canRemove
}: { 
  toolEventId: string
  onRemove: () => void
  canRemove: boolean
}) {
  // Subscribe to the tool event in real-time
		const toolEvent = useEvent(toolEventId);
  
  const tool = toolEvent ? NDKMCPTool.from(toolEvent) : null
  
  const truncateEventId = (eventId: string) => {
    if (!eventId) return 'Unknown'
    if (eventId.length <= 20) return eventId
    return `${eventId.slice(0, 12)}...${eventId.slice(-6)}`
  }

  const getToolIcon = () => {
    if (!tool) return <Wrench className="h-5 w-5" />
    
    // Icon based on tool type or name
    const name = tool.name?.toLowerCase() || ''
    if (name.includes('terminal') || name.includes('bash') || name.includes('shell')) {
      return <Terminal className="h-5 w-5" />
    }
    if (name.includes('code') || name.includes('script')) {
      return <Code2 className="h-5 w-5" />
    }
    return <Wrench className="h-5 w-5" />
  }
  
  // Don't show anything if no data yet
  if (!tool) {
    return (
      <div className="flex items-start gap-3 p-3 rounded-md border bg-card animate-pulse">
        <div className="h-10 w-10 rounded-md bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-3 bg-muted rounded w-2/3" />
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex items-start gap-3 p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors">
      <Avatar className="h-10 w-10 mt-0.5">
        <AvatarFallback>
          {getToolIcon()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-medium truncate">
            {tool.name || 'Unnamed Tool'}
          </div>
          {tool.serverName && (
            <Badge variant="secondary" className="text-xs">
              {tool.serverName}
            </Badge>
          )}
        </div>
        {tool.description && (
          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {tool.description}
          </div>
        )}
        <div className="text-xs text-muted-foreground mt-1">
          Event ID: {truncateEventId(toolEventId)}
        </div>
        {tool.inputSchema && (
          <div className="text-xs text-muted-foreground mt-1">
            Parameters: {Object.keys(tool.inputSchema.properties || {}).length}
          </div>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={onRemove}
        disabled={!canRemove}
        title={canRemove ? "Remove tool from project" : "Cannot remove tool"}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

interface ProjectToolsSettingsProps {
  project: NDKProject
}

export function ProjectToolsSettings({ project }: ProjectToolsSettingsProps) {
  const { ndk } = useNDK()
  const [addToolsDialogOpen, setAddToolsDialogOpen] = useState(false)
  
  // Get MCP tool IDs from project
  const mcpToolIds = project.mcpTools || []
  
  const handleRemoveTool = async (toolId: string) => {
    if (!ndk || !project) return
    
    try {
      // Filter out the tool tag to remove
      const newTags = project.tags.filter(tag => {
        if (tag[0] !== 'mcp') return true
        return tag[1] !== toolId
      })
      
      // Update project
      project.tags = newTags
      await project.publishReplaceable()
      
      toast.success('Tool removed from project')
    } catch (error) {
      console.error('Failed to remove tool:', error)
      toast.error('Failed to remove tool')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>MCP Tools</CardTitle>
          <CardDescription>
            Model Context Protocol tools provide specialized capabilities for your project agents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mcpToolIds.length === 0 ? (
            <div className="text-center py-8">
              <Wrench className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                No tools configured for this project
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Add MCP tools to extend your agents' capabilities
              </p>
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              {mcpToolIds.map((toolId) => (
                <ToolDisplay
                  key={toolId}
                  toolEventId={toolId}
                  onRemove={() => handleRemoveTool(toolId)}
                  canRemove={true}
                />
              ))}
            </div>
          )}
          
          <Button
            onClick={() => setAddToolsDialogOpen(true)}
            variant="outline"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Tool
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About MCP Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              MCP tools are specialized functions that agents can use to interact with external systems,
              databases, APIs, and more. Each tool has specific parameters and capabilities.
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            When you add tools to a project, all agents assigned to the project gain access to use
            these tools in their responses.
          </div>
        </CardContent>
      </Card>
      
      <AddToolsToProjectDialog
        open={addToolsDialogOpen}
        onOpenChange={setAddToolsDialogOpen}
        project={project}
        existingToolIds={mcpToolIds}
      />
    </div>
  )
}