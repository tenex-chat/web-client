import { useProfile } from "@nostr-dev-kit/ndk-hooks";
import { Bot } from "lucide-react";
import { NDKAgentDefinition } from "@/lib/ndk-events/NDKAgentDefinition";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NostrAvatar } from "@/components/ui/nostr-avatar";
import { Badge } from "@/components/ui/badge";
import { generateAgentColor } from "@/lib/utils/agent-colors";

interface AgentDefinitionCardProps {
  agent: NDKAgentDefinition;
  onClick: () => void;
}

export function AgentDefinitionCard({
  agent,
  onClick,
}: AgentDefinitionCardProps) {
  const authorProfile = useProfile(agent.pubkey);
  const agentColor = generateAgentColor(agent.name || agent.id);

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start gap-3">
          <NostrAvatar
            pubkey={agent.pubkey}
            src={agent.picture}
            alt={agent.name || "Agent"}
            fallback={
              <div style={{ backgroundColor: agentColor }} className="flex h-full w-full items-center justify-center rounded-full">
                <Bot className="w-6 h-6 text-white" />
              </div>
            }
            className="w-12 h-12"
          />
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">
              {agent.name || "Unnamed Agent Definition"}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="line-clamp-3">
          {agent.description || "No description provided"}
        </CardDescription>

        {/* Author info */}
        <div className="mt-3 pt-3 border-t flex items-center gap-2">
          <NostrAvatar
            pubkey={agent.pubkey}
            src={authorProfile?.image || authorProfile?.picture}
            alt={authorProfile?.name || "Author"}
            fallback={
              <span className="text-xs">
                {authorProfile?.name?.[0] || agent.pubkey.slice(0, 2)}
              </span>
            }
            className="w-6 h-6"
          />
          <span className="text-xs text-muted-foreground truncate">
            {authorProfile?.name ||
              authorProfile?.displayName ||
              `${agent.pubkey.slice(0, 8)}...`}
          </span>
          {agent.version && (
            <Badge variant="outline" className="text-xs ml-auto">
              v{agent.version}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
