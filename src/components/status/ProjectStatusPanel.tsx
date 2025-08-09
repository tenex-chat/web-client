import { Card } from '../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { ProjectStatusIndicator } from './ProjectStatusIndicator'
import { AgentStatusList } from './AgentStatusList'
import { ModelStatusList } from './ModelStatusList'
import { useProjectStatus } from '../../stores/projects'
import type { NDKProject } from '../../lib/ndk-events/NDKProject'
import { formatDistanceToNow } from 'date-fns'
import { Users, Cpu, Activity } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Skeleton } from '../ui/skeleton'

interface ProjectStatusPanelProps {
  project: NDKProject
  className?: string
  compact?: boolean
}

export function ProjectStatusPanel({ 
  project, 
  className,
  compact = false 
}: ProjectStatusPanelProps) {
  const projectStatus = useProjectStatus(project.tagId())
  
  // Extract data from status
  const statusEvent = projectStatus?.statusEvent
  const isLoading = false // Status is loaded from the store
  const isOnline = () => projectStatus?.isOnline || false
  const getOverallStatus = () => projectStatus?.isOnline ? 'online' : 'offline'
  const getAgentCount = () => projectStatus?.agents.length || 0
  const getModelCount = () => projectStatus?.models.length || 0
  const agents = projectStatus?.agents || []
  const models = projectStatus?.models || []
  const lastSeen = projectStatus?.lastSeen


  if (isLoading) {
    return (
      <Card className={cn('p-4', className)}>
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </Card>
    )
  }

  const overallStatus = getOverallStatus()
  const agentCount = getAgentCount()
  const modelCount = getModelCount()

  if (compact) {
    return (
      <div className={cn('flex items-center gap-4', className)}>
        <ProjectStatusIndicator status={overallStatus} size="sm" />
        
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Users className="w-3.5 h-3.5" />
          <span>{agentCount}</span>
        </div>
        
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Cpu className="w-3.5 h-3.5" />
          <span>{modelCount}</span>
        </div>

        {lastSeen && (
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(lastSeen, { addSuffix: true })}
          </span>
        )}
      </div>
    )
  }

  return (
    <Card className={cn('p-4', className)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">Project Status</h3>
            <ProjectStatusIndicator status={overallStatus} showLabel />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-2xl font-bold">{agentCount}</p>
            <p className="text-xs text-muted-foreground">Available Agents</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold">{modelCount}</p>
            <p className="text-xs text-muted-foreground">Available Models</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {lastSeen ? formatDistanceToNow(lastSeen, { addSuffix: true }) : 'Never'}
            </p>
            <p className="text-xs text-muted-foreground">Last Update</p>
          </div>
        </div>

        {/* Tabs for detailed view */}
        {(agents.length > 0 || models.length > 0) && (
          <Tabs defaultValue="agents" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="agents">
                Agents ({agents.length})
              </TabsTrigger>
              <TabsTrigger value="models">
                Models ({models.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="agents">
              <AgentStatusList agents={agents} />
            </TabsContent>
            
            <TabsContent value="models">
              <ModelStatusList models={models} />
            </TabsContent>
          </Tabs>
        )}

        {/* Empty state */}
        {!statusEvent && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              No status information available
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Waiting for project to come online...
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}