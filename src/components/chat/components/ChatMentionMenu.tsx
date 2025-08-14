import { cn } from "@/lib/utils";
import { ProfileDisplay } from "@/components/common/ProfileDisplay";
import { ChevronRight, ChevronDown } from "lucide-react";

interface AgentInstance {
  pubkey: string;
  name: string;
  projectName?: string;
  projectDTag?: string;
}

interface ProjectGroup {
  projectName: string;
  projectDTag: string;
  agents: AgentInstance[];
  isCurrentProject?: boolean;
}

interface ChatMentionMenuProps {
  showAgentMenu: boolean;
  filteredAgents?: AgentInstance[];
  filteredProjectGroups?: ProjectGroup[];
  selectedAgentIndex: number;
  insertMention: (agent: AgentInstance) => void;
  expandedProjects?: Set<string>;
  toggleProjectExpansion?: (projectDTag: string) => void;
}

/**
 * Mention menu component
 * Displays agent suggestions for @mentions in a hierarchical project structure
 */
export function ChatMentionMenu({
  showAgentMenu,
  filteredAgents,
  filteredProjectGroups,
  selectedAgentIndex,
  insertMention,
  expandedProjects = new Set(),
  toggleProjectExpansion,
}: ChatMentionMenuProps) {
  if (!showAgentMenu) return null;

  // If we have project groups, use hierarchical display
  if (filteredProjectGroups && filteredProjectGroups.length > 0) {
    return (
      <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border rounded-md shadow-lg p-2 max-h-64 overflow-y-auto z-50">
        {filteredProjectGroups.map((group) => {
          const isExpanded =
            group.isCurrentProject || expandedProjects.has(group.projectDTag);

          return (
            <div key={group.projectDTag} className="mb-1">
              {/* Current project agents - no header, always visible, no prefix */}
              {group.isCurrentProject ? (
                <div>
                  {group.agents.map((agent) => (
                    <button
                      key={agent.pubkey}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded hover:bg-accent transition-colors",
                        "flex items-center gap-2",
                      )}
                      onClick={() => insertMention(agent)}
                    >
                      <ProfileDisplay
                        pubkey={agent.pubkey}
                        showName={false}
                        avatarClassName="h-5 w-5"
                      />
                      <span className="text-sm truncate">{agent.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  {/* Other projects - collapsible headers */}
                  <button
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-accent/50 transition-colors flex items-center gap-1"
                    onClick={() => toggleProjectExpansion?.(group.projectDTag)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium text-muted-foreground">
                      {group.projectName}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      ({group.agents.length})
                    </span>
                  </button>

                  {/* Agents list - only visible when expanded */}
                  {isExpanded && (
                    <div className="ml-4">
                      {group.agents.map((agent) => (
                        <button
                          key={agent.pubkey}
                          className={cn(
                            "w-full text-left px-2 py-1.5 rounded hover:bg-accent transition-colors",
                            "flex items-center gap-2",
                          )}
                          onClick={() => insertMention(agent)}
                        >
                          <ProfileDisplay
                            pubkey={agent.pubkey}
                            showName={false}
                            avatarClassName="h-5 w-5"
                          />
                          <span className="text-sm truncate">{agent.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback to simple list display (if no project groups provided)
  if (!filteredAgents || filteredAgents.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border rounded-md shadow-lg p-2 max-h-48 overflow-y-auto z-50">
      {filteredAgents.map((agent, index) => (
        <button
          key={agent.pubkey}
          className={cn(
            "w-full text-left px-3 py-2 rounded hover:bg-accent transition-colors",
            index === selectedAgentIndex && "bg-accent",
          )}
          onClick={() => insertMention(agent)}
        >
          <div className="flex items-center gap-2">
            <ProfileDisplay
              pubkey={agent.pubkey}
              showName={false}
              avatarClassName="h-6 w-6"
            />
            <span className="text-sm font-medium truncate">{agent.name}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
