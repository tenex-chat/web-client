import { NDKEvent } from '@nostr-dev-kit/ndk'
import { useState } from 'react'
import { Terminal, Code2, Wrench, Plus, Check, Loader2, ExternalLink } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils/time'
import { NDKMCPTool } from '@/lib/ndk-events/NDKMCPTool'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNDKCurrentUser, useNDK } from '@nostr-dev-kit/ndk-hooks'
import { toast } from 'sonner'
import { NDKProject } from '@/lib/ndk-events/NDKProject'
import { useLocation } from '@tanstack/react-router'
import { useProject } from '@/hooks/useProject'

interface MCPToolEmbedCardProps {
  event: NDKEvent
  compact?: boolean
  className?: string
  onClick?: () => void
}

export function MCPToolEmbedCard({ event, compact, className, onClick }: MCPToolEmbedCardProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const { ndk } = useNDK()
  const user = useNDKCurrentUser()
  
  // Try to extract project ID from the current path
  const location = useLocation()
  const pathMatch = location.pathname.match(/\/projects\/([^\/]+)/)
  const projectId = pathMatch?.[1] || null
  const { project } = useProject(projectId || '')

  // Convert event to NDKMCPTool
  const tool = NDKMCPTool.from(event)

  const getToolIcon = (command?: string) => {
    if (!command) return <Wrench className="h-5 w-5" />
    if (command.includes('mcp')) return <Terminal className="h-5 w-5" />
    if (command.includes('code')) return <Code2 className="h-5 w-5" />
    return <Wrench className="h-5 w-5" />
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onClick) {
      onClick()
    } else {
      setModalOpen(true)
    }
  }

  const handleInstall = async () => {
    if (!project || !ndk || !user) {
      toast.error('Unable to install: Not authenticated or no project selected')
      return
    }

    setIsInstalling(true)
    try {
      // Check if already installed
      if (project.mcpTools.includes(event.id)) {
        toast.info('This tool is already installed in the project')
        setIsInstalled(true)
        setIsInstalling(false)
        return
      }

      // Add MCP tool to project
      project.addMCPTool(event.id)
      
      // Publish the updated project
      await project.publishReplaceable()
      
      toast.success(`MCP tool "${tool.name}" installed successfully`)
      setIsInstalled(true)
    } catch (error) {
      console.error('Failed to install MCP tool:', error)
      toast.error('Failed to install MCP tool')
    } finally {
      setIsInstalling(false)
    }
  }

  // Check if tool is already installed in the current project
  const checkIfInstalled = () => {
    if (project && project.mcpTools.includes(event.id)) {
      setIsInstalled(true)
    }
  }

  // Check installation status when project loads
  if (project && !isInstalled) {
    checkIfInstalled()
  }

  if (compact) {
    return (
      <>
        <span
          onClick={handleClick}
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md",
            "bg-purple-500/10 hover:bg-purple-500/20 transition-colors cursor-pointer",
            "text-sm my-1 border border-purple-500/30",
            className
          )}
        >
          <Terminal className="w-3.5 h-3.5 text-purple-500" />
          <span className="font-medium">MCP: {tool.name || 'Unnamed Tool'}</span>
        </span>

        {/* MCP Tool Detail Modal - also render in compact mode */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getToolIcon(tool.command)}
                {tool.name || 'Unnamed MCP Tool'}
              </DialogTitle>
              <DialogDescription>
                Model Context Protocol Tool
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                {/* Description */}
                {tool.description && (
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <p className="text-sm text-muted-foreground">
                      {tool.description}
                    </p>
                  </div>
                )}

                {/* Command */}
                {tool.command && (
                  <div className="space-y-2">
                    <Label>Command</Label>
                    <code className="block p-3 bg-muted rounded text-sm font-mono">
                      {tool.command}
                    </code>
                  </div>
                )}

                {/* Capabilities */}
                {tool.capabilities && tool.capabilities.length > 0 && (
                  <div className="space-y-2">
                    <Label>Capabilities</Label>
                    <div className="flex flex-wrap gap-2">
                      {tool.capabilities.map((cap, index) => (
                        <Badge key={index} variant="secondary">
                          {cap}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Parameters */}
                {tool.parameters && Object.keys(tool.parameters).length > 0 && (
                  <div className="space-y-2">
                    <Label>Parameters</Label>
                    <pre className="p-3 bg-muted rounded text-xs overflow-x-auto">
                      {JSON.stringify(tool.parameters, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Metadata */}
                <div className="space-y-2">
                  <Label>Tool Information</Label>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Event ID:</span> {event.id.substring(0, 16)}...
                    </div>
                    {event.created_at && (
                      <div>
                        <span className="font-medium">Created:</span> {new Date(event.created_at * 1000).toLocaleString()}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Author:</span> {event.pubkey.substring(0, 16)}...
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(`https://njump.me/${event.encode()}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View on njump
              </Button>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                >
                  Close
                </Button>
                
                {projectId && project && (
                  <Button
                    onClick={handleInstall}
                    disabled={isInstalling || isInstalled || !user}
                    className="min-w-[100px]"
                  >
                    {isInstalling ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Installing...
                      </>
                    ) : isInstalled ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Installed
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Install
                      </>
                    )}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <>
      <Card 
        onClick={handleClick}
        className={cn(
          "my-3 p-4 cursor-pointer transition-all",
          "hover:shadow-md hover:border-purple-500/30",
          "bg-gradient-to-br from-purple-500/5 to-transparent",
          className
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              {getToolIcon(tool.command)}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  {tool.name || 'Unnamed MCP Tool'}
                  <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-600">
                    MCP Tool
                  </Badge>
                </h3>
                
                {tool.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {tool.description}
                  </p>
                )}
                
                {tool.command && (
                  <code className="inline-block text-xs bg-muted px-2 py-1 rounded mt-2 font-mono">
                    {tool.command}
                  </code>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3 mt-3">
              {tool.capabilities && tool.capabilities.length > 0 && (
                <div className="flex gap-1">
                  {tool.capabilities.slice(0, 3).map((cap, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {cap}
                    </Badge>
                  ))}
                  {tool.capabilities.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{tool.capabilities.length - 3}
                    </Badge>
                  )}
                </div>
              )}
              
              {event.created_at && (
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(event.created_at * 1000)}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* MCP Tool Detail Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getToolIcon(tool.command)}
              {tool.name || 'Unnamed MCP Tool'}
            </DialogTitle>
            <DialogDescription>
              Model Context Protocol Tool
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Description */}
              {tool.description && (
                <div className="space-y-2">
                  <Label>Description</Label>
                  <p className="text-sm text-muted-foreground">
                    {tool.description}
                  </p>
                </div>
              )}

              {/* Command */}
              {tool.command && (
                <div className="space-y-2">
                  <Label>Command</Label>
                  <code className="block p-3 bg-muted rounded text-sm font-mono">
                    {tool.command}
                  </code>
                </div>
              )}

              {/* Capabilities */}
              {tool.capabilities && tool.capabilities.length > 0 && (
                <div className="space-y-2">
                  <Label>Capabilities</Label>
                  <div className="flex flex-wrap gap-2">
                    {tool.capabilities.map((cap, index) => (
                      <Badge key={index} variant="secondary">
                        {cap}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Parameters */}
              {tool.parameters && Object.keys(tool.parameters).length > 0 && (
                <div className="space-y-2">
                  <Label>Parameters</Label>
                  <pre className="p-3 bg-muted rounded text-xs overflow-x-auto">
                    {JSON.stringify(tool.parameters, null, 2)}
                  </pre>
                </div>
              )}

              {/* Metadata */}
              <div className="space-y-2">
                <Label>Tool Information</Label>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Event ID:</span> {event.id.substring(0, 16)}...
                  </div>
                  {event.created_at && (
                    <div>
                      <span className="font-medium">Created:</span> {new Date(event.created_at * 1000).toLocaleString()}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Author:</span> {event.pubkey.substring(0, 16)}...
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(`https://njump.me/${event.encode()}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View on njump
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setModalOpen(false)}
              >
                Close
              </Button>
              
              {projectId && project && (
                <Button
                  onClick={handleInstall}
                  disabled={isInstalling || isInstalled || !user}
                  className="min-w-[100px]"
                >
                  {isInstalling ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Installing...
                    </>
                  ) : isInstalled ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Installed
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Install
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}