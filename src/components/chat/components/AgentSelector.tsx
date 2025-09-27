import React, { useMemo, useCallback } from "react";
import { Check, ChevronDown, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NostrProfile } from "@/components/common/NostrProfile";
import type { AgentInstance } from "@/types/agent";
import type { Message } from "../hooks/useChatMessages";
import { logger } from "@/lib/logger";

interface AgentSelectorProps {
  onlineAgents: AgentInstance[] | null;
  recentMessages: Message[];
  selectedAgent: string | null;
  onAgentSelect: (agentPubkey: string | null) => void;
  disabled?: boolean;
  className?: string;
}

export function AgentSelector({
  onlineAgents,
  recentMessages,
  selectedAgent,
  onAgentSelect,
  disabled = false,
  className,
}: AgentSelectorProps) {
  const [open, setOpen] = React.useState(false);

  // Determine the default agent based on p-tag logic
  const defaultAgent = useMemo(() => {
    if (!onlineAgents || onlineAgents.length === 0) return null;

    let result = null;

    // If there are recent messages, find the most recent non-user agent
    if (recentMessages.length > 0) {
      const recentAgent = [...recentMessages].reverse().find((msg) => {
        const agent = onlineAgents.find((a) => a.pubkey === msg.event.pubkey);
        return agent !== undefined;
      });

      if (recentAgent) {
        result = recentAgent.event.pubkey;
        logger.debug("[AgentSelector] Default agent from recent messages", {
          agentPubkey: result,
          agentSlug: onlineAgents.find(a => a.pubkey === result)?.slug
        });
        return result;
      }
    }

    // Otherwise, default to the PM (first agent)
    result = onlineAgents[0].pubkey;
    logger.debug("[AgentSelector] Default agent is PM (first agent)", {
      agentPubkey: result,
      agentSlug: onlineAgents[0].slug
    });
    return result;
  }, [onlineAgents, recentMessages]);

  // Use selected agent or default
  const currentAgent = selectedAgent || defaultAgent;

  // Get the agent object for display
  const currentAgentObj = useMemo(() => {
    if (!currentAgent || !onlineAgents) return null;
    return onlineAgents.find((a) => a.pubkey === currentAgent);
  }, [currentAgent, onlineAgents]);

  const handleSelect = useCallback(
    (agentPubkey: string) => {
      const selectedAgentObj = onlineAgents?.find(a => a.pubkey === agentPubkey);
      
      // If selecting the same agent that's already the default and nothing is explicitly selected, do nothing
      if (agentPubkey === defaultAgent && !selectedAgent) {
        logger.debug("[AgentSelector] Selected default agent (no change)", {
          agentPubkey,
          agentSlug: selectedAgentObj?.slug
        });
        setOpen(false);
        return;
      }

      // If selecting the same agent that's already explicitly selected, reset to auto mode
      if (agentPubkey === selectedAgent) {
        logger.info("[AgentSelector] Resetting to auto mode", {
          previousAgent: agentPubkey,
          previousAgentSlug: selectedAgentObj?.slug
        });
        onAgentSelect(null);
      } else {
        logger.info("[AgentSelector] Agent selected", {
          agentPubkey,
          agentSlug: selectedAgentObj?.slug,
          previousAgent: selectedAgent,
          previousAgentSlug: onlineAgents?.find(a => a.pubkey === selectedAgent)?.slug
        });
        onAgentSelect(agentPubkey);
      }
      setOpen(false);
    },
    [defaultAgent, selectedAgent, onAgentSelect, onlineAgents],
  );

  if (!onlineAgents || onlineAgents.length === 0) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "justify-between h-9 px-2",
            "bg-transparent border-0",
            "hover:bg-accent/30",
            "transition-all duration-200",
            className,
          )}
        >
          <div className="flex items-center gap-1.5 truncate">
            {currentAgentObj ? (
              <>
                <NostrProfile
                  pubkey={currentAgentObj.pubkey}
                  variant="avatar"
                  size="xs"
                  fallback={currentAgentObj.slug}
                  className="flex-shrink-0"
                />
                <span className="text-sm truncate">{currentAgentObj.slug}</span>
              </>
            ) : (
              <>
                <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Select agent
                </span>
              </>
            )}
          </div>
          <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 border-0 bg-popover/95 backdrop-blur-sm shadow-sm ring-1 ring-border/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" align="start">
        <Command>
          <CommandInput placeholder="Search agents..." className="h-9" />
          <CommandList>
            <CommandEmpty>No agents found.</CommandEmpty>
            <CommandGroup heading="Project Agents">
              {/* Agent options */}
              {onlineAgents.map((agent) => {
                const isProjectManager =
                  onlineAgents[0].pubkey === agent.pubkey;
                const isSelected = selectedAgent === agent.pubkey;
                const isDefault =
                  !selectedAgent && defaultAgent === agent.pubkey;

                return (
                  <CommandItem
                    key={agent.pubkey}
                    value={agent.slug}
                    onSelect={() => handleSelect(agent.pubkey)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <NostrProfile
                        pubkey={agent.pubkey}
                        variant="avatar"
                        size="sm"
                      />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate">
                            {agent.slug}
                          </span>
                          {isProjectManager && (
                            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              PM
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4 flex-shrink-0",
                        isSelected || isDefault ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
