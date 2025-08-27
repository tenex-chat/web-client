import { motion, AnimatePresence } from 'framer-motion'
import { X, FileText, MessageSquare, Bot, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WindowState } from '@/stores/windowManager'
import { NDKArticle, NDKEvent } from '@nostr-dev-kit/ndk'
import { ProjectAvatar } from '@/components/ui/project-avatar'

interface WindowTaskbarProps {
  windows: WindowState[]
  onRestore: (id: string) => void
  onClose: (id: string) => void
}

export function WindowTaskbar({ windows, onRestore, onClose }: WindowTaskbarProps) {
  const minimizedWindows = windows.filter(w => w.isMinimized)
  
  if (minimizedWindows.length === 0) {
    return null
  }
  
  const getIcon = (window: WindowState) => {
    switch (window.content.type) {
      case 'conversations':
        return <MessageSquare className="h-3 w-3" />
      case 'docs':
        return <FileText className="h-3 w-3" />
      case 'agents':
        return <Bot className="h-3 w-3" />
      case 'settings':
        return <Settings className="h-3 w-3" />
      default:
        return null
    }
  }
  
  const getTitle = (window: WindowState) => {
    const { content } = window
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
        return 'Settings'
      default:
        return content.project.title
    }
  }
  
  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t px-4 py-2 z-50"
    >
      <div className="flex items-center gap-2 overflow-x-auto">
        <span className="text-xs text-muted-foreground mr-2">
          Minimized ({minimizedWindows.length})
        </span>
        
        <AnimatePresence mode="popLayout">
          {minimizedWindows.map((window) => (
            <motion.div
              key={window.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              layout
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRestore(window.id)}
                className="group relative flex items-center gap-2 pr-8"
              >
                <ProjectAvatar 
                  project={window.content.project} 
                  className="h-4 w-4 shrink-0"
                  fallbackClassName="text-[8px]"
                />
                {getIcon(window)}
                <span className="max-w-[150px] truncate">
                  {getTitle(window)}
                </span>
                <span className="text-xs text-muted-foreground">
                  • {window.content.project.title}
                </span>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation()
                    onClose(window.id)
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}