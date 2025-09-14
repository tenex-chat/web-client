import React, { memo, useMemo } from 'react';
import { NDKEvent } from '@nostr-dev-kit/ndk';
import { useProfile } from '@nostr-dev-kit/ndk-react';
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

export const HashtagEventItem = memo(function HashtagEventItem({ 
  event, 
  hashtags, 
  onClick 
}: HashtagEventItemProps) {
  const profile = useProfile(event.pubkey);
  
  // Format author display name
  const authorName = useMemo(() => {
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
  const eventId = useMemo(() => {
    try {
      const note = nip19.noteEncode(event.id);
      return `${note.slice(0, 12)}...`;
    } catch {
      return event.id.slice(0, 8) + '...';
    }
  }, [event.id]);

  // Highlight matching hashtags in content
  const highlightedContent = useMemo(() => {
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
  const eventHashtags = useMemo(() => {
    return event.tags
      .filter(tag => tag[0] === 't')
      .map(tag => tag[1])
      .slice(0, 3); // Show max 3 tags
  }, [event.tags]);

  return (
    <div
      className={cn(
        "flex gap-3 px-3 py-3 hover:bg-accent/50 cursor-pointer transition-colors border-b",
        "group"
      )}
      onClick={onClick}
    >
      {/* Author Avatar */}
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={profile?.image || profile?.picture} alt={authorName} />
        <AvatarFallback>
          <User className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Header */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium truncate">{authorName}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">
            {formatRelativeTime(event.created_at || 0)}
          </span>
          <span className="text-muted-foreground ml-auto text-[10px] font-mono">
            {eventId}
          </span>
        </div>

        {/* Message Content */}
        <div className="text-sm text-foreground/90 break-words whitespace-pre-wrap">
          {highlightedContent}
        </div>

        {/* Hashtags */}
        {eventHashtags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {eventHashtags.map((tag, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"
              >
                <Hash className="h-2.5 w-2.5" />
                <span>{tag}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});