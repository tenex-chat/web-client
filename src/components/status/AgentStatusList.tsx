import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProjectAgent } from "@/lib/ndk-events/NDKProjectStatus";
import { useUser, useProfileValue } from "@nostr-dev-kit/ndk-hooks";
import { Bot, Wrench } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AgentStatusListProps {
  agents: ProjectAgent[];
  className?: string;
}

function AgentStatusItem({ agent }: { agent: ProjectAgent }) {
  const user = useUser(agent.pubkey);
  const profile = useProfileValue(user);
  const avatarUrl = profile?.image || profile?.picture;

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
      <Avatar className="h-8 w-8">
        <AvatarImage src={avatarUrl} alt={agent.name} />
        <AvatarFallback>
          <Bot className="w-4 h-4" />
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{agent.name}</p>
          {agent.isGlobal && (
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              Global
            </Badge>
          )}
          {agent.model && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              {agent.model}
            </Badge>
          )}
        </div>
        {agent.tools && agent.tools.length > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                    <Wrench className="w-3 h-3" />
                    <span>{agent.tools.length} tools</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-semibold text-xs">Available Tools:</p>
                    <div className="flex flex-wrap gap-1">
                      {agent.tools.map((tool, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-xs px-1.5 py-0"
                        >
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>

      <Badge variant="secondary" className="text-xs">
        Agent
      </Badge>
    </div>
  );
}

export function AgentStatusList({ agents, className }: AgentStatusListProps) {
  if (agents.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        No agents available
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {agents.map((agent) => (
        <AgentStatusItem key={agent.pubkey} agent={agent} />
      ))}
    </div>
  );
}
