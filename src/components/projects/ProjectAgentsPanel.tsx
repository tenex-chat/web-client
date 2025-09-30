import { useState } from "react";
import {
  useNDK,
  useNDKCurrentUser,
  useSubscribe,
  useUser,
  useProfileValue,
} from "@nostr-dev-kit/ndk-hooks";
import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Bot, UserMinus, Users } from "lucide-react";
import { NDKProject } from "@/lib/ndk-events/NDKProject";

interface ProjectAgentsPanelProps {
  project: NDKProject;
}

interface AgentItemProps {
  pubkey: string;
  isSelected: boolean;
  onToggle: (pubkey: string) => void;
}

function AgentItem({ pubkey, isSelected, onToggle }: AgentItemProps) {
  const user = useUser(pubkey);
  const profile = useProfileValue(user);
  const name = profile?.displayName || profile?.name || pubkey.slice(0, 8);
  const avatarUrl = profile?.image || profile?.picture;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle(pubkey)}
        className="ml-1"
      />

      <Avatar className="h-10 w-10">
        <AvatarImage src={avatarUrl} alt={name} />
        <AvatarFallback>
          <Bot className="w-5 h-5" />
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {pubkey.slice(0, 8)}...{pubkey.slice(-8)}
        </p>
      </div>
    </div>
  );
}

export function ProjectAgentsPanel({ project }: ProjectAgentsPanelProps) {
  const { ndk } = useNDK();
  const currentUser = useNDKCurrentUser();
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [isRemoving, setIsRemoving] = useState(false);

  // Subscribe to the project event to get current agents
  const { events } = useSubscribe(
    project.pubkey && project.dTag
      ? [
          {
            kinds: [31933],
            authors: [project.pubkey],
            "#d": [project.dTag],
          },
        ]
      : [],
    {
      closeOnEose: true,
    },
  );

  const projectEvent = events?.[0];
  const agentPubkeys =
    projectEvent?.tags.filter((tag) => tag[0] === "p").map((tag) => tag[1]) ||
    [];

  const isOwner = currentUser?.pubkey === project.pubkey;
  const hasSelectedAgents = selectedAgents.size > 0;

  const handleToggleAgent = (pubkey: string) => {
    setSelectedAgents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(pubkey)) {
        newSet.delete(pubkey);
      } else {
        newSet.add(pubkey);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedAgents.size === agentPubkeys.length) {
      setSelectedAgents(new Set());
    } else {
      setSelectedAgents(new Set(agentPubkeys));
    }
  };

  const handleRemoveAgents = async () => {
    if (!projectEvent || !ndk || !currentUser) return;

    // Verify ownership
    if (projectEvent.pubkey !== currentUser.pubkey) {
      toast.error("Only the project owner can remove agents");
      return;
    }

    if (selectedAgents.size === 0) {
      toast.error("No agents selected");
      return;
    }

    setIsRemoving(true);
    try {
      // Create new event from the existing one
      const newEvent = new NDKEvent(ndk, projectEvent.rawEvent());

      // Remove selected agent p tags
      newEvent.tags = newEvent.tags.filter(
        (tag) => !(tag[0] === "p" && selectedAgents.has(tag[1])),
      );

      // Sign and publish the updated event
      await newEvent.sign();
      await newEvent.publish();

      toast.success(
        `Successfully removed ${selectedAgents.size} agent${selectedAgents.size > 1 ? "s" : ""}`,
      );
      setSelectedAgents(new Set());
    } catch (error) {
      console.error("Failed to remove agents:", error);
      toast.error("Failed to remove agents");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Project Agents</CardTitle>
                <CardDescription>
                  Manage agents assigned to this project
                </CardDescription>
              </div>
            </div>
            {isOwner && agentPubkeys.length > 0 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  {selectedAgents.size === agentPubkeys.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveAgents}
                  disabled={!hasSelectedAgents || isRemoving}
                >
                  {isRemoving ? (
                    "Removing..."
                  ) : (
                    <>
                      <UserMinus className="h-4 w-4 mr-2" />
                      Remove Selected ({selectedAgents.size})
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!project.pubkey || !project.dTag ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Unable to load project agents</p>
              <p className="text-sm mt-1">Project information is incomplete</p>
            </div>
          ) : agentPubkeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No agents assigned to this project</p>
              <p className="text-sm mt-1">Add agents from the project page</p>
            </div>
          ) : (
            <div className="space-y-2">
              {!isOwner && (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Only the project owner can remove agents
                  </p>
                </div>
              )}

              <div className="grid gap-2">
                {agentPubkeys.map((pubkey) => (
                  <AgentItem
                    key={pubkey}
                    pubkey={pubkey}
                    isSelected={selectedAgents.has(pubkey)}
                    onToggle={handleToggleAgent}
                  />
                ))}
              </div>

              {hasSelectedAgents && (
                <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                  <p className="text-sm text-destructive">
                    {selectedAgents.size} agent
                    {selectedAgents.size > 1 ? "s" : ""} selected for removal
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
