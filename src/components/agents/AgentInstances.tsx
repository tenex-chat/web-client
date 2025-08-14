import { useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bot } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { EmptyState } from "../common/EmptyState";
import { ScrollArea } from "../ui/scroll-area";

interface AgentInstancesProps {
  agentDefinitionId: string;
}

export function AgentInstances({ agentDefinitionId }: AgentInstancesProps) {
  const navigate = useNavigate();

  // Subscribe to kind:0 events that reference this agent definition
  const { events: profileEvents } = useSubscribe([
    {
      kinds: [0],
      "#e": [agentDefinitionId],
    },
  ]);

  // Parse profile events to get agent instances
  const agentInstances = useMemo(() => {
    return profileEvents.map((event) => {
      try {
        const profile = JSON.parse(event.content);
        return {
          pubkey: event.pubkey,
          name: profile.name || profile.display_name || "Unnamed Agent",
          picture: profile.picture,
          about: profile.about,
          lud16: profile.lud16,
          nip05: profile.nip05,
          created_at: event.created_at,
        };
      } catch {
        return {
          pubkey: event.pubkey,
          name: "Unnamed Agent",
          created_at: event.created_at,
        };
      }
    });
  }, [profileEvents]);

  const handleAgentClick = (pubkey: string) => {
    navigate({ to: "/p/$pubkey", params: { pubkey } });
  };

  if (agentInstances.length === 0) {
    return (
      <EmptyState
        icon={<Bot className="w-12 h-12" />}
        title="No agent instances"
        description="No agents have been created from this definition yet."
      />
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
        {agentInstances.map((agent) => (
          <Card
            key={agent.pubkey}
            className="cursor-pointer transition-colors hover:bg-accent"
            onClick={() => handleAgentClick(agent.pubkey)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={agent.picture} />
                  <AvatarFallback>
                    <Bot className="w-6 h-6" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{agent.name}</div>
                  {agent.nip05 && (
                    <div className="text-sm text-muted-foreground truncate">
                      {agent.nip05}
                    </div>
                  )}
                  {agent.about && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {agent.about}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      Agent Instance
                    </Badge>
                    {agent.lud16 && (
                      <Badge variant="outline" className="text-xs">
                        ⚡ Lightning
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
