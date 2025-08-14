import { useProfile } from "@nostr-dev-kit/ndk-hooks";
import { Bot } from "lucide-react";
import { NDKAgentDefinition } from "../../lib/ndk-events/NDKAgentDefinition";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { generateAgentColor } from "../../lib/utils/agent-colors";

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
            {agent.role && (
              <Badge
                variant="secondary"
                className={`mt-1 ${getRoleColor(agent.role)}`}
              >
                {agent.role}
              </Badge>
            )}
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

        {agent.useCriteria && agent.useCriteria.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {agent.useCriteria.slice(0, 3).map((criteria, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {criteria}
              </Badge>
            ))}
            {agent.useCriteria.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{agent.useCriteria.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
