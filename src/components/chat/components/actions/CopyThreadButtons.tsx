import { useState } from "react";
import { Copy, FileJson, Check } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useNDK, useSubscribe, NDKKind } from "@nostr-dev-kit/ndk-hooks";
import { toast } from "sonner";
import type { Message } from "@/components/chat/hooks/useChatMessages";
import type { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import {
  formatThreadAsMarkdown,
  formatThreadAsJSON,
  formatThreadAsJSONL,
} from "@/components/chat/utils/copyThread";

interface CopyThreadButtonsProps {
  messages: Message[];
  rootEvent: NDKEvent | null;
}

export function CopyThreadButtons({ messages, rootEvent }: CopyThreadButtonsProps) {
  const [copiedFormat, setCopiedFormat] = useState<"markdown" | "json" | "jsonl" | null>(null);
  const { ndk } = useNDK();

  // Subscribe to ALL thread replies for copying functionality
  // This data is only needed when copying, so it lives here
  const { events: allThreadReplies } = useSubscribe(
    rootEvent && messages.length > 0
      ? [
          {
            kinds: [NDKKind.GenericReply],
            "#E": [rootEvent.id], // Get all events that reference this thread root
          },
        ]
      : false,
    { closeOnEose: false, groupable: true },
    [rootEvent?.id],
  );

  const handleCopy = async (format: "markdown" | "json" | "jsonl") => {
    try {
      let content: string;
      if (format === "json") {
        content = await formatThreadAsJSON(
          messages,
          rootEvent,
          allThreadReplies || [],
          ndk || undefined,
        );
      } else if (format === "jsonl") {
        content = await formatThreadAsJSONL(
          messages,
          rootEvent,
          allThreadReplies || [],
        );
      } else {
        content = await formatThreadAsMarkdown(
          messages,
          rootEvent,
          allThreadReplies || [],
          ndk || undefined,
        );
      }
      await navigator.clipboard.writeText(content);
      setCopiedFormat(format);
      setTimeout(() => setCopiedFormat(null), 2000);
    } catch {
      toast.error(`Failed to copy thread as ${format}`);
    }
  };

  return (
    <>
      <DropdownMenuItem
        onClick={() => handleCopy("markdown")}
        className="cursor-pointer"
      >
        <Copy className="w-4 h-4 mr-2" />
        Copy as Markdown
        {copiedFormat === "markdown" && (
          <Check className="w-4 h-4 ml-auto text-green-600" />
        )}
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => handleCopy("json")}
        className="cursor-pointer"
      >
        <FileJson className="w-4 h-4 mr-2" />
        Copy as JSON
        {copiedFormat === "json" && (
          <Check className="w-4 h-4 ml-auto text-green-600" />
        )}
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => handleCopy("jsonl")}
        className="cursor-pointer"
      >
        <FileJson className="w-4 h-4 mr-2" />
        Copy as JSONL
        {copiedFormat === "jsonl" && (
          <Check className="w-4 h-4 ml-auto text-green-600" />
        )}
      </DropdownMenuItem>
    </>
  );
}