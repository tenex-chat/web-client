import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, useCallback } from 'react'
import { useNDK } from '@nostr-dev-kit/ndk-hooks'
import { NDKProject } from '@/lib/ndk-events/NDKProject'
import { useProject } from '@/hooks/useProject'
import { ProjectAvatar } from '@/components/ui/project-avatar'
import { Button } from '@/components/ui/button'
import { Settings, Users, MessageSquare, Menu, FileText, Bot, Plus } from 'lucide-react'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { ThreadList } from '@/components/chat/ThreadList'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { useProfile } from '@nostr-dev-kit/ndk-hooks'
import { cn } from '@/lib/utils'
import { bringProjectOnline } from '@/lib/utils/projectStatusUtils'
import { DocumentationList } from '@/components/documentation/DocumentationList'
import { DocumentationViewer } from '@/components/documentation/DocumentationViewer'
import { NDKArticle, NDKEvent } from '@nostr-dev-kit/ndk'
import { ProjectStatusIndicator } from '@/components/status/ProjectStatusIndicator'
import { useProjectStatus } from '@/stores/projects'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useProjectOnlineAgents } from '@/hooks/useProjectOnlineAgents'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronRight } from 'lucide-react'
import { ProjectColumn } from '@/components/layout/ProjectColumn'
import { useProjectActivityStore } from '@/stores/projectActivity'
import { FAB } from '@/components/ui/fab'
import { useAtom } from 'jotai'
import { openSingleProjectAtom } from '@/stores/openProjects'

// Agent list item component
function AgentListItem({ agent, isOnline }: { 
  agent: { pubkey: string; slug: string; status?: string; lastSeen?: number }
  isOnline: boolean
}) {
  const profile = useProfile(agent.pubkey)
  const avatarUrl = profile?.image || profile?.picture
  const displayName = agent.slug || profile?.displayName || profile?.name || 'Unknown Agent'
  
  return (
    <div
      className="flex items-start gap-3 px-3 py-2.5 hover:bg-accent/50 cursor-pointer transition-colors border-b"
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

export const Route = createFileRoute('/_auth/projects/$projectId/')({
  component: ProjectDetailPage,
})

function ProjectDetailPage() {
  const { projectId } = Route.useParams()
  const navigate = useNavigate()
  const { ndk } = useNDK()
  const project = useProject(projectId)
  const isMobile = useIsMobile()
  const [selectedThreadEvent, setSelectedThreadEvent] = useState<NDKEvent | undefined>(undefined)
  const [showThreadList, setShowThreadList] = useState(true)
  const [activeTab, setActiveTab] = useState<'conversations' | 'docs' | 'agents'>('conversations')
  const [selectedArticle, setSelectedArticle] = useState<NDKArticle | null>(null)
  const [, openSingleProject] = useAtom(openSingleProjectAtom)
  
  // Reset selected thread when project changes
  useEffect(() => {
    setSelectedThreadEvent(undefined)
    setActiveTab('conversations')
    setSelectedArticle(null)
  }, [projectId, isMobile])
  
  // Use project status from the store
  const projectStatus = useProjectStatus(project?.dTag)
  const agents = useProjectOnlineAgents(project?.dTag)
  
  // Update activity timestamp when user visits a project
  useEffect(() => {
    if (project?.dTag) {
      useProjectActivityStore.getState().updateActivity(project.dTag)
    }
  }, [project])
  
  // On desktop, open the project in multi-column view and redirect
  useEffect(() => {
    if (!isMobile && project) {
      openSingleProject(project)
      navigate({ to: '/projects' })
    }
  }, [project, isMobile, openSingleProject, navigate])
  
  // Helper functions for backwards compatibility
  const getOverallStatus = () => projectStatus?.isOnline ? 'online' : 'offline'
  
  const handleStartProject = async () => {
    if (!ndk || !project) return
    await bringProjectOnline(project, ndk)
  }
  


  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    )
  }



  // Render full content callback for mobile
  const renderFullContent = useCallback((project: NDKProject, itemType: string, item?: any) => {
    switch (itemType) {
      case 'conversations':
        return (
          <ChatInterface 
            project={project} 
            rootEvent={item instanceof NDKEvent ? item : undefined}
            key={item?.id || 'new'}
            className="h-full"
            onThreadCreated={(newThread: NDKEvent) => {
              setSelectedThreadEvent(newThread)
            }}
          />
        )
      
      case 'docs':
        if (item instanceof NDKArticle) {
          return (
            <DocumentationViewer
              article={item}
              projectTitle={project.title}
              project={project}
              onBack={() => setSelectedArticle(null)}
            />
          )
        }
        return null
        
      default:
        return null
    }
  }, [])

  const handleNavigateToSettings = useCallback(() => {
    navigate({ to: '/projects/$projectId/settings', params: { projectId: project.dTag || projectId }, search: { tab: 'general' } })
  }, [navigate, project, projectId])

  // Mobile view - use unified ProjectColumn
  if (isMobile) {
    return (
      <ProjectColumn
        project={project}
        mode="standalone"
        renderFullContent={renderFullContent}
        className="h-full"
        onNavigateToSettings={handleNavigateToSettings}
      />
    )
  }

  // Desktop view - keep existing layout
  return (
      <div className="flex flex-col h-full relative">
        {/* Project Header with integrated tabs */}
        <div className="border-b">
          <div className="flex items-center gap-4 px-4 pt-4 pb-2">
            <ProjectAvatar 
              project={project} 
              className="h-10 w-10"
              fallbackClassName="text-sm"
            />
            
            <div className="flex-1 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold">{project.title || 'Untitled Project'}</h1>
                <ProjectStatusIndicator 
                  status={getOverallStatus()} 
                  size="sm" 
                  onClick={handleStartProject}
                />
              </div>
              
              {/* Inline tabs */}
              <div className="flex items-center gap-1 ml-auto">
                <Button
                  variant={activeTab === 'conversations' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="gap-1.5 h-8"
                  onClick={() => setActiveTab('conversations')}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Conversations</span>
                </Button>
                <Button
                  variant={activeTab === 'docs' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="gap-1.5 h-8"
                  onClick={() => setActiveTab('docs')}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Documentation</span>
                </Button>
                <Button
                  variant={activeTab === 'agents' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="gap-1.5 h-8"
                  onClick={() => setActiveTab('agents')}
                >
                  <Bot className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Agents</span>
                </Button>
              </div>
            </div>

            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Users className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8"
                onClick={() => navigate({ to: '/projects/$projectId/settings', params: { projectId: project.dTag || projectId }, search: { tab: 'general' } })}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tab content */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'conversations' | 'docs' | 'agents')}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {/* Remove TabsList since we've integrated it into the header */}

          {/* Conversations Tab */}
          <TabsContent value="conversations" className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex overflow-hidden">
              {/* Thread List - Collapsible on mobile */}
              <div
                className={cn(
                  'border-r bg-muted/10 transition-all duration-300 overflow-hidden relative',
                  showThreadList ? 'w-80' : 'w-0',
                  'lg:w-80' // Always show on large screens
                )}
              >
                {showThreadList && (
                  <>
                    <ThreadList
                      project={project}
                      selectedThread={selectedThreadEvent}
                      onThreadSelect={async (thread) => {
                        if (ndk) {
                          const threadEvent = await ndk.fetchEvent(thread.id)
                          if (threadEvent) {
                            setSelectedThreadEvent(threadEvent)
                          }
                        }
                        // On mobile, hide thread list when selecting a thread
                        if (isMobile) {
                          setShowThreadList(false)
                        }
                      }}
                    />
                    {/* FAB for desktop - positioned within the thread list column */}
                    {!isMobile && (
                      <FAB
                        onClick={() => {
                          setSelectedThreadEvent(undefined)
                        }}
                        label="New Chat"
                        showLabel={false}
                        position="bottom-right"
                        size="default"
                        style={{
                          position: 'absolute',
                          bottom: '16px',
                          right: '16px',
                          left: 'auto',
                          top: 'auto'
                        }}
                      >
                        <Plus />
                      </FAB>
                    )}
                  </>
                )}
              </div>

              {/* Chat Interface */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile Thread Toggle */}
                <div className="lg:hidden border-b p-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowThreadList(!showThreadList)}
                    className="gap-2"
                  >
                    <Menu className="h-4 w-4" />
                    {showThreadList ? 'Hide Threads' : 'Show Threads'}
                  </Button>
                </div>
                
                <div className="flex-1 overflow-hidden">
                  <ChatInterface 
                    project={project} 
                    rootEvent={selectedThreadEvent}
                    key={selectedThreadEvent?.id} // Force remount on thread change
                    className="h-full"
                    onTaskClick={(task) => {
                      setSelectedThreadEvent(task)
                    }}
                    onThreadCreated={(newThread) => {
                      setSelectedThreadEvent(newThread)
                      // Update thread list and stay in current view
                    }}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Documentation Tab */}
          <TabsContent value="docs" className="flex-1 overflow-hidden">
            <div className="flex h-full">
              {/* Documentation List */}
              {!selectedArticle ? (
                <DocumentationList
                  projectId={project.dTag}
                  onArticleSelect={setSelectedArticle}
                  className="flex-1"
                />
              ) : (
                <DocumentationViewer
                  article={selectedArticle}
                  projectTitle={project.title}
                  project={project}
                  onBack={() => setSelectedArticle(null)}
                />
              )}
            </div>
          </TabsContent>

          {/* Agents Tab */}
          <TabsContent value="agents" className="flex-1 overflow-auto">
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
                      isOnline={true}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

        </Tabs>
      </div>
  )
}