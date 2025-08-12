import { Button } from '@/components/ui/button'
import { MessageSquare, ListTodo, FileText, Bot, Users, Settings } from 'lucide-react'
import { ProjectAvatar } from '@/components/ui/project-avatar'
import { NDKProject } from '@/lib/ndk-events/NDKProject'
import { NDKTask } from '@/lib/ndk-events/NDKTask'
import { TasksTabContent } from '@/components/tasks/TasksTabContent'
import { DocumentationList } from '@/components/documentation/DocumentationList'
import { DocumentationViewer } from '@/components/documentation/DocumentationViewer'
import { AgentsTabContent } from '@/components/agents/AgentsTabContent'
import { ProjectStatusPanel } from '@/components/status/ProjectStatusPanel'
import { ProjectStatusIndicator } from '@/components/status/ProjectStatusIndicator'
import { useProjectStatus } from '@/stores/projects'
import { ThreadList } from '@/components/chat/ThreadList'
import type { NDKArticle, NDKEvent } from '@nostr-dev-kit/ndk'
import { useNavigate } from '@tanstack/react-router'

interface MobileTabsProps {
  project: NDKProject
  activeTab: 'conversations' | 'tasks' | 'docs' | 'agents' | 'status'
  setActiveTab: (tab: 'conversations' | 'tasks' | 'docs' | 'agents' | 'status') => void
  tasks: NDKTask[]
  selectedArticle: NDKArticle | null
  setSelectedArticle: (article: NDKArticle | null) => void
  taskUnreadMap: Map<string, number>
  handleTaskSelect: (project: NDKProject, taskId: string) => void
  markTaskStatusUpdatesSeen: (taskId: string) => void
  navigate: ReturnType<typeof useNavigate>
  mobileView: 'tabs' | 'chat'
  setMobileView: (view: 'tabs' | 'chat') => void
  selectedThreadEvent: NDKEvent | undefined
  setSelectedThreadEvent: (event: NDKEvent | undefined) => void
  handleThreadSelect: (threadId: string) => Promise<void>
  handleStartProject?: () => void
}

export function MobileTabs({
  project,
  activeTab,
  setActiveTab,
  tasks,
  selectedArticle,
  setSelectedArticle,
  taskUnreadMap,
  handleTaskSelect,
  markTaskStatusUpdatesSeen,
  navigate,
  setMobileView,
  selectedThreadEvent,
  setSelectedThreadEvent,
  handleThreadSelect,
  handleStartProject
}: MobileTabsProps) {
  const projectStatus = useProjectStatus(project?.dTag)
  const getOverallStatus = () => projectStatus?.isOnline ? 'online' : 'offline'

  return (
    <div className="flex flex-col h-full">
      {/* Project Header with Tabs */}
      <div className="border-b">
        {/* Project Info */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <ProjectAvatar 
              project={project} 
              className="h-10 w-10"
              fallbackClassName="text-sm"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold">{project.title || 'Untitled Project'}</h1>
                <ProjectStatusIndicator 
                  status={getOverallStatus()} 
                  size="sm" 
                  onClick={handleStartProject}
                />
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              onClick={() => navigate({ to: '/projects/$projectId/settings', params: { projectId: project.dTag || '' } })}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Material Design Tab Bar */}
        <div className="flex border-t">
          <Button
            variant="ghost"
            className={`flex-1 rounded-none h-12 gap-1.5 ${activeTab === 'conversations' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('conversations')}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="text-xs">Chat</span>
          </Button>
          <Button
            variant="ghost"
            className={`flex-1 rounded-none h-12 gap-1.5 ${activeTab === 'tasks' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('tasks')}
          >
            <ListTodo className="h-4 w-4" />
            <span className="text-xs">Tasks</span>
            {tasks.length > 0 && (
              <span className="px-1.5 py-0 text-xs bg-muted rounded-full">
                {tasks.length}
              </span>
            )}
          </Button>
          <Button
            variant="ghost"
            className={`flex-1 rounded-none h-12 gap-1.5 ${activeTab === 'docs' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('docs')}
          >
            <FileText className="h-4 w-4" />
            <span className="text-xs">Docs</span>
          </Button>
          <Button
            variant="ghost"
            className={`flex-1 rounded-none h-12 gap-1.5 ${activeTab === 'agents' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('agents')}
          >
            <Bot className="h-4 w-4" />
            <span className="text-xs">Agents</span>
          </Button>
          <Button
            variant="ghost"
            className={`flex-1 rounded-none h-12 gap-1.5 ${activeTab === 'status' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('status')}
          >
            <Users className="h-4 w-4" />
            <span className="text-xs">Status</span>
          </Button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'conversations' && (
          <ThreadList
            project={project}
            selectedThreadId={selectedThreadEvent?.id}
            onThreadSelect={async (threadId) => {
              await handleThreadSelect(threadId)
              setMobileView('chat')
            }}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksTabContent
            tasks={tasks}
            taskUnreadMap={taskUnreadMap}
            project={project}
            onTaskSelect={handleTaskSelect}
            markTaskStatusUpdatesSeen={markTaskStatusUpdatesSeen}
          />
        )}

        {activeTab === 'docs' && (
          !selectedArticle ? (
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
          )
        )}

        {activeTab === 'agents' && (
          <AgentsTabContent project={project} />
        )}

        {activeTab === 'status' && (
          <div className="p-4">
            <ProjectStatusPanel project={project} />
          </div>
        )}
      </div>
    </div>
  )
}