import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk'
import { useSubscribe, useNDK } from '@nostr-dev-kit/ndk-hooks'
import { ChevronDown, ChevronRight, Send, Reply, MoreVertical, Cpu, DollarSign, MessageCircle, Target, Play, CheckCircle, Settings, Volume2, Square, Brain } from 'lucide-react'
import { memo, useCallback, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Button } from '@/components/ui/button'
import { formatRelativeTime } from '@/lib/utils/time'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/logger'
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
import { useStreamingResponses } from '@/hooks/useStreamingResponses'
import { ProfileDisplay } from '@/components/common/ProfileDisplay'
import { Link } from '@tanstack/react-router'
import { useMurfTTS } from '@/hooks/useMurfTTS'
import { extractTTSContent } from '@/lib/utils/extractTTSContent'
import { getAgentVoiceConfig } from '@/lib/voice-config'
import { useProjectAgents } from '@/hooks/useProjectAgents'
import { useAtom } from 'jotai'
import { llmConfigAtom } from '@/stores/llmConfig'

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
  const [showThinking, setShowThinking] = useState(false)
  const [llmConfig] = useAtom(llmConfigAtom)
  
  // Detect current theme for syntax highlighting
  const isDarkMode = useMemo(() => {
    if (typeof window === 'undefined') return false
    return document.documentElement.classList.contains('dark')
  }, [])
  
  // Get project agents to find the agent's slug from its pubkey
  const projectAgentTags = useProjectAgents(project.tagId())
  
  // Get the agent's slug from the project agents
  const agentSlug = useMemo(() => {
    if (!projectAgentTags || projectAgentTags.length === 0) return null
    const agent = projectAgentTags.find(a => a.pubkey === event.pubkey)
    return agent?.slug || null
  }, [projectAgentTags, event.pubkey])
  
  // TTS configuration
  const ttsOptions = useMemo(() => {
    const ttsConfig = llmConfig?.tts
    if (!ttsConfig?.enabled || !ttsConfig?.apiKey || !ttsConfig?.voiceId) {
      return null
    }
    
    // Try to get agent-specific voice configuration
    let voiceId = ttsConfig.voiceId
    
    if (agentSlug) {
      const agentVoiceConfig = getAgentVoiceConfig(agentSlug)
      if (agentVoiceConfig?.voiceId) {
        voiceId = agentVoiceConfig.voiceId
      }
    }
    
    return {
      apiKey: ttsConfig.apiKey,
      voiceId: voiceId,
      style: ttsConfig.style || 'Conversational',
      rate: ttsConfig.rate || 1.0,
      pitch: ttsConfig.pitch || 1.0,
      volume: ttsConfig.volume || 1.0,
      enabled: true
    }
  }, [llmConfig, agentSlug])
  
  // Get voice name for tooltip
  const voiceName = useMemo(() => {
    if (!ttsOptions?.voiceId) return 'Default'
    
    // Try to get the agent's configured voice name
    if (agentSlug) {
      const agentVoiceConfig = getAgentVoiceConfig(agentSlug)
      if (agentVoiceConfig?.voiceName) {
        return agentVoiceConfig.voiceName
      }
    }
    
    // Fall back to extracting from voice ID
    const parts = ttsOptions.voiceId.split('-')
    const name = parts[parts.length - 1]
    return name ? name.charAt(0).toUpperCase() + name.slice(1) : 'Default'
  }, [ttsOptions, agentSlug])
  
  const tts = useMurfTTS(ttsOptions || {
    apiKey: '',
    voiceId: '',
    enabled: false
  })

  // Subscribe to replies that e-tag this event (NIP-10/NIP-22 threading)
  // Don't subscribe for kind 11 (CHAT) events as their replies are shown inline in the thread
  const { events: directReplies } = useSubscribe(
    event.kind === EVENT_KINDS.THREAD_REPLY
      ? [{
          kinds: [EVENT_KINDS.THREAD_REPLY as NDKKind],
          '#e': [event.id],
        }]
      : false,
    {
      closeOnEose: false,
      groupable: true,
    },
    [event.id]
  )

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
      replyEvent.kind = EVENT_KINDS.THREAD_REPLY
      replyEvent.content = replyInput.trim()
      
      // Remove all p-tags that NDK's .reply() generated
      replyEvent.tags = replyEvent.tags.filter((tag) => tag[0] !== "p")
      
      // Add project tag
      replyEvent.tags.push(['a', project.tagId()])
      
      await replyEvent.publish()
      
      setReplyInput("")
      setReplyToEvent(null)
    } catch (error) {
      logger.error("Failed to send reply:", error)
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

  // Get conversation ID from the event's e tag or use the event ID itself
  const conversationId = useMemo(() => {
    // For kind 11 (thread/chat events), use the event ID itself as conversation ID
    if (event.kind === EVENT_KINDS.CHAT) {
      logger.debug("[MessageWithReplies] Using thread event ID as conversationId:", {
        eventId: event.id,
        eventKind: event.kind,
      })
      return event.id
    }
    
    // For replies, try to find the root conversation
    let eTag = event.tagValue('e')
    if (!eTag) {
      eTag = event.tagValue('E')
    }
    const result = eTag || event.id
    logger.debug("[MessageWithReplies] Calculated conversationId for reply:", {
      eventId: event.id,
      eTag,
      conversationId: result,
      eventKind: event.kind,
    })
    return result
  }, [event])

  // Subscribe to streaming responses if we have a conversationId
  const { streamingResponses } = useStreamingResponses(conversationId)
  
  // Check if this event has a streaming response
  const streamingResponse = useMemo(() => {
    if (!streamingResponses || streamingResponses.size === 0) return null
    return streamingResponses.get(event.pubkey)
  }, [streamingResponses, event.pubkey])
  
  // Check if we should show streaming content
  const shouldShowStreaming = streamingResponse && (!event.content || event.content.trim() === "")

  const isCurrentUser = event.pubkey === user?.pubkey

  // Extract thinking blocks and clean content
  const { thinkingBlocks, cleanContent } = useMemo(() => {
    const content = event.content || ""
    const thinkingRegex = /<thinking>([\s\S]*?)<\/thinking>/g
    const blocks: string[] = []
    let match
    
    while ((match = thinkingRegex.exec(content)) !== null) {
      blocks.push(match[1].trim())
    }
    
    // Remove thinking blocks from content
    const cleaned = content.replace(thinkingRegex, '').trim()
    
    return {
      thinkingBlocks: blocks,
      cleanContent: cleaned
    }
  }, [event.content])
  
  // Get first line of thinking for preview
  const thinkingPreview = useMemo(() => {
    if (!thinkingBlocks || thinkingBlocks.length === 0) return null
    const firstBlock = thinkingBlocks[0]
    const firstLine = firstBlock.split('\n')[0]
    // Truncate if too long
    if (firstLine.length > 100) {
      return firstLine.substring(0, 100) + '...'
    }
    return firstLine
  }, [thinkingBlocks])

  // Helper functions for extracting event metadata
  const getPhase = () => {
    // For phase transitions, use new-phase; otherwise fall back to phase
    return event.tagValue("new-phase") || event.tagValue("phase")
  }

  const getPhaseFrom = () => {
    return event.tagValue("phase-from")
  }

  const getPhaseIcon = (phase: string | null) => {
    if (!phase) return null

    const phaseIcons = {
      chat: MessageCircle,
      plan: Target,
      execute: Play,
      review: CheckCircle,
      chores: Settings,
    }

    const IconComponent = phaseIcons[phase as keyof typeof phaseIcons]
    return IconComponent ? <IconComponent className="w-2.5 h-2.5" /> : null
  }


  const getLLMMetadata = () => {
    const metadata: Record<string, string> = {}

    // Extract all LLM-related tags
    const llmTags = [
      "llm-model",
      "llm-provider",
      "llm-prompt-tokens",
      "llm-context-window",
      "llm-completion-tokens",
      "llm-total-tokens",
      "llm-cache-creation-tokens",
      "llm-cache-read-tokens",
      "llm-confidence",
      "llm-cost",
      "llm-cost-usd",
      "llm-system-prompt",
      "llm-user-prompt",
      "llm-raw-response",
    ]

    for (const tag of llmTags) {
      const value = event.tagValue(tag)
      if (value) {
        metadata[tag] = value
      }
    }

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
  }

  return (
    <div className="group">
      {/* Message */}
      <div className={cn(
        'flex gap-3 mb-2',
        isCurrentUser && 'flex-row-reverse',
        isNested && 'pl-11'
      )}>
        <div className="w-8" /> {/* Spacer for avatar alignment */}
        
        <div className={cn(
          'flex flex-col flex-1',
          isCurrentUser && 'items-end'
        )}>
          <div className="flex items-start justify-between gap-2 mb-1 max-w-[70%]">
            <div className="flex items-center gap-2">
              <Link 
                to="/p/$pubkey" 
                params={{ pubkey: event.pubkey }}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <ProfileDisplay 
                  pubkey={event.pubkey} 
                  size="md" 
                  showName={true}
                  showAvatar={true}
                  avatarClassName="h-8 w-8"
                  nameClassName="text-sm font-medium"
                />
              </Link>
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(event.created_at || 0)}
              </span>
            </div>
            
            {/* Action buttons - aligned to top right of message */}
            <div className="flex items-center gap-1">
              {/* Phase indicator - small badge style */}
              {getPhase() && (
                <Badge 
                  variant="secondary"
                  className={cn(
                    "text-[10px] h-4 px-1.5 gap-0.5",
                    getPhase()?.toLowerCase() === 'chat' && "bg-blue-500 text-white border-blue-600",
                    getPhase()?.toLowerCase() === 'plan' && "bg-purple-500 text-white border-purple-600",
                    getPhase()?.toLowerCase() === 'execute' && "bg-green-500 text-white border-green-600",
                    getPhase()?.toLowerCase() === 'review' && "bg-orange-500 text-white border-orange-600",
                    getPhase()?.toLowerCase() === 'chores' && "bg-gray-500 text-white border-gray-600"
                  )}
                  title={getPhaseFrom() ? `Phase: ${getPhaseFrom()} → ${getPhase()}` : `Phase: ${getPhase()}`}
                >
                  {getPhaseIcon(getPhase()?.toLowerCase() || null)}
                  <span className="ml-0.5">{getPhase()}</span>
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
                  className="h-6 w-6 p-0"
                  title={tts.isPlaying ? `Stop reading (Voice: ${voiceName})` : `Read aloud (Voice: ${voiceName})`}
                >
                  {tts.isPlaying ? (
                    <Square className="h-3 w-3" />
                  ) : (
                    <Volume2 className="h-3 w-3" />
                  )}
                </Button>
              )}
              
              {/* Reply button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleReply(event)}
                className="h-6 w-6 p-0"
                title="Reply to this message"
              >
                <Reply className="h-3 w-3" />
              </Button>
              
              {/* LLM Metadata Icon */}
              {getLLMMetadata() && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMetadataDialog(true)}
                  className="h-6 w-6 p-0"
                  title="View LLM metadata"
                >
                  <Cpu className="h-3 w-3" />
                </Button>
              )}
              
              {/* More options dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    title="Message options"
                  >
                    <MoreVertical className="h-3 w-3" />
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
              {(getLLMMetadata()?.["llm-cost-usd"] || getLLMMetadata()?.["llm-cost"]) && (
                <Badge
                  variant="outline"
                  className="text-xs h-5 px-2 text-green-600 border-green-600"
                >
                  <DollarSign className="w-3 h-3 mr-0.5" />
                  {getLLMMetadata()?.["llm-cost-usd"] || getLLMMetadata()?.["llm-cost"]}
                </Badge>
              )}
            </div>
          </div>
          
          <div className={cn(
            'rounded-lg px-3 py-2 max-w-[70%] markdown-content',
            isCurrentUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          )}>
            <div className="text-sm break-words">
              {shouldShowStreaming ? (
                // Show streaming content if available
                <>
                  <div className="whitespace-pre-wrap">
                    {streamingResponse.content}
                    <span className="inline-block w-2 h-4 bg-foreground/60 animate-pulse ml-1" />
                  </div>
                </>
              ) : (
                // Show final content with markdown
                <>
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                // Override default components for better styling
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                a: ({ href, children }) => (
                  <a 
                    href={href} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600 underline"
                  >
                    {children}
                  </a>
                ),
                strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                code: ({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) => {
                  const match = /language-(\w+)/.exec(className || '')
                  const isInline = !className || !match
                  
                  if (isInline) {
                    return (
                      <code className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono text-xs" {...props}>
                        {children}
                      </code>
                    )
                  }
                  
                  // Extract language from className
                  const language = match ? match[1] : 'text'
                  
                  return (
                    <SyntaxHighlighter
                      language={language}
                      style={isDarkMode ? oneDark : oneLight}
                      customStyle={{
                        margin: '8px 0',
                        padding: '12px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        lineHeight: '1.5',
                      }}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  )
                },
                ul: ({ children }) => <ul className="list-disc pl-6 mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-6 mb-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="ml-1">{children}</li>,
                h1: ({ children }) => <h1 className="text-xl font-bold mb-2 mt-3">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-bold mb-1 mt-2">{children}</h3>,
                h4: ({ children }) => <h4 className="text-sm font-bold mb-1 mt-2">{children}</h4>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-gray-400 dark:border-gray-600 pl-3 my-2 italic opacity-90">
                    {children}
                  </blockquote>
                ),
                hr: () => <hr className="my-3 border-gray-300 dark:border-gray-600" />,
                  }}
                >
                  {cleanContent}
                </ReactMarkdown>
                {/* Show cursor if streaming but event has content (transitioning state) */}
                {streamingResponse && event.content && (
                  <span className="inline-block w-2 h-4 bg-foreground/60 animate-pulse ml-1" />
                )}
              </>
            )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Thinking blocks - collapsed by default */}
      {thinkingBlocks.length > 0 && (
        <div className={cn('mt-2', isNested ? 'pl-11' : 'pl-11')}>
          <button
            type="button"
            onClick={() => setShowThinking(!showThinking)}
            className="flex items-start gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
          >
            {showThinking ? (
              <ChevronDown className="w-3 h-3 mt-0.5 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
            )}
            <Brain className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span className="truncate max-w-[600px] text-left">
              {showThinking ? 'Hide thinking' : thinkingPreview}
            </span>
          </button>
          
          {showThinking && (
            <div className="mt-2 ml-7 p-3 bg-muted/30 rounded-lg border border-muted">
              {thinkingBlocks.map((block, index) => (
                <div key={index} className={cn(index > 0 && "mt-3 pt-3 border-t border-muted")}>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                    {block}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Reply count and toggle - Slack style */}
      {replyCount > 0 && (
        <div className={cn('mt-2', isNested ? 'pl-11' : 'pl-11')}>
          <button
            type="button"
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors font-medium"
          >
            <div className="flex -space-x-2">
              {/* Show up to 3 user avatars who replied */}
              {sortedReplies.slice(0, 3).map((reply, idx) => (
                <div key={reply.id} style={{ zIndex: 3 - idx }}>
                  <ProfileDisplay pubkey={reply.pubkey} showName={false} avatarClassName="w-6 h-6 border-2 border-white" />
                </div>
              ))}
            </div>
            <span>
              {replyCount} {replyCount === 1 ? "reply" : "replies"}
            </span>
            {showReplies ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>
      )}

      {/* Thread replies - Slack style */}
      {showReplies && sortedReplies.length > 0 && (
        <div className={cn('mt-2', isNested ? 'pl-11' : 'pl-11')}>
          <div className="border-l-2 border-gray-300/50 pl-3">
            {sortedReplies.map(reply => (
              <div key={reply.id} className="relative -ml-3">
                <MessageWithReplies
                  event={reply}
                  project={project}
                  onReply={onReply}
                  isNested={true}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reply input */}
      {replyToEvent && (
        <div className={cn('mt-2', isNested ? 'pl-11' : 'pl-11')}>
          <div className="bg-muted/50 p-2 rounded mb-2">
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
              className="flex-1 min-h-[60px] p-2 text-sm bg-background border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                onClick={handleSendReply}
                disabled={!replyInput.trim() || isSending}
              >
                <Send className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setReplyToEvent(null)
                  setReplyInput("")
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* LLM Metadata Dialog */}
      {getLLMMetadata() && (
        <LLMMetadataDialog
          open={showMetadataDialog}
          onOpenChange={setShowMetadataDialog}
          metadata={getLLMMetadata()!}
        />
      )}
    </div>
  )
})