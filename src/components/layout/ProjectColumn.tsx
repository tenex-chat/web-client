import { useState, useEffect } from 'react'
import { MessageSquare, FileText, Bot, BarChart, Settings, Plus, ChevronRight, Clock, Shield, AlertTriangle, WifiOff } from 'lucide-react'
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
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { useProjectStatus } from '@/stores/projects'
import { bringProjectOnline } from '@/lib/utils/projectStatusUtils'

type TabType = 'conversations' | 'docs' | 'agents' | 'status' | 'settings'

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
          <div className="flex flex-col h-full">
            {/* Conversations Header */}
            <div className="border-b px-3 py-2 flex items-center justify-between">
              <span className="text-sm font-medium">Conversations</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onItemClick(project, 'conversations', 'new')}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {/* Thread List */}
            <div className="flex-1 overflow-hidden">
              <ThreadList
                project={project}
                selectedThread={selectedThread}
                onThreadSelect={handleThreadSelect}
                className="h-full"
              />
            </div>
          </div>
        )
      
      case 'docs':
        return (
          <div className="flex flex-col h-full">
            {/* Documentation Header */}
            <div className="border-b px-3 py-2 flex items-center justify-between">
              <span className="text-sm font-medium">Documentation</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onItemClick(project, 'docs', 'new')}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {/* Docs List */}
            <div className="flex-1 overflow-hidden">
              <DocumentationListSimple
                projectId={project.dTag}
                onArticleSelect={handleDocumentSelect}
                className="h-full"
              />
            </div>
          </div>
        )
      
      case 'agents':
        return (
          <div className="flex flex-col h-full">
            {/* Agents Header */}
            <div className="border-b px-3 py-2 flex items-center justify-between">
              <span className="text-sm font-medium">Agents</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setAddAgentsDialogOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {/* Agents List */}
            <ScrollArea className="flex-1">
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
          </div>
        )
      
      case 'status':
        return (
          <div className="flex flex-col h-full">
            {/* Status Header */}
            <div className="border-b px-3 py-2">
              <span className="text-sm font-medium">Status</span>
            </div>
            {/* Status List */}
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start p-2 h-auto"
                  onClick={() => onItemClick(project, 'status', 'overview')}
                >
                  <div className="flex items-center gap-2 w-full">
                    <BarChart className="h-4 w-4 shrink-0" />
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">Project Overview</div>
                      <div className="text-xs text-muted-foreground">View detailed status</div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                  </div>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start p-2 h-auto"
                  onClick={() => onItemClick(project, 'status', 'activity')}
                >
                  <div className="flex items-center gap-2 w-full">
                    <Clock className="h-4 w-4 shrink-0" />
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">Activity Log</div>
                      <div className="text-xs text-muted-foreground">Recent events</div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                  </div>
                </Button>
              </div>
            </ScrollArea>
          </div>
        )
      
      case 'settings':
        return (
          <div className="flex flex-col h-full">
            {/* Settings Header */}
            <div className="border-b px-3 py-2">
              <span className="text-sm font-medium">Settings</span>
            </div>
            {/* Settings List */}
            <ScrollArea className="flex-1">
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
          </div>
        )
      
      default:
        return null
    }
  }

  const tabs = [
    { id: 'conversations' as const, icon: MessageSquare, label: 'Conversations' },
    { id: 'docs' as const, icon: FileText, label: 'Documentation' },
    { id: 'agents' as const, icon: Bot, label: 'Agents' },
    { id: 'status' as const, icon: BarChart, label: 'Status' },
    { id: 'settings' as const, icon: Settings, label: 'Settings' },
  ]

  const activeTabInfo = tabs.find(tab => tab.id === activeTab)

  return (
    <>
      <div className={cn('flex flex-col border-r bg-muted/5', className)}>
      {/* Column Header */}
      <div className="border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <ProjectAvatar 
            project={project} 
            className="h-6 w-6"
            fallbackClassName="text-xs"
          />
          <h3 className="font-medium text-sm truncate flex-1 flex items-center gap-1.5">
            {project.title || 'Untitled Project'}
            {projectStatus && !projectStatus.isOnline && (
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
          
          {/* Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
              >
                {activeTabInfo && (
                  <activeTabInfo.icon className="h-3.5 w-3.5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {tabs.map((tab) => (
                <DropdownMenuItem
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2",
                    activeTab === tab.id && "bg-accent"
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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