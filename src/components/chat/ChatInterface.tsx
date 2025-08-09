import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk'
import { useNDK, useSubscribe } from '@nostr-dev-kit/ndk-hooks'
import { useState, useEffect, useRef, useMemo, RefObject } from 'react'
import { Send, Loader2, Mic, Phone, PhoneOff, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useProfile } from '@nostr-dev-kit/ndk-hooks'
import { cn } from '@/lib/utils'
import { useNDKCurrentUser } from '@nostr-dev-kit/ndk-hooks'
import { NDKProject } from '@/lib/ndk-events/NDKProject'
import { useMentionAutocomplete } from '@/hooks/useMentionAutocomplete'
import { useProjectAgents } from '@/hooks/useProjectAgents'
import { EVENT_KINDS } from '@/lib/constants'
import { VoiceDialog } from '@/components/dialogs/VoiceDialog'
import { isAudioEvent } from '@/lib/utils/audioEvents'
import { MessageWithReplies } from './MessageWithReplies'
import { useMurfTTS } from '@/hooks/useMurfTTS'
import { extractTTSContent } from '@/lib/utils/extractTTSContent'
import { useAtom } from 'jotai'
import { llmConfigAtom } from '@/stores/llmConfig'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight'
import { useStreamingResponses } from '@/hooks/useStreamingResponses'
import { TypingIndicator } from './TypingIndicator'

interface ChatInterfaceProps {
  project: NDKProject
  threadId?: string
  className?: string
  onBack?: () => void
}

interface Message {
  id: string
  content: string
  author: {
    pubkey: string
    name?: string
    picture?: string
  }
  createdAt: number
  isReply?: boolean
  replyTo?: string
  event?: NDKEvent // Store the original event for audio messages
}

interface Agent {
  pubkey: string
  name: string
}

// Component for agent avatar that uses useProfile
function AgentAvatar({ pubkey, name, className }: { pubkey: string; name?: string; className?: string }) {
  const profile = useProfile(pubkey)
  
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
  
  return (
    <Avatar className={className}>
      <AvatarImage src={profile?.image} />
      <AvatarFallback>
        {getUserInitials(profile?.name || name, pubkey)}
      </AvatarFallback>
    </Avatar>
  )
}

export function ChatInterface({ project, threadId, className, onBack }: ChatInterfaceProps) {
  const { ndk } = useNDK()
  const user = useNDKCurrentUser()
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isCreatingThread, setIsCreatingThread] = useState(false)
  const [currentThreadEvent, setCurrentThreadEvent] = useState<NDKEvent | null>(null)
  const [isVoiceDialogOpen, setIsVoiceDialogOpen] = useState(false)
  const [autoTTS, setAutoTTS] = useState(false)
  const [lastPlayedMessageId, setLastPlayedMessageId] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [llmConfig] = useAtom(llmConfigAtom)
  const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight()

  // Get project agents for @mentions
  const projectAgentTags = useProjectAgents(project.tagId())
  
  // Map agent tags to Agent interface for mention autocomplete
  const projectAgents: Agent[] = useMemo(() => {
    return projectAgentTags.map(tag => ({
      pubkey: tag.pubkey,
      name: tag.slug // Use slug as name for autocomplete
    }))
  }, [projectAgentTags])

  // TTS configuration
  const ttsOptions = useMemo(() => {
    const ttsConfig = llmConfig?.tts
    if (!ttsConfig?.enabled || !ttsConfig?.apiKey || !ttsConfig?.voiceId) {
      return null
    }
    return {
      apiKey: ttsConfig.apiKey,
      voiceId: ttsConfig.voiceId,
      style: ttsConfig.style || 'Conversational',
      rate: ttsConfig.rate || 1.0,
      pitch: ttsConfig.pitch || 1.0,
      volume: ttsConfig.volume || 1.0,
      enabled: true
    }
  }, [llmConfig])

  const tts = useMurfTTS(ttsOptions || { apiKey: '', voiceId: '', enabled: false })

  // Use mention autocomplete hook
  const {
    showAgentMenu,
    filteredAgents,
    selectedAgentIndex,
    handleInputChange,
    handleKeyDown: handleMentionKeyDown,
    insertMention,
    extractMentions,
  } = useMentionAutocomplete(projectAgents, messageInput, setMessageInput, textareaRef as RefObject<HTMLTextAreaElement>)

  // Fetch existing thread if we have a threadId
  useEffect(() => {
    if (!ndk || !threadId || threadId === 'new') return

    const fetchThread = async () => {
      try {
        const event = await ndk.fetchEvent(threadId)
        if (event) {
          setCurrentThreadEvent(event)
        }
      } catch (error) {
        console.error('Failed to fetch thread:', error)
      }
    }

    fetchThread()
  }, [ndk, threadId])

  // Subscribe to messages in the thread
  const { events: threadReplies } = useSubscribe(
    currentThreadEvent
      ? [{
          kinds: [EVENT_KINDS.THREAD_REPLY as NDKKind, NDKKind.GenericReply],
          '#e': [currentThreadEvent.id],
        }]
      : false,
    {
      closeOnEose: false,
      groupable: true,
    },
    [currentThreadEvent?.id]
  )

  // Subscribe to streaming responses for the current thread
  const { streamingResponses } = useStreamingResponses(currentThreadEvent?.id || null)

  // We no longer need a separate typing indicator since streaming messages
  // are now shown as actual messages in the chat with placeholder events
  const streamingAgents = useMemo(() => {
    // Return empty array - typing indicator not needed with placeholder messages
    return []
  }, [])

  // Auto-play new messages when auto-TTS is enabled
  useEffect(() => {
    if (!autoTTS || !ttsOptions || messages.length === 0) return

    const latestMessage = messages[messages.length - 1]
    
    // Don't play messages from the current user
    if (latestMessage.author.pubkey === user?.pubkey) return
    
    // Don't play the same message twice
    if (latestMessage.id === lastPlayedMessageId) return
    
    // Don't play audio messages (they have their own player)
    if (latestMessage.event && isAudioEvent(latestMessage.event)) return
    
    // Extract and play TTS content
    const ttsContent = extractTTSContent(latestMessage.content)
    if (ttsContent && !tts.isPlaying) {
      tts.play(ttsContent).catch((error) => {
        console.error('TTS playback failed:', error)
      })
      setLastPlayedMessageId(latestMessage.id)
    }
  }, [messages, autoTTS, ttsOptions, lastPlayedMessageId, user?.pubkey, tts])

  // Process thread replies into messages INCLUDING streaming placeholders
  useEffect(() => {
    const processedMessages: Message[] = []
    
    // Add the thread root message (kind 11) as the first message
    if (currentThreadEvent && currentThreadEvent.content) {
      processedMessages.push({
        id: currentThreadEvent.id,
        content: currentThreadEvent.content,
        author: {
          pubkey: currentThreadEvent.pubkey,
          // TODO: Fetch author metadata
        },
        createdAt: currentThreadEvent.created_at || 0,
        isReply: false,
        event: currentThreadEvent,
      })
    }
    
    // Add all replies
    if (threadReplies && threadReplies.length > 0) {
      const replies = threadReplies.map(event => ({
        id: event.id,
        content: event.content || '',
        author: {
          pubkey: event.pubkey,
          // TODO: Fetch author metadata
        },
        createdAt: event.created_at || 0,
        isReply: true,
        event: event, // Store the event for audio messages
      }))
      processedMessages.push(...replies)
    }

    // Add placeholder messages for streaming responses that don't have a final message yet
    if (streamingResponses && streamingResponses.size > 0) {
      streamingResponses.forEach((response, agentPubkey) => {
        // Check if we already have a message from this agent
        const hasExistingMessage = processedMessages.some(
          msg => msg.author.pubkey === agentPubkey
        )
        
        // If no existing message and we have streaming content, add a placeholder
        if (!hasExistingMessage && response.content && response.content.trim() !== '') {
          // Create a synthetic event for the streaming message
          const syntheticEvent = new NDKEvent(ndk)
          syntheticEvent.pubkey = agentPubkey
          syntheticEvent.content = '' // Empty content - streaming will show in MessageWithReplies
          syntheticEvent.created_at = Math.floor(Date.now() / 1000)
          syntheticEvent.id = `streaming-${agentPubkey}` // Synthetic ID
          syntheticEvent.kind = EVENT_KINDS.THREAD_REPLY as NDKKind
          
          processedMessages.push({
            id: syntheticEvent.id,
            content: '', // Empty content - streaming response will be shown
            author: {
              pubkey: agentPubkey,
            },
            createdAt: syntheticEvent.created_at,
            isReply: true,
            event: syntheticEvent,
          })
        }
      })
    }

    // Sort by timestamp
    processedMessages.sort((a, b) => a.createdAt - b.createdAt)
    setMessages(processedMessages)
  }, [currentThreadEvent, threadReplies, streamingResponses, ndk])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!ndk || !user || !messageInput.trim()) return

    setIsSending(true)

    try {
      // Extract mentioned agents
      const mentions = extractMentions()

      // If this is a new thread, create it first
      if (!currentThreadEvent) {
        setIsCreatingThread(true)
        
        // Create the initial thread event (kind 11)
        const threadEvent = new NDKEvent(ndk)
        threadEvent.kind = EVENT_KINDS.CHAT
        threadEvent.content = messageInput
        threadEvent.tags = [
          ['title', messageInput.slice(0, 50)], // Use first 50 chars as title
          ['a', project.tagId()], // NIP-33 reference to the project
        ]

        // Add p-tags for mentioned agents
        mentions.forEach(agent => {
          threadEvent.tags.push(['p', agent.pubkey])
        })

        // Add voice mode tag if auto-TTS is enabled
        if (autoTTS) {
          threadEvent.tags.push(['mode', 'voice'])
        }

        await threadEvent.publish()
        setCurrentThreadEvent(threadEvent)
        setIsCreatingThread(false)
      } else {
        // Send a reply to the existing thread
        const replyEvent = currentThreadEvent.reply()
        replyEvent.kind = EVENT_KINDS.THREAD_REPLY
        replyEvent.content = messageInput

        // Remove all p-tags that NDK's .reply() generated
        replyEvent.tags = replyEvent.tags.filter((tag) => tag[0] !== "p")

        // Add project tag
        replyEvent.tags.push(['a', project.tagId()])

        // Add p-tags for mentioned agents
        mentions.forEach(agent => {
          replyEvent.tags.push(['p', agent.pubkey])
        })

        // Add voice mode tag if auto-TTS is enabled
        if (autoTTS) {
          replyEvent.tags.push(['mode', 'voice'])
        }

        await replyEvent.publish()
      }

      // Clear input
      setMessageInput('')
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // First check for mention autocomplete
    if (showAgentMenu) {
      handleMentionKeyDown(e)
      return
    }

    // Handle sending with Enter (without shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const isNewThread = !currentThreadEvent && (!threadId || threadId === 'new')

  // Get thread title
  const threadTitle = useMemo(() => {
    if (currentThreadEvent) {
      const titleTag = currentThreadEvent.tags?.find(
        (tag: string[]) => tag[0] === 'title'
      )?.[1]
      if (titleTag) return titleTag
      // Fallback to first line of content
      const firstLine = currentThreadEvent.content?.split('\n')[0] || 'Thread'
      return firstLine.length > 50 ? `${firstLine.slice(0, 50)}...` : firstLine
    }
    return isNewThread ? 'New Thread' : 'Thread'
  }, [currentThreadEvent, isNewThread])

  return (
    <div 
      className={cn('flex flex-col h-full overflow-hidden', className)}
      style={{
        paddingBottom: isKeyboardVisible ? keyboardHeight : 0,
        transition: 'padding-bottom 0.3s ease-in-out'
      }}
    >
      {/* Header */}
      {threadId && (
        <div className="bg-card border-b border-border/60 backdrop-blur-xl bg-card/95 sticky top-0 z-50">
          <div className="flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-3">
              {onBack && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onBack}
                  className="w-8 h-8 sm:w-9 sm:h-9 hover:bg-accent"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate max-w-48">
                  {threadTitle}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">Thread discussion</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Auto-TTS toggle */}
              {ttsOptions && (
                <Button
                  variant={autoTTS ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setAutoTTS(!autoTTS)}
                  className={cn(
                    "w-8 h-8 sm:w-9 sm:h-9",
                    autoTTS ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-accent'
                  )}
                  title={autoTTS ? "Disable voice mode" : "Enable voice mode"}
                >
                  {autoTTS ? (
                    <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  ) : (
                    <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Messages Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 overflow-hidden">
        <div className="p-4">
          {messages.length === 0 && !isNewThread ? (
            <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
              No messages yet. Start the conversation!
            </div>
          ) : (
            <div className="space-y-4">
            {messages.map(message => {
              // Always use MessageWithReplies if we have the event
              if (message.event) {
                return (
                  <MessageWithReplies
                    key={message.id}
                    event={message.event}
                    project={project}
                    onReply={() => {
                      // Focus the input for reply
                      if (textareaRef.current) {
                        textareaRef.current.focus()
                      }
                    }}
                  />
                )
              }
              
              // This should never happen but keep minimal fallback
              return (
                <div key={message.id} className="text-muted-foreground">
                  Error: No event data for message
                </div>
              )
            })}
            
            {/* Show typing indicator for agents that are streaming */}
            {streamingAgents.length > 0 && (
              <TypingIndicator users={streamingAgents} className="mt-4" />
            )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Mention Autocomplete Menu */}
      {showAgentMenu && filteredAgents.length > 0 && (
        <div className="absolute bottom-28 left-4 right-4 bg-popover border rounded-md shadow-lg p-2 max-h-48 overflow-y-auto z-50">
          {filteredAgents.map((agent, index) => (
            <button
              key={agent.pubkey}
              className={cn(
                'w-full text-left px-3 py-2 rounded hover:bg-accent transition-colors',
                index === selectedAgentIndex && 'bg-accent'
              )}
              onClick={() => insertMention(agent)}
            >
              <div className="flex items-center gap-2">
                <AgentAvatar pubkey={agent.pubkey} name={agent.name} className="h-6 w-6" />
                <span className="text-sm font-medium">{agent.name}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="border-t p-4 flex-shrink-0">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={messageInput}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isNewThread ? 'Start a new conversation...' : 'Type a message...'}
            className="flex-1 min-h-[60px] resize-none"
            disabled={isSending || isCreatingThread}
          />
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => setIsVoiceDialogOpen(true)}
              disabled={isSending || isCreatingThread}
              size="icon"
              variant="outline"
              className="self-end"
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={!messageInput.trim() || isSending || isCreatingThread}
              size="icon"
              className="self-end"
            >
              {isSending || isCreatingThread ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        {isNewThread && (
          <p className="text-xs text-muted-foreground mt-2">
            This will create a new thread in the project
          </p>
        )}
      </div>

      {/* Voice Dialog */}
      <VoiceDialog
        open={isVoiceDialogOpen}
        onOpenChange={setIsVoiceDialogOpen}
        onComplete={async (data) => {
          // Send the transcription as a regular message with audio attachment
          if (data.transcription.trim()) {
            setMessageInput(data.transcription)
            await handleSendMessage()
          }
        }}
        conversationId={currentThreadEvent?.id}
        projectId={project.tagId()}
        publishAudioEvent={true}
      />
    </div>
  )
}