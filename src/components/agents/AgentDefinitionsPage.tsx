import { type NDKKind } from "@nostr-dev-kit/ndk-hooks";
import { useNDK, useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { Bot, Plus, Package, ChevronRight } from "lucide-react";
import { SearchBar } from "@/components/common/SearchBar";
import { useState, useMemo } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { NDKAgentDefinition } from "@/lib/ndk-events/NDKAgentDefinition";
import { NDKAgentDefinitionPack } from "@/lib/ndk-events/NDKAgentDefinitionPack";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNDKCurrentUser } from "@nostr-dev-kit/ndk-hooks";
import { CreateAgentDialog } from "@/components/dialogs/CreateAgentDialog";
import { CreatePackDialog } from "@/components/dialogs/CreatePackDialog";
import { AgentDefinitionCard } from "./AgentDefinitionCard";
import { PackCard } from "./PackCard";
import { getRoleColor } from "@/lib/utils/role-colors";

type FilterType = "all" | "owned" | "subscribed";

export function AgentDefinitionsPage() {
  const { ndk } = useNDK();
  const user = useNDKCurrentUser();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [createAgentDialogOpen, setCreateAgentDialogOpen] = useState(false);
  const [createPackDialogOpen, setCreatePackDialogOpen] = useState(false);

  // Fetch all agents (kind 4199)
  const { events: rawAgents } = useSubscribe(
    [{ kinds: [NDKAgentDefinition.kind as NDKKind] }]
  );

  // Fetch all packs (kind 34199)
  const { events: rawPacks } = useSubscribe(
    [{ kinds: [NDKAgentDefinitionPack.kind as NDKKind] }]
  );

  // Convert raw events to NDKAgentDefinition instances and filter to latest versions only
  const agents = useMemo(() => {
    const allAgents = (rawAgents || []).map(
      (event) => new NDKAgentDefinition(ndk || undefined, event.rawEvent()),
    );

    // Group agents by slug/d-tag/name (without author) to show only latest version across all authors
    const agentGroups = new Map<string, NDKAgentDefinition[]>();

    allAgents.forEach((agent) => {
      // Priority: d-tag/slug > name > id
      const identifier = agent.slug || agent.dTag || agent.name || agent.id;
      const groupKey = identifier;

      if (!agentGroups.has(groupKey)) {
        agentGroups.set(groupKey, []);
      }
      agentGroups.get(groupKey)!.push(agent);
    });

    // For each group, keep only the latest version
    const latestAgents: NDKAgentDefinition[] = [];

    agentGroups.forEach((groupAgents) => {
      if (groupAgents.length === 1) {
        latestAgents.push(groupAgents[0]);
      } else {
        // Sort by created_at timestamp (newest first) and version number
        const sorted = groupAgents.sort((a, b) => {
          // First try to compare by created_at timestamp
          const timeA = a.created_at || 0;
          const timeB = b.created_at || 0;
          if (timeA !== timeB) {
            return timeB - timeA; // Newer timestamp first
          }

          // If timestamps are equal, compare by version number
          const versionA = parseInt(a.version || "0");
          const versionB = parseInt(b.version || "0");
          return versionB - versionA; // Higher version first
        });

        latestAgents.push(sorted[0]);
      }
    });

    return latestAgents;
  }, [rawAgents, ndk]);

  // Convert raw pack events to NDKAgentDefinitionPack instances
  const packs = useMemo(() => {
    return (rawPacks || []).map(
      (event) => new NDKAgentDefinitionPack(ndk || undefined, event.rawEvent())
    ).slice(0, 10); // Limit to 10 for horizontal scroll
  }, [rawPacks, ndk]);

  // Filter agents based on search query and filter
  const filteredAgents = useMemo(() => {
    let filtered = agents;

    // Filter by filter type
    if (activeFilter === "owned" && user) {
      filtered = filtered.filter((agent) => agent.pubkey === user.pubkey);
    } else if (activeFilter === "subscribed" && user) {
      // Show agents from other users (subscribed agents would be filtered here when subscription system is ready)
      filtered = filtered.filter((agent) => agent.pubkey !== user.pubkey);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (agent) =>
          agent.name?.toLowerCase().includes(query) ||
          agent.description?.toLowerCase().includes(query) ||
          agent.role?.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [agents, searchQuery, activeFilter, user]);

  const handleAgentClick = (agent: NDKAgentDefinition) => {
    navigate({
      to: "/agent-definition/$agentDefinitionEventId",
      params: { agentDefinitionEventId: agent.id },
    });
  };

  const handleCreateAgent = () => {
    setCreateAgentDialogOpen(true);
  };

  const handleCreatePack = () => {
    setCreatePackDialogOpen(true);
  };

  const handlePackClick = (pack: NDKAgentDefinitionPack) => {
    const naddr = pack.encode();
    navigate({
      to: "/agents/packs/$naddr",
      params: { naddr }
    });
  };


  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold">Agent Definitions</h1>
              <p className="text-sm text-muted-foreground mt-1">
                AI assistant templates that can be instantiated for your
                projects
              </p>
            </div>
            <div className="flex gap-2">
              {user && (
                <>
                  <Button variant="outline" onClick={handleCreatePack}>
                    <Package className="w-4 h-4 mr-2" />
                    Create Pack
                  </Button>
                  <Button onClick={handleCreateAgent}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Agent
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Featured Packs Section */}
          {packs.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-medium text-muted-foreground">Featured Packs</h2>
                <div className="flex items-center gap-2">
                  <Link to="/agents/packs">
                    <Button variant="ghost" size="sm">
                      See all
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
              
              {/* Horizontal scroll container */}
              <div className="overflow-x-auto">
                <div className="flex gap-4 pb-2">
                  {packs.map((pack) => (
                    <div key={pack.id} className="flex-shrink-0">
                      <PackCard
                        pack={pack}
                        onClick={() => handlePackClick(pack)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Search and Filter */}
          <div className="flex gap-3">
            <div className="flex-1">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search agents by name, description, or role..."
              />
            </div>
            {user && (
              <Select
                value={activeFilter}
                onValueChange={(v) => setActiveFilter(v as FilterType)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Definitions</SelectItem>
                  <SelectItem value="owned">My Definitions</SelectItem>
                  <SelectItem value="subscribed">Subscribed</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-6xl mx-auto p-4">
          {filteredAgents.length === 0 ? (
            <EmptyState
              icon={<Bot className="w-12 h-12" />}
              title={
                searchQuery
                  ? "No agent definitions found"
                  : "No agent definitions yet"
              }
              description={
                searchQuery
                  ? "Try adjusting your search query"
                  : user
                    ? "Create your first agent definition to get started"
                    : "Sign in to create and manage agent definitions"
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAgents.map((agent) => (
                <AgentDefinitionCard
                  key={agent.id}
                  agent={agent}
                  onClick={() => handleAgentClick(agent)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <CreateAgentDialog
        open={createAgentDialogOpen}
        onOpenChange={setCreateAgentDialogOpen}
      />
      <CreatePackDialog
        open={createPackDialogOpen}
        onOpenChange={setCreatePackDialogOpen}
      />
    </div>
  );
}
