import { NDKArticle, NDKKind } from '@nostr-dev-kit/ndk'
import { useEvent } from '@nostr-dev-kit/ndk-hooks'
import { ExternalLink } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { 
  NostrEntity, 
  getEntityDisplayInfo, 
  isAddressPointer, 
  isEventPointer,
  isProfilePointer 
} from '@/lib/utils/nostrEntityParser'
import { ProfileDisplay } from '@/components/common/ProfileDisplay'
import { InlineProfileMention } from '@/components/common/InlineProfileMention'
import { cn } from '@/lib/utils'
import { EVENT_KINDS } from '@/lib/constants'
import { NDKTask } from '@/lib/ndk-events/NDKTask'
import { NDKMCPTool } from '@/lib/ndk-events/NDKMCPTool'
import { NDKAgentDefinition } from '@/lib/ndk-events/NDKAgentDefinition'
import { NDKAgentLesson } from '@/lib/ndk-events/NDKAgentLesson'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet'

// Import specialized card components
import { TaskEmbedCard } from '@/components/embeds/TaskEmbedCard'
import { ArticleEmbedCard } from '@/components/embeds/ArticleEmbedCard'
import { NoteEmbedCard } from '@/components/embeds/NoteEmbedCard'
import { MCPToolEmbedCard } from '@/components/embeds/MCPToolEmbedCard'
import { AgentDefinitionEmbedCard } from '@/components/embeds/AgentDefinitionEmbedCard'
import { DefaultEmbedCard } from '@/components/embeds/DefaultEmbedCard'
import { DocumentationViewer } from '@/components/documentation/DocumentationViewer'

interface NostrEntityCardProps {
  entity: NostrEntity
  className?: string
  compact?: boolean
}

export function NostrEntityCard({ 
  entity, 
  className = '',
  compact = false 
}: NostrEntityCardProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const displayInfo = getEntityDisplayInfo(entity)

  // Build subscription filter based on entity type
  const subscriptionFilter = useMemo(() => {
    if (!entity.data) return undefined

    if (entity.type === 'nevent' && isEventPointer(entity.data)) {
      // For events, subscribe by ID
      return [{
        ids: [entity.data.id],
      }]
    } else if (entity.type === 'naddr' && isAddressPointer(entity.data)) {
      // For addressable events, subscribe by author + d-tag
      return [{
        kinds: [entity.data.kind as NDKKind],
        authors: [entity.data.pubkey],
        '#d': [entity.data.identifier],
      }]
    } else if (entity.type === 'note' && typeof entity.data === 'string') {
      // For note references (just the event ID)
      return [{
        ids: [entity.data],
      }]
    }

    return undefined
  }, [entity])

  // Subscribe to the event if we have a filter
  const event = useEvent(
    subscriptionFilter || false,
    {}
  )

  // Handle profile types (npub, nprofile)
  if (entity.type === 'npub' || entity.type === 'nprofile') {
    let pubkey: string | undefined
    
    if (entity.type === 'npub' && typeof entity.data === 'string') {
      pubkey = entity.data
    } else if (entity.type === 'nprofile' && isProfilePointer(entity.data)) {
      pubkey = entity.data.pubkey
    }

    if (pubkey) {
      // Use inline mention for compact mode, card for full mode
      if (compact) {
        return <InlineProfileMention pubkey={pubkey} className={className} />
      }
      
      return (
        <Card className={cn(
          "inline-flex items-center gap-2",
          className
        )}>
          <ProfileDisplay pubkey={pubkey} />
        </Card>
      )
    }
  }

  // Handle click events
  const handleClick = () => {
    if (event?.content) {
      setDrawerOpen(true)
    } else {
      // Open in njump if no content to display
      window.open(`https://njump.me/${entity.bech32}`, '_blank')
    }
  }

  // If we don't have the event yet, show loading state
  if (!event) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md",
          "bg-muted/50 animate-pulse",
          "text-sm my-1",
          className
        )}
      >
        <span className="text-base">{displayInfo.icon}</span>
        <span className="font-medium">Loading...</span>
      </span>
    )
  }

  // Route to specialized card components based on event kind
  switch (event.kind) {
    case NDKTask.kind:
      return (
        <>
          <TaskEmbedCard 
            event={event} 
            compact={compact} 
            className={className}
            onClick={handleClick}
          />
          <EventDrawer 
            event={event}
            title={`Task: ${event.tags?.find(tag => tag[0] === 'title')?.[1] || 'Untitled'}`}
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
          />
        </>
      )

    case NDKArticle.kind: // 30023
      return (
        <>
          <ArticleEmbedCard 
            event={event} 
            compact={compact} 
            className={className}
            onClick={() => setSheetOpen(true)}
          />
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetContent 
              className="p-0 flex flex-col w-[65%] sm:max-w-[65%]"
              side="right"
            >
              <DocumentationViewer 
                article={NDKArticle.from(event)}
                onBack={() => setSheetOpen(false)}
              />
            </SheetContent>
          </Sheet>
        </>
      )

    case 1: // Regular note
      return (
        <>
          <NoteEmbedCard 
            event={event} 
            compact={compact} 
            className={className}
            onClick={handleClick}
          />
          <EventDrawer 
            event={event}
            title="Note"
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
          />
        </>
      )

    case NDKMCPTool.kind: // 4200
      return (
        <MCPToolEmbedCard 
          event={event} 
          compact={compact} 
          className={className}
        />
      )

    case NDKAgentDefinition.kind: // 4199
      return (
        <AgentDefinitionEmbedCard 
          event={event} 
          compact={compact} 
          className={className}
        />
      )

    case NDKAgentLesson.kind: // 4129
      // This might need a specialized card in the future
      return (
        <>
          <DefaultEmbedCard 
            event={event} 
            compact={compact} 
            className={className}
            onClick={handleClick}
          />
          <EventDrawer 
            event={event}
            title={displayInfo.title}
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
          />
        </>
      )

    default:
      return (
        <>
          <DefaultEmbedCard 
            event={event} 
            compact={compact} 
            className={className}
            onClick={handleClick}
          />
          <EventDrawer 
            event={event}
            title={displayInfo.title}
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
          />
        </>
      )
  }
}

// Shared drawer component for viewing full event content
function EventDrawer({ 
  event, 
  title, 
  open, 
  onOpenChange 
}: { 
  event: any
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!event.content) return null

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            {title}
            <ExternalLink 
              className="w-4 h-4 opacity-50 cursor-pointer hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                window.open(`https://njump.me/${event.encode()}`, '_blank')
              }}
            />
          </DrawerTitle>
        </DrawerHeader>
        
        <div className="px-6 pb-6 overflow-y-auto">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {event.content}
            </ReactMarkdown>
          </div>
          
          {/* Event metadata */}
          <div className="mt-6 pt-6 border-t space-y-2 text-sm text-muted-foreground">
            <div>
              <span className="font-medium">Event ID:</span> {event.id.substring(0, 16)}...
            </div>
            <div>
              <span className="font-medium">Kind:</span> {event.kind}
            </div>
            {event.created_at && (
              <div>
                <span className="font-medium">Created:</span> {new Date(event.created_at * 1000).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}