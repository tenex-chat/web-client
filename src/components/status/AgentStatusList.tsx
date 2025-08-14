import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { cn } from '../../lib/utils'
import type { ProjectAgent } from '../../lib/ndk-events/NDKProjectStatus'
import { useProfile } from '@nostr-dev-kit/ndk-hooks'
import { Bot } from 'lucide-react'

interface AgentStatusListProps {
  agents: ProjectAgent[]
  className?: string
}

function AgentStatusItem({ agent }: { agent: ProjectAgent }) {
  const profile = useProfile(agent.pubkey)
  const avatarUrl = profile?.image || profile?.picture
  
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
      <Avatar className="h-8 w-8">
        <AvatarImage src={avatarUrl} alt={agent.name} />
        <AvatarFallback>
          <Bot className="w-4 h-4" />
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {agent.name}
        </p>
        {agent.role && (
          <p className="text-xs text-muted-foreground">
            {agent.role}
          </p>
        )}
      </div>

      <Badge variant="secondary" className="text-xs">
        Agent
      </Badge>
    </div>
  )
}

export function AgentStatusList({ 
  agents, 
  className
}: AgentStatusListProps) {
  if (agents.length === 0) {
    return (
      <div className={cn('text-sm text-muted-foreground', className)}>
        No agents available
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {agents.map((agent) => (
        <AgentStatusItem key={agent.pubkey} agent={agent} />
      ))}
    </div>
  )
}