import React from "react";
import { useUser, useProfileValue } from "@nostr-dev-kit/ndk-hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, ChevronRight } from "lucide-react";

interface AgentListItemProps {
  agent: { 
    pubkey: string; 
    slug: string; 
    status?: string; 
    lastSeen?: number;
  };
  isOnline: boolean;
  onClick: () => void;
}

export const AgentListItem = React.memo(
  ({ agent, isOnline, onClick }: AgentListItemProps) => {
    const user = useUser(agent.pubkey);
    const profile = useProfileValue(user);
    const avatarUrl = profile?.image || profile?.picture;
    const displayName =
      agent.slug || profile?.displayName || profile?.name || "Unknown Agent";

    return (
      <div
        className="flex items-start gap-3 px-3 py-2.5 hover:bg-accent/50 cursor-pointer transition-colors border-b"
        onClick={onClick}
      >
        <div className="relative">
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback>
              <Bot className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          {isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 border border-background" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{displayName}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {isOnline ? "Online" : "Offline"}
          </div>
        </div>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 mt-1.5" />
      </div>
    );
  }
);