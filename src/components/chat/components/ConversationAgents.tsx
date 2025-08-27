import { useMemo, useState } from "react";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk-hooks";
import { useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Bot, Save } from "lucide-react";
import { useProjectOnlineAgents } from "@/hooks/useProjectOnlineAgents";
import { useProjectOnlineModels } from "@/hooks/useProjectOnlineModels";
import { useProjectAvailableTools } from "@/hooks/useProjectAvailableTools";
import {
  useNDK,
  useNDKCurrentUser,
  useProfileValue,
} from "@nostr-dev-kit/ndk-hooks";
import type { Message } from "@/components/chat/hooks/useChatMessages";
import type { NDKProject } from "@/lib/ndk-events/NDKProject";

interface ConversationAgentsProps {
  messages: Message[];
  project: NDKProject;
  rootEvent: NDKEvent | null;
}

interface AgentInfo {
  pubkey: string;
  slug?: string;
  model?: string;  // Model slug from the agent
  lastMessageId?: string;
  tools?: string[];
  isProjectAgent?: boolean; // Flag to indicate if this is a project agent
}

function AgentAvatar({
  agent,
  project,
  availableModels,
  availableTools,
  onSaveChanges,
}: {
  agent: AgentInfo;
  project: NDKProject;
  availableModels: any[];
  availableTools: string[];
  onSaveChanges: (
    agentPubkey: string,
    agentSlug: string,
    newModel: string,
    tools: string[],
  ) => Promise<void>;
}) {
  const profile = useProfileValue(agent.pubkey);
  const avatarUrl = profile?.picture;
  const displayName = profile?.displayName || profile?.name || agent.pubkey;
  const isMobile = useIsMobile();

  if (!agent.isProjectAgent) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Avatar className={isMobile ? "h-6 w-6" : "h-7 w-7"}>
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback>
                <Bot className={isMobile ? "w-3 h-3" : "w-3.5 h-3.5"} />
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent>
            <p>{displayName}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Logic for project agents (the popover)
  const [selectedModel, setSelectedModel] = useState(agent.model || "");
  const [selectedTools, setSelectedTools] = useState<Set<string>>(
    new Set(agent.tools || []),
  );
  const [popoverOpen, setPopoverOpen] = useState(false);

  const hasChanges =
    selectedModel !== (agent.model || "") ||
    !setsAreEqual(selectedTools, new Set(agent.tools || []));

  function setsAreEqual<T>(setA: Set<T>, setB: Set<T>): boolean {
    if (setA.size !== setB.size) return false;
    for (const item of setA) {
      if (!setB.has(item)) return false;
    }
    return true;
  }

  const handleToolToggle = (tool: string) => {
    setSelectedTools(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tool)) {
        newSet.delete(tool);
      } else {
        newSet.add(tool);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    try {
      await onSaveChanges(
        agent.pubkey,
        agent.slug,
        selectedModel,
        Array.from(selectedTools),
      );
      setPopoverOpen(false);
    } catch (error) {
      toast.error("Failed to save agent changes");
    }
  };

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <button
          className="group hover:opacity-80 transition-opacity"
          title={displayName}
        >
          <Avatar
            className={
              isMobile
                ? "h-6 w-6"
                : "h-7 w-7 ring-2 ring-transparent hover:ring-accent transition-all"
            }
          >
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback>
              <Bot className={isMobile ? "w-3 h-3" : "w-3.5 h-3.5"} />
            </AvatarFallback>
          </Avatar>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" side="bottom" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold">
              {project.title || project.dTag} / {agent.slug}
            </h4>
            <p className="text-xs text-muted-foreground truncate">
              {agent.pubkey}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Model
            </label>
            {availableModels.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No models available
              </p>
            ) : (
              <Select
                value={selectedModel}
                onValueChange={setSelectedModel}
              >
                <SelectTrigger className="w-full h-8 text-xs">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map(model => (
                    <SelectItem
                      key={model.model}
                      value={model.model}
                      className="text-xs"
                    >
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Tools ({selectedTools.size} selected)
              </label>
              {agent.tools && agent.tools.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  Current: {agent.tools.length}
                </Badge>
              )}
            </div>
            <div className="h-48 overflow-y-auto rounded-md border p-2">
              <div className="space-y-1">
                {availableTools.map(tool => (
                  <div key={tool} className="flex items-center space-x-2 py-1">
                    <Checkbox
                      id={`tool-${tool}`}
                      checked={selectedTools.has(tool)}
                      onCheckedChange={() => handleToolToggle(tool)}
                    />
                    <label
                      htmlFor={`tool-${tool}`}
                      className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                    >
                      {tool}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={!hasChanges}
            size="sm"
            className="w-full"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            Save Changes
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ConversationAgents({
  messages,
  project,
  rootEvent,
}: ConversationAgentsProps) {
  const { ndk } = useNDK();
  const user = useNDKCurrentUser();
  useProfileValue(user?.pubkey || "");
  const onlineAgents = useProjectOnlineAgents(project.dTag);
  const availableModels = useProjectOnlineModels(project.dTag);
  const availableTools = useProjectAvailableTools(project.dTag);

  // Subscribe to ALL events that reference this thread with #E tag
  // This includes nested replies that aren't shown in the main thread
  const { events: threadParticipants } = useSubscribe(
    rootEvent && !rootEvent.tagValue("e") // Only if root event doesn't have an "e" tag
      ? [
          {
            kinds: [NDKKind.GenericReply],
            "#E": [rootEvent.id],
          },
        ]
      : false,
    { closeOnEose: false, groupable: true },
    [rootEvent?.id]
  );

  // Extract unique agents from the conversation
  const conversationAgents = useMemo(() => {
    const agentsMap = new Map<string, AgentInfo>();

    // Go through messages to find unique participants
    messages.forEach((message) => {
      const pubkey = message.event.pubkey;

      // Check if this is a project agent
      const agentInfo = onlineAgents.find((a) => a.pubkey === pubkey);
      
      if (!agentsMap.has(pubkey)) {
        agentsMap.set(pubkey, {
          pubkey,
          slug: agentInfo?.slug,
          model: agentInfo?.model,
          lastMessageId: message.id,
          tools: agentInfo?.tools || [],
          isProjectAgent: !!agentInfo,
        });
      } else {
        // Update last message ID
        const existing = agentsMap.get(pubkey)!;
        existing.lastMessageId = message.id;
      }
    });

    // Also check E-tags in messages to find all participants
    messages.forEach((message) => {
      const eTags = message.event.tags.filter(tag => tag[0] === 'E');
      eTags.forEach(tag => {
        const pubkey = tag[1];
        if (pubkey && pubkey !== user?.pubkey && !agentsMap.has(pubkey)) {
          const agentInfo = onlineAgents.find((a) => a.pubkey === pubkey);
          agentsMap.set(pubkey, {
            pubkey,
            slug: agentInfo?.slug,
            model: agentInfo?.model,
            lastMessageId: message.id,
            tools: agentInfo?.tools || [],
            isProjectAgent: !!agentInfo,
          });
        }
      });
    });

    // If root event doesn't have an "e" tag, also include participants from #E tag references
    if (rootEvent && !rootEvent.tagValue("e") && threadParticipants) {
      threadParticipants.forEach((event) => {
        const pubkey = event.pubkey;

        // Skip if it's the user or already in the map
        if (pubkey === user?.pubkey || agentsMap.has(pubkey)) {
          return;
        }

        // Check if this is a project agent
        const agentInfo = onlineAgents.find((a) => a.pubkey === pubkey);
        agentsMap.set(pubkey, {
          pubkey,
          slug: agentInfo?.slug || 'Agent',
          model: agentInfo?.model,
          lastMessageId: event.id,
          tools: agentInfo?.tools || [],
          isProjectAgent: !!agentInfo,
        });
      });
    }

    return Array.from(agentsMap.values());
  }, [messages, onlineAgents, user?.pubkey, rootEvent, threadParticipants]);

  const handleSaveChanges = async (agentPubkey: string, agentName: string, newModel: string, tools: string[]) => {
    if (!ndk || !user || !rootEvent) return;

    try {
      // Create a model/tools change event (kind 24020)
      const changeEvent = new NDKEvent(ndk);
      changeEvent.kind = 24020;
      changeEvent.content = "";
      changeEvent.tags = [
        ["p", agentPubkey], // Target agent
        ["model", newModel], // New model slug
        ["a", project.tagId()], // Project reference
      ];

      // Add tool tags - one tag per tool
      tools.forEach(tool => {
        changeEvent.tags.push(["tool", tool]);
      });

      await changeEvent.publish();
      toast.success(`Agent settings updated`);
    } catch (error) {
      toast.error("Failed to update agent settings");
      toast.error("Failed to update agent settings");
    }
  };

  const isMobile = useIsMobile();

  return (
    <div className={isMobile ? "flex items-center -space-x-1" : "flex flex-wrap items-center gap-x-1.5 gap-y-1"}>
      {/* Show agents with popover for model selection */}
      {conversationAgents.map((agent, index) => (
        <div key={agent.pubkey} className={isMobile && index > 0 ? "" : ""}>
          <AgentAvatar
            agent={agent}
            project={project}
            availableModels={availableModels}
            availableTools={availableTools}
            onSaveChanges={handleSaveChanges}
          />
        </div>
      ))}
    </div>
  );
}
