import { memo } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { Message } from "./Message";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import { useChatMessages } from "./hooks/useChatMessages";
import { isBrainstormMessage } from "@/lib/utils/brainstorm";
import { useBrainstormView } from "@/stores/brainstorm-view-store";
import { calculateMessageProperties } from "./utils/messageUtils";

interface FlattenedConversationProps {
  conversationEvent: NDKEvent;
  project?: NDKProject | null;
  onTimeClick?: (event: NDKEvent) => void;
  onConversationNavigate?: (event: NDKEvent) => void;
}

/**
 * Renders a conversation in flattened mode where all messages are shown chronologically
 */
export const FlattenedConversation = memo(function FlattenedConversation({
  conversationEvent,
  project,
  onTimeClick,
  onConversationNavigate,
}: FlattenedConversationProps) {
  // Check if this is a brainstorm conversation
  const isBrainstormConversation = isBrainstormMessage(conversationEvent);
  const { showNotChosen } = useBrainstormView();

  // Get all messages in the conversation
  const messages = useChatMessages(
    conversationEvent,
    'flattened',
    isBrainstormConversation,
    isBrainstormConversation ? showNotChosen : false
  );

  // Include the root event as the first message
  const allMessages = [
    { id: conversationEvent.id, event: conversationEvent },
    ...messages
  ];

  // Calculate display properties for all messages
  const messageProperties = calculateMessageProperties(allMessages);

  return (
    <>
      {messageProperties.map(({ message, isConsecutive, hasNextConsecutive, isLastReasoningMessage }) => (
        <Message
          key={message.id}
          event={message.event}
          project={project}
          isConsecutive={isConsecutive}
          hasNextConsecutive={hasNextConsecutive}
          isNested={false}
          onTimeClick={onTimeClick}
          onConversationNavigate={onConversationNavigate}
          message={message}
          isLastMessage={isLastReasoningMessage}
        />
      ))}
    </>
  );
});