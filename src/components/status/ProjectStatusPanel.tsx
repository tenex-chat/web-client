import { useState } from 'react'
import { Card } from '../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { ProjectStatusIndicator } from './ProjectStatusIndicator'
import { AgentStatusList } from './AgentStatusList'
import { ModelStatusList } from './ModelStatusList'
import { ExecutionQueueCard } from './ExecutionQueueCard'
import { ForceReleaseDialog } from './ForceReleaseDialog'
import { useProjectStatus } from '../../stores/projects'
import type { NDKProject } from '../../lib/ndk-events/NDKProject'
import { formatRelativeTime } from '@/lib/utils/time'
import { Users, Cpu, Activity } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useNDK } from '@nostr-dev-kit/ndk-hooks'

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
  const projectStatus = useProjectStatus(project.dTag)
  const { ndk } = useNDK()
  const [showForceReleaseDialog, setShowForceReleaseDialog] = useState(false)
  
  // Extract data from status
  const statusEvent = projectStatus?.statusEvent
  const getOverallStatus = () => projectStatus?.isOnline ? 'online' : 'offline'
  const getAgentCount = () => projectStatus?.agents.length || 0
  const getModelCount = () => projectStatus?.models.length || 0
  const agents = projectStatus?.agents || []
  const models = projectStatus?.models || []
  const executionQueue = projectStatus?.executionQueue || null
  const lastSeen = projectStatus?.lastSeen
  
  // Check if current user can force release (is project owner)
  const userPubkey = ndk?.activeUser?.pubkey
  const canForceRelease = userPubkey === project.pubkey


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
            {formatRelativeTime(Math.floor(lastSeen.getTime() / 1000))}
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
              {lastSeen ? formatRelativeTime(Math.floor(lastSeen.getTime() / 1000)) : 'Never'}
            </p>
            <p className="text-xs text-muted-foreground">Last Update</p>
          </div>
        </div>

        {/* Tabs for detailed view */}
        {(agents.length > 0 || models.length > 0 || executionQueue) && (
          <Tabs defaultValue="agents" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="agents">
                Agents ({agents.length})
              </TabsTrigger>
              <TabsTrigger value="models">
                Models ({models.length})
              </TabsTrigger>
              <TabsTrigger value="queue">
                Queue {executionQueue?.totalWaiting ? `(${executionQueue.totalWaiting})` : ''}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="agents">
              <AgentStatusList agents={agents} />
            </TabsContent>
            
            <TabsContent value="models">
              <ModelStatusList models={models} />
            </TabsContent>
            
            <TabsContent value="queue">
              <ExecutionQueueCard 
                queue={executionQueue}
                onForceRelease={() => setShowForceReleaseDialog(true)}
                canForceRelease={canForceRelease}
              />
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
      
      {/* Force Release Dialog */}
      <ForceReleaseDialog
        open={showForceReleaseDialog}
        onOpenChange={setShowForceReleaseDialog}
        project={project}
        conversationId={executionQueue?.active?.conversationId}
      />
    </Card>
  )
}