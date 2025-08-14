import { useMemo, useState } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
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
import { useProjectOnlineAgents } from "@/hooks/useProjectOnlineAgents";
import { useProjectOnlineModels } from "@/hooks/useProjectOnlineModels";
import {
  useNDK,
  useNDKCurrentUser,
  useProfile,
} from "@nostr-dev-kit/ndk-hooks";
import { toast } from "sonner";
import type { Message } from "../hooks/useChatMessages";
import type { NDKProject } from "@/lib/ndk-events/NDKProject";

interface ConversationAgentsProps {
  messages: Message[];
  project: NDKProject;
  rootEvent: NDKEvent | null;
}

interface AgentInfo {
  pubkey: string;
  name: string;
  currentModel?: string;
  lastMessageId?: string;
}

export function ConversationAgents({
  messages,
  project,
  rootEvent,
}: ConversationAgentsProps) {
  const { ndk } = useNDK();
  const user = useNDKCurrentUser();
  useProfile(user?.pubkey || "");
  const onlineAgents = useProjectOnlineAgents(project.dTag);
  const availableModels = useProjectOnlineModels(project.dTag);
  const [sendingModelChange, setSendingModelChange] = useState<string | null>(
    null,
  );

  // Extract unique agents from the conversation
  const conversationAgents = useMemo(() => {
    const agentsMap = new Map<string, AgentInfo>();

    // Go through messages to find unique agents
    messages.forEach((message) => {
      const pubkey = message.event.pubkey;

      // Skip if it's the user
      if (pubkey === user?.pubkey) {
        return;
      }

      // Find agent info from online agents
      const agentInfo = onlineAgents.find((a) => a.pubkey === pubkey);
      if (agentInfo) {
        if (!agentsMap.has(pubkey)) {
          agentsMap.set(pubkey, {
            pubkey,
            name: agentInfo.name,
            lastMessageId: message.id,
          });
        } else {
          // Update last message ID
          const existing = agentsMap.get(pubkey)!;
          existing.lastMessageId = message.id;
        }
      }
    });

    return Array.from(agentsMap.values());
  }, [messages, onlineAgents, user?.pubkey]);

  const handleModelChange = async (agentPubkey: string, newModel: string) => {
    if (!ndk || !user || !rootEvent) return;

    setSendingModelChange(agentPubkey);
    try {
      // Create a model change event (kind 24020)
      const modelChangeEvent = new NDKEvent(ndk);
      modelChangeEvent.kind = 24020;
      modelChangeEvent.content = "";
      modelChangeEvent.tags = [
        ["p", agentPubkey], // Target agent
        ["model", newModel], // New model
        ["a", project.tagId()], // Project reference
        ["e", rootEvent.id, "", "", user.pubkey], // Root event reference with user pubkey
        ["p", user.pubkey], // User pubkey
      ];

      await modelChangeEvent.publish();
      toast.success(`Model changed to ${newModel}`);
    } catch (error) {
      console.error("Failed to change model:", error);
      toast.error("Failed to change model");
    } finally {
      setSendingModelChange(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {/* Show agents with popover for model selection */}
      {conversationAgents.map((agent) => (
        <Popover key={agent.pubkey}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1 group text-sm hover:bg-accent/50 px-2 py-1 rounded-md transition-colors">
              <span className="font-medium transition-all group-hover:underline">
                {project.title || project.dTag} / {agent.name}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold">
                  {project.title || project.dTag} / {agent.name}
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
                    value={agent.currentModel}
                    onValueChange={(value) =>
                      handleModelChange(agent.pubkey, value)
                    }
                    disabled={sendingModelChange === agent.pubkey}
                  >
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((model) => (
                        <SelectItem
                          key={`${model.provider}-${model.model}`}
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
            </div>
          </PopoverContent>
        </Popover>
      ))}
    </div>
  );
}
