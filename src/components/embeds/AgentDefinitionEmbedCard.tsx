import { NDKEvent } from '@nostr-dev-kit/ndk'
import React, { useState } from 'react'
import { Bot, Brain, Plus, Check, Loader2, ExternalLink, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils/time'
import { NDKAgentDefinition } from '@/lib/ndk-events/NDKAgentDefinition'
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
import { useNDKCurrentUser, useNDK, useProfile } from '@nostr-dev-kit/ndk-hooks'
import { toast } from 'sonner'
import { useLocation } from '@tanstack/react-router'
import { useProject } from '@/hooks/useProject'
import { useProjectsStore } from '@/stores/projects'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { generateAgentColor } from '@/lib/utils/agent-colors'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface AgentDefinitionEmbedCardProps {
  event: NDKEvent
  compact?: boolean
  className?: string
  onClick?: () => void
}

export function AgentDefinitionEmbedCard({ event, compact, className, onClick }: AgentDefinitionEmbedCardProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const { ndk } = useNDK()
  const user = useNDKCurrentUser()
  const authorProfile = useProfile(event.pubkey)
  
  // Try to extract project ID from the current path
  const location = useLocation()
  const pathMatch = location.pathname.match(/\/projects\/([^\/]+)/)
  const projectIdFromUrl = pathMatch?.[1] || null
  
  // Get all projects for dropdown when not on a project page
  const allProjects = useProjectsStore(state => state.projectsArray || [])
  
  // Use URL project if available, otherwise use selected project
  const projectId = projectIdFromUrl || selectedProjectId
  const project = useProject(projectId || undefined)
  
  // Ensure we re-fetch projects when modal opens
  React.useEffect(() => {
    if (modalOpen && !project && projectId) {
      // Force a re-render to try fetching the project again
      const timer = setTimeout(() => {
        setSelectedProjectId(prev => prev); // Trigger re-render
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [modalOpen, project, projectId])

  // Convert event to NDKAgentDefinition
  const agent = NDKAgentDefinition.from(event)
  const agentColor = generateAgentColor(agent.name || agent.id)
  

  const getRoleIcon = (role?: string) => {
    switch(role?.toLowerCase()) {
      case 'specialist':
      case 'expert':
        return <Brain className="h-5 w-5" />
      case 'creative':
      case 'brainstorm':
        return <Sparkles className="h-5 w-5" />
      default:
        return <Bot className="h-5 w-5" />
    }
  }

  const getRoleColor = (role?: string) => {
    switch(role?.toLowerCase()) {
      case 'specialist':
      case 'expert':
        return 'text-blue-600 bg-blue-500/10 border-blue-500/30'
      case 'creative':
      case 'brainstorm':
        return 'text-purple-600 bg-purple-500/10 border-purple-500/30'
      default:
        return 'text-green-600 bg-green-500/10 border-green-500/30'
    }
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
      if (!user) {
        toast.error('Please sign in to install agents')
      } else if (!project) {
        toast.error('Please select a project to install the agent to')
      }
      return
    }

    setIsInstalling(true)
    try {
      // Check if already installed
      const existingAgents = project.agents.map(a => a.ndkAgentEventId)
      if (existingAgents.includes(event.id)) {
        toast.info('This agent is already installed in the project')
        setIsInstalled(true)
        setIsInstalling(false)
        return
      }

      // Add agent to project
      project.addAgent(event.id)
      
      // Publish the updated project
      await project.publishReplaceable()
      
      toast.success(`Agent "${agent.name}" installed successfully`)
      setIsInstalled(true)
    } catch (error) {
      console.error('Failed to install agent:', error)
      toast.error('Failed to install agent')
    } finally {
      setIsInstalling(false)
    }
  }

  // Check if agent is already installed in the current project
  const checkIfInstalled = () => {
    if (project) {
      const existingAgents = project.agents.map(a => a.ndkAgentEventId)
      setIsInstalled(existingAgents.includes(event.id))
    } else {
      setIsInstalled(false)
    }
  }
  
  // Debug logging
  React.useEffect(() => {
    if (modalOpen) {
      console.log('[AgentDefinitionEmbedCard] Modal opened:', {
        hasUser: !!user,
        userId: user?.pubkey,
        hasProjectFromUrl: !!projectIdFromUrl,
        projectIdFromUrl,
        hasSelectedProject: !!selectedProjectId,
        selectedProjectId,
        hasProject: !!project,
        projectId,
        projectTitle: project?.title,
        projectAgents: project?.agents,
        projectCount: allProjects.length,
        filteredProjectCount: allProjects.filter(p => p.dTag).length,
        willShowInstallButton: !!(user && (projectIdFromUrl || selectedProjectId) && project),
        willShowProjectSelector: !!(user && !project && allProjects.filter(p => p.dTag).length > 0),
        agentName: agent.name,
        eventId: event.id,
        // Detailed install button condition breakdown
        installButtonConditions: {
          hasUser: !!user,
          hasProjectIdFromUrlOrSelected: !!(projectIdFromUrl || selectedProjectId),
          hasProject: !!project,
          combined: !!(user && (projectIdFromUrl || selectedProjectId) && project)
        },
        // Detailed selector condition breakdown
        selectorConditions: {
          hasUser: !!user,
          noProject: !project,
          hasProjectsWithDTag: allProjects.filter(p => p.dTag).length > 0,
          combined: !!(user && !project && allProjects.filter(p => p.dTag).length > 0)
        }
      })
    }
  }, [modalOpen, user, projectIdFromUrl, selectedProjectId, project, projectId, allProjects.length, agent.name, event.id])

  // Check installation status when project loads
  React.useEffect(() => {
    if (project) {
      checkIfInstalled()
    }
  }, [project, event.id])

  if (compact) {
    return (
      <>
        <span
          onClick={handleClick}
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md",
            "bg-gradient-to-r from-indigo-500/10 to-purple-500/10 hover:from-indigo-500/20 hover:to-purple-500/20",
            "transition-colors cursor-pointer",
            "text-sm my-1 border border-indigo-500/30",
            className
          )}
        >
          <Bot className="w-3.5 h-3.5 text-indigo-500" />
          <span className="font-medium">Agent: {agent.name || 'Unnamed Agent'}</span>
        </span>

        {/* Agent Definition Detail Modal - also render in compact mode */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={agent.picture} />
                  <AvatarFallback style={{ backgroundColor: agentColor }}>
                    <Bot className="w-6 h-6 text-white" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="flex items-center gap-2">
                    {agent.name || 'Unnamed Agent Definition'}
                  </DialogTitle>
                  <DialogDescription>
                    {agent.role && (
                      <Badge variant="secondary" className={cn("mt-1", getRoleColor(agent.role))}>
                        {agent.role}
                      </Badge>
                    )}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                {/* Description */}
                {agent.description && (
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <p className="text-sm text-muted-foreground">
                      {agent.description}
                    </p>
                  </div>
                )}

                {/* Instructions */}
                {agent.instructions && (
                  <div className="space-y-2">
                    <Label>Instructions</Label>
                    <div className="prose prose-sm dark:prose-invert max-w-none p-3 bg-muted rounded">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {agent.instructions}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Use Criteria */}
                {agent.useCriteria && agent.useCriteria.length > 0 && (
                  <div className="space-y-2">
                    <Label>Use Criteria</Label>
                    <div className="flex flex-wrap gap-2">
                      {agent.useCriteria.map((criteria, index) => (
                        <Badge key={index} variant="outline">
                          {criteria}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Model */}
                {agent.model && (
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <p className="text-sm text-muted-foreground">
                      {agent.model}
                    </p>
                  </div>
                )}

                {/* Author */}
                <div className="space-y-2">
                  <Label>Created by</Label>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={authorProfile?.image || authorProfile?.picture} />
                      <AvatarFallback className="text-xs">
                        {authorProfile?.name?.[0] || event.pubkey.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">
                      {authorProfile?.name || authorProfile?.displayName || `${event.pubkey.slice(0, 8)}...`}
                    </span>
                  </div>
                </div>

                {/* Metadata */}
                <div className="space-y-2">
                  <Label>Agent Information</Label>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Event ID:</span> {event.id.substring(0, 16)}...
                    </div>
                    {event.created_at && (
                      <div>
                        <span className="font-medium">Created:</span> {new Date(event.created_at * 1000).toLocaleString()}
                      </div>
                    )}
                    {agent.version && (
                      <div>
                        <span className="font-medium">Version:</span> {agent.version}
                      </div>
                    )}
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
                
                {/* Show project selector when user is logged in and has projects */}
                {user && !project && allProjects.filter(p => p.dTag).length > 0 && (
                  <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {allProjects.filter(p => p.dTag).map((p) => (
                        <SelectItem key={p.dTag} value={p.dTag!}>
                          {p.title || 'Untitled Project'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
                {/* Show install button when project is available (from URL or selection) */}
                {user ? (
                  (projectIdFromUrl || selectedProjectId) && project ? (
                    <Button
                      onClick={handleInstall}
                      disabled={isInstalling || isInstalled}
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
                  ) : !projectIdFromUrl && allProjects.filter(p => p.dTag).length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No projects available
                    </div>
                  ) : null
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Sign in to install
                  </div>
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
          "hover:shadow-md hover:border-indigo-500/30",
          "bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent",
          className
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Avatar className="w-10 h-10">
              <AvatarImage src={agent.picture} />
              <AvatarFallback style={{ backgroundColor: agentColor }}>
                {getRoleIcon(agent.role)}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  {agent.name || 'Unnamed Agent Definition'}
                  {agent.role && (
                    <Badge variant="outline" className={cn("text-xs", getRoleColor(agent.role))}>
                      {agent.role}
                    </Badge>
                  )}
                </h3>
                
                {agent.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {agent.description}
                  </p>
                )}
                
                {agent.model && (
                  <Badge variant="secondary" className="text-xs mt-2">
                    {agent.model}
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3 mt-3">
              {agent.useCriteria && agent.useCriteria.length > 0 && (
                <div className="flex gap-1">
                  {agent.useCriteria.slice(0, 2).map((criteria, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {criteria}
                    </Badge>
                  ))}
                  {agent.useCriteria.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{agent.useCriteria.length - 2}
                    </Badge>
                  )}
                </div>
              )}
              
              {/* Author info */}
              <div className="flex items-center gap-1.5">
                <Avatar className="w-5 h-5">
                  <AvatarImage src={authorProfile?.image || authorProfile?.picture} />
                  <AvatarFallback className="text-xs">
                    {authorProfile?.name?.[0] || event.pubkey.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">
                  {authorProfile?.name || authorProfile?.displayName || `${event.pubkey.slice(0, 8)}...`}
                </span>
              </div>
              
              {event.created_at && (
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(event.created_at * 1000)}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Agent Definition Detail Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={agent.picture} />
                <AvatarFallback style={{ backgroundColor: agentColor }}>
                  <Bot className="w-6 h-6 text-white" />
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="flex items-center gap-2">
                  {agent.name || 'Unnamed Agent Definition'}
                </DialogTitle>
                <DialogDescription>
                  {agent.role && (
                    <Badge variant="secondary" className={cn("mt-1", getRoleColor(agent.role))}>
                      {agent.role}
                    </Badge>
                  )}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Description */}
              {agent.description && (
                <div className="space-y-2">
                  <Label>Description</Label>
                  <p className="text-sm text-muted-foreground">
                    {agent.description}
                  </p>
                </div>
              )}

              {/* Instructions */}
              {agent.instructions && (
                <div className="space-y-2">
                  <Label>Instructions</Label>
                  <div className="prose prose-sm dark:prose-invert max-w-none p-3 bg-muted rounded">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {agent.instructions}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Use Criteria */}
              {agent.useCriteria && agent.useCriteria.length > 0 && (
                <div className="space-y-2">
                  <Label>Use Criteria</Label>
                  <div className="flex flex-wrap gap-2">
                    {agent.useCriteria.map((criteria, index) => (
                      <Badge key={index} variant="outline">
                        {criteria}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Model */}
              {agent.model && (
                <div className="space-y-2">
                  <Label>Model</Label>
                  <p className="text-sm text-muted-foreground">
                    {agent.model}
                  </p>
                </div>
              )}

              {/* Author */}
              <div className="space-y-2">
                <Label>Created by</Label>
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={authorProfile?.image || authorProfile?.picture} />
                    <AvatarFallback className="text-xs">
                      {authorProfile?.name?.[0] || event.pubkey.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">
                    {authorProfile?.name || authorProfile?.displayName || `${event.pubkey.slice(0, 8)}...`}
                  </span>
                </div>
              </div>

              {/* Metadata */}
              <div className="space-y-2">
                <Label>Agent Information</Label>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Event ID:</span> {event.id.substring(0, 16)}...
                  </div>
                  {event.created_at && (
                    <div>
                      <span className="font-medium">Created:</span> {new Date(event.created_at * 1000).toLocaleString()}
                    </div>
                  )}
                  {agent.version && (
                    <div>
                      <span className="font-medium">Version:</span> {agent.version}
                    </div>
                  )}
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
              
              {/* Show project selector when user is logged in and has projects */}
              {user && !project && allProjects.filter(p => p.dTag).length > 0 && (
                <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {allProjects.filter(p => p.dTag).map((p) => (
                      <SelectItem key={p.dTag} value={p.dTag!}>
                        {p.title || 'Untitled Project'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {/* Show install button when project is available (from URL or selection) */}
              {user ? (
                (projectIdFromUrl || selectedProjectId) && project ? (
                  <Button
                    onClick={handleInstall}
                    disabled={isInstalling || isInstalled}
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
                ) : !projectIdFromUrl && allProjects.filter(p => p.dTag).length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No projects available
                  </div>
                ) : null
              ) : (
                <div className="text-sm text-muted-foreground">
                  Sign in to install
                </div>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}