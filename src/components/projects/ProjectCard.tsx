import { Link } from '@tanstack/react-router'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { NDKProject } from '@/lib/ndk-events/NDKProject'
import { Circle } from 'lucide-react'

interface ProjectCardProps {
  project: NDKProject
  isActive?: boolean
  isOnline?: boolean
  onClick?: () => void
}

export function ProjectCard({ project, isActive, isOnline = false, onClick }: ProjectCardProps) {
  const lastActivity = project.created_at 
    ? formatDistanceToNow(new Date(project.created_at * 1000), { addSuffix: true })
    : 'Unknown'

  // Get project initials for avatar fallback
  const initials = project.title
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Mock unread count (will be replaced with real data)
  const unreadCount = 0

  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.id }}
      onClick={onClick}
      className={cn(
        "block p-3 rounded-lg hover:bg-accent transition-colors",
        isActive && "bg-accent"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={project.picture} />
            <AvatarFallback className="text-xs">
              {initials || '??'}
            </AvatarFallback>
          </Avatar>
          {/* Online indicator */}
          <Circle
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3 w-3",
              isOnline ? "fill-green-500 text-green-500" : "fill-gray-400 text-gray-400"
            )}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between">
            <h3 className="font-medium truncate">
              {project.title || 'Untitled Project'}
            </h3>
            <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
              {lastActivity}
            </span>
          </div>

          <p className="text-sm text-muted-foreground truncate">
            {project.description || 'No description'}
          </p>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {project.agents.length} agents
            </span>
            {project.hashtags.slice(0, 2).map(tag => (
              <span key={tag} className="text-xs text-muted-foreground">
                #{tag}
              </span>
            ))}
            {unreadCount > 0 && (
              <Badge variant="default" className="ml-auto">
                {unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}