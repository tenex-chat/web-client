import { useState, useMemo, useEffect } from "react";
import { Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useBrainstormMode } from "@/stores/brainstorm-mode-store";
import { NostrProfile } from "@/components/common/NostrProfile";
import type { AgentInstance } from "@/types/agent";

interface BrainstormModeButtonProps {
  onlineAgents?: AgentInstance[] | null;
  className?: string;
  disabled?: boolean;
}

export function BrainstormModeButton({
  onlineAgents,
  className,
  disabled = false,
}: BrainstormModeButtonProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const {
    currentSession,
    startBrainstormSession,
    clearBrainstormSession,
    setModerator,
    toggleParticipant,
  } = useBrainstormMode();

  // Find the moderator agent
  const moderatorAgent = useMemo(() => {
    if (!currentSession?.moderatorPubkey || !onlineAgents) return null;
    return onlineAgents.find(a => a.pubkey === currentSession.moderatorPubkey);
  }, [currentSession?.moderatorPubkey, onlineAgents]);

  // Dynamic button label
  const buttonLabel = useMemo(() => {
    if (!currentSession || !moderatorAgent) {
      return "Brainstorm Mode";
    }
    return `Brainstorm Mode (${moderatorAgent.slug})`;
  }, [currentSession, moderatorAgent]);

  // Debug state changes
  useEffect(() => {
    console.log("Brainstorm state updated:", {
      session: currentSession,
      moderatorAgent: moderatorAgent?.slug,
      buttonLabel
    });
  }, [currentSession, moderatorAgent, buttonLabel]);

  // Handle opening dropdown and starting session if needed
  const handleOpenChange = (open: boolean) => {
    if (open && !currentSession) {
      // Start a new brainstorm session when opening for the first time
      startBrainstormSession();
    }
    setIsDropdownOpen(open);
  };


  // Handle clearing the session
  const handleClear = () => {
    clearBrainstormSession();
    setIsDropdownOpen(false);
  };

  if (!onlineAgents || onlineAgents.length === 0) {
    return null;
  }

  return (
    <DropdownMenu open={isDropdownOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className={cn(
            "h-8 gap-2 transition-all",
            currentSession ? "px-3 bg-purple-600 hover:bg-purple-700 text-white" : "px-2",
            className
          )}
        >
          <Brain className="h-4 w-4" />
          {currentSession && (
            <span className="text-xs font-medium">{buttonLabel}</span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        align="end" 
        className="w-64"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {!currentSession?.moderatorPubkey ? (
          // Step 1: Select moderator
          <>
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
              Select Moderator
            </DropdownMenuLabel>
            
            {onlineAgents.map((agent) => (
              <DropdownMenuItem
                key={`mod-${agent.pubkey}`}
                onSelect={(e) => {
                  e.preventDefault();
                  setModerator(agent.pubkey);
                }}
                className="flex items-center gap-2 py-2 cursor-pointer"
              >
                <NostrProfile
                  pubkey={agent.pubkey}
                  variant="avatar"
                  size="xs"
                  fallback={agent.slug}
                  className="h-5 w-5"
                />
                <span className="text-sm">{agent.slug}</span>
              </DropdownMenuItem>
            ))}
          </>
        ) : (
          // Step 2: Select participants
          <>
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
              Moderator: {moderatorAgent?.slug}
            </DropdownMenuLabel>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
              Select Participants
            </DropdownMenuLabel>

            {onlineAgents
              .filter(agent => agent.pubkey !== currentSession.moderatorPubkey)
              .map((agent) => (
                <DropdownMenuCheckboxItem
                  key={`part-${agent.pubkey}`}
                  checked={currentSession.participantPubkeys.includes(agent.pubkey)}
                  onCheckedChange={() => toggleParticipant(agent.pubkey)}
                  onSelect={(e) => e.preventDefault()}
                  className="flex items-center gap-2 py-2"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <NostrProfile
                      pubkey={agent.pubkey}
                      variant="avatar"
                      size="xs"
                      fallback={agent.slug}
                      className="h-5 w-5"
                    />
                    <span className="text-sm">{agent.slug}</span>
                  </div>
                </DropdownMenuCheckboxItem>
              ))}

            {onlineAgents.filter(agent => agent.pubkey !== currentSession.moderatorPubkey).length === 0 && (
              <div className="text-xs text-muted-foreground px-2 py-2">
                No other agents available as participants
              </div>
            )}

            <DropdownMenuSeparator />
            
            <DropdownMenuItem
              onClick={handleClear}
              className="text-xs text-muted-foreground"
            >
              Clear Brainstorm Mode
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}