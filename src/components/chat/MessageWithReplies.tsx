import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk'
import { useSubscribe, useNDK } from '@nostr-dev-kit/ndk-hooks'
import { ChevronDown, ChevronRight, Send, Reply, MoreVertical, Cpu, DollarSign, Volume2, Square, Brain } from 'lucide-react'
import { TypingIndicator } from './TypingIndicator'
import { memo, useCallback, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { formatRelativeTime } from '@/lib/utils/time'
import { cn } from '@/lib/utils'
import { NDKProject } from '@/lib/ndk-events/NDKProject'
import { EVENT_KINDS } from '@/lib/constants'
import { useNDKCurrentUser } from '@nostr-dev-kit/ndk-hooks'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LLMMetadataDialog } from '@/components/dialogs/LLMMetadataDialog'
import { ProfileDisplay } from '@/components/common/ProfileDisplay'
import { Link } from '@tanstack/react-router'
import { useMurfTTS } from '@/hooks/useMurfTTS'
import { extractTTSContent } from '@/lib/utils/extractTTSContent'
import { useAgentTTSConfig, getVoiceDisplayName } from '@/hooks/useAgentTTSConfig'
import { useMarkdownComponents } from '@/lib/markdown/config'
import { extractLLMMetadata, getEventPhase, getEventPhaseFrom, getPhaseIcon } from '@/lib/utils/event-metadata'
import { useProjectOnlineAgents } from '@/hooks/useProjectOnlineAgents'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { replaceNostrEntities } from '@/lib/utils/nostrEntityParser'
import { getUserStatus } from '@/lib/utils/userStatus'

interface MessageWithRepliesProps {
  event: NDKEvent
  project: NDKProject
  onReply?: (event: NDKEvent) => void
  isNested?: boolean
}


export const MessageWithReplies = memo(function MessageWithReplies({
  event,
  project,
  onReply,
  isNested = false
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
  const isMobile = useIsMobile()
  
  // Get ONLINE agents to find the agent's name from its pubkey
  const onlineAgents = useProjectOnlineAgents(project.dTag)
  
  // Get the agent's name from the online agents
  const agentSlug = useMemo(() => {
    if (!onlineAgents || onlineAgents.length === 0) return null
    const agent = onlineAgents.find(a => a.pubkey === event.pubkey)
    return agent?.name || null
  }, [onlineAgents, event.pubkey])
  
  // Get user status (external or belonging to another project)
  const userStatus = useMemo(() => {
    return getUserStatus(event.pubkey, user?.pubkey, project.dTag)
  }, [event.pubkey, user?.pubkey, project.dTag])
  
  // TTS configuration
  const ttsOptions = useAgentTTSConfig(agentSlug || undefined)
  const voiceName = getVoiceDisplayName(ttsOptions)
  
  // Markdown configuration
  const markdownComponents = useMarkdownComponents({ 
    isMobile, 
    onImageClick: setLightboxImage 
  })
  
  const tts = useMurfTTS(ttsOptions || {
    apiKey: '',
    voiceId: '',
    enabled: false
  })

  // Subscribe to replies that e-tag this event (NIP-10/NIP-22 threading)
		// Don't subscribe for kind 11 (CHAT) events as their replies are shown inline in the thread
		const { events: directReplies } = useSubscribe(
			event.kind === NDKKind.GenericReply
				? [
						{
							kinds: [NDKKind.GenericReply],
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
    
    // Filter to only include events that directly e-tag this event
    const filtered = directReplies.filter(reply => {
      const eTags = reply.tags?.filter(tag => tag[0] === 'e')
      return eTags?.some(tag => tag[1] === event.id)
    })
    
    return filtered.sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0))
  }, [directReplies, event.id])

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
      
      // Add project tag
      replyEvent.tags.push(['a', project.tagId()])
      
      await replyEvent.publish()
      
      setReplyInput("")
      setReplyToEvent(null)
    } catch (error) {
      console.error("Failed to send reply:", error)
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
    if (!directReplies) return 0
    
    // Count events that directly e-tag this event
    return directReplies.filter(reply => {
      const eTags = reply.tags?.filter(tag => tag[0] === 'e')
      return eTags?.some(tag => tag[1] === event.id)
    }).length
  }, [directReplies, event.id])

  // Check if this is a typing indicator event
  const isTypingEvent = event.kind === EVENT_KINDS.TYPING_INDICATOR || event.kind === EVENT_KINDS.STREAMING_RESPONSE
  
  // For typing events, check if content contains "is typing"
  const showTypingIndicator = isTypingEvent && event.content?.includes('is typing')

  // Parse content with thinking blocks
  const { contentParts, shouldTruncate } = useMemo(() => {
    // Skip parsing if this is a typing indicator
    if (showTypingIndicator) {
      return { contentParts: [], shouldTruncate: false }
    }
    
    let content = event.content || ""
    const parts: Array<{ type: 'text' | 'thinking', content: string }> = []
    
    // Convert plain text nostr: references to markdown links so they're handled by the markdown renderer
    const hasMarkdownNostrLinks = /\[([^\]]+)\]\((nostr:[^)]+)\)/.test(content)
    
    if (!hasMarkdownNostrLinks) {
      // Convert plain text nostr: references to markdown links
      content = replaceNostrEntities(content, (_entity, match) => {
        // Convert to markdown link format that will be handled by our custom link renderer
        return `${_entity} [${_entity.bech32}](${match})`
      })
    }
    
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


  return (
    <div className={cn(
      "group hover:bg-muted/30 transition-colors px-4 py-1",
      isNested && "ml-10"
    )}>
      {/* Message - Slack style layout */}
      <div className="flex gap-3">
        {/* Avatar column - fixed width */}
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
            <div className="flex items-baseline gap-2 flex-wrap">
              <Link 
                to="/p/$pubkey" 
                params={{ pubkey: event.pubkey }}
                className="hover:underline"
              >
                <ProfileDisplay 
                  pubkey={event.pubkey} 
                  size="md" 
                  showName={true}
                  showAvatar={false}
                  nameClassName="text-sm font-semibold text-foreground"
                />
              </Link>
              {userStatus.isExternal && (
                <span className="text-xs text-muted-foreground">
                  ({userStatus.projectName || 'external'})
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(event.created_at || 0)}
              </span>
            </div>
            
            {/* Action buttons - only visible on hover, hide for typing indicators */}
            {!showTypingIndicator && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Phase indicator - inline with hover buttons */}
              {phase && (
                <Badge 
                  variant="secondary"
                  className={cn(
                    "text-[10px] h-5 px-1.5 gap-0.5",
                    phase?.toLowerCase() === 'chat' && "bg-blue-500/90 text-white border-blue-600",
                    phase?.toLowerCase() === 'plan' && "bg-purple-500/90 text-white border-purple-600",
                    phase?.toLowerCase() === 'execute' && "bg-green-500/90 text-white border-green-600",
                    phase?.toLowerCase() === 'review' && "bg-orange-500/90 text-white border-orange-600",
                    phase?.toLowerCase() === 'chores' && "bg-gray-500/90 text-white border-gray-600"
                  )}
                  title={phaseFrom ? `Phase: ${phaseFrom} → ${phase}` : `Phase: ${phase}`}
                >
                  {(() => {
                    const IconComponent = getPhaseIcon(phase?.toLowerCase() || null)
                    return IconComponent ? <IconComponent className="w-2.5 h-2.5" /> : null
                  })()}
                  <span className="ml-0.5">{phase}</span>
                </Badge>
              )}
              
              {/* TTS button */}
              {ttsOptions && event.content && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (tts.isPlaying) {
                      tts.stop()
                    } else {
                      const ttsContent = extractTTSContent(event.content)
                      if (ttsContent) {
                        await tts.play(ttsContent)
                      }
                    }
                  }}
                  className="h-7 w-7 p-0 hover:bg-muted"
                  title={tts.isPlaying ? `Stop reading (Voice: ${voiceName})` : `Read aloud (Voice: ${voiceName})`}
                >
                  {tts.isPlaying ? (
                    <Square className="h-3.5 w-3.5" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
              
              {/* Reply button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleReply(event)}
                className="h-7 w-7 p-0 hover:bg-muted"
                title="Reply to this message"
              >
                <Reply className="h-3.5 w-3.5" />
              </Button>
              
              {/* LLM Metadata Icon */}
              {llmMetadata && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMetadataDialog(true)}
                  className="h-7 w-7 p-0 hover:bg-muted"
                  title="View LLM metadata"
                >
                  <Cpu className="h-3.5 w-3.5" />
                </Button>
              )}
              
              {/* More options dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-muted"
                    title="Message options"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onClick={() => {
                      navigator.clipboard.writeText(event.id)
                    }}
                  >
                    Copy ID
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onClick={() => {
                      const rawEventString = JSON.stringify(event.rawEvent(), null, 2)
                      navigator.clipboard.writeText(rawEventString)
                      toast.success('Raw event copied to clipboard')
                    }}
                  >
                    View Raw
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onClick={() => {
                      const rawEventString = JSON.stringify(event.rawEvent(), null, 4)
                      navigator.clipboard.writeText(rawEventString)
                    }}
                  >
                    Copy Raw Event
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Cost indicator */}
              {(llmMetadata?.["llm-cost-usd"] || llmMetadata?.["llm-cost"]) && (
                <Badge
                  variant="outline"
                  className="text-[10px] h-5 px-1.5 text-green-600 border-green-600"
                >
                  <DollarSign className="w-3 h-3 mr-0.5" />
                  {llmMetadata?.["llm-cost-usd"] || llmMetadata?.["llm-cost"]}
                </Badge>
              )}
              </div>
            )}
          </div>
          
          {/* Message content - no background, just text */}
          <div className="markdown-content">
            <div className={cn(
              "break-words text-foreground",
              isMobile ? "text-[15px] leading-[1.6]" : "text-sm"
            )}>
              {/* Show typing indicator for typing events */}
              {showTypingIndicator ? (
                <TypingIndicator users={[{ pubkey: event.pubkey, name: agentSlug || undefined }]} />
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
                    <ReactMarkdown 
                      key={`text-${partIndex}`}
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                    >
                      {textToRender}
                    </ReactMarkdown>
                  )
                } else {
                  // Render thinking block
                  const isThinkingExpanded = expandedThinkingBlocks.has(partIndex)
                  const thinkingPreview = part.content.split('\n')[0]
                  const preview = thinkingPreview.length > 100 
                    ? thinkingPreview.substring(0, 100) + '...' 
                    : thinkingPreview
                  
                  return (
                    <div key={`thinking-${partIndex}`} className="my-2">
                      <button
                        type="button"
                        onClick={() => toggleThinkingBlock(partIndex)}
                        className={cn(
                          "flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors",
                          isMobile ? "text-[11px]" : "text-xs"
                        )}
                      >
                        {isThinkingExpanded ? (
                          <ChevronDown className="w-3 h-3 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-3 h-3 flex-shrink-0" />
                        )}
                        <Brain className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate max-w-[600px]">
                          {isThinkingExpanded ? 'Hide thinking' : preview}
                        </span>
                      </button>
                      
                      {isThinkingExpanded && (
                        <div className="mt-1 p-2 bg-muted/20 rounded-md border border-muted/30">
                          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                            {part.content}
                          </pre>
                        </div>
                      )}
                    </div>
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
          
          {/* Reply count and toggle - Slack style - hide for typing indicators */}
          {!showTypingIndicator && replyCount > 0 && !showReplies && (
            <div className="mt-1.5">
              <button
                type="button"
                onClick={() => setShowReplies(!showReplies)}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 transition-colors font-medium hover:bg-blue-50 dark:hover:bg-blue-950/30 px-2 py-1 rounded">
                <div className="flex -space-x-1.5">
                  {/* Show up to 3 user avatars who replied */}
                  {sortedReplies.slice(0, 3).map((reply, idx) => (
                    <div key={reply.id} style={{ zIndex: 3 - idx }}>
                      <ProfileDisplay pubkey={reply.pubkey} showName={false} avatarClassName="w-5 h-5 border-2 border-background rounded" />
                    </div>
                  ))}
                </div>
                <span>
                  {replyCount} {replyCount === 1 ? "reply" : "replies"}
                </span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Thread replies - Slack style indented */}
      {showReplies && sortedReplies.length > 0 && (
        <div className="border-l-2 border-muted ml-12 mt-2">
          {sortedReplies.map(reply => (
            <div key={reply.id}>
              <MessageWithReplies
                event={reply}
                project={project}
                onReply={onReply}
                isNested={true}
              />
            </div>
          ))}
        </div>
      )}

      {/* Reply input - Slack style inline */}
      {replyToEvent && (
        <div className="ml-12 mt-2 border-l-2 border-muted pl-3">
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