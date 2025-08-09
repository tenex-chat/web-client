import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { cn } from '../../lib/utils'
import type { ProjectAgent } from '../../lib/ndk-events/NDKProjectStatus'

interface AgentStatusListProps {
  agents: ProjectAgent[]
  className?: string
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
        <div 
          key={agent.pubkey}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              {agent.name.slice(0, 2).toUpperCase()}
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
      ))}
    </div>
  )
}