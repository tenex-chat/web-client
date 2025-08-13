import { Link } from '@tanstack/react-router'
import { formatRelativeTime } from '@/lib/utils/time'
import { cn } from '@/lib/utils'
import { ProjectAvatar } from '@/components/ui/project-avatar'
import { Badge } from '@/components/ui/badge'
import type { NDKProject } from '@/lib/ndk-events/NDKProject'
import { Circle, Users2 } from 'lucide-react'
import { useProjectStatus } from '@/stores/projects'

interface ProjectCardProps {
  project: NDKProject
  isActive?: boolean
  isOnline?: boolean
  onClick?: () => void
}

export function ProjectCard({ project, isActive, isOnline = false, onClick }: ProjectCardProps) {
  const projectStatus = useProjectStatus(project.dTag)
  const executionQueue = projectStatus?.executionQueue
  const lastActivity = project.created_at 
    ? formatRelativeTime(project.created_at)
    : 'Unknown'

  // Mock unread count (will be replaced with real data)
  const unreadCount = 0

  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.dTag || project.encode() }}
      onClick={onClick}
      className={cn(
        "block p-3 rounded-lg hover:bg-accent transition-colors",
        isActive && "bg-accent"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <ProjectAvatar 
            project={project} 
            className="h-10 w-10"
            fallbackClassName="text-xs"
          />
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
            
            {/* Execution Queue Indicator */}
            {executionQueue && (executionQueue.active || executionQueue.totalWaiting > 0) && (
              <div className="flex items-center gap-1">
                <Users2 className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {executionQueue.active && 'Active'}
                  {executionQueue.totalWaiting > 0 && ` (${executionQueue.totalWaiting} waiting)`}
                </span>
              </div>
            )}
            
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