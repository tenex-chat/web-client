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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { generateAgentColor } from "@/lib/utils/agent-colors";

interface AgentDefinitionCardProps {
  agent: NDKAgentDefinition;
  onClick: () => void;
  getRoleColor: (role: string) => string;
}

export function AgentDefinitionCard({
  agent,
  onClick,
  getRoleColor,
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
          <Avatar className="w-12 h-12">
            <AvatarImage src={agent.picture} />
            <AvatarFallback style={{ backgroundColor: agentColor }}>
              <Bot className="w-6 h-6 text-white" />
            </AvatarFallback>
          </Avatar>
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
          <Avatar className="w-6 h-6">
            <AvatarImage src={authorProfile?.image || authorProfile?.picture} />
            <AvatarFallback className="text-xs">
              {authorProfile?.name?.[0] || agent.pubkey.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
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
