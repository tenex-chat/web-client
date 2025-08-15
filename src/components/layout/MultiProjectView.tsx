import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ProjectColumn } from './ProjectColumn'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { DocumentationViewer } from '@/components/documentation/DocumentationViewer'
import { AgentProfilePage } from '@/components/agents/AgentProfilePage'
import { ProjectGeneralSettings } from '@/components/settings/ProjectGeneralSettings'
import { ProjectAdvancedSettings } from '@/components/settings/ProjectAdvancedSettings'
import { ProjectDangerZone } from '@/components/settings/ProjectDangerZone'
import { NDKProject } from '@/lib/ndk-events/NDKProject'
import { NDKEvent, NDKArticle, NDKTask } from '@nostr-dev-kit/ndk'
import { useNDK } from '@nostr-dev-kit/ndk-hooks'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'

type TabType = 'conversations' | 'docs' | 'agents' | 'status' | 'settings'

interface DrawerContent {
  project: NDKProject
  type: TabType
  item?: string | NDKEvent;
  data?: any
}

interface MultiProjectViewProps {
  openProjects: NDKProject[]
  className?: string
}

export function MultiProjectView({ openProjects, className }: MultiProjectViewProps) {
  const [drawerContent, setDrawerContent] = useState<DrawerContent | null>(null)
  const [selectedThreadEvent, setSelectedThreadEvent] = useState<NDKEvent | undefined>()
  const [selectedArticle, setSelectedArticle] = useState<NDKArticle | null>(null)
  const { ndk } = useNDK()

  // Handle item clicks from project columns
  const handleItemClick = async (project: NDKProject, itemType: TabType, item?: string | NDKEvent) => {
    // Fetch necessary data based on item type
    if (itemType === 'conversations' && item === 'new') {
      // New conversation
      setSelectedThreadEvent(undefined)
      setDrawerContent({ project, type: itemType, item: 'new' })
    } else if (itemType === 'conversations' && item) {
      // Existing conversation
      const threadEvent = item;
      if (threadEvent instanceof NDKEvent) {
        setSelectedThreadEvent(threadEvent)
        setDrawerContent({ project, type: itemType, item, data: threadEvent })
      }
    } else if (itemType === 'docs' && item instanceof NDKEvent) {
      // For docs, we'd need to fetch the article
      // This is simplified - you'd need actual article fetching logic
      setDrawerContent({ project, type: itemType, item })
      setSelectedArticle(NDKArticle.from(item))
    } else {
      setDrawerContent({ project, type: itemType, item })
    }
  }

  const handleDrawerClose = () => {
    setDrawerContent(null)
    setSelectedThreadEvent(undefined)
    setSelectedArticle(null)
  }

  const renderDrawerContent = () => {
    if (!drawerContent) return null

    const { project, type } = drawerContent

    switch (type) {
      case 'conversations':
        return (
          <ChatInterface
            project={project}
            rootEvent={selectedThreadEvent}
            className="h-full"
            onTaskClick={async (task: NDKTask) => {
                if (task) {
                  setSelectedThreadEvent(task)
                  setDrawerContent({ ...drawerContent, data: task })
                }
            }}
            onThreadCreated={(newThread: NDKEvent) => {
              if (newThread) {
                setSelectedThreadEvent(newThread)
                setDrawerContent({ ...drawerContent, data: newThread, item: newThread.id })
              }
            }}
          />
        )

      case 'docs':
        if (selectedArticle) {
          return (
            <DocumentationViewer
              article={selectedArticle}
              projectTitle={project.title}
              project={project}
              onBack={handleDrawerClose}
            />
          )
        }
        return <div className="p-4">Loading document...</div>

      case 'agents':
        // The item should be the agent's pubkey
        if (typeof drawerContent.item === 'string') {
          return (
            <div className="h-full overflow-hidden">
              <AgentProfilePage pubkey={drawerContent.item} />
            </div>
          )
        }
        return null

      case 'status':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Project Status</h2>
            <p className="text-muted-foreground">Detailed status view would go here</p>
          </div>
        )

      case 'settings':
        // Render appropriate settings component based on item
        return (
          <ScrollArea className="h-full">
            <div className="p-6">
              {(() => {
                switch (drawerContent.item) {
                  case 'general':
                    return <ProjectGeneralSettings project={project} />
                  
                  case 'advanced':
                    return <ProjectAdvancedSettings project={project} />
                  
                  case 'danger':
                    return <ProjectDangerZone project={project} onDelete={handleDrawerClose} />
                  
                  default:
                    return <ProjectGeneralSettings project={project} />
                }
              })()}
            </div>
          </ScrollArea>
        )

      default:
        return null
    }
  }

  // Calculate column width classes - removed since we'll use flex-1

  if (openProjects.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/10">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No projects open</h2>
          <p className="text-muted-foreground">
            Select projects from the sidebar to view them
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex h-full relative', className)}>
      {/* Container for project columns */}
      <div className="flex h-full overflow-x-auto">
        {openProjects.map((project) => (
          <ProjectColumn
            key={project.dTag || project.encode()}
            project={project}
            onItemClick={handleItemClick}
            className="w-80 flex-shrink-0"
          />
        ))}
      </div>

      {/* Drawer for detail views */}
      <Sheet open={!!drawerContent} onOpenChange={(open) => !open && handleDrawerClose()}>
        <SheetContent 
          className="w-[85%] sm:max-w-[85%] p-0 flex flex-col"
          side="right"
        >
          {drawerContent && renderDrawerContent()}
        </SheetContent>
      </Sheet>
    </div>
  )
}