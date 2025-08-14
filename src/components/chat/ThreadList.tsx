import { useSubscribe } from '@nostr-dev-kit/ndk-hooks'
import { useState, useEffect } from 'react'
import { MessageSquare, ChevronRight, Users } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { VirtualList } from '@/components/ui/virtual-list'
import { Badge } from '@/components/ui/badge'
import { PhaseIndicator } from '@/components/ui/phase-indicator'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils/time'
import { NDKProject } from '@/lib/ndk-events/NDKProject'
import { EVENT_KINDS, VIRTUAL_LIST_THRESHOLDS, SUBSCRIPTION_LIMITS } from '@/lib/constants'
import type { NDKKind } from '@nostr-dev-kit/ndk'

interface ThreadListProps {
  project: NDKProject
  selectedThreadId?: string
  onThreadSelect: (threadId: string) => void
  className?: string
}

interface Thread {
  id: string
  title: string
  content: string
  lastMessage?: string
  author: {
    pubkey: string
    name?: string
    picture?: string
  }
  createdAt: number
  replyCount: number
  lastReplyAt?: number
  participants: Set<string>
}

export function ThreadList({ 
  project, 
  selectedThreadId, 
  onThreadSelect, 
  className 
}: ThreadListProps) {
  const [threads, setThreads] = useState<Thread[]>([])
  const [threadPhases, setThreadPhases] = useState<Record<string, string>>({})

  // Subscribe to project threads (kind 11 - CHAT)
		// Try subscribing with just kinds filter first to see if we get any events
		const { events: threadEvents } = useSubscribe(
			project
				? [
						{
							kinds: [EVENT_KINDS.THREAD as NDKKind],
							...project.filter(),
						},
					]
				: false,
			{},
			[project?.dTag],
		);

  // Subscribe to kind:1111 events that e-tag threads to get phase information
  const { events: phaseEvents } = useSubscribe(
    threadEvents && threadEvents.length > 0
      ? [{
          kinds: [EVENT_KINDS.THREAD_REPLY as NDKKind],
          '#e': threadEvents.map(e => e.id),
        }]
      : false,
    {
      closeOnEose: false,
      groupable: true,
    },
    [threadEvents?.length]
  )

  // Subscribe to all thread replies to count them
  const { events: allReplies } = useSubscribe(
    threadEvents && threadEvents.length > 0
      ? [{
          kinds: [EVENT_KINDS.THREAD_REPLY as NDKKind],
          '#e': threadEvents.map(e => e.id),
        }]
      : false,
    {
      closeOnEose: false,
      groupable: true,
    },
    [threadEvents?.length]
  )

  // Process thread events
  useEffect(() => {
    if (!threadEvents || threadEvents.length === 0) return

    const processedThreads: Thread[] = threadEvents.map(event => {
      // Extract title from tags or use first line of content
      const titleTag = event.tags.find(t => t[0] === 'title')
      const title = titleTag ? titleTag[1] : event.content.split('\n')[0].slice(0, 50)

      return {
        id: event.id,
        title,
        content: event.content,
        author: {
          pubkey: event.pubkey,
          // Author metadata will be fetched by ThreadItem component
        },
        createdAt: event.created_at || 0,
        replyCount: 0,
        participants: new Set([event.pubkey]),
      }
    })

    // Sort by creation time (newest first)
    processedThreads.sort((a, b) => b.createdAt - a.createdAt)
    setThreads(processedThreads)
  }, [threadEvents])

  // Count replies and track participants
  useEffect(() => {
    if (!allReplies || allReplies.length === 0) return

    const counts: Record<string, number> = {}
    const lastReplyTimes: Record<string, number> = {}
    const lastMessages: Record<string, string> = {}
    const participants: Record<string, Set<string>> = {}

    // Group replies by thread and find the latest one
    
    allReplies.forEach(reply => {
      // Find which thread this reply belongs to
      const rootTag = reply.tags.find(t => t[0] === 'e' && t[3] === 'root')
      const threadId = rootTag ? rootTag[1] : reply.tags.find(t => t[0] === 'e')?.[1]

      if (threadId) {
        counts[threadId] = (counts[threadId] || 0) + 1
        
        // Track the latest reply time and content
        if (!lastReplyTimes[threadId] || (reply.created_at || 0) > lastReplyTimes[threadId]) {
          lastReplyTimes[threadId] = reply.created_at || 0
          lastMessages[threadId] = reply.content
        }
        
        if (!participants[threadId]) {
          participants[threadId] = new Set()
        }
        participants[threadId].add(reply.pubkey)
      }
    })

    // Update threads with reply counts, last message, and participants
    setThreads(prev => prev.map(thread => ({
      ...thread,
      replyCount: counts[thread.id] || 0,
      lastReplyAt: lastReplyTimes[thread.id],
      lastMessage: lastMessages[thread.id],
      participants: new Set([
        ...thread.participants,
        ...(participants[thread.id] || [])
      ])
    })))
  }, [allReplies])

  // Process phase information from kind:1111 events
  useEffect(() => {
    if (!phaseEvents || phaseEvents.length === 0) return

    const phases: Record<string, string> = {}
    const latestEventPerThread: Record<string, { timestamp: number; phase: string }> = {}

    phaseEvents.forEach(event => {
      // Find which thread this event belongs to
      const rootTag = event.tags.find(t => t[0] === 'e' && t[3] === 'root')
      const threadId = rootTag ? rootTag[1] : event.tags.find(t => t[0] === 'e')?.[1]

      if (threadId && event.created_at) {
        // Extract phase from tags
        const phaseNewTag = event.tags.find(t => t[0] === 'new-phase')
        const phaseTag = event.tags.find(t => t[0] === 'phase')
        const phase = phaseNewTag ? phaseNewTag[1] : (phaseTag ? phaseTag[1] : null)
        
        if (phase) {
          // Only keep the latest phase per thread
          if (!latestEventPerThread[threadId] || event.created_at > latestEventPerThread[threadId].timestamp) {
            latestEventPerThread[threadId] = {
              timestamp: event.created_at,
              phase: phase
            }
          }
        }
      }
    })

    // Extract just the phases
    Object.entries(latestEventPerThread).forEach(([threadId, data]) => {
      phases[threadId] = data.phase
    })

    setThreadPhases(phases)
  }, [phaseEvents])


  const getLastActivityTime = (thread: Thread) => {
    return thread.lastReplyAt || thread.createdAt
  }

  // Sort threads by last activity
  const sortedThreads = [...threads].sort((a, b) => 
    getLastActivityTime(b) - getLastActivityTime(a)
  )

  const renderThread = (thread: Thread) => {
    const isSelected = thread.id === selectedThreadId

    return (
      <button
        key={thread.id}
        onClick={() => onThreadSelect(thread.id)}
        className={cn(
          'w-full text-left p-3 hover:bg-accent/50 transition-colors border-b',
          isSelected && 'bg-accent'
        )}
      >
        <div className="flex items-start gap-2.5">
          {/* Phase Indicator */}
          <div className="shrink-0 pt-2">
            <PhaseIndicator phase={threadPhases[thread.id]} className="w-2 h-2" />
          </div>

          {/* Thread Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-normal truncate">
                {thread.title}
              </h3>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatRelativeTime(getLastActivityTime(thread))}
              </span>
            </div>

            <p className="text-sm text-muted-foreground truncate mt-1">
              {thread.lastMessage || thread.content}
            </p>

            {/* Thread Meta */}
            <div className="flex items-center gap-2 mt-1">
              {thread.replyCount > 0 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  {thread.replyCount}
                </Badge>
              )}
              
              {thread.participants.size > 1 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  <Users className="h-3 w-3 mr-1" />
                  {thread.participants.size}
                </Badge>
              )}
            </div>
          </div>

          {/* Selection Indicator */}
          {isSelected && (
            <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-1" />
          )}
        </div>
      </button>
    )
  }

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
}