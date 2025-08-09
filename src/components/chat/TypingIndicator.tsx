import { memo } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useProfile } from '@nostr-dev-kit/ndk-hooks'

interface TypingUser {
  pubkey: string
  name?: string
}

interface TypingIndicatorProps {
  users: TypingUser[]
  className?: string
}

function TypingUserAvatar({ user }: { user: TypingUser }) {
  const profile = useProfile(user.pubkey)
  
  const getUserInitials = (name?: string, pubkey?: string) => {
    if (name) {
      return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return pubkey?.slice(0, 2).toUpperCase() || '??'
  }

  return (
    <Avatar className="h-6 w-6 border-2 border-background">
      <AvatarImage src={profile?.image} />
      <AvatarFallback className="text-[10px]">
        {getUserInitials(profile?.name || user.name, user.pubkey)}
      </AvatarFallback>
    </Avatar>
  )
}

export const TypingIndicator = memo(function TypingIndicator({
  users,
  className,
}: TypingIndicatorProps) {
  if (users.length === 0) return null

  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0].name || 'Someone'} is typing`
    } else if (users.length === 2) {
      return `${users[0].name || 'Someone'} and ${users[1].name || 'someone'} are typing`
    } else {
      return `${users.length} people are typing`
    }
  }

  return (
    <div className={cn('flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground', className)}>
      <div className="flex -space-x-2">
        {users.slice(0, 3).map((user) => (
          <TypingUserAvatar key={user.pubkey} user={user} />
        ))}
      </div>
      <div className="flex items-center gap-1">
        <span>{getTypingText()}</span>
        <div className="flex gap-1">
          <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: '200ms' }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: '400ms' }}>.</span>
        </div>
      </div>
    </div>
  )
})