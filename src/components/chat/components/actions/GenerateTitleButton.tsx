import { useState } from "react";
import { Type } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useConversationUpdater } from "@/hooks/useConversationUpdater";
import { useAI } from "@/hooks/useAI";
import { toast } from "sonner";
import type { Message } from "@/components/chat/hooks/useChatMessages";

interface GenerateTitleButtonProps {
  rootEventId: string;
  messages: Message[];
}

export function GenerateTitleButton({ rootEventId, messages }: GenerateTitleButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { generateTitle, hasTitleProvider } = useAI();
  const { updateTitle } = useConversationUpdater(rootEventId);

  const handleGenerateTitle = async () => {
    if (!hasTitleProvider) {
      toast.error("Cannot generate title: no title generation LLM configured");
      return;
    }

    setIsGenerating(true);
    try {
      const messageContents = messages
        .slice(0, 5)
        .map(m => m.event.content || "")
        .filter(c => c.length > 0);

      if (messageContents.length === 0) {
        toast.error("No message content to generate title from");
        return;
      }

      const generatedTitle = await generateTitle(messageContents);
      await updateTitle(generatedTitle);
    } catch (error) {
      console.error("Error generating title:", error);
      toast.error("Failed to generate title");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <DropdownMenuItem
      onClick={handleGenerateTitle}
      disabled={isGenerating || !hasTitleProvider}
      className="cursor-pointer"
    >
      <Type className="w-4 h-4 mr-2" />
      {isGenerating ? "Generating..." : "Add Title"}
    </DropdownMenuItem>
  );
}