import { StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEventOperationStatus } from "@/hooks/useEventOperationStatus";
import { stopConversation } from "@/lib/ndk-events/operations";
import { useNDK } from "@nostr-dev-kit/ndk-hooks";

interface ConversationStopButtonProps {
  conversationRootId: string;
  projectId: string;
  size?: "sm" | "default" | "icon";
}

/**
 * Optional conversation-level stop button
 * Only shows when there are active operations for the conversation
 */
export function ConversationStopButton({
  conversationRootId,
  projectId,
  size = "icon",
}: ConversationStopButtonProps) {
  const { ndk } = useNDK();
  const { hasActiveOperations } = useEventOperationStatus(
    conversationRootId,
    projectId,
  );

  if (!hasActiveOperations) return null;

  const handleStop = () => {
    if (ndk) {
      stopConversation(ndk, projectId, conversationRootId);
    }
  };

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleStop}
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
      title="Stop all operations"
    >
      <StopCircle className="h-4 w-4" />
    </Button>
  );
}
