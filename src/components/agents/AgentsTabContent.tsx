import { useMemo } from 'react';
import { useNDK, useSubscribe } from '@nostr-dev-kit/ndk-hooks';
import { type NDKKind } from '@nostr-dev-kit/ndk';
import { Bot, Plus, Settings, Volume2 } from 'lucide-react';
import { NDKProject } from '@/lib/ndk-events/NDKProject';
import { NDKAgent } from '@/lib/ndk-events/NDKAgent';
import { EVENT_KINDS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingSpinner';
import { getAgentVoiceConfig } from '@/lib/voice-config';
import { useTTSConfig } from '@/stores/llmConfig';
import { useNavigate } from '@tanstack/react-router';
import { useProjectStatus } from '@/stores/projects';

interface AgentData {
  id?: string;
  pubkey: string;
  name?: string;
  description?: string;
  picture?: string;
  role?: string;
  status?: string;
  lastSeen?: number;
  useCriteria?: string[];
  fromStatus?: boolean;
  fromProject?: boolean;
  fromNDK?: boolean;
}

interface AgentsTabContentProps {
  project: NDKProject;
}

export function AgentsTabContent({ project }: AgentsTabContentProps) {
  const { ndk } = useNDK();
  const navigate = useNavigate();
  const { apiKey: murfApiKey } = useTTSConfig();
  
  // Get agents from project status (same as Status tab)
  const projectStatus = useProjectStatus(project?.tagId());
  const statusAgents = projectStatus?.agents || [];
  const isLoading = !projectStatus;

  // Get agents from project tags as well (for additional metadata)
  const projectAgents = useMemo(() => {
    return project.agents || [];
  }, [project]);

  // Get unique agent pubkeys to fetch their NDKAgent events
  const agentPubkeys = useMemo(() => {
    const pubkeys = new Set<string>();
    // Add from project tags
    projectAgents.forEach(agent => pubkeys.add(agent.pubkey));
    // Add from status
    statusAgents.forEach(agent => pubkeys.add(agent.pubkey));
    return Array.from(pubkeys);
  }, [projectAgents, statusAgents]);

  // Subscribe to agent events for more detailed information
  const { events: agentEvents } = useSubscribe(
    agentPubkeys.length > 0
      ? [{ kinds: [EVENT_KINDS.AGENT_CONFIG as NDKKind], authors: agentPubkeys }]
      : null,
    {},
    [agentPubkeys.join(',')]
  );

  // Convert events to NDKAgent instances
  const ndkAgents = useMemo(() => {
    return (agentEvents || []).map(event => new NDKAgent(ndk || undefined, event.rawEvent()));
  }, [agentEvents, ndk]);

  // Combine all sources of agent data
  const allAgents = useMemo(() => {
    const agentMap = new Map<string, AgentData>();
    
    // Start with status agents (these are the ones that are actually online)
    statusAgents.forEach(agent => {
      agentMap.set(agent.pubkey, {
        pubkey: agent.pubkey,
        name: agent.name,
        status: agent.status || 'online',
        lastSeen: agent.lastSeen,
        fromStatus: true
      });
    });
    
    // Add/update with project agent info
    projectAgents.forEach(pa => {
      const existing = agentMap.get(pa.pubkey) || {};
      agentMap.set(pa.pubkey, {
        ...existing,
        pubkey: pa.pubkey,
        name: pa.name || existing.name,
        fromProject: true
      });
    });
    
    // Add/update with NDKAgent data for full details
    ndkAgents.forEach(agent => {
      const existing = agentMap.get(agent.pubkey) || {};
      agentMap.set(agent.pubkey, {
        ...existing,
        id: agent.id, // Event ID for navigation
        pubkey: agent.pubkey,
        name: agent.name || existing.name,
        description: agent.description,
        picture: agent.picture,
        role: agent.role,
        useCriteria: agent.useCriteria,
        fromNDK: true
      });
    });
    
    return Array.from(agentMap.values());
  }, [statusAgents, projectAgents, ndkAgents]);

  const handleAgentClick = (agent: AgentData) => {
    // Navigate to agent profile page using pubkey as the identifier
    navigate({ 
      to: '/p/$pubkey', 
      params: { pubkey: agent.pubkey }
    });
  };

  const handleVoiceSettings = (agent: AgentData, e: React.MouseEvent) => {
    e.stopPropagation();
    // Navigate directly to agent profile settings using pubkey
    navigate({ 
      to: '/p/$pubkey', 
      params: { pubkey: agent.pubkey }
    });
  };

  const getVoiceStatus = (agent: AgentData) => {
    const config = getAgentVoiceConfig(agent.name || agent.pubkey);
    return config ? config.voiceName : null;
  };

  if (isLoading) {
    return <LoadingState text="Loading agents..." className="flex-1" />;
  }

  if (allAgents.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <EmptyState
          icon={<Bot className="w-12 h-12" />}
          title="No agents available"
          description="No agents are currently online for this project. Agents will appear here when they come online."
        >
          <Button className="mt-4">
            <Plus className="w-4 h-4 mr-2" />
            Add Agents
          </Button>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">Project Agents</h2>
            <p className="text-sm text-muted-foreground">
              {allAgents.length} {allAgents.length === 1 ? 'agent' : 'agents'} assigned to this project
            </p>
          </div>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Agent
          </Button>
        </div>

        {/* Agent Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allAgents.map((agent) => {
            const voiceConfig = getVoiceStatus(agent);
            const isOnline = agent.fromStatus && agent.status === 'online';
            
            return (
              <Card 
                key={agent.pubkey}
                className="cursor-pointer hover:shadow-lg transition-shadow relative"
                onClick={() => handleAgentClick(agent)}
              >
                {/* Online Status Indicator */}
                {isOnline && (
                  <div className="absolute top-3 right-3">
                    <div className="relative">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
                    </div>
                  </div>
                )}
                
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={agent.picture} />
                        <AvatarFallback>
                          <Bot className="w-5 h-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">
                          {agent.name || 'Unnamed Agent'}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          {agent.role && (
                            <Badge variant="secondary">
                              {agent.role}
                            </Badge>
                          )}
                          {!isOnline && agent.fromStatus && (
                            <Badge variant="outline" className="text-xs">
                              Offline
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleVoiceSettings(agent, e)}
                      className="h-8 w-8"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {agent.description && (
                    <CardDescription className="line-clamp-2 mb-3">
                      {agent.description}
                    </CardDescription>
                  )}
                  
                  {/* Voice Configuration Status */}
                  {murfApiKey && (
                    <div className="flex items-center gap-2 text-sm">
                      <Volume2 className="w-4 h-4 text-muted-foreground" />
                      {voiceConfig ? (
                        <span className="text-green-600 dark:text-green-500">
                          Voice: {voiceConfig}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          No voice configured
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Use Criteria */}
                  {agent.useCriteria && agent.useCriteria.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Use when:</p>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        {agent.useCriteria.slice(0, 2).map((criteria: string, idx: number) => (
                          <li key={idx} className="truncate">• {criteria}</li>
                        ))}
                        {agent.useCriteria.length > 2 && (
                          <li className="text-primary">
                            +{agent.useCriteria.length - 2} more
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}