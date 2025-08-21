import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { ProjectColumn } from './ProjectColumn'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { DocumentationViewer } from '@/components/documentation/DocumentationViewer'
import { DocumentationEditorDrawer } from '@/components/documentation/DocumentationEditorDrawer'
import { AgentProfilePage } from '@/components/agents/AgentProfilePage'
import { ProjectGeneralSettings } from '@/components/settings/ProjectGeneralSettings'
import { ProjectAdvancedSettings } from '@/components/settings/ProjectAdvancedSettings'
import { ProjectDangerZone } from '@/components/settings/ProjectDangerZone'
import { NDKProject } from '@/lib/ndk-events/NDKProject'
import { NDKEvent, NDKArticle, NDKKind } from '@nostr-dev-kit/ndk'
import { NDKTask } from '@/lib/ndk-events/NDKTask'
import { useSubscribe } from '@nostr-dev-kit/ndk-hooks'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'

type TabType = 'conversations' | 'docs' | 'agents' | 'status' | 'settings' | 'tasks'

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
  const [isCreatingDoc, setIsCreatingDoc] = useState(false)
  const [editingArticle, setEditingArticle] = useState<NDKArticle | null>(null)
  
  // Collect existing hashtags from documentation for suggestions
  const currentProject = drawerContent?.project
  const filter = useMemo(() => {
    if (!currentProject) return null
    return {
      kinds: [NDKKind.Article],
      '#a': [currentProject.tagId()]
    }
  }, [currentProject])
  
  const { events: articles } = useSubscribe<NDKArticle>(filter ? [filter] : false, {
    wrap: true,
    closeOnEose: false,
    groupable: true,
    subId: 'hashtag-suggestions'
  }, [currentProject])
  
  const existingHashtags = useMemo(() => {
    if (!articles) return []
    const tagSet = new Set<string>()
    articles.forEach(article => {
      article.tags
        .filter(tag => tag[0] === 't')
        .forEach(tag => tagSet.add(tag[1]))
    })
    return Array.from(tagSet).sort()
  }, [articles])

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
    } else if (itemType === 'docs' && item === 'new') {
      // New documentation - open in drawer
      setIsCreatingDoc(true)
      setEditingArticle(null)
      setSelectedArticle(null)
      setDrawerContent({ project, type: itemType, item: 'new' })
    } else if (itemType === 'docs' && item instanceof NDKEvent) {
      // Existing documentation
      setIsCreatingDoc(false)
      setEditingArticle(null)
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
    setIsCreatingDoc(false)
    setEditingArticle(null)
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
            onTaskClick={(task: NDKTask) => {
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
        // Creating new document or editing
        if (isCreatingDoc || editingArticle) {
          return (
            <DocumentationEditorDrawer
              project={project}
              projectTitle={project.title}
              existingArticle={editingArticle}
              existingHashtags={existingHashtags}
              onBack={handleDrawerClose}
            />
          )
        }
        // Viewing existing document
        if (selectedArticle) {
          return (
            <DocumentationViewer
              article={selectedArticle}
              projectTitle={project.title}
              project={project}
              onBack={handleDrawerClose}
              onEdit={() => {
                setEditingArticle(selectedArticle)
                setIsCreatingDoc(false)
              }}
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
          className={cn(
            "p-0 flex flex-col",
            // Use different widths based on content type
            drawerContent?.type === 'docs' 
              ? "w-[65%] sm:max-w-[65%]"  // Narrower for documentation
              : "w-[85%] sm:max-w-[85%]"  // Wider for conversations and other content
          )}
          side="right"
        >
          {drawerContent && renderDrawerContent()}
        </SheetContent>
      </Sheet>
    </div>
  )
}