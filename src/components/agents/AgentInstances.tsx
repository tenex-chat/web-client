import { useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bot, FolderOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/EmptyState";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProjectsStore } from "@/stores/projects";

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

  // Parse profile events to get agent instances with their projects
  const agentInstances = useMemo(() => {
    const projectsMap = useProjectsStore.getState().projects;
    
    return profileEvents.map((event) => {
      // Extract project from "a" tags (NIP-33 reference format: kind:pubkey:d-tag)
      const projectTag = event.tags.find(tag => tag[0] === 'a' && tag[1]?.startsWith('31933:'));
      let projectInfo = null;
      
      if (projectTag) {
        // Parse the NIP-33 reference
        const [, , dTag] = projectTag[1].split(':');
        if (dTag) {
          const project = projectsMap.get(dTag);
          if (project) {
            projectInfo = {
              dTag,
              title: project.title,
              picture: project.picture
            };
          }
        }
      }
      
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
          project: projectInfo,
        };
      } catch {
        return {
          pubkey: event.pubkey,
          name: "Unnamed Agent",
          created_at: event.created_at,
          project: projectInfo,
        };
      }
    });
  }, [profileEvents]);

  const handleAgentClick = (pubkey: string) => {
    navigate({ to: "/p/$pubkey", params: { pubkey } });
  };

  const handleProjectClick = (e: React.MouseEvent, dTag: string) => {
    e.stopPropagation(); // Prevent agent card click
    navigate({ to: "/projects/$projectId", params: { projectId: dTag } });
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
                  {agent.project && (
                    <div 
                      className="flex items-center gap-2 mt-2 p-2 bg-muted/50 rounded hover:bg-muted/70 transition-colors cursor-pointer"
                      onClick={(e) => handleProjectClick(e, agent.project!.dTag)}
                    >
                      <FolderOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-medium truncate">
                        {agent.project.title}
                      </span>
                    </div>
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
