import { useState, useEffect, useMemo } from 'react'
import { MessageSquare, FileText, Bot, Settings, Plus, ChevronRight, Shield, AlertTriangle, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NDKProject } from '@/lib/ndk-events/NDKProject'
import { ProjectAvatar } from '@/components/ui/project-avatar'
import { Button } from '@/components/ui/button'
import { ThreadList } from '@/components/chat/ThreadList'
import { DocumentationListSimple } from '@/components/documentation/DocumentationListSimple'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useProjectOnlineAgents } from '@/hooks/useProjectOnlineAgents'
import { useProfile, useNDK } from '@nostr-dev-kit/ndk-hooks'
import { NDKArticle, NDKEvent } from '@nostr-dev-kit/ndk'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AddAgentsToProjectDialog } from '@/components/dialogs/AddAgentsToProjectDialog'
import { useProjectStatus } from '@/stores/projects'
import { bringProjectOnline } from '@/lib/utils/projectStatusUtils'

type TabType = 'conversations' | 'docs' | 'agents' | 'settings'

/**
 * Generate a deterministic HSL color based on a string
 * Same function as in project-avatar.tsx to ensure consistency
 */
function generateColorFromString(str: string): string {
  if (!str) return 'hsl(213, 27%, 64%)' // Default slate-400 if no string provided
  
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 65%, 55%)`
}

// Agent list item component
function AgentListItem({ agent, isOnline, onClick }: { 
  agent: { pubkey: string; name: string; status?: string; lastSeen?: number }
  isOnline: boolean
  onClick: () => void 
}) {
  const profile = useProfile(agent.pubkey)
  const avatarUrl = profile?.image || profile?.picture
  const displayName = agent.name || profile?.displayName || profile?.name || 'Unknown Agent'
  
  return (
    <div
      className="flex items-start gap-3 px-3 py-2.5 hover:bg-accent/50 cursor-pointer transition-colors border-b"
      onClick={onClick}
    >
      <div className="relative">
        <Avatar className="h-8 w-8">
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback>
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        {isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 border border-background" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">
          {displayName}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </div>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 mt-1.5" />
    </div>
  )
}

interface ProjectColumnProps {
  project: NDKProject
  onItemClick: (project: NDKProject, itemType: TabType, item?: string | NDKEvent) => void
  className?: string
}

export function ProjectColumn({ project, onItemClick, className }: ProjectColumnProps) {
  const [activeTab, setActiveTab] = useState<TabType>('conversations')
  const [selectedThread, setSelectedThread] = useState<NDKEvent>()
  const [addAgentsDialogOpen, setAddAgentsDialogOpen] = useState(false)
  const { ndk } = useNDK()
  const agents = useProjectOnlineAgents(project?.dTag)
  const projectStatus = useProjectStatus(project?.dTag)
  
  // Generate project color for the glow effect
  const projectColor = useMemo(() => {
    return generateColorFromString(project?.dTag || '')
  }, [project?.dTag])

  // Reset state when project changes
  useEffect(() => {
    setActiveTab('conversations')
    setSelectedThread(undefined)
  }, [project.dTag])

  const handleThreadSelect = (thread: NDKEvent) => {
    setSelectedThread(thread)
    onItemClick(project, 'conversations', thread)
  }

  const handleDocumentSelect = (article: NDKArticle) => {
    onItemClick(project, 'docs', article)
  }

  const handleBringOnline = async () => {
    if (!ndk) return
    await bringProjectOnline(project, ndk)
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'conversations':
        return (
          <ThreadList
            project={project}
            selectedThread={selectedThread}
            onThreadSelect={handleThreadSelect}
            className="h-full"
          />
        )
      
      case 'docs':
        return (
          <DocumentationListSimple
            projectId={project.dTag}
            onArticleSelect={handleDocumentSelect}
            className="h-full"
          />
        )
      
      case 'agents':
        return (
          <ScrollArea className="h-full">
            <div className="flex flex-col">
              {agents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-center px-3">
                  <Bot className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No agents available</p>
                </div>
              ) : (
                agents.map((agent) => (
                  <AgentListItem
                    key={agent.pubkey}
                    agent={agent}
                    isOnline={true} // All agents from useProjectOnlineAgents are online
                    onClick={() => onItemClick(project, 'agents', agent.pubkey)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        )
      
      case 'settings':
        return (
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start p-2 h-auto"
                onClick={() => onItemClick(project, 'settings', 'general')}
              >
                <div className="flex items-center gap-2 w-full">
                  <Settings className="h-4 w-4 shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">General</div>
                    <div className="text-xs text-muted-foreground">Basic project information</div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                </div>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start p-2 h-auto"
                onClick={() => onItemClick(project, 'settings', 'advanced')}
              >
                <div className="flex items-center gap-2 w-full">
                  <Shield className="h-4 w-4 shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">Advanced</div>
                    <div className="text-xs text-muted-foreground">Advanced configuration</div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                </div>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start p-2 h-auto"
                onClick={() => onItemClick(project, 'settings', 'danger')}
              >
                <div className="flex items-center gap-2 w-full">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">Danger Zone</div>
                    <div className="text-xs text-muted-foreground">Irreversible actions</div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                </div>
              </Button>
            </div>
          </ScrollArea>
        )
      
      default:
        return null
    }
  }

  const tabs = [
    { id: 'conversations' as const, icon: MessageSquare, label: 'Conversations' },
    { id: 'docs' as const, icon: FileText, label: 'Documentation' },
    { id: 'agents' as const, icon: Bot, label: 'Agents' },
    { id: 'settings' as const, icon: Settings, label: 'Settings' },
  ]

  return (
    <>
      <div className={cn('flex flex-col border-r bg-muted/5 relative overflow-hidden', className)}>
      {/* Glow effect at the top */}
      <div 
        className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, ${projectColor.replace('55%', '50%').replace('65%', '40%').replace(')', ', 0.12)')}, transparent)`,
        }}
      />
      
      {/* Column Header */}
      <div className="border-b relative">
        <div className="px-3 py-2">
          <div className="flex items-center gap-2">
            <ProjectAvatar 
              project={project} 
              className="h-6 w-6"
              fallbackClassName="text-xs"
            />
            <h3 className="font-medium text-sm truncate flex-1 flex items-center gap-1.5">
              {project.title || 'Untitled Project'}
              {(!projectStatus || !projectStatus.isOnline) && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={handleBringOnline}
                      >
                        <WifiOff className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Project is offline. Click to bring online.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </h3>
          </div>
        </div>
        
        {/* Icon Tab Bar */}
        <div className="flex items-center justify-between px-2 pb-1">
          <TooltipProvider>
            <div className="flex gap-1">
              {tabs.map((tab) => (
                <Tooltip key={tab.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "px-3 py-1.5 relative transition-colors rounded-sm",
                        "hover:text-foreground hover:bg-accent/50",
                        activeTab === tab.id 
                          ? "text-foreground" 
                          : "text-muted-foreground"
                      )}
                    >
                      <tab.icon className="h-4 w-4" />
                      {activeTab === tab.id && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-primary rounded-full" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{tab.label}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
          
          {/* Add button - conditionally shown based on active tab */}
          {(activeTab === 'conversations' || activeTab === 'docs' || activeTab === 'agents') && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                if (activeTab === 'agents') {
                  setAddAgentsDialogOpen(true)
                } else {
                  onItemClick(project, activeTab, 'new')
                }
              }}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

        {/* Column Content */}
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </div>

      <AddAgentsToProjectDialog
        open={addAgentsDialogOpen}
        onOpenChange={setAddAgentsDialogOpen}
        project={project}
        existingAgentIds={agents.map(a => a.pubkey)}
      />
    </>
  )
}