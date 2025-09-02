import { NDKEvent } from '@nostr-dev-kit/ndk-hooks'
import { ProfileDisplay } from '@/components/common/ProfileDisplay'
import { RecipientAvatars } from '@/components/common/RecipientAvatars'
import { formatRelativeTime, formatCompactTime } from '@/lib/utils/time'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { getPhaseIcon } from '@/lib/utils/event-metadata'
import { Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'

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
}

export function MessageHeaderContent({
  event,
  userStatus,
  recipientPubkeys,
  phase,
  phaseFrom,
  onTimeClick,
  isMobile,
  hideTimestamp = false
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
            <ProfileDisplay 
              pubkey={event.pubkey} 
              size="sm" 
              showName={true}
              showAvatar={false}
              nameClassName="text-[13px] font-semibold text-foreground"
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
          {!hideTimestamp && (
            <button
              onClick={() => onTimeClick?.(event)}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors hover:underline"
              title={formatRelativeTime(event.created_at!)}
            >
              {formatCompactTime(event.created_at!)}
            </button>
          )}
          {phase && (
            <Badge 
              variant="secondary"
              className={cn(
                "text-[9px] h-4 px-1 gap-0.5",
                phase?.toLowerCase() === 'chat' && "bg-blue-500/90 text-white border-blue-600",
                phase?.toLowerCase() === 'plan' && "bg-purple-500/90 text-white border-purple-600",
                phase?.toLowerCase() === 'execute' && "bg-green-500/90 text-white border-green-600",
                phase?.toLowerCase() === 'review' && "bg-orange-500/90 text-white border-orange-600",
                phase?.toLowerCase() === 'chores' && "bg-gray-500/90 text-white border-gray-600"
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
        <ProfileDisplay 
          pubkey={event.pubkey} 
          size="md" 
          showName={true}
          showAvatar={false}
          nameClassName="text-sm font-semibold text-foreground"
        />
      </Link>
      {userStatus.isExternal && (
        <span className="text-xs text-muted-foreground">
          ({userStatus.projectName || 'external'})
        </span>
      )}
      <button
        onClick={() => onTimeClick?.(event)}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer hover:underline"
        title="Open as root conversation"
      >
        {formatRelativeTime(event.created_at!)}
      </button>
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
            phase?.toLowerCase() === 'chat' && "bg-blue-500/90 text-white border-blue-600",
            phase?.toLowerCase() === 'plan' && "bg-purple-500/90 text-white border-purple-600",
            phase?.toLowerCase() === 'execute' && "bg-green-500/90 text-white border-green-600",
            phase?.toLowerCase() === 'review' && "bg-orange-500/90 text-white border-orange-600",
            phase?.toLowerCase() === 'chores' && "bg-gray-500/90 text-white border-gray-600"
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
    </div>
  )
}