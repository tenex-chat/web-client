import { useState, useEffect, useRef, useCallback } from "react";
import { useNDK, useNDKCurrentUser } from "@nostr-dev-kit/ndk-hooks";
import { cn } from "@/lib/utils";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useProjectOnlineAgents } from "@/hooks/useProjectOnlineAgents";
import { ChatDropZone } from "./ChatDropZone";
import { motion, AnimatePresence } from "framer-motion";
import type { NDKProject } from "@/lib/ndk-events/NDKProject";
import { NDKTask } from "@/lib/ndk-events/NDKTask";
import type { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { useChatNavigationStore } from "@/stores/chatNavigation";
import { toast } from "sonner";

// Import new hooks and components
import { useChatMessages } from "./hooks/useChatMessages";
import { useChatScroll } from "./hooks/useChatScroll";
import { useChatInput } from "./hooks/useChatInput";
import { useThreadManagement } from "./hooks/useThreadManagement";
import { ChatHeader } from "./components/ChatHeader";
import { ChatMessageList } from "./components/ChatMessageList";
import { ChatInputArea } from "./components/ChatInputArea";
import { useAutoTTS } from "@/stores/ai-config-store";

interface ChatInterfaceProps {
  project?: NDKProject | null;
  rootEvent?: NDKEvent;
  extraTags?: string[][];
  className?: string;
  onBack?: () => void;
  onTaskClick?: (task: NDKTask) => void;
  onThreadCreated?: (thread: NDKEvent) => void;
  onVoiceCallClick?: () => void;
}

/**
 * Refactored ChatInterface component
 * Now serves as an orchestrator, delegating responsibilities to specialized components and hooks
 */
export function ChatInterface({
  project,
  rootEvent,
  extraTags,
  className,
  onBack,
  onTaskClick,
  onThreadCreated,
  onVoiceCallClick,
}: ChatInterfaceProps) {
  const { ndk } = useNDK();
  const user = useNDKCurrentUser();
  const isMobile = useIsMobile();
  const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Navigation store
  const navigationStore = useChatNavigationStore();
  const projectId = project?.dTag || '';

  // TTS state
  const [autoTTS, setAutoTTS] = useAutoTTS();

  // Use navigation store to track current root event
  const currentRootFromStore = navigationStore.getCurrentRoot();
  const [localRootEvent, setLocalRootEvent] = useState<NDKEvent | null>(
    rootEvent || currentRootFromStore || null
  );

  // Subscribe to navigation store changes
  useEffect(() => {
    // Update local root when store changes
    const unsubscribe = useChatNavigationStore.subscribe((state) => {
      const currentRoot = state.currentRoot;
      // Only update if it's actually different to avoid loops
      if (currentRoot && currentRoot.id !== localRootEvent?.id) {
        setLocalRootEvent(currentRoot);
      }
    });
    return unsubscribe;
  }, [localRootEvent?.id]);

  // Update local root when rootEvent prop changes
  useEffect(() => {
    if (rootEvent && rootEvent.id !== navigationStore.getCurrentRoot()?.id) {
      setLocalRootEvent(rootEvent);
      navigationStore.setCurrentRoot(rootEvent);
    }
  }, [rootEvent]);

  // Clear navigation stack when switching projects
  useEffect(() => {
    return () => {
      // Clear navigation when unmounting
      navigationStore.clearStack();
    };
  }, [projectId]);

  // Thread management
  const threadManagement = useThreadManagement(
    project,
    localRootEvent,
    extraTags,
    onThreadCreated,
  );
  const { sendMessage } = threadManagement;

  // Message management
  const messages = useChatMessages(project, localRootEvent);

  // Check if the root event is a task
  const isRootEventTask = localRootEvent?.kind === NDKTask.kind;

  // Scroll management
  const scrollProps = useChatScroll(messages);

  // Get ONLINE agents for @mentions
  const onlineAgents = useProjectOnlineAgents(project?.dTag);

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
    threadManagement.setLocalRootEvent(localRootEvent || null);
  }, [localRootEvent, threadManagement]);

  // Stable callback for sending messages - only pass what ChatInputArea needs
  const handleSendMessage = useCallback(
    async (content: string, mentions: any[], imageUploads: any[]) => {
      if (!ndk || !user) return;

      try {
        await sendMessage(content, mentions, imageUploads, autoTTS, messages);

        // Auto-scroll to bottom after sending
        setTimeout(() => {
          scrollProps.scrollToBottom(true);
        }, 100);
      } catch (error) {
        toast.error("Failed to send message");
      }
    },
    [ndk, user, sendMessage, autoTTS, messages, scrollProps]
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
        const imageUploads = completedUploads.map((upload) => ({
          url: upload.url!,
          metadata: upload.metadata,
        }));
        await handleSendMessage(content, mentions, imageUploads);
        inputProps.clearInput();
      }
    },
    [inputProps, handleSendMessage],
  );


  // Enhanced back handler with navigation stack
  const handleBackWithStack = useCallback(() => {
    // Check if we can go back in the navigation stack
    if (navigationStore.canGoBack()) {
      const previousEvent = navigationStore.popFromStack();
      if (previousEvent) {
        setLocalRootEvent(previousEvent);
        // Don't call onBack, just navigate within the chat
        return;
      }
    }
    
    // If no stack history, use original onBack behavior
    if (onBack) {
      navigationStore.clearStack();
      onBack();
    }
  }, [navigationStore, onBack]);


  console.log('rendering <ChatInterface>')

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
          autoTTS={autoTTS}
          onAutoTTSChange={setAutoTTS}
          messages={messages}
          project={project}
          onVoiceCallClick={onVoiceCallClick}
        />

        {/* Messages Area */}
        <ChatMessageList
          messages={messages}
          project={project!}
          ndk={ndk || undefined}
          scrollAreaRef={scrollProps.scrollAreaRef}
          showScrollToBottom={scrollProps.showScrollToBottom}
          unreadCount={scrollProps.unreadCount}
          scrollToBottom={scrollProps.scrollToBottom}
          onScroll={scrollProps.handleScroll}
          onTaskClick={onTaskClick}
          isNewThread={isNewThread}
          isRootEventTask={isRootEventTask}
          autoTTS={autoTTS}
          currentUserPubkey={user?.pubkey}
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
        />

      </div>
    </ChatDropZone>
  );
}
