import { useState, useMemo } from "react";
import { useNDK, useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { useNavigate } from "@tanstack/react-router";
import { Package, Plus } from "lucide-react";
import { SearchBar } from "@/components/common/SearchBar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NDKAgentDefinitionPack } from "@/lib/ndk-events/NDKAgentDefinitionPack";
import { PackCard } from "./PackCard";
import { CreatePackDialog } from "@/components/dialogs/CreatePackDialog";
import { useNDKCurrentUser } from "@nostr-dev-kit/ndk-hooks";
import { type NDKKind } from "@nostr-dev-kit/ndk-hooks";

export function AgentPacksPage() {
  const { ndk } = useNDK();
  const user = useNDKCurrentUser();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Fetch all packs (kind 34199)
  const { events: rawPacks } = useSubscribe([
    { kinds: [NDKAgentDefinitionPack.kind as NDKKind] },
  ]);

  // Convert raw events to NDKAgentDefinitionPack instances
  const packs = useMemo(() => {
    return (rawPacks || []).map(
      (event) => new NDKAgentDefinitionPack(ndk || undefined, event.rawEvent()),
    );
  }, [rawPacks, ndk]);

  // Filter packs based on search query
  const filteredPacks = useMemo(() => {
    if (!searchQuery) return packs;

    const query = searchQuery.toLowerCase();
    return packs.filter(
      (pack) =>
        pack.title?.toLowerCase().includes(query) ||
        pack.description?.toLowerCase().includes(query),
    );
  }, [packs, searchQuery]);

  const handlePackClick = (pack: NDKAgentDefinitionPack) => {
    const naddr = pack.encode();
    navigate({
      to: "/agents/packs/$naddr",
      params: { naddr },
    });
  };

  const handleCreatePack = () => {
    setCreateDialogOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold">Agent Packs</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Curated collections of AI agents for specific workflows
              </p>
            </div>
            {user && (
              <Button onClick={handleCreatePack}>
                <Plus className="w-4 h-4 mr-2" />
                Create Pack
              </Button>
            )}
          </div>

          {/* Search */}
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search packs by name or description..."
          />
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-6xl mx-auto p-4">
          {filteredPacks.length === 0 ? (
            <EmptyState
              icon={<Package className="w-12 h-12" />}
              title={searchQuery ? "No packs found" : "No agent packs yet"}
              description={
                searchQuery
                  ? "Try adjusting your search query"
                  : user
                    ? "Create your first agent pack to get started"
                    : "Sign in to create and manage agent packs"
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredPacks.map((pack) => (
                <PackCard
                  key={pack.id}
                  pack={pack}
                  onClick={() => handlePackClick(pack)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <CreatePackDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
