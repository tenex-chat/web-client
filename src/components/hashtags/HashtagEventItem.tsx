import * as React from 'react';
import type { NDKEvent } from '@nostr-dev-kit/ndk-hooks';
import { useUser, useProfileValue } from '@nostr-dev-kit/ndk-hooks';
import { nip19 } from 'nostr-tools';
import { formatRelativeTime } from '@/lib/utils/time';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Hash, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HashtagEventItemProps {
  event: NDKEvent;
  hashtags: string[];
  onClick?: () => void;
}

export const HashtagEventItem = React.memo(function HashtagEventItem({ 
  event, 
  hashtags, 
  onClick 
}: HashtagEventItemProps) {
  const user = useUser(event.pubkey);
  const profile = useProfileValue(user);
  
  // Format author display name
  const authorName = React.useMemo(() => {
    if (profile?.displayName || profile?.name) {
      return profile.displayName || profile.name;
    }
    try {
      const npub = nip19.npubEncode(event.pubkey);
      return `${npub.slice(0, 8)}...${npub.slice(-4)}`;
    } catch {
      return 'Unknown';
    }
  }, [profile, event.pubkey]);

  // Format event ID for display
  const eventId = React.useMemo(() => {
    try {
      const note = nip19.noteEncode(event.id);
      return `${note.slice(0, 12)}...`;
    } catch {
      return event.id.slice(0, 8) + '...';
    }
  }, [event.id]);

  // Highlight matching hashtags in content
  const highlightedContent = React.useMemo(() => {
    let content = event.content;
    
    // Truncate content if too long
    if (content.length > 280) {
      content = content.slice(0, 280) + '...';
    }

    // Highlight hashtags
    hashtags.forEach(tag => {
      const regex = new RegExp(`#${tag}\\b`, 'gi');
      content = content.replace(regex, (match) => `__HIGHLIGHT_START__${match}__HIGHLIGHT_END__`);
    });

    // Split and map to elements
    const parts = content.split(/(__HIGHLIGHT_START__|__HIGHLIGHT_END__)/);
    const elements: React.ReactNode[] = [];
    let isHighlighted = false;

    parts.forEach((part, index) => {
      if (part === '__HIGHLIGHT_START__') {
        isHighlighted = true;
      } else if (part === '__HIGHLIGHT_END__') {
        isHighlighted = false;
      } else if (part) {
        elements.push(
          isHighlighted ? (
            <span key={index} className="bg-primary/20 text-primary font-medium px-0.5 rounded">
              {part}
            </span>
          ) : (
            <span key={index}>{part}</span>
          )
        );
      }
    });

    return elements;
  }, [event.content, hashtags]);

  // Get event hashtags
  const eventHashtags = React.useMemo(() => {
    return event.tags
      .filter(tag => tag[0] === 't')
      .map(tag => tag[1])
      .slice(0, 3); // Show max 3 tags
  }, [event.tags]);

  return (
    <div
      className={cn(
        "px-3 py-2.5 hover:bg-accent/50 cursor-pointer transition-colors border-b",
        "group"
      )}
      onClick={onClick}
    >
      <div className="flex gap-2.5">
        {/* Author Avatar */}
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={profile?.image || profile?.picture} alt={authorName} />
          <AvatarFallback>
            <User className="h-3.5 w-3.5" />
          </AvatarFallback>
        </Avatar>

        {/* Header */}
        <div className="flex-1 min-w-0 flex items-center">
          <div className="flex items-center gap-1.5 text-xs flex-wrap">
            <span className="font-semibold">{authorName}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              {formatRelativeTime(event.created_at || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Message Content - Now flows under avatar */}
      <div className="mt-1 text-sm text-foreground/90 break-words whitespace-pre-wrap">
        {highlightedContent}
      </div>

      {/* Hashtags */}
      {eventHashtags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mt-1.5">
          {eventHashtags.map((tag, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground"
            >
              <Hash className="h-3 w-3" />
              <span>{tag}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});