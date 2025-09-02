import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NDKProject } from '@/lib/ndk-events/NDKProject'
import { NDKAgentDefinition } from '@/lib/ndk-events/NDKAgentDefinition'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useNDK } from '@nostr-dev-kit/ndk-hooks'
import { Crown, X, Plus, Bot, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { AddAgentsToProjectDialog } from '@/components/dialogs/AddAgentsToProjectDialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useProfile } from '@nostr-dev-kit/ndk-hooks'

interface AgentWithDefinition {
  projectAgent: { slug?: string; ndkAgentEventId: string }
  definition: NDKAgentDefinition | null
  loading: boolean
}

// Component to display agent info with fetched definition
function AgentDisplay({ 
  agent, 
  isProjectManager,
  onRemove,
  canRemove
}: { 
  agent: AgentWithDefinition
  isProjectManager: boolean
  onRemove: () => void
  canRemove: boolean
}) {
  const agentPubkey = agent.definition?.pubkey
  const profile = useProfile(agentPubkey || '')
  
  const displayName = agent.definition?.name || 
                      agent.projectAgent.slug || 
                      profile?.displayName || 
                      profile?.name || 
                      'Loading...'
  
  const description = agent.definition?.description || 
                     agent.definition?.content || 
                     'No description available'
  
  const avatarUrl = profile?.image || profile?.picture
  
  const truncateEventId = (eventId: string) => {
    if (!eventId) return 'Unknown'
    if (eventId.length <= 20) return eventId
    return `${eventId.slice(0, 12)}...${eventId.slice(-6)}`
  }
  
  if (agent.loading) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-md border bg-card">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <div className="flex-1">
          <div className="font-medium">Loading agent definition...</div>
          <div className="text-xs text-muted-foreground">
            Event ID: {truncateEventId(agent.projectAgent.ndkAgentEventId)}
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex items-start gap-3 p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors">
      <Avatar className="h-10 w-10 mt-0.5">
        <AvatarImage src={avatarUrl} alt={displayName} />
        <AvatarFallback>
          <Bot className="h-5 w-5" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-medium truncate">
            {displayName}
          </div>
          {isProjectManager && (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary shrink-0">
              <Crown className="h-3 w-3" />
              <span className="text-xs font-semibold">PM</span>
            </div>
          )}
        </div>
        {agent.projectAgent.slug && (
          <div className="text-sm text-muted-foreground">
            Slug: {agent.projectAgent.slug}
          </div>
        )}
        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
          {description}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Event ID: {truncateEventId(agent.projectAgent.ndkAgentEventId)}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={onRemove}
        disabled={!canRemove}
        title={
          !canRemove
            ? isProjectManager 
              ? "Reassign Project Manager role before removing"
              : "Cannot remove the last agent"
            : "Remove agent from project"
        }
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

interface ProjectAgentsSettingsProps {
  project: NDKProject
}

export function ProjectAgentsSettings({ project }: ProjectAgentsSettingsProps) {
  const { ndk } = useNDK()
  const [selectedPM, setSelectedPM] = useState<string>('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [addAgentsDialogOpen, setAddAgentsDialogOpen] = useState(false)
  const [agentsWithDefinitions, setAgentsWithDefinitions] = useState<AgentWithDefinition[]>([])
  
  // Get agent definitions from project tags
  const projectAgents = project.agents || []
  
  // Fetch agent definitions
  useEffect(() => {
    if (!ndk || projectAgents.length === 0) {
      setAgentsWithDefinitions([])
      return
    }
    
    const fetchAgentDefinitions = async () => {
      // Initialize with loading state
      const initialData: AgentWithDefinition[] = projectAgents.map(agent => ({
        projectAgent: agent,
        definition: null,
        loading: true
      }))
      
      setAgentsWithDefinitions(initialData)
      
      // Fetch all definitions in parallel
      const definitionPromises = projectAgents.map(async (agent) => {
        try {
          const event = await ndk.fetchEvent(agent.ndkAgentEventId)
          if (event) {
            return NDKAgentDefinition.from(event)
          }
          return null
        } catch (error) {
          console.error('Failed to fetch agent definition:', error)
          return null
        }
      })
      
      // Wait for all fetches to complete
      const definitions = await Promise.all(definitionPromises)
      
      // Update state once with all results
      const finalData: AgentWithDefinition[] = projectAgents.map((agent, index) => ({
        projectAgent: agent,
        definition: definitions[index],
        loading: false
      }))
      
      setAgentsWithDefinitions(finalData)
    }
    
    fetchAgentDefinitions()
  }, [ndk, project.dTag]) // Use project.dTag as dependency instead of projectAgents array
  
  // Set initial PM (first agent)
  useEffect(() => {
    if (projectAgents.length > 0 && !selectedPM) {
      setSelectedPM(projectAgents[0].slug || projectAgents[0].ndkAgentEventId)
    }
  }, [projectAgents, selectedPM])

  const handleUpdatePM = async () => {
    if (!ndk || !project || !selectedPM) return
    
    setIsUpdating(true)
    try {
      // Get current agent tags
      const agentTags = project.tags.filter(tag => tag[0] === 'agent')
      
      // Find the new PM tag by matching slug or event ID
      const newPMTagIndex = agentTags.findIndex(tag => 
        tag[2] === selectedPM || tag[1] === selectedPM
      )
      
      if (newPMTagIndex === -1) return
      
      const newPMTag = agentTags[newPMTagIndex]
      
      // Reorder tags: new PM first, then others
      const otherAgentTags = agentTags.filter((_, index) => index !== newPMTagIndex)
      const reorderedAgentTags = [newPMTag, ...otherAgentTags]
      
      // Create new tag array with reordered agent tags
      const nonAgentTags = project.tags.filter(tag => tag[0] !== 'agent')
      const newTags = [...nonAgentTags, ...reorderedAgentTags]
      
      // Update project
      project.tags = newTags
      await project.publishReplaceable()
      
      toast.success('Project Manager updated')
      
      // Refresh the agents list to reflect new order
      window.location.reload()
    } catch (error) {
      console.error('Failed to update Project Manager:', error)
      toast.error('Failed to update Project Manager')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRemoveAgent = async (agentToRemove: { slug?: string; ndkAgentEventId: string }) => {
    if (!ndk || !project) return
    
    // Can't remove the PM without reassigning first
    const isCurrentPM = projectAgents.indexOf(agentToRemove) === 0
    if (isCurrentPM && projectAgents.length > 1) {
      toast.error('Please reassign the Project Manager role before removing this agent')
      return
    }
    
    // Can't remove the last agent
    if (projectAgents.length === 1) {
      toast.error('Cannot remove the last agent from the project')
      return
    }
    
    try {
      // Filter out the agent tag to remove
      const newTags = project.tags.filter(tag => {
        if (tag[0] !== 'agent') return true
        // Check both slug and event ID
        return tag[2] !== agentToRemove.slug && tag[1] !== agentToRemove.ndkAgentEventId
      })
      
      // Update project
      project.tags = newTags
      await project.publishReplaceable()
      
      toast.success('Agent removed from project')
      
      // Refresh to update the list
      window.location.reload()
    } catch (error) {
      console.error('Failed to remove agent:', error)
      toast.error('Failed to remove agent')
    }
  }

  const getAgentIdentifier = (agent: { slug?: string; ndkAgentEventId: string }) => {
    return agent.slug || agent.ndkAgentEventId
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Manager</CardTitle>
          <CardDescription>
            The Project Manager is the primary agent for this project and will be automatically tagged in new conversations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {agentsWithDefinitions.length > 0 ? (
            <>
              <div className="space-y-2">
                <Label>Current Project Manager</Label>
                {agentsWithDefinitions[0] && (
                  <div className="p-3 rounded-md bg-muted/50">
                    <AgentDisplay 
                      agent={agentsWithDefinitions[0]} 
                      isProjectManager={true}
                      onRemove={() => {}}
                      canRemove={false}
                    />
                  </div>
                )}
              </div>
              
              {projectAgents.length > 1 && (
                <div className="space-y-2">
                  <Label>Change Project Manager</Label>
                  <div className="flex gap-2">
                    <Select value={selectedPM} onValueChange={setSelectedPM}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select new Project Manager" />
                      </SelectTrigger>
                      <SelectContent>
                        {agentsWithDefinitions.map((agentData) => {
                          const identifier = getAgentIdentifier(agentData.projectAgent)
                          const displayName = agentData.definition?.name || 
                                            agentData.projectAgent.slug || 
                                            'Unknown Agent'
                          return (
                            <SelectItem key={identifier} value={identifier}>
                              <div className="flex items-center gap-2">
                                <Bot className="h-4 w-4" />
                                <span>{displayName}</span>
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={handleUpdatePM}
                      disabled={isUpdating || selectedPM === getAgentIdentifier(projectAgents[0])}
                    >
                      {isUpdating ? 'Updating...' : 'Update'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No agents assigned to this project</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Agents</CardTitle>
          <CardDescription>
            {projectAgents.length} agent{projectAgents.length !== 1 ? 's' : ''} assigned to this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {agentsWithDefinitions.length > 0 ? (
              agentsWithDefinitions.map((agentData, index) => {
                const isProjectManager = index === 0
                
                return (
                  <AgentDisplay
                    key={getAgentIdentifier(agentData.projectAgent)}
                    agent={agentData}
                    isProjectManager={isProjectManager}
                    onRemove={() => handleRemoveAgent(agentData.projectAgent)}
                    canRemove={!(isProjectManager && projectAgents.length > 1) && projectAgents.length > 1}
                  />
                )
              })
            ) : projectAgents.length > 0 ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Loading agent definitions...
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <Bot className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  No agents assigned to this project
                </p>
              </div>
            )}
            
            <Button
              onClick={() => setAddAgentsDialogOpen(true)}
              variant="outline"
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Agent
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <AddAgentsToProjectDialog
        open={addAgentsDialogOpen}
        onOpenChange={setAddAgentsDialogOpen}
        project={project}
        existingAgentIds={projectAgents.map(a => a.ndkAgentEventId)}
      />
    </div>
  )
}