import { useEvent } from "@nostr-dev-kit/ndk-hooks";
import { NDKAgentDefinition } from "@/lib/ndk-events/NDKAgentDefinition";
import { AgentDefinitionCard } from "./AgentDefinitionCard";
import { useNDK } from "@nostr-dev-kit/ndk-hooks";
import { useNavigate } from "@tanstack/react-router";

interface AgentDefinitionFromIdProps {
  eventId: string;
}

export function AgentDefinitionFromId({ eventId }: AgentDefinitionFromIdProps) {
  const { ndk } = useNDK();
  const navigate = useNavigate();
  const event = useEvent(eventId);

  if (!event || !ndk) return null;

  const agent = new NDKAgentDefinition(ndk, event);

  const handleClick = () => {
    navigate({
      to: "/agent-definition/$agentDefinitionEventId",
      params: { agentDefinitionEventId: agent.id },
    });
  };

  return <AgentDefinitionCard agent={agent} onClick={handleClick} />;
}
