import { NDKEvent, NDKThread, type NDKKind } from '@nostr-dev-kit/ndk-hooks'
import { useNDK, useSubscribe } from '@nostr-dev-kit/ndk-hooks'
import { useState, useEffect, useRef, useMemo, type RefObject, useCallback } from 'react'
import { Send, Loader2, Mic, Phone, PhoneOff, ArrowLeft, Paperclip, X, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { ProfileDisplay } from '@/components/common/ProfileDisplay'
import { cn } from '@/lib/utils'
import { useNDKCurrentUser } from '@nostr-dev-kit/ndk-hooks'
import type { NDKProject } from '@/lib/ndk-events/NDKProject'
import { useMentionAutocomplete } from '@/hooks/useMentionAutocomplete'
import { EVENT_KINDS } from '@/lib/constants'
import { useProjectOnlineAgents } from '@/hooks/useProjectOnlineAgents'
import { VoiceDialog } from '@/components/dialogs/VoiceDialog'
import { isAudioEvent } from '@/lib/utils/audioEvents'
import { MessageWithReplies } from './MessageWithReplies'
import { useMurfTTS } from '@/hooks/useMurfTTS'
import { extractTTSContent } from '@/lib/utils/extractTTSContent'
import { useAgentTTSConfig } from '@/hooks/useAgentTTSConfig'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { TaskCard } from '@/components/tasks/TaskCard'
import { NDKTask } from '@/lib/ndk-events/NDKTask'
import { ChatDropZone } from './ChatDropZone'
import { ImageUploadQueue } from '@/components/upload/ImageUploadQueue'
import { ImagePreview } from '@/components/upload/ImagePreview'
import { useBlossomUpload } from '@/hooks/useBlossomUpload'
import { motion, AnimatePresence } from 'framer-motion'
import { useDraftMessages } from '@/stores/draftMessages'

interface ChatInterfaceProps {
  project: NDKProject
  rootEvent?: NDKEvent
  className?: string
  onBack?: () => void
  onTaskClick?: (taskId: string) => void
  onThreadCreated?: (threadId: string) => void
}

interface Message {
  id: string // Either event.id or synthetic ID for streaming sessions
  event: NDKEvent
}

interface AgentInstance {
  pubkey: string
  name: string
}

interface StreamingSession {
  syntheticId: string  // Stable ID for React rendering
  latestEvent: NDKEvent // The latest 21111 event
}

export function ChatInterface({ project, rootEvent, className, onBack, onTaskClick, onThreadCreated }: ChatInterfaceProps) {
  const { ndk } = useNDK()
  const user = useNDKCurrentUser()
  const [localRootEvent, setLocalRootEvent] = useState<NDKEvent | null>(rootEvent || null)
  const [messages, setMessages] = useState<Message[]>([])
  const { setDraft, getDraft, clearDraft } = useDraftMessages()
  
  // Compute the conversation ID for draft storage
  const conversationId = useMemo(() => {
    return rootEvent?.id || `${project.dTag}-new`
  }, [rootEvent?.id, project.dTag])
  
  // Update localRootEvent when rootEvent prop changes
  useEffect(() => {
    setLocalRootEvent(rootEvent || null)
  }, [rootEvent])
  const [messageInput, setMessageInput] = useState('')
  
  // Restore draft when conversation changes
  useEffect(() => {
    const draft = getDraft(conversationId)
    if (draft) {
      setMessageInput(draft)
    } else {
      setMessageInput('')
    }
  }, [conversationId, getDraft])
  
  // Save draft as user types (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (messageInput.trim()) {
        setDraft(conversationId, messageInput)
      } else {
        clearDraft(conversationId)
      }
    }, 300) // Save after 300ms of no typing
    
    return () => clearTimeout(timer)
  }, [messageInput, conversationId, setDraft, clearDraft])
  
  const [isVoiceDialogOpen, setIsVoiceDialogOpen] = useState(false)
  const [autoTTS, setAutoTTS] = useState(false)
  const [lastPlayedMessageId, setLastPlayedMessageId] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isMobile = useIsMobile()
  
  // Smart scroll state
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const isNearBottomRef = useRef(true)
  const lastMessageCountRef = useRef(0)
  const userScrolledRef = useRef(false)
  
  // Upload related state with enhanced features
  const { 
    uploadFiles, 
    uploadQueue,
    handlePaste,
    uploadStats,
    cancelUpload,
    retryUpload
  } = useBlossomUpload()
  const [pendingImageUrls, setPendingImageUrls] = useState<string[]>([])
  const [showUploadProgress, setShowUploadProgress] = useState(false)

  // Get ONLINE agents for @mentions (not just configured agents)
  const onlineAgents = useProjectOnlineAgents(project.dTag)
  
  // Map online agents to Agent interface for mention autocomplete
  const projectAgents: AgentInstance[] = useMemo(() => {
    return onlineAgents.map(agent => ({
      pubkey: agent.pubkey,
      name: agent.name
    }))
  }, [onlineAgents])

  // TTS configuration (no agent-specific override in chat interface)
  const ttsOptions = useAgentTTSConfig()

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

  // Subscribe to thread messages using NIP-22 threading
		// Include both 1111 (final) and 21111 (streaming) events
		const { events } = useSubscribe(
			localRootEvent
				? [{ ids: [localRootEvent.id] }, localRootEvent.filter(), localRootEvent.nip22Filter()]
				: false,
			{ closeOnEose: false, groupable: false },
			[localRootEvent?.id],
		);
  
  // Auto-play new messages when auto-TTS is enabled
  useEffect(() => {
    if (!autoTTS || !ttsOptions || messages.length === 0) return

    const latestMessage = messages[messages.length - 1]
    
    // Don't play messages from the current user
    if (latestMessage.event.pubkey === user?.pubkey) return
    
    // Don't play the same message twice
    if (latestMessage.id === lastPlayedMessageId) return
    
    // Don't play audio messages (they have their own player)
    if (isAudioEvent(latestMessage.event)) return
    
    // Extract and play TTS content
    const ttsContent = extractTTSContent(latestMessage.event.content)
    if (ttsContent && !tts.isPlaying) {
      tts.play(ttsContent).catch((error) => {
        console.error('TTS playback failed:', error)
      })
      setLastPlayedMessageId(latestMessage.id)
    }
  }, [messages, autoTTS, ttsOptions, lastPlayedMessageId, user?.pubkey, tts])

  // Process thread replies into messages with streaming session management
  useEffect(() => {
    const finalMessages: Message[] = []
    const streamingSessions = new Map<string, StreamingSession>()
    
    const sortedEvents = [...events].sort((a, b) => {
      // Primary sort: by creation time (ascending)
      const timeA = a.created_at ?? 0;
      const timeB = b.created_at ?? 0;

      if (timeA !== timeB) {
        return timeA - timeB;
      }

      // Secondary sort: by kind (descending - higher kinds first)
      const kindA = a.kind ?? 0;
      const kindB = b.kind ?? 0;
      return kindB - kindA;
    })
    
    // Process events in chronological order
    for (const event of sortedEvents) {
      // No need to track activeEvent anymore, we have rootEvent
      
      if (
        event.kind === EVENT_KINDS.STREAMING_RESPONSE ||
        event.kind === EVENT_KINDS.TYPING_INDICATOR
      ) {
        // 21111: Update or create streaming session
        let session = streamingSessions.get(event.pubkey)
        
        if (!session) {
          // New streaming session - create stable synthetic ID
          session = {
            syntheticId: `streaming-${event.pubkey}-${Date.now()}`,
            latestEvent: event
          }
          streamingSessions.set(event.pubkey, session)
        } else {
          // Update existing session with latest event
          session.latestEvent = event
        }
      } else if (event.kind === EVENT_KINDS.TYPING_INDICATOR_STOP) {
        const session = streamingSessions.get(event.pubkey);
        if (session?.latestEvent?.kind === EVENT_KINDS.TYPING_INDICATOR) {
          streamingSessions.delete(event.pubkey);
        }
      } else {
        finalMessages.push({ id: event.id, event: event })
        if (event.kind === EVENT_KINDS.THREAD_REPLY) {
          streamingSessions.delete(event.pubkey)
        }
      }
    }
    
    // Add active streaming sessions to final messages
    streamingSessions.forEach(session => {
      finalMessages.push({
        id: session.syntheticId,  // Stable ID prevents flicker
        event: session.latestEvent,
      })
    })
    
    // Sort everything by timestamp
    finalMessages.sort((a, b) => 
      (a.event.created_at || 0) - (b.event.created_at || 0)
    )
    
    setMessages(finalMessages)
  }, [events])

  // Helper function to check if user is near bottom
  const checkIfNearBottom = useCallback((container: Element) => {
    const threshold = 100 // pixels from bottom to consider "near bottom"
    const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    return scrollBottom <= threshold
  }, [])
  
  // Helper function to scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto'
        })
        setShowScrollToBottom(false)
        setUnreadCount(0)
        isNearBottomRef.current = true
      }
    }
  }, [])
  
  // Smart auto-scroll when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        // Check if we have new messages
        const hasNewMessages = messages.length > lastMessageCountRef.current
        const isInitialLoad = lastMessageCountRef.current === 0 && messages.length > 0
        
        // Auto-scroll only if:
        // 1. Initial load OR
        // 2. User is near bottom and hasn't manually scrolled away OR
        // 3. User just sent a message
        if (isInitialLoad || (isNearBottomRef.current && !userScrolledRef.current)) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight
        } else if (hasNewMessages && !isNearBottomRef.current) {
          // User is reading history and new messages arrived
          const newMessageCount = messages.length - lastMessageCountRef.current
          setUnreadCount(prev => prev + newMessageCount)
          setShowScrollToBottom(true)
        }
        
        lastMessageCountRef.current = messages.length
        
        // Reset userScrolledRef after processing
        if (hasNewMessages) {
          userScrolledRef.current = false
        }
      }
    }
  }, [messages, checkIfNearBottom])

  const handleSendMessage = async () => {
    if (!ndk || !user || (!messageInput.trim() && pendingImageUrls.length === 0)) return

    try {
      // Extract mentioned agents
      const mentions = extractMentions()
      
      // Build message content with images
      let content = messageInput
      
      // Append image URLs to the message content
      if (pendingImageUrls.length > 0) {
        if (content) content += '\n\n'
        pendingImageUrls.forEach(url => {
          content += `![image](${url})\n`
        })
      }

      // If this is a new thread (no rootEvent), create it first
      if (!rootEvent) {
        // Create the initial thread event (kind 11)
        const newThreadEvent = new NDKThread(ndk)
        newThreadEvent.content = content
        newThreadEvent.tags = [
          ['title', messageInput.slice(0, 50) || 'Image'], // Use first 50 chars as title or 'Image'
          ['a', project.tagId()], // NIP-33 reference to the project
        ]

        // Add image tags for each uploaded image
        if (pendingImageUrls.length > 0) {
          const completedUploads = uploadQueue.filter(item => 
            item.status === 'completed' && 
            item.url && 
            pendingImageUrls.includes(item.url)
          )
          
          completedUploads.forEach(upload => {
            if (upload.metadata) {
              newThreadEvent.tags.push(['image', upload.metadata.sha256, upload.url!, upload.metadata.mimeType, upload.metadata.size.toString()])
              if (upload.metadata.blurhash) {
                newThreadEvent.tags.push(['blurhash', upload.metadata.blurhash])
              }
            }
          })
        }

        // Add p-tags for mentioned agents
        mentions.forEach(agent => {
          newThreadEvent.tags.push(['p', agent.pubkey])
        })
        // If no agents are mentioned in a new thread, don't p-tag anyone
        // Let the backend routing handle agent selection

        // Add voice mode tag if auto-TTS is enabled
        if (autoTTS) {
          newThreadEvent.tags.push(['mode', 'voice'])
        }

        await newThreadEvent.sign();
        setLocalRootEvent(newThreadEvent);
        newThreadEvent.publish()
        
        // Notify parent component about the new thread
        if (onThreadCreated) {
          onThreadCreated(newThreadEvent.id)
        }
      } else if (localRootEvent) {
        // Send a reply to the existing thread
        const replyEvent = localRootEvent.reply()
        replyEvent.content = content

        // Remove all p-tags that NDK's .reply() generated
        replyEvent.tags = replyEvent.tags.filter((tag) => tag[0] !== "p")

        // Add project tag
        replyEvent.tags.push(['a', project.tagId()])
        
        // Add image tags for each uploaded image
        if (pendingImageUrls.length > 0) {
          const completedUploads = uploadQueue.filter(item => 
            item.status === 'completed' && 
            item.url && 
            pendingImageUrls.includes(item.url)
          )
          
          completedUploads.forEach(upload => {
            if (upload.metadata) {
              replyEvent.tags.push(['image', upload.metadata.sha256, upload.url!, upload.metadata.mimeType, upload.metadata.size.toString()])
              if (upload.metadata.blurhash) {
                replyEvent.tags.push(['blurhash', upload.metadata.blurhash])
              }
            }
          })
        }

        // Add p-tags for mentioned agents
        mentions.forEach(agent => {
          replyEvent.tags.push(['p', agent.pubkey])
        })

        // If no agents were mentioned, p-tag the most recent non-user message author
        if (mentions.length === 0 && messages.length > 0) {
          const mostRecentNonUserMessage = [...messages]
            .reverse()
            .find(msg => msg.event.pubkey !== user.pubkey)
          
          if (mostRecentNonUserMessage) {
            replyEvent.tags.push(['p', mostRecentNonUserMessage.event.pubkey])
          }
        }

        // Add voice mode tag if auto-TTS is enabled
        if (autoTTS) {
          replyEvent.tags.push(['mode', 'voice'])
        }

        await replyEvent.sign()
        replyEvent.publish()
      }

      // Clear input and pending images
      setMessageInput('')
      setPendingImageUrls([])
      
      // Clear the draft for this conversation
      clearDraft(conversationId)
      
      // Auto-scroll to bottom after sending a message
      setTimeout(() => {
        scrollToBottom(true)
        isNearBottomRef.current = true
        userScrolledRef.current = false
      }, 100)
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
    }
  }

  // Handle file selection from input
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setShowUploadProgress(true)
      await uploadFiles(Array.from(files))
    }
    // Clear the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [uploadFiles])
  
  // Enhanced paste handler  
  const handlePasteEvent = useCallback((e: React.ClipboardEvent) => {
    handlePaste(e)
    setShowUploadProgress(true)
  }, [handlePaste])
  
  // Monitor upload queue for completed uploads
  useEffect(() => {
    const completedUrls = uploadQueue
      .filter(item => item.status === 'completed' && item.url)
      .map(item => item.url!)
      .filter(url => !pendingImageUrls.includes(url))
    
    if (completedUrls.length > 0) {
      setPendingImageUrls(prev => [...prev, ...completedUrls])
    }
  }, [uploadQueue, pendingImageUrls])

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

  const isNewThread = !localRootEvent

  // Get thread title
  const threadTitle = useMemo(() => {
    const eventToUse = localRootEvent
    if (eventToUse) {
      const titleTag = eventToUse.tags?.find(
        (tag: string[]) => tag[0] === 'title'
      )?.[1]
      if (titleTag) return titleTag
      // Fallback to first line of content
      const firstLine = eventToUse.content?.split('\n')[0] || 'Thread'
      return firstLine.length > 50 ? `${firstLine.slice(0, 50)}...` : firstLine
    }
    return isNewThread ? 'New Thread' : 'Thread'
  }, [localRootEvent, isNewThread])

  return (
			<ChatDropZone
				className={cn("flex flex-col h-full overflow-hidden", className)}
			>
				<div
					className="flex flex-col h-full"
					style={{
						paddingBottom: isKeyboardVisible ? keyboardHeight : 0,
						transition: "padding-bottom 0.3s ease-in-out",
					}}
					onPaste={handlePasteEvent}
				>
					{/* Header */}
					{localRootEvent && (
						<div className="bg-card border-b border-border/60 backdrop-blur-xl bg-card/95 sticky top-0 z-50">
							<div
								className={cn(
									"flex items-center justify-between",
									isMobile ? "px-3 py-2" : "px-3 sm:px-4 py-3 sm:py-4",
								)}
							>
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
										<h1
											className={cn(
												"font-semibold text-foreground truncate",
												isMobile
													? "text-base max-w-40"
													: "text-lg sm:text-xl max-w-48",
											)}
										>
											{threadTitle}
										</h1>
										<p
											className={cn(
												"text-muted-foreground",
												isMobile ? "text-[10px] mt-0" : "text-xs mt-0.5",
											)}
										>
											Thread discussion
										</p>
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
												autoTTS
													? "bg-green-600 hover:bg-green-700"
													: "hover:bg-accent",
											)}
											title={
												autoTTS ? "Disable voice mode" : "Enable voice mode"
											}
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
					<div className="flex-1 overflow-hidden relative">
						<ScrollArea
							ref={scrollAreaRef}
							className="h-full pb-4"
							onScrollCapture={(e) => {
								const container = e.currentTarget?.querySelector(
									"[data-radix-scroll-area-viewport]",
								);
								if (!container) return;

								// Track if user is near bottom
								const wasNearBottom = isNearBottomRef.current;
								isNearBottomRef.current = checkIfNearBottom(container);

								// If user scrolled away from bottom, mark as user-initiated scroll
								if (wasNearBottom && !isNearBottomRef.current) {
									userScrolledRef.current = true;
								}

								// Update scroll-to-bottom button visibility
								setShowScrollToBottom(!isNearBottomRef.current);

								// If scrolled back to bottom, clear unread count
								if (isNearBottomRef.current) {
									setUnreadCount(0);
								}
							}}
						>
							<div className={isMobile ? "py-0 pb-20" : "py-2 pb-20"}>
								{messages.length === 0 && !isNewThread ? (
									<div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
										No messages yet. Start the conversation!
									</div>
								) : (
									<div className="divide-y divide-transparent">
										{messages.map((message) => {
											// Check if this is a task event
											if (message.event.kind === EVENT_KINDS.TASK) {
												const task = new NDKTask(
													ndk!,
													message.event.rawEvent(),
												);
												return (
													<div
														key={message.id}
														data-message-author={message.event.pubkey}
													>
														<TaskCard
															task={task}
															className="cursor-pointer hover:shadow-md transition-shadow"
															onClick={() => {
																// Open the task as a conversation
																if (onTaskClick) {
																	onTaskClick(task.id);
																}
															}}
														/>
													</div>
												);
											}

											// All other events (1111, 21111, etc) go through MessageWithReplies
											return (
												<div
													key={message.id}
													data-message-author={message.event.pubkey}
												>
													<MessageWithReplies
														event={message.event}
														project={project}
														onReply={() => {
															// Focus the input for reply
															if (textareaRef.current) {
																textareaRef.current.focus();
															}
														}}
													/>
												</div>
											);
										})}
									</div>
								)}
							</div>
						</ScrollArea>

						{/* Scroll to bottom button */}
						<AnimatePresence>
							{showScrollToBottom && (
								<motion.div
									initial={{ opacity: 0, scale: 0.8 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0.8 }}
									className="absolute bottom-4 right-4 z-30"
								>
									<Button
										onClick={() => scrollToBottom(true)}
										size="icon"
										className={cn(
											"rounded-full shadow-lg",
											"bg-primary hover:bg-primary/90",
											"w-10 h-10",
											unreadCount > 0 && "animate-pulse",
										)}
									>
										<div className="relative">
											<ArrowDown className="h-4 w-4" />
											{unreadCount > 0 && (
												<span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
													{unreadCount > 99 ? "99+" : unreadCount}
												</span>
											)}
										</div>
									</Button>
								</motion.div>
							)}
						</AnimatePresence>
					</div>

					{/* Input Area */}
					<div
						className={cn(
							"flex-shrink-0 relative",
							isMobile ? "p-3 pb-safe" : "p-4",
						)}
					>
						<div
							className={cn(
								"relative rounded-2xl",
								"bg-background/80 backdrop-blur-xl",
								"border border-border/50",
								"shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]",
								isMobile ? "" : "max-w-4xl mx-auto",
							)}
						>
							{/* Enhanced pending images display with animation */}
							<AnimatePresence>
								{pendingImageUrls.length > 0 && (
									<motion.div
										initial={{ opacity: 0, height: 0 }}
										animate={{ opacity: 1, height: "auto" }}
										exit={{ opacity: 0, height: 0 }}
										className="overflow-hidden"
									>
										<div
											className={cn(
												"flex flex-wrap gap-2 border-b border-border/30",
												isMobile ? "p-2 pb-3" : "p-3 pb-4",
											)}
										>
											{pendingImageUrls.map((url, index) => {
												const uploadItem = uploadQueue.find(
													(item) => item.url === url,
												);
												return (
													<motion.div
														key={url}
														initial={{ scale: 0.8, opacity: 0 }}
														animate={{ scale: 1, opacity: 1 }}
														exit={{ scale: 0.8, opacity: 0 }}
														transition={{ delay: index * 0.05 }}
														className="relative group"
													>
														<ImagePreview
															url={url}
															alt="Pending upload"
															className="w-16 h-16 rounded-lg border border-border/50"
															showLightbox={false}
														/>

														{/* Upload status overlay */}
														{uploadItem &&
															uploadItem.status === "uploading" && (
																<div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
																	<div className="text-white text-xs font-medium">
																		{uploadItem.progress}%
																	</div>
																</div>
															)}

														{/* Actions */}
														<div className="absolute -top-1.5 -right-1.5 flex gap-0.5">
															{uploadItem?.status === "failed" && (
																<button
																	onClick={() => retryUpload(uploadItem.id)}
																	className="bg-orange-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
																	title="Retry upload"
																>
																	<svg
																		className="w-2.5 h-2.5"
																		fill="none"
																		stroke="currentColor"
																		viewBox="0 0 24 24"
																	>
																		<path
																			strokeLinecap="round"
																			strokeLinejoin="round"
																			strokeWidth={2}
																			d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
																		/>
																	</svg>
																</button>
															)}
															<button
																onClick={() => {
																	setPendingImageUrls((prev) =>
																		prev.filter((_, i) => i !== index),
																	);
																	if (uploadItem) {
																		cancelUpload(uploadItem.id);
																	}
																}}
																className="bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
															>
																<X className="w-2.5 h-2.5" />
															</button>
														</div>
													</motion.div>
												);
											})}
										</div>
									</motion.div>
								)}
							</AnimatePresence>
							<div
								className={cn(
									"flex items-end",
									isMobile ? "gap-1.5 p-2" : "gap-2 p-3",
								)}
							>
								<div className="flex-1 relative">
									{/* Mention Autocomplete Menu - positioned above the textarea */}
									{showAgentMenu && filteredAgents.length > 0 && (
										<div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border rounded-md shadow-lg p-2 max-h-48 overflow-y-auto z-50">
											{filteredAgents.map((agent, index) => (
												<button
													key={agent.pubkey}
													className={cn(
														"w-full text-left px-3 py-2 rounded hover:bg-accent transition-colors",
														index === selectedAgentIndex && "bg-accent",
													)}
													onClick={() => insertMention(agent)}
												>
													<div className="flex items-center gap-2">
														<ProfileDisplay
															pubkey={agent.pubkey}
															showName={false}
															avatarClassName="h-6 w-6"
														/>
														<span className="text-sm font-medium truncate">
															{agent.name}
														</span>
													</div>
												</button>
											))}
										</div>
									)}
									<Textarea
										ref={textareaRef}
										value={messageInput}
										onChange={(e) => handleInputChange(e.target.value)}
										onKeyDown={handleKeyDown}
										placeholder={
											isNewThread
												? "Start a new conversation..."
												: "Type a message..."
										}
										className={cn(
											"resize-none bg-transparent border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0",
											"placeholder:text-muted-foreground/60",
											"transition-all duration-200",
											isMobile
												? "min-h-[40px] text-[15px] py-2.5 px-1 leading-relaxed"
												: "min-h-[56px] text-base py-3 px-2",
										)}
									/>
								</div>
								<div
									className={cn(
										"flex items-center",
										isMobile ? "gap-1" : "gap-2",
									)}
								>
									{/* Hidden file input */}
									<input
										ref={fileInputRef}
										type="file"
										multiple
										accept="image/*"
										onChange={handleFileSelect}
										className="hidden"
									/>
									<Button
										onClick={() => fileInputRef.current?.click()}
										size="icon"
										variant="ghost"
										className={cn(
											"rounded-full transition-all duration-200",
											"hover:bg-accent/80 hover:scale-110",
											"active:scale-95",
											isMobile ? "h-9 w-9" : "h-10 w-10",
										)}
										title="Attach image"
									>
										<Paperclip
											className={cn(
												"transition-colors",
												isMobile ? "h-4 w-4" : "h-4.5 w-4.5",
											)}
										/>
									</Button>
									{!isMobile && (
										<Button
											onClick={() => setIsVoiceDialogOpen(true)}
											size="icon"
											variant="ghost"
											className={cn(
												"rounded-full transition-all duration-200",
												"hover:bg-accent/80 hover:scale-110",
												"active:scale-95",
												"h-10 w-10",
											)}
										>
											<Mic className="h-4.5 w-4.5" />
										</Button>
									)}
									<Button
										onClick={handleSendMessage}
										disabled={
											!messageInput.trim() && pendingImageUrls.length === 0
										}
										size="icon"
										className={cn(
											"rounded-full transition-all duration-200",
											"bg-primary hover:bg-primary/90",
											"hover:scale-110 active:scale-95",
											"disabled:opacity-50 disabled:hover:scale-100",
											"shadow-sm hover:shadow-md",
											isMobile ? "h-9 w-9" : "h-10 w-10",
										)}
									>
										<Send
											className={cn(
												"transition-transform",
												!messageInput.trim() && pendingImageUrls.length === 0
													? ""
													: "translate-x-0.5",
												isMobile ? "h-4 w-4" : "h-4.5 w-4.5",
											)}
										/>
									</Button>
								</div>
							</div>
						</div>
					</div>

					{/* Voice Dialog */}
					<VoiceDialog
						open={isVoiceDialogOpen}
						onOpenChange={setIsVoiceDialogOpen}
						onComplete={async (data) => {
							// Send the transcription as a regular message with audio attachment
							if (data.transcription.trim()) {
								setMessageInput(data.transcription);
								await handleSendMessage();
							}
						}}
						conversationId={localRootEvent?.id}
						projectId={project.tagId()}
						publishAudioEvent={true}
					/>

					{/* Enhanced Upload Queue Overlay */}
					<AnimatePresence>
						{showUploadProgress && uploadStats.total > 0 && (
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: 20 }}
							>
								<ImageUploadQueue />
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</ChatDropZone>
		);
}