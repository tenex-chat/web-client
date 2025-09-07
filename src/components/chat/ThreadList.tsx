import { useSubscribe } from '@nostr-dev-kit/ndk-hooks'
import { useMemo, useCallback, memo } from 'react'
import { MessageSquare } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { VirtualList } from '@/components/ui/virtual-list'
import { cn } from '@/lib/utils'
import { NDKProject } from '@/lib/ndk-events/NDKProject'
import { VIRTUAL_LIST_THRESHOLDS } from '@/lib/constants'
import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk-hooks'
import { ThreadItem } from './ThreadItem'

interface ThreadListProps {
  project: NDKProject
  selectedThread?: NDKEvent;
  onThreadSelect: (thread: NDKEvent) => void
  className?: string
}

export const ThreadList = memo(function ThreadList({ 
  project, 
  selectedThread, 
  onThreadSelect, 
  className 
}: ThreadListProps) {
  // Subscribe to project threads - ONLY THIS, nothing else
  const { events: threadEvents } = useSubscribe(
    project
      ? [
          {
            kinds: [NDKKind.Thread],
            ...project.filter(),
          },
        ]
      : false,
    {}
  )

  // Sort threads by creation time (newest first)
  const sortedThreads = useMemo(() => {
    if (!threadEvents || threadEvents.length === 0) return []
    
    return [...threadEvents]
      .filter(thread => thread.created_at !== undefined)
      .sort((a, b) => {
        // TypeScript now knows both have created_at
        return b.created_at - a.created_at
      })
  }, [threadEvents])

  const renderThread = useCallback((thread: typeof sortedThreads[0]) => (
    <ThreadItem
      key={thread.id}
      thread={thread}
      isSelected={thread.id === selectedThread?.id}
      onSelect={() => onThreadSelect(thread)}
    />
  ), [selectedThread?.id, onThreadSelect])

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Thread List */}
      {sortedThreads.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">No conversations yet</p>
          <p className="text-xs mt-2">Start a new thread to begin chatting</p>
        </div>
      ) : sortedThreads.length > VIRTUAL_LIST_THRESHOLDS.THREAD_LIST ? (
        // Use VirtualList for large thread lists
        <VirtualList
          items={sortedThreads}
          renderItem={renderThread}
          estimateSize={90} // Estimated average thread item height
          overscan={3}
          containerClassName="flex-1"
        />
      ) : (
        // Use regular ScrollArea for small thread lists
        <ScrollArea className="flex-1">
          <div className="divide-y">
            {sortedThreads.map(renderThread)}
          </div>
        </ScrollArea>
      )}
    </div>
  )
})