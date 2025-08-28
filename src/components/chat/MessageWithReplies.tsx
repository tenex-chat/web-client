import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk'
import { useSubscribe, useNDK } from '@nostr-dev-kit/ndk-hooks'
import { ChevronDown, ChevronRight, Send, Reply } from 'lucide-react'
import { TypingIndicator } from './TypingIndicator'
import { StreamingCaret } from './StreamingCaret'
import { ThinkingBlock } from './ThinkingBlock'
import { memo, useCallback, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { NDKProject } from '@/lib/ndk-events/NDKProject'
import { EVENT_KINDS } from '@/lib/constants'
import { useNDKCurrentUser } from '@nostr-dev-kit/ndk-hooks'
import { LLMMetadataDialog } from '@/components/dialogs/LLMMetadataDialog'
import { ProfileDisplay } from '@/components/common/ProfileDisplay'
import { Link } from '@tanstack/react-router'
import { useMarkdownComponents } from '@/lib/markdown/config'
import { extractLLMMetadata, getEventPhase, getEventPhaseFrom } from '@/lib/utils/event-metadata'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { getUserStatus } from '@/lib/utils/userStatus'
import { useAtomValue, useSetAtom } from 'jotai'
import { hoveredMessageIdAtom, hoveredMessageStackAtom } from './atoms/hoveredMessage'
import { TaskContent } from './TaskContent'
import { NDKTask } from '@/lib/ndk-events/NDKTask'
import { MessageHeaderContent } from './MessageHeaderContent'
import { MessageActionsToolbar } from './MessageActionsToolbar'

interface MessageWithRepliesProps {
  event: NDKEvent
  project?: NDKProject | null
  onReply?: (event: NDKEvent) => void
  isNested?: boolean
  onTimeClick?: (event: NDKEvent) => void
  onConversationNavigate?: (event: NDKEvent) => void
}


export const MessageWithReplies = memo(function MessageWithReplies({
  event,
  project,
  onReply,
  isNested = false,
  onTimeClick,
  onConversationNavigate
}: MessageWithRepliesProps) {
  const { ndk } = useNDK()
  const user = useNDKCurrentUser()
  const [showReplies, setShowReplies] = useState(false)
  const [replyToEvent, setReplyToEvent] = useState<NDKEvent | null>(null)
  const [replyInput, setReplyInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [showMetadataDialog, setShowMetadataDialog] = useState(false)
  const [, setLightboxImage] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const hoveredMessageId = useAtomValue(hoveredMessageIdAtom)
  const setHoveredStack = useSetAtom(hoveredMessageStackAtom)
  const isMobile = useIsMobile()
  
  const isHovered = hoveredMessageId === event.id
  
  const handleMouseEnter = useCallback(() => {
    if (!isMobile) {
      setHoveredStack(stack => [...stack.filter(id => id !== event.id), event.id])
    }
  }, [event.id, setHoveredStack, isMobile])
  
  const handleMouseLeave = useCallback(() => {
    if (!isMobile) {
      setHoveredStack(stack => stack.filter(id => id !== event.id))
    }
  }, [event.id, setHoveredStack, isMobile])
  
  // Handle tap for mobile
  const handleTap = useCallback(() => {
    if (isMobile) {
      setHoveredStack(stack => {
        if (stack.includes(event.id)) {
          return stack.filter(id => id !== event.id)
        }
        return [event.id] // Only one message selected at a time on mobile
      })
    }
  }, [event.id, setHoveredStack, isMobile])
  
  // Get user status (external or belonging to another project)
  const userStatus = useMemo(() => {
    return getUserStatus(event.pubkey, user?.pubkey, project?.dTag || '')
  }, [event.pubkey, user?.pubkey, project?.dTag])
  
  // Extract p-tags (recipients) from the event
  const recipientPubkeys = useMemo(() => {
    if (!event.tags) return []
    return event.tags
      .filter(tag => tag[0] === 'p' && tag[1])
      .map(tag => tag[1])
      .filter((pubkey, index, self) => self.indexOf(pubkey) === index) // Remove duplicates
  }, [event.tags])
  
  // Markdown configuration
  const markdownComponents = useMarkdownComponents({ 
    isMobile, 
    onImageClick: setLightboxImage,
    onConversationClick: onConversationNavigate
  })

  // Subscribe to replies that e-tag this event (NIP-10/NIP-22 threading)
		// Don't subscribe for kind 11 (CHAT) events as their replies are shown inline in the thread
		const { events: directReplies } = useSubscribe(
			event.kind === NDKKind.GenericReply
				? [
						{
							kinds: [NDKKind.GenericReply, 1934], // Include task events as replies
							"#e": [event.id],
						},
					]
				: false,
			{
				closeOnEose: false,
				groupable: true,
			},
			[event.id],
		);

  // Sort replies by timestamp
  const sortedReplies = useMemo(() => {
    if (!directReplies || directReplies.length === 0) return []
    
    // Filter out events that have a "root" tag marker
    // These are already shown in the main conversation thread
    const filtered = directReplies.filter(reply => {
      const eTags = reply.tags?.filter(tag => tag[0] === 'e')
      // Check if any e-tag has "root" as its marker (4th element)
      const hasRootMarker = eTags?.some(tag => tag[3] === 'root')
      // Exclude replies that have a root marker (they're in the main thread)
      return !hasRootMarker
    })
    
    return filtered.sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0))
  }, [directReplies])

  const handleReply = useCallback((targetEvent: NDKEvent) => {
    setReplyToEvent(targetEvent)
    setShowReplies(true)
    onReply?.(targetEvent)
  }, [onReply])

  const handleSendReply = useCallback(async () => {
    if (!replyInput.trim() || !ndk?.signer || isSending || !replyToEvent) return

    setIsSending(true)
    try {
      const replyEvent = replyToEvent.reply()
      replyEvent.content = replyInput.trim()
      
      // Remove all p-tags that NDK's .reply() generated
      replyEvent.tags = replyEvent.tags.filter((tag) => tag[0] !== "p")
      
      // Add project tag if we have a project
      if (project) {
        replyEvent.tags.push(['a', project.tagId()])
      }
      
      await replyEvent.publish()
      
      setReplyInput("")
      setReplyToEvent(null)
    } catch (error) {
      toast.error("Failed to send reply")
    } finally {
      setIsSending(false)
    }
  }, [replyInput, ndk, replyToEvent, isSending, project])

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSendReply()
      }
    },
    [handleSendReply]
  )

  // Count for replies display
  const replyCount = useMemo(() => {
    return sortedReplies.length
  }, [sortedReplies])

  // Check if this is a typing indicator event
  const isTypingEvent = event.kind === EVENT_KINDS.TYPING_INDICATOR || event.kind === EVENT_KINDS.STREAMING_RESPONSE
  
  // For typing events, check if content contains "is typing"
  const showTypingIndicator = isTypingEvent && event.content?.includes('is typing')
  
  // Check if this is a streaming response event (kind 21111) and not a typing indicator
  const isStreamingResponse = event.kind === EVENT_KINDS.STREAMING_RESPONSE && !showTypingIndicator

  // Parse content with thinking blocks
  const { contentParts, shouldTruncate } = useMemo(() => {
    // Skip parsing if this is a typing indicator
    if (showTypingIndicator) {
      return { contentParts: [], shouldTruncate: false }
    }
    
    let content = event.content ?? ""  // Empty string is valid content
    const parts: Array<{ type: 'text' | 'thinking', content: string }> = []
    
    // Special handling for task messages - hide the entire thinking block content
    if (event.kind === 1934) {
      const thinkingStart = content.indexOf('<thinking>')
      if (thinkingStart !== -1) {
        content = content.substring(0, thinkingStart).trim()
      }
      parts.push({ type: 'text', content })
      return { contentParts: parts, shouldTruncate: false }
    }
    
    // For other messages, check if thinking block is incomplete
    const thinkingStartCount = (content.match(/<thinking>/g) || []).length
    const thinkingEndCount = (content.match(/<\/thinking>/g) || []).length
    
    if (thinkingStartCount > thinkingEndCount) {
      // Incomplete thinking block - close it
      content = content + '</thinking>'
    }
    
    // Split content by thinking blocks
    const thinkingRegex = /<thinking>([\s\S]*?)<\/thinking>/g
    let lastIndex = 0
    let match
    
    while ((match = thinkingRegex.exec(content)) !== null) {
      // Add text before thinking block
      if (match.index > lastIndex) {
        const textBefore = content.substring(lastIndex, match.index).trim()
        if (textBefore) {
          parts.push({ type: 'text', content: textBefore })
        }
      }
      
      // Add thinking block
      parts.push({ type: 'thinking', content: match[1].trim() })
      lastIndex = match.index + match[0].length
    }
    
    // Add remaining text after last thinking block
    if (lastIndex < content.length) {
      const remainingText = content.substring(lastIndex).trim()
      if (remainingText) {
        parts.push({ type: 'text', content: remainingText })
      }
    }
    
    // If no parts found, treat entire content as text
    if (parts.length === 0 && content.trim()) {
      parts.push({ type: 'text', content: content.trim() })
    }
    
    // Check if content should be truncated on mobile
    const MAX_LENGTH = 280
    const textOnlyLength = parts
      .filter(p => p.type === 'text')
      .reduce((sum, p) => sum + p.content.length, 0)
    const shouldTruncate = isMobile && textOnlyLength > MAX_LENGTH && !isNested
    
    return {
      contentParts: parts,
      shouldTruncate
    }
  }, [event.content, event.kind, isMobile, isNested])
  
  // State for which thinking blocks are expanded
  const [expandedThinkingBlocks, setExpandedThinkingBlocks] = useState<Set<number>>(new Set())
  
  const toggleThinkingBlock = useCallback((index: number) => {
    setExpandedThinkingBlocks(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  // Extract event metadata using utilities
  const phase = getEventPhase(event)
  const phaseFrom = getEventPhaseFrom(event)
  
  const llmMetadata = useMemo(() => {
    const metadata = extractLLMMetadata(event)
    
    // Also check for system-prompt and user-prompt tags (without llm- prefix)
    const systemPromptValue = event.tagValue("system-prompt")
    if (systemPromptValue && !metadata["llm-system-prompt"]) {
      metadata["llm-system-prompt"] = systemPromptValue
    }

    const userPromptValue = event.tagValue("prompt")
    if (userPromptValue && !metadata["llm-user-prompt"]) {
      metadata["llm-user-prompt"] = userPromptValue
    }

    // Check for alternative token naming conventions
    const inputTokensValue = event.tagValue("llm-input-tokens")
    if (inputTokensValue && !metadata["llm-prompt-tokens"]) {
      metadata["llm-prompt-tokens"] = inputTokensValue
    }

    const outputTokensValue = event.tagValue("llm-output-tokens")
    if (outputTokensValue && !metadata["llm-completion-tokens"]) {
      metadata["llm-completion-tokens"] = outputTokensValue
    }

    return Object.keys(metadata).length > 0 ? metadata : null
  }, [event])


  // Responsive padding and margins
  const paddingClass = isMobile ? "px-3 py-1" : "px-4 py-1"
  const nestedMargin = isMobile ? "ml-4" : "ml-4"
  const contentGap = isMobile ? "gap-2" : "gap-3"

  return (
    <div 
      className={cn(
        "relative transition-colors",
        paddingClass,
        isNested && nestedMargin,
        isHovered && "bg-muted/30",
        isMobile && "border-b border-border"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleTap}
    >
      {/* Message layout - completely different for mobile */}
      {isMobile ? (
        // Mobile layout - header with avatar, then full-width content below
        <div className="flex-1">
          {/* Mobile header with avatar and name on same line */}
          <div className="flex items-center gap-2 mb-1">
            {!isNested && (
              <Link 
                to="/p/$pubkey" 
                params={{ pubkey: event.pubkey }}
                className="flex-shrink-0"
              >
                <ProfileDisplay 
                  pubkey={event.pubkey} 
                  size="sm" 
                  showName={false}
                  showAvatar={true}
                  avatarClassName="h-7 w-7 rounded-md"
                />
              </Link>
            )}
            <MessageHeaderContent
              event={event}
              userStatus={userStatus}
              recipientPubkeys={recipientPubkeys}
              phase={phase}
              phaseFrom={phaseFrom}
              onTimeClick={onTimeClick}
              isMobile={isMobile}
              hideTimestamp={false} // Show timestamp in header
            />
          </div>
          
          {/* Message content - full width below header */}
          <div className={cn("markdown-content", isNested && "ml-9")}>
            <div className={cn(
              "break-words text-foreground",
              "text-[14px] leading-[1.4]"
            )}>
              {/* Show typing indicator for typing events */}
              {showTypingIndicator ? (
                <TypingIndicator users={[{ pubkey: event.pubkey }]} />
              ) : (
                <>
                  {/* Render content parts with inline thinking blocks */}
                  {contentParts.map((part, partIndex) => {
                if (part.type === 'text') {
                  // Render text content with markdown
                  const textToRender = shouldTruncate && !isExpanded && partIndex === 0 
                    ? part.content.substring(0, 280) 
                    : part.content
                  
                  return (
                    <span key={`text-${partIndex}`}>
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                      >
                        {textToRender}
                      </ReactMarkdown>
                      {/* Show streaming caret only on the last text part when streaming */}
                      {isStreamingResponse && partIndex === contentParts.filter(p => p.type === 'text').length - 1 && (
                        <StreamingCaret className="ml-0.5" />
                      )}
                    </span>
                  )
                } else {
                  // Render thinking block
                  return (
                    <ThinkingBlock
                      key={`thinking-${partIndex}`}
                      content={part.content}
                      index={partIndex}
                      isExpanded={expandedThinkingBlocks.has(partIndex)}
                      onToggle={() => toggleThinkingBlock(partIndex)}
                      isMobile={true}
                    />
                  )
                }
              })}
              
                  {/* Show expand/collapse button for truncated content */}
                  {shouldTruncate && contentParts.some(p => p.type === 'text' && p.content.length > 280) && (
                    <button
                      type="button"
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                    >
                      {isExpanded ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          
          
          {/* Mobile footer with actions only */}
          {!showTypingIndicator && (
            <div className={cn("flex items-center justify-end mt-1", isNested && "ml-9")}>
              <MessageActionsToolbar
                event={event}
                project={project}
                onReply={() => handleReply(event)}
                onMetadataClick={() => setShowMetadataDialog(true)}
                llmMetadata={llmMetadata}
                isMobile={true}
                isHovered={false}
              />
            </div>
          )}
        </div>
      ) : (
        // Desktop layout - keep original side-by-side design
        <div className={cn("flex", contentGap)}>
          {/* Avatar column - desktop only */}
          <div className="flex-shrink-0 pt-0.5">
            <Link 
              to="/p/$pubkey" 
              params={{ pubkey: event.pubkey }}
              className="block hover:opacity-80 transition-opacity"
            >
              <ProfileDisplay 
                pubkey={event.pubkey} 
                size="md" 
                showName={false}
                showAvatar={true}
                avatarClassName="h-9 w-9 rounded-md"
              />
            </Link>
          </div>
          
          {/* Content column */}
          <div className="flex-1 min-w-0">
            {/* Header row with name, time, and actions */}
            <div className="flex items-start justify-between gap-2 mb-0.5">
              <MessageHeaderContent
                event={event}
                userStatus={userStatus}
                recipientPubkeys={recipientPubkeys}
                phase={phase}
                phaseFrom={phaseFrom}
                onTimeClick={onTimeClick}
                isMobile={isMobile}
              />
              
              {/* Action buttons - desktop hover */}
              {!showTypingIndicator && (
                <MessageActionsToolbar
                  event={event}
                  project={project}
                  onReply={() => handleReply(event)}
                  onMetadataClick={() => setShowMetadataDialog(true)}
                  llmMetadata={llmMetadata}
                  isMobile={false}
                  isHovered={isHovered}
                />
              )}
            </div>
          
          {/* Message content - no background, just text */}
          <div className="markdown-content">
            <div className={cn(
              "break-words text-foreground",
              isMobile ? "text-[14px] leading-[1.4] mt-1" : "text-sm"
            )}>
              {/* Show typing indicator for typing events */}
              {showTypingIndicator ? (
                <TypingIndicator users={[{ pubkey: event.pubkey }]} />
              ) : (
                <>
                  {/* Render content parts with inline thinking blocks */}
                  {contentParts.map((part, partIndex) => {
                if (part.type === 'text') {
                  // Render text content with markdown
                  const textToRender = shouldTruncate && !isExpanded && partIndex === 0 
                    ? part.content.substring(0, 280) 
                    : part.content
                  
                  return (
                    <span key={`text-${partIndex}`}>
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                      >
                        {textToRender}
                      </ReactMarkdown>
                      {/* Show streaming caret only on the last text part when streaming */}
                      {isStreamingResponse && partIndex === contentParts.filter(p => p.type === 'text').length - 1 && (
                        <StreamingCaret className="ml-0.5" />
                      )}
                    </span>
                  )
                } else {
                  // Render thinking block
                  return (
                    <ThinkingBlock
                      key={`thinking-${partIndex}`}
                      content={part.content}
                      index={partIndex}
                      isExpanded={expandedThinkingBlocks.has(partIndex)}
                      onToggle={() => toggleThinkingBlock(partIndex)}
                      isMobile={isMobile}
                    />
                  )
                }
              })}
              
                  {/* Show expand/collapse button for truncated content */}
                  {shouldTruncate && contentParts.some(p => p.type === 'text' && p.content.length > 280) && (
                    <button
                      type="button"
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                    >
                      {isExpanded ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          
            {/* Mobile action toolbar - show inline when message is selected */}
            {!showTypingIndicator && isMobile && isHovered && (
              <MessageActionsToolbar
                event={event}
                project={project}
                onReply={() => handleReply(event)}
                onMetadataClick={() => setShowMetadataDialog(true)}
                llmMetadata={llmMetadata}
                isMobile={true}
                isHovered={false}
              />
            )}
          </div>
        </div>
      )}
      
      {/* Reply count and toggle - Slack style - hide for typing indicators */}
      {!showTypingIndicator && replyCount > 0 && (
        <div className="mt-1.5">
          <button
            type="button"
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 transition-colors font-medium hover:bg-blue-50 dark:hover:bg-blue-950/30 px-2 py-1 rounded">
            <div className="flex -space-x-1.5">
              {/* Show up to 20 user avatars who replied */}
              {sortedReplies.slice(0, 20).map((reply, idx) => (
                <div key={reply.id} style={{ zIndex: 20 - idx }}>
                  <ProfileDisplay pubkey={reply.pubkey} showName={false} avatarClassName="w-5 h-5 border-2 border-background rounded" />
                </div>
              ))}
              {sortedReplies.length > 20 && (
                <span className="ml-1 text-[10px] text-muted-foreground">
                  +{sortedReplies.length - 20}
                </span>
              )}
            </div>
            <span>
              {replyCount} {replyCount === 1 ? "reply" : "replies"}
            </span>
            {showReplies ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        </div>
      )}

      {/* Thread replies - responsive indentation */}
      {showReplies && sortedReplies.length > 0 && (
        <div className={cn(
          "border-l-2 border-muted mt-2",
          isMobile ? "ml-3" : "ml-[18px]"
        )}>
          {sortedReplies.map(reply => {
            // Check if this is a task event
            if (reply.kind === 1934) {
              const task = new NDKTask(ndk!, reply.rawEvent())
              return (
                <div key={reply.id} className="ml-3 mt-2">
                  <TaskContent 
                    task={task}
                    onClick={() => onTimeClick?.(reply)}
                  />
                </div>
              )
            }
            
            // Regular message reply
            return (
              <div key={reply.id}>
                <MessageWithReplies
                  event={reply}
                  project={project}
                  onReply={onReply}
                  isNested={true}
                  onTimeClick={onTimeClick}
                  onConversationNavigate={onConversationNavigate}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Reply input - responsive inline */}
      {replyToEvent && (
        <div className={cn(
          "mt-2 border-l-2 border-muted pl-3",
          isMobile ? "ml-3" : "ml-[18px]"
        )}>
          <div className="bg-muted/30 p-2 rounded-md mb-2">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Reply className="w-3 h-3" />
              Replying to {replyToEvent.id === event.id ? "this message" : "a reply"}
            </div>
          </div>
          <div className="flex gap-2">
            <textarea
              value={replyInput}
              onChange={(e) => setReplyInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Write a reply..."
              className="flex-1 min-h-[50px] p-2 text-sm bg-background border border-muted rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                onClick={handleSendReply}
                disabled={!replyInput.trim() || isSending}
                className="h-8"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setReplyToEvent(null)
                  setReplyInput("")
                }}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* LLM Metadata Dialog */}
      {llmMetadata && (
        <LLMMetadataDialog
          open={showMetadataDialog}
          onOpenChange={setShowMetadataDialog}
          metadata={llmMetadata}
        />
      )}
    </div>
  )
})