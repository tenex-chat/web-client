import React, { useMemo } from "react";
import { MessageSquare, FileText, Hash, Bot, Phone } from "lucide-react";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk-hooks";
import { useUser, useProfileValue } from "@nostr-dev-kit/ndk-hooks";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/utils/time";
import { useConversationTitleForEvent } from "@/hooks/useConversationTitleForEvent";
interface EventItemProps {
  event: NDKEvent;
  onClick?: () => void;
}

export const EventItem: React.FC<EventItemProps> = ({
  event,
  onClick
}) => {
  const user = useUser(event.pubkey);
  const profile = useProfileValue(user);
  const conversationTitle = useConversationTitleForEvent(event);

  // Format author display name
  const authorName = useMemo(() => {
    if (profile?.displayName || profile?.name) {
      return profile.displayName || profile.name;
    }
  }, [profile, event.pubkey]);

  // Determine event type and rendering details based on actual kind
  const { icon, label, title } = useMemo(() => {
    // Show the actual event content, NOT the conversation title
    switch (event.kind) {
      case NDKKind.Text: // kind 1 - text note
        return {
          icon: <MessageSquare className="h-3.5 w-3.5" />,
          label: "Note",
          title: event.content.length > 100
            ? event.content.slice(0, 100) + "..."
            : event.content
        };

      case NDKKind.Article: // kind 30023 - long-form content
        return {
          icon: <FileText className="h-3.5 w-3.5" />,
          label: "Article",
          title: event.tagValue("title") || event.tagValue("name") || "Untitled"
        };

      case 1111: // kind 1111 - generic reply
        return {
          icon: <MessageSquare className="h-3.5 w-3.5" />,
          label: "Reply",
          title: event.content.length > 100
            ? event.content.slice(0, 100) + "..."
            : event.content
        };

      case 29000: // kind 29000 - call event
        return {
          icon: <Phone className="h-3.5 w-3.5" />,
          label: "Call",
          title: event.tagValue("subject") || "Voice Call"
        };

      case 1905: // kind 1905 - agent event
      case 31905: // kind 31905 - agent definition
        return {
          icon: <Bot className="h-3.5 w-3.5" />,
          label: "Agent",
          title: event.tagValue("name") || "Agent Activity"
        };

      default:
        return {
          icon: <Hash className="h-3.5 w-3.5" />,
          label: `Kind ${event.kind}`,
          title: event.content?.slice(0, 100) || "Event"
        };
    }
  }, [event]);

  // Get hashtags for the event
  const hashtags = useMemo(() => {
    return event.tags
      .filter(tag => tag[0] === 't')
      .map(tag => tag[1])
      .slice(0, 3); // Show max 3 tags
  }, [event.tags]);

  return (
    <div
      className={cn(
        "px-3 py-3 hover:bg-accent/50 cursor-pointer transition-colors border-b",
        "group"
      )}
      onClick={onClick}
    >
      <div className="flex gap-3">
        {/* Author Avatar */}
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={profile?.image || profile?.picture} alt={authorName} />
          <AvatarFallback className="text-xs">
            {authorName?.slice(0, 2).toUpperCase() || 'UN'}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{authorName}</span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {icon}
              <span>{label}</span>
              <span>·</span>
              <span>{formatRelativeTime(event.created_at || 0)}</span>
            </div>
          </div>

          {/* Title/Preview - Shows actual event content */}
          <div className="text-sm text-foreground/90 break-words line-clamp-2">
            {title}
          </div>

          {/* Conversation Title if available */}
          {conversationTitle && (
            <div className="text-xs text-muted-foreground mt-1">
              {conversationTitle}
            </div>
          )}

          {/* Hashtags if present */}
          {hashtags.length > 0 && (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {hashtags.map((tag, index) => (
                <div
                  key={index}
                  className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground"
                >
                  <Hash className="h-2.5 w-2.5" />
                  <span>{tag}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};