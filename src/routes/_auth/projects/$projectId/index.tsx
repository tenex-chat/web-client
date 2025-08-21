import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNDK } from '@nostr-dev-kit/ndk-hooks'
import { NDKProject } from '@/lib/ndk-events/NDKProject'
import { useProject } from '@/hooks/useProject'
import { ProjectAvatar } from '@/components/ui/project-avatar'
import { Button } from '@/components/ui/button'
import { Settings, Users, MessageSquare, Menu, ListTodo, FileText, Bot, ArrowLeft, Plus } from 'lucide-react'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { ThreadList } from '@/components/chat/ThreadList'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { TasksTabContent } from '@/components/tasks/TasksTabContent'
import { NDKTask } from '@/lib/ndk-events/NDKTask'
import { useSubscribe } from '@nostr-dev-kit/ndk-hooks'
import { cn } from '@/lib/utils'
import { bringProjectOnline } from '@/lib/utils/projectStatusUtils'
import { DocumentationList } from '@/components/documentation/DocumentationList'
import { DocumentationViewer } from '@/components/documentation/DocumentationViewer'
import { NDKArticle, NDKEvent } from '@nostr-dev-kit/ndk'
import { ProjectStatusIndicator } from '@/components/status/ProjectStatusIndicator'
import { ProjectStatusPanel } from '@/components/status/ProjectStatusPanel'
import { useProjectStatus } from '@/stores/projects'
import { AgentsTabContent } from '@/components/agents/AgentsTabContent'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { ProjectColumn } from '@/components/layout/ProjectColumn'
import { useProjectActivityStore } from '@/stores/projectActivity'
import { FAB } from '@/components/ui/fab'
import { useAtom } from 'jotai'
import { openSingleProjectAtom } from '@/stores/openProjects'

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
  const [activeTab, setActiveTab] = useState<'conversations' | 'tasks' | 'docs' | 'agents' | 'status'>('conversations')
  const [selectedArticle, setSelectedArticle] = useState<NDKArticle | null>(null)
  const [taskUnreadMap] = useState(new Map<string, number>())
  const [, openSingleProject] = useAtom(openSingleProjectAtom)
  
  // Reset selected thread when project changes
  useEffect(() => {
    setSelectedThreadEvent(undefined)
    setActiveTab('conversations')
    setSelectedArticle(null)
  }, [projectId, isMobile])
  
  // Use project status from the store
  const projectStatus = useProjectStatus(project?.dTag)
  
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
  

  // Create task subscription filter
  const taskFilter = useMemo(
    () => project ? {
      kinds: [NDKTask.kind],
      '#a': [project.tagId()],
    } : null,
    [project]
  )

  // Subscribe to tasks for this project
  const { events: taskEvents } = useSubscribe(
    taskFilter ? [taskFilter] : []
  )


  // Convert task events to NDKTask instances
  const tasks = useMemo(() => {
    return taskEvents?.map(event => NDKTask.from(event)) || []
  }, [taskEvents])

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    )
  }


  const handleTaskSelect = async (_project: NDKProject, taskId: string) => {
    // Fetch the task event and set it as the selected thread
    if (ndk) {
      const taskEvent = await ndk.fetchEvent(taskId)
      if (taskEvent) {
        setSelectedThreadEvent(taskEvent)
        // Switch to conversations tab to show the task
        setActiveTab('conversations')
        // On mobile, switch to chat view
        if (isMobile) {
          setMobileView('chat')
        }
      }
    }
  }

  const markTaskStatusUpdatesSeen = (_taskId: string) => {
    // Mark task updates as seen - implementation pending
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
            onTaskClick={(task: NDKTask) => {
              setSelectedThreadEvent(task)
            }}
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
    navigate({ to: '/projects/$projectId/settings', params: { projectId: project.dTag || projectId } })
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
                onClick={() => navigate({ to: '/projects/$projectId/settings', params: { projectId: project.dTag || projectId } })}
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
                  'border-r bg-muted/10 transition-all duration-300 overflow-hidden relative',
                  showThreadList ? 'w-80' : 'w-0',
                  'lg:w-80' // Always show on large screens
                )}
              >
                {showThreadList && (
                  <>
                    <ThreadList
                      project={project}
                      selectedThreadId={selectedThreadEvent?.id}
                      onThreadSelect={async (threadId) => {
                        if (ndk) {
                          const threadEvent = await ndk.fetchEvent(threadId)
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
                    onTaskClick={async (taskId) => {
                      if (ndk) {
                        const taskEvent = await ndk.fetchEvent(taskId)
                        if (taskEvent) {
                          setSelectedThreadEvent(taskEvent)
                        }
                      }
                      // Desktop already shows chat, just update the thread
                    }}
                    onThreadCreated={async (newThreadId) => {
                      if (ndk) {
                        const newEvent = await ndk.fetchEvent(newThreadId)
                        if (newEvent) {
                          setSelectedThreadEvent(newEvent)
                        }
                      }
                      // Update thread list and stay in current view
                    }}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="flex-1 overflow-auto">
            <div className="flex flex-col h-full relative">
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
                  project={project}
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
  )
}