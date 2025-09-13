import { useState, useEffect, useRef, useCallback } from "react";
import { useNDK, useNDKCurrentUser } from "@nostr-dev-kit/ndk-hooks";
import { cn } from "@/lib/utils";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useProjectOnlineAgents } from "@/hooks/useProjectOnlineAgents";
import { ChatDropZone } from "./ChatDropZone";
import type { NDKProject } from "@/lib/ndk-events/NDKProject";
import type { NDKEvent } from "@nostr-dev-kit/ndk-hooks";

// Import new hooks and components
import { useChatMessages } from "./hooks/useChatMessages";
import { useChatScroll } from "./hooks/useChatScroll";
import { ChatHeader } from "./components/ChatHeader";
import { ChatMessageList } from "./components/ChatMessageList";
import { ChatInputArea } from "./components/ChatInputArea";
import { useAI } from "@/hooks/useAI";
import { ReplyProvider } from "./contexts/ReplyContext";

interface ChatInterfaceProps {
  project?: NDKProject | null;
  rootEvent?: NDKEvent;
  extraTags?: string[][];
  className?: string;
  onBack?: () => void;
  onDetach?: () => void;
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
  onThreadCreated,
  onVoiceCallClick,
}: ChatInterfaceProps) {
  const { ndk } = useNDK();
  const user = useNDKCurrentUser();
  const isMobile = useIsMobile();
  const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // TTS state
  const { voiceSettings } = useAI();
  const autoTTS = voiceSettings.autoSpeak;

  // Local navigation state
  const [navigationStack, setNavigationStack] = useState<NDKEvent[]>([]);
  const [localRootEvent, setLocalRootEvent] = useState<NDKEvent | null>(
    rootEvent || null,
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
  const pushToStack = useCallback(
    (event: NDKEvent) => {
      if (localRootEvent && localRootEvent.id !== event.id) {
        setNavigationStack((prev) => [...prev, localRootEvent]);
      }
      setLocalRootEvent(event);
    },
    [localRootEvent],
  );

  const popFromStack = useCallback(() => {
    if (navigationStack.length > 0) {
      const previous = navigationStack[navigationStack.length - 1];
      setNavigationStack((prev) => prev.slice(0, -1));
      setLocalRootEvent(previous);
      return previous;
    }
    return null;
  }, [navigationStack]);

  const canGoBack = useCallback(() => {
    return navigationStack.length > 0;
  }, [navigationStack]);

  // Get ONLINE agents for @mentions
  const onlineAgents = useProjectOnlineAgents(project?.dTag);

  // Message management
  const messages = useChatMessages(localRootEvent);

  // Scroll management
  const scrollProps = useChatScroll(messages);

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

  // Handle thread creation (when ChatInputArea creates a new thread)
  const handleThreadCreated = useCallback(
    (thread: NDKEvent) => {
      setLocalRootEvent(thread);
      if (onThreadCreated) {
        onThreadCreated(thread);
      }
    },
    [onThreadCreated],
  );

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
          scrollAreaRef={scrollProps.scrollAreaRef}
          showScrollToBottom={scrollProps.showScrollToBottom}
          unreadCount={scrollProps.unreadCount}
          scrollToBottom={scrollProps.scrollToBottom}
          onScroll={scrollProps.handleScroll}
          onReplyFocus={() => textareaRef.current?.focus()}
          isNewThread={isNewThread}
          autoTTS={autoTTS}
          currentUserPubkey={user?.pubkey}
          onNavigate={pushToStack}
        />

        {/* Input Area - fully autonomous, publishes directly to Nostr */}
        <ChatInputArea
          project={project}
          rootEvent={localRootEvent}
          extraTags={extraTags}
          onlineAgents={onlineAgents}
          recentMessages={messages}
          disabled={!ndk || !user}
          showVoiceButton={!isMobile}
          onThreadCreated={handleThreadCreated}
        />
      </div>
    </ChatDropZone>
  );
}

/**
 * Refactored ChatInterface component
 * Now serves as a pure orchestrator with no input state management
 */
export function ChatInterface({ ...props }: ChatInterfaceProps) {
  return (
    <ReplyProvider>
      <ChatInterfaceInner {...props} />
    </ReplyProvider>
  );
}
