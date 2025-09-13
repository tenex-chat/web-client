import { useState } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { useNDK, useEvent } from "@nostr-dev-kit/ndk-hooks";
import { useNDKCurrentUser, useProfileValue } from "@nostr-dev-kit/ndk-hooks";
import { Package, Plus, Users, Copy, ArrowLeft, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { NDKAgentDefinitionPack } from "@/lib/ndk-events/NDKAgentDefinitionPack";
import { AgentDefinitionFromId } from "./AgentDefinitionFromId";
import { EmptyState } from "@/components/common/EmptyState";
import { AddPackToProjectDialog } from "@/components/dialogs/AddPackToProjectDialog";
import { CreatePackDialog } from "@/components/dialogs/CreatePackDialog";
import { getPackColor } from "@/lib/utils/pack-colors";

export function AgentPackDetailPage() {
  const { naddr } = useParams({ from: "/_auth/agents/packs/$naddr" });
  const { ndk } = useNDK();
  const user = useNDKCurrentUser();
  const navigate = useNavigate();
  const [addToProjectOpen, setAddToProjectOpen] = useState(false);
  const [forkDialogOpen, setForkDialogOpen] = useState(false);

  // Fetch the pack event directly using useEvent hook with bech32 address
  const packEvent = useEvent(naddr);
  const pack = packEvent ? new NDKAgentDefinitionPack(ndk, packEvent) : null;

  const profile = useProfileValue(pack?.pubkey);

  const isAuthor = user?.pubkey === pack?.pubkey;

  const handleForkOrEdit = () => {
    setForkDialogOpen(true);
  };

  const handleAddToProject = () => {
    setAddToProjectOpen(true);
  };

  if (!pack) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <EmptyState
          icon={<Package className="w-12 h-12" />}
          title="Pack not found"
          description="This pack might have been deleted or doesn't exist"
        />
      </div>
    );
  }

  const backgroundColor = pack.image
    ? undefined
    : getPackColor(pack.id || pack.title || "default");

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <div className="relative h-64 overflow-hidden">
        {pack.image ? (
          <>
            <img
              src={pack.image}
              alt={pack.title || "Pack cover"}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          </>
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor }}
          >
            <Package className="w-24 h-24 text-white/80" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          </div>
        )}

        {/* Back button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 bg-black/20 backdrop-blur-sm hover:bg-black/40 text-white"
          onClick={() => navigate({ to: "/agents/packs" })}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        {/* Content overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">
              {pack.title || "Untitled Pack"}
            </h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 border-2 border-white/20">
                  <AvatarImage
                    src={profile?.image || profile?.picture}
                    alt={profile?.name || "Author"}
                  />
                  <AvatarFallback className="text-xs bg-white/20">
                    {profile?.name?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">
                  {profile?.name || profile?.displayName || "Anonymous"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span className="text-sm">
                  {pack.agentEventIds.length} agent
                  {pack.agentEventIds.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">
              {pack.description || "No description available"}
            </p>
            <div className="flex gap-2">
              {user && (
                <Button variant="outline" onClick={handleForkOrEdit}>
                  {isAuthor ? (
                    <>
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Fork Pack
                    </>
                  )}
                </Button>
              )}
              <Button onClick={handleAddToProject}>
                <Plus className="w-4 h-4 mr-2" />
                Add to Project
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <ScrollArea className="flex-1">
        <div className="max-w-6xl mx-auto p-6">
          <h2 className="text-lg font-semibold mb-4">Agents in this Pack</h2>
          {pack.agentEventIds.length === 0 ? (
            <EmptyState
              icon={<Users className="w-12 h-12" />}
              title="No agents in this pack"
              description="This pack doesn't contain any agent definitions yet"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pack.agentEventIds.map((agentId) => (
                <AgentDefinitionFromId key={agentId} eventId={agentId} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Dialogs */}
      {pack && (
        <>
          <AddPackToProjectDialog
            open={addToProjectOpen}
            onOpenChange={setAddToProjectOpen}
            pack={pack}
          />
          <CreatePackDialog
            open={forkDialogOpen}
            onOpenChange={setForkDialogOpen}
            forkFromPack={isAuthor ? undefined : pack}
            editPack={isAuthor ? pack : undefined}
          />
        </>
      )}
    </div>
  );
}
