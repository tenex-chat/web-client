import React, { useMemo, useState } from "react";
import { useNDK, useSubscribe, useProfile } from "@nostr-dev-kit/ndk-hooks";
import { type NDKKind } from "@nostr-dev-kit/ndk-hooks";
import { Bot, Plus, Settings, Volume2 } from "lucide-react";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import { NDKAgentDefinition } from "@/lib/ndk-events/NDKAgentDefinition";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NostrAvatar } from "@/components/ui/nostr-avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/EmptyState";
import { useAgentVoiceConfig } from "@/hooks/useAgentVoiceConfig";
import { useNavigate } from "@tanstack/react-router";
import { useProjectStatus } from "@/stores/projects";
import { AddAgentsToProjectDialog } from "@/components/dialogs/AddAgentsToProjectDialog";

interface AgentsTabContentProps {
  project: NDKProject;
}

// Define AgentData interface locally
interface AgentData {
  id?: string;
  pubkey: string;
  name?: string;
  description?: string;
  picture?: string;
  role?: string;
  useCriteria?: string[];
  status?: string;
  lastSeen?: number;
  fromStatus?: boolean;
  fromNDK?: boolean;
  fromProject?: boolean;
}

function AgentCard({ 
  agent, 
  onAgentClick, 
  onVoiceSettings,
  hasVoice
}: {
  agent: AgentData;
  onAgentClick: (agent: AgentData) => void;
  onVoiceSettings: (agent: AgentData, e: React.MouseEvent) => void;
  hasVoice: boolean;
}) {
  const profile = useProfile(agent.pubkey);
  const avatarUrl = profile?.image || profile?.picture || agent.picture;
  const isOnline = agent.status === "online";
  
  // Get voice config for this specific agent
  const { hasCustomConfig, config } = useAgentVoiceConfig(agent.pubkey);
  
  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow relative"
      onClick={() => onAgentClick(agent)}
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
            <NostrAvatar
              pubkey={agent.pubkey}
              src={avatarUrl}
              alt={agent.name || "Agent"}
              fallback={<Bot className="w-5 h-5" />}
              className="w-10 h-10"
            />
            <div>
              <CardTitle className="text-base">
                {agent.name || "Unnamed Agent"}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {agent.role && (
                  <Badge variant="secondary">{agent.role}</Badge>
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
            onClick={(e) => onVoiceSettings(agent, e)}
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
        {hasVoice && (
          <div className="flex items-center gap-2 text-sm">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            {hasCustomConfig ? (
              <span className="text-green-600 dark:text-green-500">
                Custom voice: {config.voiceId}
              </span>
            ) : (
              <span className="text-muted-foreground">
                Using global voice
              </span>
            )}
          </div>
        )}

        {/* Use Criteria */}
        {agent.useCriteria && agent.useCriteria.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Use when:
            </p>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {agent.useCriteria
                .slice(0, 2)
                .map((criteria: string, idx: number) => (
                  <li key={idx} className="truncate">
                    • {criteria}
                  </li>
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
}

export function AgentsTabContent({ project }: AgentsTabContentProps) {
  const { ndk } = useNDK();
  const navigate = useNavigate();
  const [addAgentsDialogOpen, setAddAgentsDialogOpen] = useState(false);
  
  // Check if we have voice configured
  const { config: globalVoiceConfig } = useAgentVoiceConfig(undefined);
  const hasVoice = globalVoiceConfig.enabled && !!globalVoiceConfig.apiKey;

  // Get agents from project status (same as Status tab)
  const projectStatus = useProjectStatus(project?.dTag);
  const statusAgents = useMemo(() => projectStatus?.agents || [], [projectStatus]);

  // Get agent event IDs from project tags
  const projectAgentEventIds = useMemo(() => {
    return project.agents || [];
  }, [project]);

  // Get unique agent pubkeys from status to fetch their NDKAgentDefinition events
  const agentPubkeys = useMemo(() => {
    const pubkeys = new Set<string>();
    // Add from status
    statusAgents.forEach((agent) => pubkeys.add(agent.pubkey));
    return Array.from(pubkeys);
  }, [statusAgents]);

  // Subscribe to agent events for more detailed information
  const { events: agentEvents } = useSubscribe(
    agentPubkeys.length > 0
      ? [
          {
            kinds: [NDKAgentDefinition.kind as NDKKind],
            authors: agentPubkeys,
          },
        ]
      : false,
    {},
    [agentPubkeys.join(",")],
  );

  // Convert events to NDKAgentDefinition instances and filter to latest versions only
  const ndkAgents = useMemo(() => {
    const agents = (agentEvents || []).map(
      (event) => new NDKAgentDefinition(ndk || undefined, event.rawEvent()),
    );

    // Group agents by d-tag (slug) and keep only the latest version
    const latestAgentsMap = new Map<string, NDKAgentDefinition>();

    agents.forEach((agent) => {
      const dTag = agent.dTag || agent.name || agent.pubkey;
      const existing = latestAgentsMap.get(dTag);

      // Keep the agent with the most recent created_at timestamp
      if (
        !existing ||
        (agent.created_at &&
          existing.created_at &&
          agent.created_at > existing.created_at)
      ) {
        latestAgentsMap.set(dTag, agent);
      }
    });

    return Array.from(latestAgentsMap.values());
  }, [agentEvents, ndk]);

  // Combine all sources of agent data
  const allAgents = useMemo(() => {
    const agentMap = new Map<string, AgentData>();

    // Start with status agents (these are the ones that are actually online)
    statusAgents.forEach((agent) => {
      agentMap.set(agent.pubkey, {
        pubkey: agent.pubkey,
        name: agent.name,
        status: "online", // Agents in status events are online by definition
        lastSeen: agent.lastSeen,
        fromStatus: true,
      });
    });

    // Add/update with NDKAgentDefinition data for full details
    ndkAgents.forEach((agent) => {
      const existing = agentMap.get(agent.pubkey);
      agentMap.set(agent.pubkey, {
        ...existing,
        id: agent.id, // Event ID for navigation
        pubkey: agent.pubkey,
        name: agent.name || existing?.name || agent.pubkey.slice(0, 8),
        description: agent.description,
        picture: agent.picture,
        role: agent.role,
        useCriteria: agent.useCriteria,
        fromNDK: true,
        fromProject: projectAgentEventIds.some(
          (pa) => pa.ndkAgentEventId === agent.id,
        ),
        status: existing?.status,
        lastSeen: existing?.lastSeen,
        fromStatus: existing?.fromStatus,
      });
    });

    return Array.from(agentMap.values());
  }, [statusAgents, projectAgentEventIds, ndkAgents]);

  const handleAgentClick = (agent: AgentData) => {
    // Navigate to agent profile page using pubkey as the identifier
    navigate({
      to: "/p/$pubkey",
      params: { pubkey: agent.pubkey },
    });
  };

  const handleVoiceSettings = (agent: AgentData, e: React.MouseEvent) => {
    e.stopPropagation();
    // Navigate directly to agent profile settings using pubkey
    navigate({
      to: "/p/$pubkey",
      params: { pubkey: agent.pubkey },
    });
  };

  if (allAgents.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <EmptyState
          icon={<Bot className="w-12 h-12" />}
          title="No agents available"
          description="No agents are currently online for this project. Agents will appear here when they come online."
        />
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
              {allAgents.length} {allAgents.length === 1 ? "agent" : "agents"}{" "}
              assigned to this project
            </p>
          </div>
          <Button size="sm" onClick={() => setAddAgentsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Agent
          </Button>
        </div>

        {/* Agent Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allAgents.map((agent) => (
            <AgentCard
              key={agent.pubkey}
              agent={agent}
              onAgentClick={handleAgentClick}
              onVoiceSettings={handleVoiceSettings}
              hasVoice={hasVoice}
            />
          ))}
        </div>
      </div>

      <AddAgentsToProjectDialog
        open={addAgentsDialogOpen}
        onOpenChange={setAddAgentsDialogOpen}
        project={project}
        existingAgentIds={projectAgentEventIds.map((a) => a.ndkAgentEventId)}
      />
    </div>
  );
}
