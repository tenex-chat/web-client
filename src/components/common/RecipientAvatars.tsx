import { useProfile } from "@nostr-dev-kit/ndk-hooks"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { cn } from "@/lib/utils"
import { Link } from "@tanstack/react-router"

interface RecipientAvatarsProps {
  pubkeys: string[]
  className?: string
  avatarClassName?: string
  maxDisplay?: number
}

function RecipientAvatar({ pubkey }: { pubkey: string }) {
  const profile = useProfile(pubkey)
  
  const displayName = profile?.displayName || profile?.name || pubkey.slice(0, 8)
  const avatarUrl = profile?.image || profile?.picture
  const bio = profile?.about || profile?.bio
  
  const getInitials = (name: string) => {
    const words = name.split(' ')
    if (words.length >= 2) {
      return words[0][0] + words[1][0]
    }
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Link 
          to="/p/$pubkey" 
          params={{ pubkey }}
          className="block hover:opacity-80 transition-opacity"
        >
          <Avatar className="w-5 h-5 border border-background">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="text-[8px]">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
        </Link>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="flex gap-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="text-sm">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <h4 className="text-sm font-semibold">{displayName}</h4>
            {bio && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {bio}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {pubkey.slice(0, 8)}...{pubkey.slice(-8)}
            </p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

export function RecipientAvatars({ 
  pubkeys, 
  className,
  avatarClassName,
  maxDisplay = 3 
}: RecipientAvatarsProps) {
  if (!pubkeys || pubkeys.length === 0) return null
  
  const displayPubkeys = pubkeys.slice(0, maxDisplay)
  const remainingCount = pubkeys.length - maxDisplay
  
  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex -space-x-1">
        {displayPubkeys.map((pubkey, idx) => (
          <div 
            key={pubkey} 
            style={{ zIndex: maxDisplay - idx }}
            className={avatarClassName}
          >
            <RecipientAvatar pubkey={pubkey} />
          </div>
        ))}
      </div>
      {remainingCount > 0 && (
        <span className="ml-2 text-xs text-muted-foreground">
          +{remainingCount}
        </span>
      )}
    </div>
  )
}