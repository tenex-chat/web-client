import { useSubscribe } from '@nostr-dev-kit/ndk-hooks'
import { useState, useEffect } from 'react'
import { MessageSquare, ChevronRight, Users } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils/time'
import { NDKProject } from '@/lib/ndk-events/NDKProject'
import { EVENT_KINDS } from '@/lib/constants'
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

  // Subscribe to project threads (kind 11 - CHAT)
  // Try subscribing with just kinds filter first to see if we get any events
  const { events: threadEvents } = useSubscribe(
    project
      ? [{
          kinds: [EVENT_KINDS.CHAT as NDKKind],
          ...project.filter(),
          limit: 50,
        }]
      : false,
    {},
    [project?.tagId()]
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
          // TODO: Fetch author metadata
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
    const participants: Record<string, Set<string>> = {}

    allReplies.forEach(reply => {
      // Find which thread this reply belongs to
      const rootTag = reply.tags.find(t => t[0] === 'e' && t[3] === 'root')
      const threadId = rootTag ? rootTag[1] : reply.tags.find(t => t[0] === 'e')?.[1]

      if (threadId) {
        counts[threadId] = (counts[threadId] || 0) + 1
        lastReplyTimes[threadId] = Math.max(
          lastReplyTimes[threadId] || 0,
          reply.created_at || 0
        )
        
        if (!participants[threadId]) {
          participants[threadId] = new Set()
        }
        participants[threadId].add(reply.pubkey)
      }
    })

    // Update threads with reply counts and participants
    setThreads(prev => prev.map(thread => ({
      ...thread,
      replyCount: counts[thread.id] || 0,
      lastReplyAt: lastReplyTimes[thread.id],
      participants: new Set([
        ...thread.participants,
        ...(participants[thread.id] || [])
      ])
    })))
  }, [allReplies])

  const getUserInitials = (name?: string, pubkey?: string) => {
    if (name) {
      return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return pubkey?.slice(0, 2).toUpperCase() || '??'
  }

  const getLastActivityTime = (thread: Thread) => {
    return thread.lastReplyAt || thread.createdAt
  }

  // Sort threads by last activity
  const sortedThreads = [...threads].sort((a, b) => 
    getLastActivityTime(b) - getLastActivityTime(a)
  )

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Conversations
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {threads.length} {threads.length === 1 ? 'thread' : 'threads'}
        </p>
      </div>

      {/* Thread List */}
      <ScrollArea className="flex-1">
        {sortedThreads.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-2">Start a new thread to begin chatting</p>
          </div>
        ) : (
          <div className="divide-y">
            {sortedThreads.map(thread => {
              const isSelected = thread.id === selectedThreadId
              const hasUnread = false // TODO: Track read status

              return (
                <button
                  key={thread.id}
                  onClick={() => onThreadSelect(thread.id)}
                  className={cn(
                    'w-full text-left p-4 hover:bg-accent/50 transition-colors',
                    isSelected && 'bg-accent',
                    hasUnread && 'font-semibold'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Author Avatar */}
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={thread.author.picture} />
                      <AvatarFallback>
                        {getUserInitials(thread.author.name, thread.author.pubkey)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Thread Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={cn(
                          'text-sm font-medium truncate',
                          !hasUnread && 'font-normal'
                        )}>
                          {thread.title}
                        </h3>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatRelativeTime(getLastActivityTime(thread))}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {thread.content}
                      </p>

                      {/* Thread Meta */}
                      <div className="flex items-center gap-3 mt-2">
                        {thread.replyCount > 0 && (
                          <Badge variant="secondary" className="text-xs px-2 py-0">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            {thread.replyCount}
                          </Badge>
                        )}
                        
                        {thread.participants.size > 1 && (
                          <Badge variant="secondary" className="text-xs px-2 py-0">
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
            })}
          </div>
        )}
      </ScrollArea>

      {/* New Thread Button */}
      <div className="p-4 border-t">
        <button
          onClick={() => onThreadSelect('new')}
          className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          Start New Conversation
        </button>
      </div>
    </div>
  )
}