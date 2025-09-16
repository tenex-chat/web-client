import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { NostrProfile } from "@/components/common/NostrProfile";
import { RecipientAvatars } from "@/components/common/RecipientAvatars";
import { formatRelativeTime, formatCompactTime } from "@/lib/utils/time";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getPhaseIcon } from "@/lib/utils/event-metadata";
import { getPhaseColorClasses } from "@/lib/utils/phase-colors";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Brain } from "lucide-react";
import { EventOperationIndicator } from "./EventOperationIndicator";
import { isBrainstormMessage, getBrainstormModerator } from "@/lib/utils/brainstorm";

interface MessageHeaderContentProps {
  event: NDKEvent;
  userStatus: {
    isExternal: boolean;
    projectName?: string | null;
  };
  recipientPubkeys: string[];
  phase?: string | null;
  phaseFrom?: string | null;
  onTimeClick?: (event: NDKEvent) => void;
  isMobile: boolean;
  hideTimestamp?: boolean;
  projectId?: string;
  isConsecutive?: boolean;
}

export function MessageHeaderContent({
  event,
  userStatus,
  recipientPubkeys,
  phase,
  phaseFrom,
  onTimeClick,
  isMobile,
  hideTimestamp = false,
  projectId,
  isConsecutive = false,
}: MessageHeaderContentProps) {
  if (isMobile) {
    // Mobile layout: Name + time on left, recipients on right
    return (
      <div className="flex items-center justify-between flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link
            to="/p/$pubkey"
            params={{ pubkey: event.pubkey }}
            className="hover:underline"
          >
            <NostrProfile
              pubkey={event.pubkey}
              variant="name"
              size="sm"
              className="text-[13px] font-semibold text-foreground"
            />
          </Link>
          {userStatus.isExternal && (
            <Badge
              variant="outline"
              className="h-3.5 px-1 text-[9px] border-muted text-muted-foreground"
            >
              <ExternalLink className="w-2 h-2 mr-0.5" />
              {userStatus.projectName || "ext"}
            </Badge>
          )}
          {!hideTimestamp && (
            <button
              onClick={() => {
                console.log("Time clicked! Event:", event);
                console.log("onTimeClick function exists?", !!onTimeClick);
                onTimeClick?.(event);
              }}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors hover:underline"
              title={formatRelativeTime(event.created_at || 0)}
            >
              {formatCompactTime(event.created_at || 0)}
            </button>
          )}
          {phase && (
            <Badge
              variant="secondary"
              className={cn(
                "text-[9px] h-4 px-1 gap-0.5",
                getPhaseColorClasses(phase),
              )}
              title={
                phaseFrom ? `Phase: ${phaseFrom} → ${phase}` : `Phase: ${phase}`
              }
            >
              {(() => {
                const IconComponent = getPhaseIcon(
                  phase?.toLowerCase() || null,
                );
                return IconComponent ? (
                  <IconComponent className="w-2.5 h-2.5" />
                ) : null;
              })()}
              <span>{phase}</span>
            </Badge>
          )}
          {isBrainstormMessage(event) && (
            <Badge
              variant="secondary"
              className="text-[9px] h-4 px-1 gap-0.5 bg-purple-600/20 text-purple-600 border-purple-600/30"
              title={`Brainstorm mode - Moderator: ${getBrainstormModerator(event) || 'Unknown'}`}
            >
              <Brain className="w-2.5 h-2.5" />
              <span>Brainstorm</span>
            </Badge>
          )}
          <EventOperationIndicator eventId={event.id} projectId={projectId} />
        </div>

        {/* Recipients on far right */}
        {recipientPubkeys.length > 0 && (
          <div className="flex items-center gap-1">
            <RecipientAvatars pubkeys={recipientPubkeys} className="scale-75" />
          </div>
        )}
      </div>
    );
  }

  // Desktop layout: Adjust for consecutive messages
  if (isConsecutive) {
    // For consecutive messages, show timestamp and recipients if any
    return (
      <div className="flex items-center gap-2">
        {event.created_at && (
          <button
            onClick={() => {
              console.log("Consecutive message time clicked! Event:", event);
              console.log("onTimeClick function exists?", !!onTimeClick);
              onTimeClick?.(event);
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer hover:underline"
            title="Open as root conversation"
          >
            {formatRelativeTime(event.created_at || 0)}
          </button>
        )}
        {/* Show recipients for consecutive messages with p-tags */}
        {recipientPubkeys.length > 0 && (
            <RecipientAvatars pubkeys={recipientPubkeys} className="scale-90" />
        )}
        {isBrainstormMessage(event) && (
          <Badge
            variant="secondary"
            className="text-[9px] h-4 px-1 gap-0.5 bg-purple-600/20 text-purple-600 border-purple-600/30"
            title={`Brainstorm mode - Moderator: ${getBrainstormModerator(event) || 'Unknown'}`}
          >
            <Brain className="w-2.5 h-2.5" />
            <span>Brainstorm</span>
          </Badge>
        )}
        <EventOperationIndicator eventId={event.id} projectId={projectId} />
      </div>
    );
  }

  // Original layout for first message in group
  return (
    <div className="flex items-baseline gap-2 flex-wrap flex-1">
      <Link
        to="/p/$pubkey"
        params={{ pubkey: event.pubkey }}
        className="hover:underline"
      >
        <NostrProfile
          pubkey={event.pubkey}
          variant="name"
          size="md"
          className="text-sm font-semibold text-foreground"
        />
      </Link>
      {userStatus.isExternal && (
        <span className="text-xs text-muted-foreground">
          ({userStatus.projectName || "external"})
        </span>
      )}
      {event.created_at && (
        <button
          onClick={() => {
            console.log("Desktop time clicked! Event:", event);
            console.log("onTimeClick function exists?", !!onTimeClick);
            onTimeClick?.(event);
          }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer hover:underline"
          title="Open as root conversation"
        >
          {formatRelativeTime(event.created_at)}
        </button>
      )}
      {recipientPubkeys.length > 0 && (
        <>
          <span className="text-xs text-muted-foreground">→</span>
          <RecipientAvatars pubkeys={recipientPubkeys} className="ml-1" />
        </>
      )}
      {phase && (
        <Badge
          variant="secondary"
          className={cn(
            "text-[10px] h-5 px-1.5 gap-0.5",
            getPhaseColorClasses(phase),
          )}
          title={
            phaseFrom ? `Phase: ${phaseFrom} → ${phase}` : `Phase: ${phase}`
          }
        >
          {(() => {
            const IconComponent = getPhaseIcon(phase?.toLowerCase() || null);
            return IconComponent ? (
              <IconComponent className="w-2.5 h-2.5" />
            ) : null;
          })()}
          <span className="ml-0.5">{phase}</span>
        </Badge>
      )}
      {isBrainstormMessage(event) && (
        <Badge
          variant="secondary"
          className="text-[10px] h-5 px-1.5 gap-0.5 bg-purple-600/20 text-purple-600 border-purple-600/30"
          title={`Brainstorm mode - Moderator: ${getBrainstormModerator(event) || 'Unknown'}`}
        >
          <Brain className="w-3 h-3" />
          <span className="ml-0.5">Brainstorm</span>
        </Badge>
      )}
      <EventOperationIndicator eventId={event.id} projectId={projectId} />
    </div>
  );
}
