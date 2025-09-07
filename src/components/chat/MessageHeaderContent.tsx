import { NDKEvent } from '@nostr-dev-kit/ndk-hooks'
import { NostrProfile } from '@/components/common/NostrProfile'
import { RecipientAvatars } from '@/components/common/RecipientAvatars'
import { formatRelativeTime, formatCompactTime } from '@/lib/utils/time'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { getPhaseIcon } from '@/lib/utils/event-metadata'
import { getPhaseColorClasses } from '@/lib/utils/phase-colors'
import { Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { EventOperationIndicator } from './EventOperationIndicator'

interface MessageHeaderContentProps {
  event: NDKEvent
  userStatus: {
    isExternal: boolean
    projectName?: string | null
  }
  recipientPubkeys: string[]
  phase?: string | null
  phaseFrom?: string | null
  onTimeClick?: (event: NDKEvent) => void
  isMobile: boolean
  hideTimestamp?: boolean
  projectId?: string
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
  projectId
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
              {userStatus.projectName || 'ext'}
            </Badge>
          )}
          {!hideTimestamp && event.created_at && (
            <button
              onClick={() => onTimeClick?.(event)}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors hover:underline"
              title={formatRelativeTime(event.created_at)}
            >
              {formatCompactTime(event.created_at)}
            </button>
          )}
          {phase && (
            <Badge 
              variant="secondary"
              className={cn(
                "text-[9px] h-4 px-1 gap-0.5",
                getPhaseColorClasses(phase)
              )}
              title={phaseFrom ? `Phase: ${phaseFrom} → ${phase}` : `Phase: ${phase}`}
            >
              {(() => {
                const IconComponent = getPhaseIcon(phase?.toLowerCase() || null)
                return IconComponent ? <IconComponent className="w-2.5 h-2.5" /> : null
              })()}
              <span>{phase}</span>
            </Badge>
          )}
          <EventOperationIndicator eventId={event.id} projectId={projectId} />
        </div>
        
        {/* Recipients on far right */}
        {recipientPubkeys.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground">→</span>
            <RecipientAvatars 
              pubkeys={recipientPubkeys}
              className="scale-75"
            />
          </div>
        )}
      </div>
    )
  }

  // Desktop layout: Original side-by-side design
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
          ({userStatus.projectName || 'external'})
        </span>
      )}
      {event.created_at && (
        <button
          onClick={() => onTimeClick?.(event)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer hover:underline"
          title="Open as root conversation"
        >
          {formatRelativeTime(event.created_at)}
        </button>
      )}
      {recipientPubkeys.length > 0 && (
        <>
          <span className="text-xs text-muted-foreground">→</span>
          <RecipientAvatars 
            pubkeys={recipientPubkeys}
            className="ml-1"
          />
        </>
      )}
      {phase && (
        <Badge 
          variant="secondary"
          className={cn(
            "text-[10px] h-5 px-1.5 gap-0.5",
            getPhaseColorClasses(phase)
          )}
          title={phaseFrom ? `Phase: ${phaseFrom} → ${phase}` : `Phase: ${phase}`}
        >
          {(() => {
            const IconComponent = getPhaseIcon(phase?.toLowerCase() || null)
            return IconComponent ? <IconComponent className="w-2.5 h-2.5" /> : null
          })()}
          <span className="ml-0.5">{phase}</span>
        </Badge>
      )}
      <EventOperationIndicator eventId={event.id} projectId={projectId} />
    </div>
  )
}