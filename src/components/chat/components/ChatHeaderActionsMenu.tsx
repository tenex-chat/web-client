import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { GenerateTitleButton } from "./actions/GenerateTitleButton";
import { SummarizeButton } from "./actions/SummarizeButton";
import { ToggleViewButton } from "./actions/ToggleViewButton";
import { CopyThreadButtons } from "./actions/CopyThreadButtons";
import type { Message } from "@/components/chat/hooks/useChatMessages";
import type { NDKEvent } from "@nostr-dev-kit/ndk-hooks";

interface ChatHeaderActionsMenuProps {
  rootEvent: NDKEvent;
  messages: Message[];
}

/**
 * Actions menu for the chat header
 * Contains all thread-related actions in a dropdown
 */
export function ChatHeaderActionsMenu({
  rootEvent,
  messages,
}: ChatHeaderActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 sm:w-9 sm:h-9 hover:bg-accent"
          aria-label="Thread options"
        >
          <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <GenerateTitleButton 
          rootEventId={rootEvent.id} 
          messages={messages} 
        />
        <SummarizeButton 
          rootEventId={rootEvent.id} 
          messages={messages} 
        />
        <ToggleViewButton />
        <DropdownMenuSeparator />
        <CopyThreadButtons 
          messages={messages}
          rootEvent={rootEvent}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}