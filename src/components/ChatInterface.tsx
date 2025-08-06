import { NDKKind, NDKTask } from "@nostr-dev-kit/ndk-hooks";
import {
    NDKEvent,
    type NDKProject,
    useEvent,
    useNDK,
    useSubscribe,
    useNDKCurrentPubkey,
} from "@nostr-dev-kit/ndk-hooks";
import { EVENT_KINDS } from "../lib/constants";
import { useAtom } from "jotai";
import { ArrowDown, Send } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useMentionAutocomplete } from "../hooks/useMentionAutocomplete";
import { useProjectAgents, useProjectLLMConfigs } from "../stores/project/hooks";
import { useScrollManagement } from "../hooks/useScrollManagement";
import { messageDraftsAtom, selectedTaskAtom } from "../lib/store";
import { generateThreadTitle } from "../utils/openai";
import { extractTTSContent } from "../utils/extractTTSContent";
import { useMurfTTS } from "../hooks/useMurfTTS";
import { useLLMConfig } from "../hooks/useLLMConfig";
import { BackendButtons } from "./BackendButtons";
import { ChatDebugDialog } from "./chat/ChatDebugDialog";
import { ChatHeader } from "./chat/ChatHeader";
import { ChatInputArea } from "./chat/ChatInputArea";
import { ChatTypingIndicator } from "./chat/ChatTypingIndicator";
import { VoiceDialog } from "./dialogs/VoiceDialog";
import { AgentDiscoveryCard } from "./common/AgentDiscoveryCard";
import { CommandExecutionCard } from "./common/CommandExecutionCard";
import { MessageWithReplies } from "./MessageWithReplies";
import { TaskCard } from "./tasks/TaskCard";
import { Button } from "./ui/button";
import { useStreamingResponses } from "../hooks/useStreamingResponses";

interface ChatInterfaceProps {
    statusUpdates?: NDKEvent[];
    task?: NDKTask;
    inputPlaceholder?: string;
    allowInput?: boolean;
    className?: string;
    // New props for thread mode
    project?: NDKProject;
    threadId?: string;
    threadTitle?: string;
    initialAgentPubkeys?: string[];
    onBack?: () => void;
    disableTaskClick?: boolean; // Disable task click handler when in drawer
    onThreadCreated?: (threadEvent: NDKEvent) => void; // Callback when a new thread is created
    initialThreadEvent?: NDKEvent; // Pre-configured thread event
    initialMessage?: string; // Initial message content
}

// Memoized message list component
const MessageList = memo(
    ({
        messages,
        onTaskClick,
        project,
    }: {
        messages: NDKEvent[];
        onTaskClick?: (task: NDKTask) => void;
        project: NDKProject;
    }) => {
        return (
            <div className="divide-y divide-transparent">
                {messages.map((event) => {
                    // Check if this is a task event
                    if (event.kind === EVENT_KINDS.TASK) {
                        // For tasks, we'll render them as a special message with the task card
                        const task = event as NDKTask;

                        return (
                            <TaskCard key={event.id} task={task} onClick={() => onTaskClick?.(task)} />
                        );
                    }

                    // Check for render-type tag
                    const renderType = event.tagValue("render-type");

                    // If render-type is "agent_discovery", render the discovery card
                    if (renderType === "agent_discovery") {
                        return (
                            <div key={event.id}>
                                <AgentDiscoveryCard event={event} />
                            </div>
                        );
                    }

                    // For all other events, render as message with replies
                    return (
                        <MessageWithReplies
                            key={event.id}
                            event={event}
                            project={project}
                        />
                    );
                })}
            </div>
        );
    }
);

MessageList.displayName = "MessageList";

export function ChatInterface({
    statusUpdates = [],
    task,
    inputPlaceholder = "Add a comment...",
    allowInput = true,
    className = "",
    project,
    threadId,
    threadTitle,
    initialAgentPubkeys = [],
    onBack,
    disableTaskClick = false,
    onThreadCreated,
    initialThreadEvent,
    initialMessage = "",
}: ChatInterfaceProps) {
    const { ndk } = useNDK();
    const currentUserPubkey = useNDKCurrentPubkey();
    const [isSending, setIsSending] = useState(false);
    const [kind11Event, setKind11Event] = useState<NDKEvent | null>(null);
    const [showDebugDialog, setShowDebugDialog] = useState(false);
    const [debugIndicator, setDebugIndicator] = useState<NDKEvent | null>(null);
    const [, setSelectedTask] = useAtom(selectedTaskAtom);
    const [autoTTS, setAutoTTS] = useState(false);
    const [messageDrafts, setMessageDrafts] = useAtom(messageDraftsAtom);

    // Determine if we're in thread mode (include new threads without titles)
    const isThreadMode = !!(project && (threadTitle !== undefined || threadId === "new"));
    
    // Get project agents for @mentions
    const projectAgents = useProjectAgents(project?.tagId());

    // Generate a stable root event ID for draft persistence
    const rootEventId = useMemo(() => {
        if (isThreadMode) {
            // For existing threads, use the thread event ID
            if (threadId && threadId !== "new") return threadId;
            // For new threads, use a stable identifier based on thread title
            if (threadTitle) return `new-${threadTitle}`;
        } else if (task?.id) {
            // For task conversations, use the task ID
            return task.id;
        }
        return null;
    }, [isThreadMode, threadId, threadTitle, task?.id]);

    // Initialize message input from drafts or initialMessage
    const [messageInput, setMessageInput] = useState(() => {
        if (rootEventId) {
            return messageDrafts.get(rootEventId) || initialMessage;
        }
        return initialMessage;
    });

    // State for new thread detection
    const isNewThread = threadId === "new" && (threadTitle === undefined || threadTitle === "");
    
    // TTS configuration
    const { getTTSConfig } = useLLMConfig();
    const ttsConfig = getTTSConfig();
    
    const ttsOptions = useMemo(() => {
        if (!ttsConfig) return null;
        return {
            apiKey: ttsConfig.credentials.apiKey || '',
            voiceId: ttsConfig.config.voiceId || '',
            style: 'Conversational',
            rate: ttsConfig.config.settings?.speed || 1.0,
            pitch: ttsConfig.config.settings?.pitch || 1.0,
            volume: ttsConfig.config.settings?.volume || 1.0,
        };
    }, [ttsConfig]);
    
    const tts = useMurfTTS(ttsOptions || {
        apiKey: '',
        voiceId: '',
    });

    // State for voice dialog
    const [showVoiceDialog, setShowVoiceDialog] = useState(false);

    // Update draft when messageInput changes
    useEffect(() => {
        if (!rootEventId) return;

        if (messageInput.trim()) {
            // Save draft if there's content
            setMessageDrafts((prev) => {
                const newDrafts = new Map(prev);
                newDrafts.set(rootEventId, messageInput);
                return newDrafts;
            });
        } else {
            // Remove draft if empty
            setMessageDrafts((prev) => {
                const newDrafts = new Map(prev);
                newDrafts.delete(rootEventId);
                return newDrafts;
            });
        }
    }, [messageInput, rootEventId, setMessageDrafts]);

    // Get project directory and LLM configurations
    // Extract just the d-tag from the project's tagId (format: 31933:pubkey:d-tag)
    const projectTagId = project?.tagId();
    const projectDir = projectTagId ? projectTagId.split(":")[2] : undefined;
    const availableLLMConfigs = useProjectLLMConfigs(projectDir);

    // Use mention autocomplete hook
    const {
        textareaRef,
        showAgentMenu,
        filteredAgents,
        selectedAgentIndex,
        handleInputChange,
        handleKeyDown: handleMentionKeyDown,
        insertMention,
        extractMentions,
    } = useMentionAutocomplete(projectAgents, messageInput, setMessageInput);

    // Auto-focus the input when thread view opens
    useEffect(() => {
        if (isThreadMode && textareaRef.current) {
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 100);
        }
    }, [isThreadMode, textareaRef]);

    // Subscribe to existing thread if we have a threadId (but not for 'new' threads)
    const existingThread = useEvent(threadId && threadId !== "new" ? threadId : false);

    // Use existing thread or the kind11Event for new threads
    const currentThreadEvent = existingThread || kind11Event;

    // Get thread title from the thread event if we don't have it from props
    const effectiveThreadTitle = useMemo(() => {
        // If we have a current thread event (created after submit), use its title
        if (currentThreadEvent) {
            const titleTag = currentThreadEvent.tags?.find(
                (tag: string[]) => tag[0] === "title"
            )?.[1];
            if (titleTag) return titleTag;
            // Fallback to first line of content
            const firstLine = currentThreadEvent.content?.split("\n")[0] || "Thread";
            return firstLine.length > 50 ? `${firstLine.slice(0, 50)}...` : firstLine;
        }

        // For new threads without a created event yet, show "New Thread"
        if (isNewThread) {
            return "New Thread";
        }

        // Use the threadTitle prop as fallback
        if (threadTitle) return threadTitle;

        return "Thread";
    }, [currentThreadEvent, isNewThread, threadTitle]);

    // Subscribe to thread messages when currentThreadEvent is available
    const { events: threadReplies } = useSubscribe(
        currentThreadEvent
            ? [
                  {
                      kinds: [NDKKind.GenericReply],
                      ...currentThreadEvent.nip22Filter(),
                  },
              ]
            : false,
        {},
        [currentThreadEvent?.id]
    );

    // Subscribe to tasks related to the thread
    // This ensures tasks are in the cache when referenced via nostr:nevent1...
    const { events: relatedTasks } = useSubscribe(
        currentThreadEvent && typeof currentThreadEvent.filter === "function"
            ? [{ kinds: [NDKTask.kind], ...currentThreadEvent.filter() }]
            : false,
        {},
        [currentThreadEvent?.id]
    );

    // Subscribe to typing indicators when we have a thread or task
    const { events: typingIndicatorEvents } = useSubscribe(
        currentThreadEvent || task?.id
            ? [
                  {
                      kinds: [
                          EVENT_KINDS.TYPING_INDICATOR as NDKKind,
                          EVENT_KINDS.TYPING_INDICATOR_STOP as NDKKind,
                      ],
                      "#e": currentThreadEvent
                          ? [currentThreadEvent.id]
                          : task?.id
                            ? [task?.id]
                            : [],
                      since: Math.floor(Date.now() / 1000) - 60, // Only show indicators from last minute
                  },
              ]
            : false,
        {},
        [currentThreadEvent?.id, task?.id]
    );

    // Subscribe to streaming responses for the current thread
    useStreamingResponses(currentThreadEvent?.id || null);

    // Process typing indicators - only keep latest per pubkey
    const activeTypingIndicators = useMemo(() => {
        if (!typingIndicatorEvents || typingIndicatorEvents.length === 0) return [];

        // Group by pubkey and keep only the latest event
        const indicatorsByPubkey = new Map<string, NDKEvent>();

        // Sort events by created_at to process them in order
        const sortedEvents = [...typingIndicatorEvents].sort(
            (a, b) => (a.created_at ?? 0) - (b.created_at ?? 0)
        );

        for (const event of sortedEvents) {
            if (event.kind === EVENT_KINDS.TYPING_INDICATOR_STOP) {
                // Stop typing event - remove the indicator
                indicatorsByPubkey.delete(event.pubkey);
            } else if (event.kind === EVENT_KINDS.TYPING_INDICATOR) {
                // Start typing event - add/update the indicator
                indicatorsByPubkey.set(event.pubkey, event);
            }
        }

        // Filter out indicators older than 30 seconds (safety net)
        const thirtySecondsAgo = Math.floor(Date.now() / 1000) - 30;
        const active = Array.from(indicatorsByPubkey.values()).filter(
            (event) =>
                (event.created_at ?? 0) > thirtySecondsAgo &&
                event.kind === EVENT_KINDS.TYPING_INDICATOR
        );

        return active;
    }, [typingIndicatorEvents]);

    // Combine the thread event and its replies
    const threadMessages = useMemo(() => {
        if (!currentThreadEvent) return [];

        // Start with the thread event itself
        const messages = [currentThreadEvent];

        // Add all replies
        if (threadReplies && threadReplies.length > 0) {
            messages.push(...threadReplies);
        }

        // Add all related tasks (project-level tasks)
        if (relatedTasks && relatedTasks.length > 0) {
            messages.push(...relatedTasks);
        }

        // Sort by created_at timestamp
        return messages.sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0));
    }, [currentThreadEvent, threadReplies, relatedTasks]);
    
    // Track the last message ID to detect new messages
    const [lastMessageId, setLastMessageId] = useState<string | null>(null);
    
    // Auto-play new messages when auto-TTS is enabled
    useEffect(() => {
        if (!autoTTS || !ttsOptions || threadMessages.length === 0) return;
        
        const latestMessage = threadMessages[threadMessages.length - 1];
        if (!latestMessage || latestMessage.id === lastMessageId) return;
        
        // Don't auto-play messages from the current user
        if (latestMessage.pubkey === currentUserPubkey) {
            setLastMessageId(latestMessage.id);
            return;
        }
        
        // Extract and play the content
        const ttsContent = extractTTSContent(latestMessage.content);
        if (ttsContent && !tts.isPlaying) {
            tts.play(ttsContent).catch((error) => {
                console.error("TTS playback failed:", error);
                // Silently fail - TTS is a nice-to-have feature
            });
        }
        
        setLastMessageId(latestMessage.id);
    }, [threadMessages, autoTTS, ttsOptions, lastMessageId, currentUserPubkey, tts]);

    // Get unique participants from thread messages and p-tags
    const threadParticipants = useMemo(() => {
        if (!isThreadMode) return [];

        const participantSet = new Set<string>();

        // Add participants from messages
        for (const message of threadMessages) {
            participantSet.add(message.pubkey);

            // Also add any p-tagged participants from the original thread event
            if (message === currentThreadEvent) {
                for (const tag of message.tags || []) {
                    if (tag[0] === "p" && tag[1]) {
                        participantSet.add(tag[1]);
                    }
                }
            }
        }

        // If no messages yet but we have initial agent pubkeys, include them
        if (threadMessages.length === 0 && initialAgentPubkeys.length > 0) {
            for (const pubkey of initialAgentPubkeys) {
                participantSet.add(pubkey);
            }
        }

        return Array.from(participantSet);
    }, [isThreadMode, threadMessages, currentThreadEvent, initialAgentPubkeys]);

    const messageCount = isThreadMode ? threadMessages.length : statusUpdates.length;

    // Use scroll management hook
    const {
        messagesEndRef,
        messagesContainerRef,
        showNewMessageIndicator,
        handleScroll,
        scrollToBottom,
        setShowNewMessageIndicator,
    } = useScrollManagement(messageCount);

    // Send message
    const handleSendMessage = useCallback(async () => {
        if (!messageInput.trim() || !ndk?.signer || isSending) return;

        // For task mode, require task?.id
        if (!isThreadMode && !task?.id) return;

        setIsSending(true);
        try {
            let event: NDKEvent;

            // Extract mentions and get clean content
            const { cleanContent, mentionedAgents } = extractMentions(messageInput.trim());
            
            // Debug logging
            console.log("Message input:", messageInput);
            console.log("Mentioned agents found:", mentionedAgents);
            console.log("Available project agents:", projectAgents);

            if (isThreadMode) {
                // Check if we have an existing thread with reply capability
                if (currentThreadEvent && typeof currentThreadEvent.reply === "function") {
                    // This is a reply to an existing thread
                    event = currentThreadEvent.reply();
                    event.content = cleanContent;

                    // Remove all p-tags that NDK's .reply() generated
                    event.tags = event.tags.filter((tag) => tag[0] !== "p");

                    event.tags.push(["a", project?.tagId()]);

                    // Add mentioned agents to the reply (explicit p-tags)
                    for (const agent of mentionedAgents) {
                        event.tags.push(["p", agent.pubkey]);
                    }

                    // If no agents were mentioned, p-tag the most recent non-user message
                    if (mentionedAgents.length === 0 && currentUserPubkey && threadMessages.length > 0) {
                        const mostRecentNonUserMessage = [...threadMessages]
                            .reverse()
                            .find((msg) => msg.pubkey !== currentUserPubkey);
                        
                        if (mostRecentNonUserMessage) {
                            event.tags.push(["p", mostRecentNonUserMessage.pubkey]);
                        }
                    }
                    
                    // Add voice mode tag if auto-TTS is enabled
                    if (autoTTS) {
                        event.tags.push(["mode", "voice"]);
                    }
                } else if (!kind11Event) {
                    // This is the first message, create a new thread (kind 11)
                    if (initialThreadEvent) {
                        // Use the pre-configured thread event
                        event = initialThreadEvent;
                        event.ndk = ndk;
                        event.content = cleanContent;
                    } else {
                        event = new NDKEvent(ndk);
                        event.kind = EVENT_KINDS.CHAT;
                        event.content = cleanContent;

                        // Generate title if this is a new thread
                        let finalTitle = threadTitle;
                        if (isNewThread) {
                            try {
                                finalTitle = await generateThreadTitle(messageInput);
                            } catch (error) {
                                console.warn("Failed to generate thread title:", error);
                                // Fallback to a simple title based on first few words
                                finalTitle = `${messageInput.trim().split(" ").slice(0, 4).join(" ").slice(0, 30)}...`;
                            }
                        }

                        event.tags = [
                            ["title", finalTitle || "New Thread"],
                            ["a", project?.tagId()],
                        ];
                    }

                    // Add initial agents as p-tags
                    if (initialAgentPubkeys.length > 0) {
                        const projectAgentsMap = new Map(projectAgents.map((a) => [a.pubkey, a]));
                        for (const pubkey of initialAgentPubkeys) {
                            const agent = projectAgentsMap.get(pubkey);
                            if (agent) {
                                event.tags.push(["p", pubkey]);
                            }
                        }
                    }

                    // Add mentioned agents to the initial message
                    for (const agent of mentionedAgents) {
                        // Don't add duplicate p-tags
                        if (!event.tags.some((tag) => tag[0] === "p" && tag[1] === agent.pubkey)) {
                            event.tags.push(["p", agent.pubkey]);
                        }
                    }
                    
                    // Add voice mode tag if auto-TTS is enabled
                    if (autoTTS) {
                        event.tags.push(["mode", "voice"]);
                    }

                    await event.sign();

                    // Store the kind11Event to start subscription
                    setKind11Event(event);

                    // Publish the event
                    await event.publish();
                    setMessageInput("");

                    // Notify parent component about thread creation
                    if (onThreadCreated) {
                        onThreadCreated(event);
                    }

                    // Clean up draft for new thread since it now has a real ID
                    if (rootEventId?.startsWith("new-")) {
                        setMessageDrafts((prev) => {
                            const newDrafts = new Map(prev);
                            newDrafts.delete(rootEventId);
                            return newDrafts;
                        });
                    }

                    // Scroll to bottom after creating thread
                    requestAnimationFrame(() => {
                        scrollToBottom(true); // Force scroll after sending
                    });

                    return; // Exit early since we've handled publishing
                } else {
                    // We have a kind11Event but it might not have reply() yet
                    // This shouldn't happen in normal flow, but let's handle it
                    return;
                }
            } else if (task?.id) {
                // Task mode - create a reply to the task
                event = task.reply();
                event.content = cleanContent;

                // Remove all p-tags that NDK's .reply() generated
                event.tags = event.tags.filter((tag) => tag[0] !== "p");

                if (project) {
                    event.tags.push(["a", project.tagId()]); // Project reference
                }

                // Find the most recent non-user message from status updates
                const sortedUpdates = [...statusUpdates].sort(
                    (a, b) => (b.created_at ?? 0) - (a.created_at ?? 0)
                );
                
                // Find the most recent update that is not from the current user
                const mostRecentNonUserUpdate = currentUserPubkey 
                    ? sortedUpdates.find((update) => update.pubkey !== currentUserPubkey)
                    : sortedUpdates[0];

                // Find claude-session tag in status updates
                // Filter out any pseudo-events (like task description) that don't have proper tags
                const realStatusUpdates = statusUpdates.filter(s => 
                    s.tags && !s.tags.some(tag => tag[0] === "task-description")
                );
                
                const claudeSessionId = realStatusUpdates
                    .find((s) => !!s.hasTag("claude-session"))
                    ?.tagValue("claude-session");
                
                if (!claudeSessionId) {
                    alert("No claude-session found in status updates. This is a bug");
                    return;
                }

                // Add mentioned agents to the reply (explicit p-tags)
                for (const agent of mentionedAgents) {
                    event.tags.push(["p", agent.pubkey]);
                }

                // If no agents were mentioned, p-tag the most recent non-user update
                if (mentionedAgents.length === 0 && mostRecentNonUserUpdate) {
                    // P-tag the most recent non-user that responded
                    event.tags.push(["p", mostRecentNonUserUpdate.pubkey]);
                }

                // Always add claude-session for routing
                event.tags.push(["claude-session", claudeSessionId]);
                
                // Add voice mode tag if auto-TTS is enabled
                if (autoTTS) {
                    event.tags.push(["mode", "voice"]);
                }
            } else {
                // This shouldn't happen due to the check above, but TypeScript needs this
                return;
            }

            // Publish the reply event
            await event.publish();
            setMessageInput("");

            // Scroll to bottom after sending
            requestAnimationFrame(() => {
                scrollToBottom(true); // Force scroll after sending
            });
        } catch {
            /**/
        } finally {
            setIsSending(false);
        }
    }, [
        messageInput,
        ndk,
        isSending,
        autoTTS,
        isThreadMode,
        task,
        extractMentions,
        currentThreadEvent,
        kind11Event,
        project,
        threadTitle,
        isNewThread,
        initialAgentPubkeys,
        rootEventId,
        projectAgents,
        setMessageDrafts,
        scrollToBottom,
        statusUpdates,
        currentUserPubkey,
        initialThreadEvent,
        onThreadCreated,
        threadMessages,
    ]);

    const handleKeyPress = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            // Let mention autocomplete handle key first
            const consumed = handleMentionKeyDown(e);
            if (!consumed && e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        },
        [handleMentionKeyDown, handleSendMessage]
    );


    return (
        <div className={`bg-background flex flex-col ${className}`}>
            {/* Header for thread mode */}
            {isThreadMode && (
                <ChatHeader
                    title={effectiveThreadTitle}
                    subtitle="Thread discussion"
                    participants={threadParticipants}
                    messages={threadMessages}
                    projectPubkey={project?.pubkey}
                    projectId={projectTagId}
                    projectEvent={project}
                    availableModels={availableLLMConfigs}
                    onBack={onBack}
                    autoTTS={autoTTS}
                    onAutoTTSToggle={ttsOptions ? () => setAutoTTS(!autoTTS) : undefined}
                />
            )}
            {/* Messages Container */}
            <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto relative"
                id="chat-messages-container"
                onScroll={handleScroll}
            >
                <div className="p-2">
                    {/* Show thread messages if in thread mode, otherwise show status updates */}
                    {isThreadMode ? (
                        threadMessages && threadMessages.length > 0 && project ? (
                            <MessageList
                                messages={threadMessages}
                                onTaskClick={disableTaskClick ? undefined : (task) => setSelectedTask(task)}
                                project={project}
                            />
                        ) : threadId && threadId !== "new" && !currentThreadEvent ? (
                            // Loading state for existing thread
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                    <Send className="w-6 h-6 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-medium text-foreground mb-2">
                                    Loading thread...
                                </h3>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Send className="w-6 h-6 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-medium text-foreground mb-2">
                                    Start the conversation
                                </h3>
                            </div>
                        )
                    ) : statusUpdates.length > 0 && project ? (
                        <MessageList
                            messages={statusUpdates}
                            onTaskClick={disableTaskClick ? undefined : (task) => setSelectedTask(task)}
                            project={project}
                        />
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                <Send className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium text-foreground mb-2">
                                No updates yet
                            </h3>
                            <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed mb-6">
                                Status updates and conversations will appear here.
                            </p>
                            {task?.id && project && (
                                <div className="max-w-sm mx-auto">
                                    <BackendButtons
                                        taskId={task?.id}
                                        projectTagId={project.tagId()}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Command Execution Cards */}
                    {(project || threadId) && (
                        <CommandExecutionCard
                            projectId={project?.tagId() || ""}
                            rootEventId={threadId || currentThreadEvent?.id}
                        />
                    )}

                    {/* Typing Indicators */}
                    <ChatTypingIndicator
                        activeIndicators={activeTypingIndicators}
                        onDebugClick={(indicator) => {
                            setDebugIndicator(indicator);
                            setShowDebugDialog(true);
                        }}
                    />

                    {/* Scroll anchor - moved inside the content container */}
                    <div ref={messagesEndRef} className="h-1" />
                </div>

                {/* New Message Indicator */}
                {showNewMessageIndicator && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                                scrollToBottom(true);
                                setShowNewMessageIndicator(false);
                            }}
                            className="flex items-center gap-2 shadow-lg"
                        >
                            <ArrowDown className="w-4 h-4" />
                            New message
                        </Button>
                    </div>
                )}
            </div>
            {/* Input Area */}
            {allowInput && (isThreadMode || task?.id) && (
                <ChatInputArea
                    ref={textareaRef}
                    messageInput={messageInput}
                    isSending={isSending}
                    placeholder={isThreadMode ? "Write something..." : inputPlaceholder}
                    showAgentMenu={showAgentMenu}
                    filteredAgents={filteredAgents}
                    selectedAgentIndex={selectedAgentIndex}
                    onInputChange={handleInputChange}
                    onKeyDown={handleKeyPress}
                    onSendMessage={handleSendMessage}
                    onSelectAgent={insertMention}
                    onVoiceRecord={
                        isThreadMode && project ? () => setShowVoiceDialog(true) : undefined
                    }
                />
            )}
            {/* Debug Dialog */}
            {showDebugDialog && (
                <ChatDebugDialog
                    indicator={debugIndicator}
                    onClose={() => {
                        setShowDebugDialog(false);
                        setDebugIndicator(null);
                    }}
                />
            )}
            {/* Voice Dialog */}
            {showVoiceDialog && project && (
                <VoiceDialog
                    open={showVoiceDialog}
                    onOpenChange={setShowVoiceDialog}
                    onComplete={(data) => {
                        // Just set the transcription, the audio event is published separately
                        setMessageInput(data.transcription);
                        setShowVoiceDialog(false);
                        // Focus the textarea after setting the text
                        setTimeout(() => textareaRef.current?.focus(), 100);
                    }}
                    conversationId={rootEventId || undefined}
                    projectId={project.tagId()}
                    publishAudioEvent={true}
                />
            )}
        </div>
    );
}
