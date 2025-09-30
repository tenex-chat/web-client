import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSubscribe, useUser, useProfileValue, useEvent } from "@nostr-dev-kit/ndk-hooks";
import { Crown, X, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NDKAgentDefinition } from "@/lib/ndk-events/NDKAgentDefinition";

interface AgentDisplayProps {
  projectAgent: { ndkAgentEventId: string };
  isProjectManager: boolean;
  onRemove: () => void;
  canRemove: boolean;
  onUpdate?: (oldId: string, newId: string) => void;
}

function truncateEventId(eventId: string): string {
  if (!eventId) return "Unknown";
  if (eventId.length <= 20) return eventId;
  return `${eventId.slice(0, 12)}...${eventId.slice(-6)}`;
}

export function AgentDisplay({
  projectAgent,
  isProjectManager,
  onRemove,
  canRemove,
  onUpdate,
}: AgentDisplayProps) {
  const navigate = useNavigate();

  const { events } = useSubscribe(
    projectAgent.ndkAgentEventId
      ? [
          {
            ids: [projectAgent.ndkAgentEventId],
          },
        ]
      : [],
    { closeOnEose: false },
  );

  const newerVersionEvent = useEvent(
    projectAgent.ndkAgentEventId
      ? [
          {
            "#e": [projectAgent.ndkAgentEventId],
            kinds: NDKAgentDefinition.kinds,
          },
        ]
      : [],
  );

  const agentEvent = events[0];
  const agentDefinition = agentEvent
    ? NDKAgentDefinition.from(agentEvent)
    : null;

  const agentPubkey = agentDefinition?.pubkey;
  const user = useUser(agentPubkey);
  const profile = useProfileValue(user);

  const displayName =
    agentDefinition?.name || profile?.displayName || profile?.name || "";

  const description =
    agentDefinition?.description || agentDefinition?.content || "";

  const handleEventIdClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate({
      to: "/agent-definition/$agentDefinitionId",
      params: { agentDefinitionId: projectAgent.ndkAgentEventId },
    });
  };

  const handleViewNewVersion = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (newerVersionEvent) {
      navigate({
        to: "/agent-definition/$agentDefinitionId",
        params: { agentDefinitionId: newerVersionEvent.id },
      });
    }
  };

  const handleUpdateVersion = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (newerVersionEvent && onUpdate) {
      onUpdate(projectAgent.ndkAgentEventId, newerVersionEvent.id);
    }
  };

  const getRemoveButtonTitle = () => {
    if (canRemove) return "Remove agent from project";
    if (isProjectManager) return "Reassign Project Manager role before removing";
    return "Cannot remove the last agent";
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-medium truncate">{displayName}</div>
          {isProjectManager && (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary shrink-0">
              <Crown className="h-3 w-3" />
              <span className="text-xs font-semibold">PM</span>
            </div>
          )}
          {newerVersionEvent && (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 shrink-0">
              <AlertCircle className="h-3 w-3" />
              <span className="text-xs font-semibold">Update Available</span>
            </div>
          )}
        </div>
        {description && (
          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {description}
          </div>
        )}
        <div className="text-xs text-muted-foreground mt-1">
          Event ID:{" "}
          <button
            onClick={handleEventIdClick}
            className="hover:text-primary underline transition-colors"
          >
            {truncateEventId(projectAgent.ndkAgentEventId)}
          </button>
        </div>
        {newerVersionEvent && (
          <div className="flex items-center gap-2 mt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleViewNewVersion}
              className="h-7 text-xs"
            >
              View New Version
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={handleUpdateVersion}
              className="h-7 text-xs"
            >
              <ArrowRight className="h-3 w-3 mr-1" />
              Update to {truncateEventId(newerVersionEvent.id)}
            </Button>
          </div>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={onRemove}
        disabled={!canRemove}
        title={getRemoveButtonTitle()}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}