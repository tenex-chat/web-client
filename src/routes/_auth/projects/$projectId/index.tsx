import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AppShell } from '@/components/layout/AppShell'
import { useEffect, useState, useMemo } from 'react'
import { useNDK } from '@nostr-dev-kit/ndk-hooks'
import { NDKProject } from '@/lib/ndk-events/NDKProject'
import { useProject } from '@/hooks/useProject'
import { ProjectAvatar } from '@/components/ui/project-avatar'
import { Button } from '@/components/ui/button'
import { Settings, Users, MessageSquare, Menu, ListTodo, FileText, Bot, ArrowLeft } from 'lucide-react'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { ThreadList } from '@/components/chat/ThreadList'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { TasksTabContent } from '@/components/tasks/TasksTabContent'
import { NDKTask } from '@/lib/ndk-events/NDKTask'
import { useSubscribe } from '@nostr-dev-kit/ndk-hooks'
import { EVENT_KINDS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { DocumentationList } from '@/components/documentation/DocumentationList'
import { DocumentationViewer } from '@/components/documentation/DocumentationViewer'
import type { NDKArticle } from '@nostr-dev-kit/ndk'
import { ProjectStatusIndicator } from '@/components/status/ProjectStatusIndicator'
import { ProjectStatusPanel } from '@/components/status/ProjectStatusPanel'
import { useProjectStatus } from '@/stores/projects'
import { AgentsTabContent } from '@/components/agents/AgentsTabContent'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { MobileTabs } from '@/components/mobile/MobileTabs'
import { useProjectActivityStore } from '@/stores/projectActivity'

export const Route = createFileRoute('/_auth/projects/$projectId/')({
  component: ProjectDetailPage,
})

function ProjectDetailPage() {
  const { projectId } = Route.useParams()
  const navigate = useNavigate()
  const { ndk } = useNDK()
  const { project, isLoading } = useProject(projectId)
  const isMobile = useIsMobile()
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(isMobile ? null : 'new')
  const [showThreadList, setShowThreadList] = useState(true)
  const [activeTab, setActiveTab] = useState<'conversations' | 'tasks' | 'docs' | 'agents' | 'status'>('conversations')
  const [selectedArticle, setSelectedArticle] = useState<NDKArticle | null>(null)
  const [taskUnreadMap] = useState(new Map<string, number>())
  const [mobileView, setMobileView] = useState<'tabs' | 'chat'>('tabs')
  
  // Use project status from the store
  const projectStatus = useProjectStatus(project?.tagId())
  
  // Update activity timestamp when user visits a project
  useEffect(() => {
    if (project?.tagId()) {
      useProjectActivityStore.getState().updateActivity(project.tagId())
    }
  }, [project])
  
  // Helper functions for backwards compatibility
  const getOverallStatus = () => projectStatus?.isOnline ? 'online' : 'offline'
  
  // Debug logging for status
  useEffect(() => {
    if (project && projectStatus) {
      console.log(`Project ${project.title} status:`, {
        hasProject: !!project,
        hasStatus: !!projectStatus,
        isOnline: projectStatus.isOnline,
        overallStatus: getOverallStatus(),
        agents: projectStatus.agents.length,
        models: projectStatus.models.length
      })
    }
  }, [project, projectStatus])

  // Create task subscription filter
  const taskFilter = useMemo(
    () => project ? {
      kinds: [EVENT_KINDS.TASK],
      '#a': [project.tagId()],
    } : null,
    [project]
  )

  // Subscribe to tasks for this project
  const { events: taskEvents } = useSubscribe(
    taskFilter ? [taskFilter] : [],
    { disabled: !ndk || !project || !taskFilter }
  )

  // Debug logging
  useEffect(() => {
    if (taskFilter) {
      console.log('Task subscription filter:', taskFilter)
    }
    if (taskEvents) {
      console.log('Task events received:', taskEvents.length)
      taskEvents.forEach(event => {
        console.log('Task event:', event.id, event.tags)
      })
    }
  }, [taskFilter, taskEvents])

  // Convert task events to NDKTask instances
  const tasks = useMemo(() => {
    return taskEvents?.map(event => NDKTask.from(event)) || []
  }, [taskEvents])

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </AppShell>
    )
  }

  if (!project) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Project not found</p>
        </div>
      </AppShell>
    )
  }


  const handleTaskSelect = (_project: NDKProject, taskId: string) => {
    // Set the task as the selected thread/conversation
    setSelectedThreadId(taskId)
    // Switch to conversations tab to show the task
    setActiveTab('conversations')
    // On mobile, switch to chat view
    if (isMobile) {
      setMobileView('chat')
    }
  }

  const markTaskStatusUpdatesSeen = (taskId: string) => {
    // TODO: Mark task updates as seen
    console.log('Marking task updates as seen:', taskId)
  }

  // Mobile view - show one view at a time
  if (isMobile) {
    return (
      <AppShell>
        <div className="flex flex-col h-full">
          {/* Mobile Header with Back Navigation */}
          {mobileView !== 'tabs' && (
            <div className="border-b px-4 py-3 flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -ml-2"
                onClick={() => {
                  if (mobileView === 'chat') {
                    setMobileView('tabs')
                    setSelectedThreadId(null)
                  }
                }}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 flex-1">
                <ProjectAvatar 
                  project={project} 
                  className="h-8 w-8"
                  fallbackClassName="text-xs"
                />
                <div>
                  <h1 className="text-sm font-semibold">{project.title || 'Untitled Project'}</h1>
                  {mobileView === 'chat' && (
                    <p className="text-xs text-muted-foreground">Conversation</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Mobile Content */}
          {mobileView === 'tabs' && (
            <MobileTabs
              project={project}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              tasks={tasks}
              selectedArticle={selectedArticle}
              setSelectedArticle={setSelectedArticle}
              taskUnreadMap={taskUnreadMap}
              handleTaskSelect={handleTaskSelect}
              markTaskStatusUpdatesSeen={markTaskStatusUpdatesSeen}
              navigate={navigate}
              mobileView={mobileView}
              setMobileView={setMobileView}
              selectedThreadId={selectedThreadId}
              setSelectedThreadId={setSelectedThreadId}
            />
          )}


          {mobileView === 'chat' && (
            <ChatInterface 
              project={project} 
              threadId={selectedThreadId || 'new'}
              key={selectedThreadId || 'new'}
              className="h-full"
              onTaskClick={(taskId) => {
                setSelectedThreadId(taskId)
                // Stay in chat view on mobile when clicking a task within chat
              }}
            />
          )}
        </div>
      </AppShell>
    )
  }

  // Desktop view - keep existing layout
  return (
    <AppShell>
      <div className="flex flex-col h-full">
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
                <ProjectStatusIndicator status={getOverallStatus()} size="sm" />
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
                  variant={activeTab === 'tasks' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="gap-1.5 h-8"
                  onClick={() => setActiveTab('tasks')}
                >
                  <ListTodo className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Tasks</span>
                  {tasks.length > 0 && (
                    <span className="ml-1 px-1.5 py-0 text-xs bg-muted rounded-full">
                      {tasks.length}
                    </span>
                  )}
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
                <Button
                  variant={activeTab === 'status' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="gap-1.5 h-8"
                  onClick={() => setActiveTab('status')}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Status</span>
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
                onClick={() => navigate({ to: '/projects/$projectId/settings', params: { projectId } })}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tab content */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'conversations' | 'tasks' | 'docs' | 'agents' | 'status')}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {/* Remove TabsList since we've integrated it into the header */}

          {/* Conversations Tab */}
          <TabsContent value="conversations" className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex overflow-hidden">
              {/* Thread List - Collapsible on mobile */}
              <div
                className={cn(
                  'border-r bg-muted/10 transition-all duration-300 overflow-hidden',
                  showThreadList ? 'w-80' : 'w-0',
                  'lg:w-80' // Always show on large screens
                )}
              >
                {showThreadList && (
                  <ThreadList
                    project={project}
                    selectedThreadId={selectedThreadId || undefined}
                    onThreadSelect={(threadId) => {
                      setSelectedThreadId(threadId)
                      // On mobile, hide thread list when selecting a thread
                      if (isMobile) {
                        setShowThreadList(false)
                      }
                    }}
                  />
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
                    threadId={selectedThreadId || 'new'}
                    key={selectedThreadId} // Force remount on thread change
                    className="h-full"
                    onTaskClick={(taskId) => {
                      setSelectedThreadId(taskId)
                      // Desktop already shows chat, just update the thread
                    }}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="flex-1 overflow-auto">
            <div className="flex flex-col h-full">
              {/* Tasks Header */}
              <div className="border-b p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Project Tasks</h2>
                    <p className="text-sm text-muted-foreground">
                      {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Tasks List */}
              <div className="flex-1 overflow-auto">
                <TasksTabContent
                  tasks={tasks}
                  taskUnreadMap={taskUnreadMap}
                  project={project}
                  onTaskSelect={handleTaskSelect}
                  markTaskStatusUpdatesSeen={markTaskStatusUpdatesSeen}
                />
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
                  onBack={() => setSelectedArticle(null)}
                />
              )}
            </div>
          </TabsContent>

          {/* Agents Tab */}
          <TabsContent value="agents" className="flex-1 overflow-auto">
            <AgentsTabContent project={project} />
          </TabsContent>

          {/* Status Tab */}
          <TabsContent value="status" className="flex-1 overflow-auto">
            <div className="p-6 max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Project Status</h2>
                <p className="text-muted-foreground">
                  Real-time status of agents and available models for this project
                </p>
              </div>
              
              <ProjectStatusPanel project={project} />
            </div>
          </TabsContent>
        </Tabs>

      </div>
    </AppShell>
  )
}