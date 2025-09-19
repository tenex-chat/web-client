import { useState } from "react";
import { FileText } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useConversationUpdater } from "@/hooks/useConversationUpdater";
import { useAI } from "@/hooks/useAI";
import { useNDK } from "@nostr-dev-kit/ndk-hooks";
import { toast } from "sonner";
import type { Message } from "@/components/chat/hooks/useChatMessages";

interface SummarizeButtonProps {
  rootEventId: string;
  messages: Message[];
}

export function SummarizeButton({ rootEventId, messages }: SummarizeButtonProps) {
  const [isSummarizing, setIsSummarizing] = useState(false);
  const { summarizeConversation, hasSummaryProvider } = useAI();
  const { updateSummary } = useConversationUpdater(rootEventId);
  const { ndk } = useNDK();

  const handleSummarize = async () => {
    if (!hasSummaryProvider) {
      toast.error("Please configure a summary LLM in Settings > AI Settings > UI Features Configuration");
      return;
    }

    setIsSummarizing(true);
    try {
      const messagesToSummarize = await Promise.all(
        messages.map(async (msg) => {
          let authorName = "Unknown";
          const authorPubkey = msg.event.pubkey;
          if (authorPubkey && ndk) {
            try {
              const user = ndk.getUser({ pubkey: authorPubkey });
              await user.fetchProfile();
              authorName = user.profile?.displayName || 
                          user.profile?.name || 
                          `${authorPubkey.slice(0, 8)}...`;
            } catch (error) {
              console.warn("Failed to fetch user profile:", error);
              authorName = `${authorPubkey.slice(0, 8)}...`;
            }
          }
          return {
            author: authorName,
            content: msg.event.content || "",
            timestamp: msg.event.created_at
          };
        })
      );

      if (messagesToSummarize.length === 0) {
        toast.error("No message content to summarize");
        return;
      }

      const summary = await summarizeConversation(messagesToSummarize);
      if (summary) {
        await updateSummary(summary);
      }
    } catch (error) {
      console.error("Error generating summary:", error);
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <DropdownMenuItem
      onClick={handleSummarize}
      disabled={isSummarizing || !hasSummaryProvider}
      className="cursor-pointer"
    >
      <FileText className="w-4 h-4 mr-2" />
      {isSummarizing ? "Summarizing..." : "Summarize"}
    </DropdownMenuItem>
  );
}