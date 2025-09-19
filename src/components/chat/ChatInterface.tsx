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
import { ChatMessages } from "./ChatMessages";
import { ChatInputArea } from "./components/ChatInputArea";
import { ReplyProvider } from "./contexts/ReplyContext";
import { useThreadViewModeStore } from "@/stores/thread-view-mode-store";
import { useChatInputFocus } from "@/stores/chat-input-focus";

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
  const { setFocusCallback } = useChatInputFocus();

  // Register focus callback
  useEffect(() => {
    setFocusCallback(() => {
      textareaRef.current?.focus();
    });
    return () => setFocusCallback(null);
  }, [setFocusCallback]);


  // Local navigation state
  const [navigationStack, setNavigationStack] = useState<NDKEvent[]>([]);
  const [localRootEvent, setLocalRootEvent] = useState<NDKEvent | null>(
    rootEvent || null,
  );
  const [prefilledContent, setPrefilledContent] = useState<string>("");

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

  // Thread view mode
  const { mode: viewMode } = useThreadViewModeStore();

  // Message management
  const messages = useChatMessages(localRootEvent, viewMode);

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


  // Handle navigation to parent event
  const handleNavigateToParent = useCallback(async (parentId: string) => {
    if (!ndk) return;
    
    try {
      // Fetch the parent event
      const parentEvent = await ndk.fetchEvent(parentId);
      if (parentEvent) {
        // Push current event to navigation stack
        if (localRootEvent) {
          setNavigationStack(prev => [...prev, localRootEvent]);
        }
        // Set the parent as the new root event
        setLocalRootEvent(parentEvent);
      }
    } catch (error) {
      console.error("Failed to fetch parent event:", error);
    }
  }, [ndk, localRootEvent]);

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
          onNavigateToParent={handleNavigateToParent}
        />

        {/* Messages Area */}
        {localRootEvent ? (
          <ChatMessages
            project={project}
            conversationEvent={localRootEvent}
            scrollAreaRef={scrollProps.scrollAreaRef}
            showScrollToBottom={scrollProps.showScrollToBottom}
            unreadCount={scrollProps.unreadCount}
            scrollToBottom={scrollProps.scrollToBottom}
            onScroll={scrollProps.handleScroll}
            onNavigate={pushToStack}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            {isNewThread ? "Start a new conversation" : "Loading conversation..."}
          </div>
        )}

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
          textareaRef={textareaRef}
          initialContent={prefilledContent}
          onContentUsed={() => setPrefilledContent("")}
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
