import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNDK, useNDKCurrentUser } from "@nostr-dev-kit/ndk-hooks";
import { useAtom } from "jotai";
import { cn } from "@/lib/utils";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useProjectOnlineAgents } from "@/hooks/useProjectOnlineAgents";
import { useMurfTTS } from "@/hooks/useMurfTTS";
import { useAgentTTSConfig } from "@/hooks/useAgentTTSConfig";
import { extractTTSContent } from "@/lib/utils/extractTTSContent";
import { isAudioEvent } from "@/lib/utils/audioEvents";
import { VoiceDialog } from "@/components/dialogs/VoiceDialog";
import { ImageUploadQueue } from "@/components/upload/ImageUploadQueue";
import { ChatDropZone } from "./ChatDropZone";
import { motion, AnimatePresence } from "framer-motion";
import type { NDKProject } from "@/lib/ndk-events/NDKProject";
import { NDKTask } from "@/lib/ndk-events/NDKTask";
import type { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { useChatNavigationStore } from "@/stores/chatNavigation";

// Import new hooks and components
import { useChatMessages } from "./hooks/useChatMessages";
import { useChatScroll } from "./hooks/useChatScroll";
import { useChatInput } from "./hooks/useChatInput";
import {
  useThreadManagement,
  type AgentMention,
} from "./hooks/useThreadManagement";
import { ChatHeader } from "./components/ChatHeader";
import { ChatMessageList } from "./components/ChatMessageList";
import { ChatInputArea } from "./components/ChatInputArea";
import { autoTTSAtom } from "@/stores/llmConfig";

interface ChatInterfaceProps {
  project: NDKProject;
  rootEvent?: NDKEvent;
  extraTags?: string[][];
  className?: string;
  onBack?: () => void;
  onTaskClick?: (task: NDKTask) => void;
  onThreadCreated?: (thread: NDKEvent) => void;
}

type AgentInstance = AgentMention;

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
}: ChatInterfaceProps) {
  const { ndk } = useNDK();
  const user = useNDKCurrentUser();
  const isMobile = useIsMobile();
  const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Navigation store
  const navigationStore = useChatNavigationStore();
  const projectId = project.dTag || '';

  // State for voice and TTS
  const [isVoiceDialogOpen, setIsVoiceDialogOpen] = useState(false);
  const [autoTTS, setAutoTTS] = useAtom(autoTTSAtom);
  const [lastPlayedMessageId, setLastPlayedMessageId] = useState<string | null>(
    null,
  );

  // Use navigation store to track current root event
  const [localRootEvent, setLocalRootEvent] = useState<NDKEvent | null>(
    rootEvent || navigationStore.getCurrentRoot(projectId) || null
  );

  // Update local root when rootEvent prop changes
  useEffect(() => {
    if (rootEvent) {
      setLocalRootEvent(rootEvent);
      navigationStore.setCurrentRoot(projectId, rootEvent);
    }
  }, [rootEvent, projectId]);

  // Clear navigation stack when switching projects
  useEffect(() => {
    return () => {
      // Clear navigation when unmounting (switching projects)
      navigationStore.clearStack(projectId);
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
  const onlineAgents = useProjectOnlineAgents(project.dTag);
  const projectAgents: AgentInstance[] = useMemo(() => {
    return onlineAgents.map((agent) => ({
      pubkey: agent.pubkey,
      name: agent.name,
    }));
  }, [onlineAgents]);

  // Input management - always include all projects
  const inputProps = useChatInput(
    project,
    localRootEvent,
    projectAgents,
    textareaRef,
    true,
  );

  // TTS configuration
  const ttsOptions = useAgentTTSConfig();
  const tts = useMurfTTS(
    ttsOptions || { apiKey: "", voiceId: "", enabled: false },
  );

  // Update localRootEvent when rootEvent prop changes
  useEffect(() => {
    threadManagement.setLocalRootEvent(rootEvent || null);
  }, [rootEvent, threadManagement]);

  // Auto-play new messages when auto-TTS is enabled
  useEffect(() => {
    if (!autoTTS || !ttsOptions || messages.length === 0) return;

    const latestMessage = messages[messages.length - 1];

    // Don't play messages from the current user
    if (latestMessage.event.pubkey === user?.pubkey) return;

    // Don't play the same message twice
    if (latestMessage.id === lastPlayedMessageId) return;

    // Don't play audio messages (they have their own player)
    if (isAudioEvent(latestMessage.event)) return;

    // Extract and play TTS content
    const ttsContent = extractTTSContent(latestMessage.event.content);
    if (ttsContent && !tts.isPlaying) {
      tts.play(ttsContent).catch((error) => {
        console.error("TTS playback failed:", error);
      });
      setLastPlayedMessageId(latestMessage.id);
    }
  }, [messages, autoTTS, ttsOptions, lastPlayedMessageId, user?.pubkey, tts]);

  // Handle sending messages
  const handleSendMessage = useCallback(async () => {
    if (
      !ndk ||
      !user ||
      (!inputProps.messageInput.trim() &&
        inputProps.pendingImageUrls.length === 0)
    )
      return;

    try {
      const content = inputProps.buildMessageContent();
      const mentions = inputProps.mentionProps.extractMentions(content);
      const completedUploads = inputProps.getCompletedUploads();

      const imageUploads = completedUploads.map((upload) => ({
        url: upload.url!,
        metadata: upload.metadata,
      }));

      await sendMessage(content, mentions, imageUploads, autoTTS, messages);

      inputProps.clearInput();

      // Auto-scroll to bottom after sending
      setTimeout(() => {
        scrollProps.scrollToBottom(true);
      }, 100);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  }, [ndk, user, inputProps, sendMessage, autoTTS, messages, scrollProps]);

  // Handle voice dialog completion
  const handleVoiceComplete = useCallback(
    async (data: { transcription: string }) => {
      if (data.transcription.trim()) {
        inputProps.setMessageInput(data.transcription);
        await handleSendMessage();
      }
    },
    [inputProps, handleSendMessage],
  );

  // Handle clicking on a message timestamp to open it as root
  const handleTimeClick = useCallback((event: NDKEvent) => {
    // Push current root to stack and set new root
    navigationStore.pushToStack(projectId, event);
    setLocalRootEvent(event);
    // Scroll to top when changing root
    setTimeout(() => {
      scrollProps.scrollToBottom(false);
    }, 100);
  }, [projectId, navigationStore, scrollProps]);

  // Enhanced back handler with navigation stack
  const handleBackWithStack = useCallback(() => {
    // Check if we can go back in the navigation stack
    if (navigationStore.canGoBack(projectId)) {
      const previousEvent = navigationStore.popFromStack(projectId);
      if (previousEvent) {
        setLocalRootEvent(previousEvent);
        // Don't call onBack, just navigate within the chat
        return;
      }
    }
    
    // If no stack history, use original onBack behavior
    if (onBack) {
      navigationStore.clearStack(projectId);
      onBack();
    }
  }, [navigationStore, projectId, onBack]);

  // Focus textarea on reply
  const handleReplyFocus = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

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
          ttsEnabled={!!ttsOptions}
          messages={messages}
          project={project}
        />

        {/* Messages Area */}
        <ChatMessageList
          messages={messages}
          project={project}
          ndk={ndk || undefined}
          scrollAreaRef={scrollProps.scrollAreaRef}
          showScrollToBottom={scrollProps.showScrollToBottom}
          unreadCount={scrollProps.unreadCount}
          scrollToBottom={scrollProps.scrollToBottom}
          onScroll={scrollProps.handleScroll}
          onTaskClick={onTaskClick}
          onReplyFocus={handleReplyFocus}
          isNewThread={isNewThread}
          isRootEventTask={isRootEventTask}
          onTimeClick={handleTimeClick}
        />

        {/* Input Area */}
        <ChatInputArea
          textareaRef={textareaRef}
          messageInput={inputProps.messageInput}
          setMessageInput={inputProps.setMessageInput}
          pendingImageUrls={inputProps.pendingImageUrls}
          removeImageUrl={inputProps.removeImageUrl}
          uploadQueue={inputProps.uploadQueue}
          uploadFiles={inputProps.uploadFiles}
          handlePaste={inputProps.handlePaste}
          cancelUpload={inputProps.cancelUpload}
          retryUpload={inputProps.retryUpload}
          setShowUploadProgress={inputProps.setShowUploadProgress}
          mentionProps={inputProps.mentionProps}
          onSend={handleSendMessage}
          onVoiceClick={() => setIsVoiceDialogOpen(true)}
          isNewThread={isNewThread}
          showVoiceButton={!isMobile}
        />

        {/* Voice Dialog */}
        <VoiceDialog
          open={isVoiceDialogOpen}
          onOpenChange={setIsVoiceDialogOpen}
          onComplete={handleVoiceComplete}
          conversationId={localRootEvent?.id}
          projectId={project.tagId()}
          publishAudioEvent={true}
        />

        {/* Upload Queue Overlay */}
        <AnimatePresence>
          {inputProps.showUploadProgress &&
            inputProps.uploadStats.total > 0 && (
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
