import { useState } from 'react'
import { motion } from 'framer-motion'
import { Rnd } from 'react-rnd'
import { cn } from '@/lib/utils'
import { X, Minus, Maximize2, Minimize2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { DocumentationViewer } from '@/components/documentation/DocumentationViewer'
import { DocumentationEditorDrawer } from '@/components/documentation/DocumentationEditorDrawer'
import { AgentProfilePage } from '@/components/agents/AgentProfilePage'
import { ProjectGeneralSettings } from '@/components/settings/ProjectGeneralSettings'
import { ProjectAdvancedSettings } from '@/components/settings/ProjectAdvancedSettings'
import { ProjectDangerZone } from '@/components/settings/ProjectDangerZone'
import { NDKProject } from '@/lib/ndk-events/NDKProject'
import { NDKEvent, NDKArticle } from '@nostr-dev-kit/ndk'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ProjectAvatar } from '@/components/ui/project-avatar'

type TabType = 'conversations' | 'docs' | 'agents' | 'status' | 'settings' | 'tasks'

export interface DrawerContent {
  project: NDKProject
  type: TabType
  item?: string | NDKEvent
  data?: any
}

interface FloatingWindowProps {
  content: DrawerContent
  onClose: () => void
  onMinimize: () => void
  onFocus: () => void
  isMinimized: boolean
  zIndex: number
  initialPosition?: { x: number; y: number }
}

export function FloatingWindow({
  content: initialContent,
  onClose,
  onMinimize,
  onFocus,
  isMinimized,
  zIndex,
  initialPosition = { x: 100, y: 100 }
}: FloatingWindowProps) {
  const [isMaximized, setIsMaximized] = useState(false)
  const [size, setSize] = useState({ width: 800, height: 600 })
  const [position, setPosition] = useState(initialPosition)
  const [preMaximizeState, setPreMaximizeState] = useState({ size, position })
  const [aspectRatio, setAspectRatio] = useState(800 / 600)
  const [isScaling, setIsScaling] = useState(false)
  
  // Store the content locally to prevent external updates
  const [content] = useState(initialContent)

  // Hide window when minimized
  if (isMinimized) {
    return null
  }

  const handleMaximize = () => {
    if (isMaximized) {
      // Restore
      setSize(preMaximizeState.size)
      setPosition(preMaximizeState.position)
    } else {
      // Maximize
      setPreMaximizeState({ size, position })
      setSize({ width: window.innerWidth - 100, height: window.innerHeight - 100 })
      setPosition({ x: 50, y: 50 })
    }
    setIsMaximized(!isMaximized)
  }

  const getTitle = () => {
    switch (content.type) {
      case 'conversations':
        return content.item === 'new' ? 'New Conversation' : 'Conversation'
      case 'docs':
        if (content.item === 'new') return 'New Document'
        if (content.item instanceof NDKEvent) {
          const article = NDKArticle.from(content.item)
          return article.title || 'Document'
        }
        return 'Documentation'
      case 'agents':
        return 'Agent Profile'
      case 'settings':
        return `${content.project.title} Settings`
      default:
        return content.project.title
    }
  }

  const renderContent = () => {
    switch (content.type) {
      case 'conversations':
        if (content.item === 'new' || content.data) {
          return (
            <ChatInterface
              project={content.project}
              rootEvent={content.data}
              className="h-full w-full"
            />
          )
        }
        break

      case 'docs':
        if (content.item === 'new') {
          return (
            <DocumentationEditorDrawer
              project={content.project}
              projectTitle={content.project.title}
              existingHashtags={[]}
              onBack={() => onClose()}
            />
          )
        } else if (content.item instanceof NDKEvent) {
          return (
            <DocumentationViewer
              article={NDKArticle.from(content.item)}
              projectTitle={content.project.title}
              project={content.project}
              onBack={() => onClose()}
              onEdit={() => {
                // Handle edit mode
              }}
            />
          )
        }
        break

      case 'agents':
        if (typeof content.item === 'string') {
          return (
            <div className="h-full overflow-hidden">
              <AgentProfilePage pubkey={content.item} />
            </div>
          )
        }
        break

      case 'settings':
        const settingsSection = content.item as string
        switch (settingsSection) {
          case 'advanced':
            return <ProjectAdvancedSettings project={content.project} />
          case 'danger':
            return <ProjectDangerZone project={content.project} />
          default:
            return <ProjectGeneralSettings project={content.project} />
        }
    }

    return <div className="p-4">Content not available</div>
  }

  return (
    <Rnd
      default={{
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
      }}
      position={isMaximized ? position : undefined}
      size={isMaximized ? size : undefined}
      onDragStop={(_, d) => {
        if (!isMaximized) {
          setPosition({ x: d.x, y: d.y })
        }
      }}
      onResizeStart={(e) => {
        if (e instanceof MouseEvent && e.shiftKey) {
          setIsScaling(true)
        }
      }}
      onResize={(e, _direction, ref, _delta, _position) => {
        // Check if shift key is pressed for proportional scaling
        if (e instanceof MouseEvent && e.shiftKey) {
          const newWidth = parseInt(ref.style.width)
          const newHeight = Math.round(newWidth / aspectRatio)
          ref.style.height = `${newHeight}px`
        }
      }}
      onResizeStop={(e, __, ref, ___, position) => {
        if (!isMaximized) {
          const newWidth = parseInt(ref.style.width)
          const newHeight = parseInt(ref.style.height)
          setSize({
            width: newWidth,
            height: newHeight
          })
          setPosition(position)
          
          // Update aspect ratio if not shift-scaling
          if (!(e instanceof MouseEvent && e.shiftKey)) {
            setAspectRatio(newWidth / newHeight)
          }
        }
        setIsScaling(false)
      }}
      minWidth={400}
      minHeight={300}
      bounds="window"
      style={{ zIndex }}
      dragHandleClassName="window-drag-handle"
      disableDragging={isMaximized}
      enableResizing={!isMaximized}
      onMouseDown={onFocus}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          "h-full flex flex-col bg-background border rounded-lg shadow-2xl overflow-hidden",
          "ring-1 ring-border/50",
          isScaling && "ring-2 ring-primary/50"
        )}
      >
        {/* Window Header */}
        <div className="window-drag-handle flex items-center justify-between px-4 py-2 border-b bg-muted/50 cursor-move select-none">
          <div className="flex items-center gap-2">
            <ProjectAvatar 
              project={content.project} 
              className="h-6 w-6 shrink-0"
              fallbackClassName="text-[10px]"
            />
            <span className="text-sm font-medium truncate max-w-[300px]">
              {getTitle()}
            </span>
            <span className="text-xs text-muted-foreground">
              • {content.project.title}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onMinimize}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleMaximize}
            >
              {isMaximized ? (
                <Minimize2 className="h-3 w-3" />
              ) : (
                <Maximize2 className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
              onClick={onClose}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Window Content */}
        <div className="flex-1 min-h-0 overflow-hidden relative flex flex-col">
          {/* Render content directly for conversations, wrap others in ScrollArea */}
          {content.type === 'conversations' ? (
            renderContent()
          ) : (
            <ScrollArea className="h-full">
              {renderContent()}
            </ScrollArea>
          )}
          
          {/* Scaling indicator */}
          {isScaling && (
            <div className="absolute bottom-2 right-2 bg-primary/10 text-primary text-xs px-2 py-1 rounded-md flex items-center gap-1 z-10 pointer-events-none">
              <Lock className="h-3 w-3" />
              Aspect ratio locked
            </div>
          )}
        </div>
      </motion.div>
    </Rnd>
  )
}