import { useState, useEffect, useRef, useCallback } from "react";
import { useNDK, useNDKCurrentUser } from "@nostr-dev-kit/ndk-hooks";
import { cn } from "@/lib/utils";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useProjectOnlineAgents } from "@/hooks/useProjectOnlineAgents";
import { ChatDropZone } from "./ChatDropZone";
import type { NDKProject } from "@/lib/ndk-events/NDKProject";
import { NDKTask } from "@/lib/ndk-events/NDKTask";
import type { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { toast } from "sonner";
import type { AgentInstance } from "@/types/agent";

// Import new hooks and components
import { useChatMessages } from "./hooks/useChatMessages";
import { useChatScroll } from "./hooks/useChatScroll";
import { useChatInput } from "./hooks/useChatInput";
import { useThreadManagement } from "./hooks/useThreadManagement";
import { ChatHeader } from "./components/ChatHeader";
import { ChatMessageList } from "./components/ChatMessageList";
import { ChatInputArea } from "./components/ChatInputArea";
import { useAI } from "@/hooks/useAI";
import { ReplyProvider, useReply } from "./contexts/ReplyContext";

interface ChatInterfaceProps {
  project?: NDKProject | null;
  rootEvent?: NDKEvent;
  extraTags?: string[][];
  className?: string;
  onBack?: () => void;
  onDetach?: () => void;
  onTaskClick?: (task: NDKTask) => void;
  onThreadCreated?: (thread: NDKEvent) => void;
  onVoiceCallClick?: () => void;
}

/**
 * Inner component that uses the Reply context
 */
function ChatInterfaceInner({
  project,
  rootEvent,
  extraTags,
  className,
  onBack,
  onDetach,
  onTaskClick,
  onThreadCreated,
  onVoiceCallClick,
}: ChatInterfaceProps) {
  const { ndk } = useNDK();
  const user = useNDKCurrentUser();
  const isMobile = useIsMobile();
  const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { replyingTo, clearReply } = useReply();

  // TTS state
  const { voiceSettings } = useAI();
  const autoTTS = voiceSettings.autoSpeak;

  // Local navigation state
  const [navigationStack, setNavigationStack] = useState<NDKEvent[]>([]);
  const [localRootEvent, setLocalRootEvent] = useState<NDKEvent | null>(
    rootEvent || null
  );

  // Update local root when rootEvent prop changes
  useEffect(() => {
    if (rootEvent && rootEvent.id !== localRootEvent?.id) {
      setLocalRootEvent(rootEvent);
      // Clear navigation stack when explicitly setting a new root from props
      setNavigationStack([]);
    }
  }, [rootEvent]);

  // Navigation functions
  const pushToStack = useCallback((event: NDKEvent) => {
    if (localRootEvent && localRootEvent.id !== event.id) {
      setNavigationStack(prev => [...prev, localRootEvent]);
    }
    setLocalRootEvent(event);
  }, [localRootEvent]);

  const popFromStack = useCallback(() => {
    if (navigationStack.length > 0) {
      const previous = navigationStack[navigationStack.length - 1];
      setNavigationStack(prev => prev.slice(0, -1));
      setLocalRootEvent(previous);
      return previous;
    }
    return null;
  }, [navigationStack]);

  const canGoBack = useCallback(() => {
    return navigationStack.length > 0;
  }, [navigationStack]);

  // Get ONLINE agents for @mentions (moved up before thread management)
  const onlineAgents = useProjectOnlineAgents(project?.dTag);

  // Thread management
  const threadManagement = useThreadManagement(
    project,
    localRootEvent,
    extraTags,
    onThreadCreated,
    onlineAgents,
    replyingTo
  );
  const { sendMessage } = threadManagement;

  // Message management
  const messages = useChatMessages(localRootEvent);

  // Check if the root event is a task
  const isRootEventTask = localRootEvent?.kind === NDKTask.kind;

  // Scroll management
  const scrollProps = useChatScroll(messages);

  // Input management - always include all projects
  const inputProps = useChatInput(
    project,
    localRootEvent,
    onlineAgents, // Pass the agents here
    textareaRef, // Pass the textareaRef
    true,
  );

  // Update threadManagement's localRootEvent when our localRootEvent state changes
  useEffect(() => {
    threadManagement.setLocalRootEvent(localRootEvent);
  }, [localRootEvent, threadManagement]);

  // Stable callback for sending messages - only pass what ChatInputArea needs
  const handleSendMessage = useCallback(
    async (content: string, mentions: AgentInstance[], imageUploads: { url: string; metadata?: unknown }[], targetAgent: string | null) => {
      if (!ndk || !user) {
        console.error('ChatInterface: Cannot send message without NDK or user');
        return;
      }

      try {
        await sendMessage(content, mentions, imageUploads, autoTTS, messages, targetAgent);
        
        // Clear reply context after sending
        if (replyingTo) {
          clearReply();
        }

        // Auto-scroll to bottom after sending
        setTimeout(() => {
          scrollProps.scrollToBottom(true);
        }, 100);
      } catch {
        toast.error("Failed to send message");
      }
    },
    [ndk, user, sendMessage, autoTTS, messages, scrollProps, replyingTo, clearReply]
  );

  // Handle voice dialog completion
  const handleVoiceComplete = useCallback(
    async (data: { transcription: string }) => {
      if (data.transcription.trim()) {
        inputProps.setMessageInput(data.transcription);
        // Voice sends need to build content and extract mentions
        const content = data.transcription;
        const mentions = inputProps.mentionProps.extractMentions(content);
        const completedUploads = inputProps.getCompletedUploads();
        const imageUploads = completedUploads
          .filter((upload) => upload.url !== undefined)
          .map((upload) => ({
            url: upload.url,
            metadata: upload.metadata,
          }));
        await handleSendMessage(content, mentions, imageUploads, null);
        inputProps.clearInput();
      }
    },
    [inputProps, handleSendMessage],
  );

  // Enhanced back handler with navigation stack
  const handleBackWithStack = useCallback(() => {
    // Check if we can go back in the navigation stack
    if (canGoBack()) {
      const previousEvent = popFromStack();
      if (previousEvent) {
        // Don't call onBack, just navigate within the chat
        return;
      }
    }
    
    // If no stack history, use original onBack behavior
    if (onBack) {
      setNavigationStack([]);
      onBack();
    }
  }, [canGoBack, popFromStack, onBack]);

  const isNewThread = !localRootEvent;

  return (
    <ChatDropZone
      className={cn("flex flex-col h-full overflow-hidden", className)}
    >
      <div
        className="flex flex-col h-full items-stretch"
        style={{
          paddingBottom: isKeyboardVisible ? keyboardHeight : 0,
          transition: "padding-bottom 0.3s ease-in-out",
        }}
      >
        {/* Header */}
        <ChatHeader
          rootEvent={localRootEvent}
          onBack={handleBackWithStack}
          onDetach={onDetach}
          messages={messages}
          project={project}
          onVoiceCallClick={onVoiceCallClick}
        />

        {/* Messages Area */}
        <ChatMessageList
          messages={messages}
          project={project}
          ndk={ndk ?? undefined}
          scrollAreaRef={scrollProps.scrollAreaRef}
          showScrollToBottom={scrollProps.showScrollToBottom}
          unreadCount={scrollProps.unreadCount}
          scrollToBottom={scrollProps.scrollToBottom}
          onScroll={scrollProps.handleScroll}
          onTaskClick={onTaskClick}
          onReplyFocus={() => textareaRef.current?.focus()}
          isNewThread={isNewThread}
          isRootEventTask={isRootEventTask}
          autoTTS={autoTTS}
          currentUserPubkey={user?.pubkey}
          onNavigate={pushToStack}
        />

        {/* Input Area - manages its own voice dialog */}
        <ChatInputArea
          project={project}
          inputProps={inputProps}
          textareaRef={textareaRef}
          onSend={handleSendMessage}
          isNewThread={isNewThread}
          showVoiceButton={!isMobile}
          canSend={!!ndk && !!user}
          localRootEvent={localRootEvent}
          onVoiceComplete={handleVoiceComplete}
          onlineAgents={onlineAgents}
          recentMessages={messages}
        />
      </div>
    </ChatDropZone>
  );
}

/**
 * Refactored ChatInterface component
 * Now serves as an orchestrator, delegating responsibilities to specialized components and hooks
 */
export function ChatInterface({
  ...props
}: ChatInterfaceProps) {

  return (
    <ReplyProvider>
      <ChatInterfaceInner {...props} />
    </ReplyProvider>
  );
}
