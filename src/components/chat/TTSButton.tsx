import { Button } from "@/components/ui/button";
import { Volume2, Square } from "lucide-react";
import { useMemo } from "react";
import { useProjectOnlineAgents } from "@/hooks/useProjectOnlineAgents";
import { useAgentVoiceConfig } from "@/hooks/useAgentVoiceConfig";
import { useTTSPlayer } from "@/hooks/useTTSPlayer";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TTSButtonProps {
  content: string;
  authorPubkey: string;
  messageId: string;
  projectId?: string;
  className?: string;
  size?: "default" | "sm" | "icon";
  variant?: "ghost" | "default" | "outline";
  tooltipEnabled?: boolean;
}

export function TTSButton({
  content,
  authorPubkey,
  messageId,
  projectId,
  className,
  size = "icon",
  variant = "ghost",
  tooltipEnabled = true,
}: TTSButtonProps) {
  const {
    play,
    stop,
    currentMessageId,
    isPlaying,
    hasTTS
  } = useTTSPlayer();

  // Get online agents to find the agent's slug
  const onlineAgents = useProjectOnlineAgents(projectId);

  // Get the agent's slug from the online agents
  const agentSlug = useMemo(() => {
    if (!onlineAgents || onlineAgents.length === 0) return null;
    const agent = onlineAgents.find((a) => a.pubkey === authorPubkey);
    return agent?.slug ?? null;
  }, [onlineAgents, authorPubkey]);

  // Get voice configuration for this agent
  const { config: voiceConfig } = useAgentVoiceConfig(agentSlug ?? undefined);
  const voiceName = voiceConfig?.voiceId || "Default";

  // Check if this message is currently playing
  const isThisMessagePlaying = currentMessageId === messageId && isPlaying;

  // Don't render if TTS is not configured
  if (!hasTTS || !content) return null;

  const handleClick = () => {
    if (isThisMessagePlaying) {
      stop();
    } else {
      play(
        content,
        messageId,
        authorPubkey,
        voiceConfig?.voiceId,
        voiceConfig?.provider
      );
    }
  };

  const button = (
    <Button
      size={size}
      variant={variant}
      className={cn("transition-all", className)}
      onClick={handleClick}
    >
      {isThisMessagePlaying ? (
        <Square className="h-3.5 w-3.5" />
      ) : (
        <Volume2 className="h-3.5 w-3.5" />
      )}
    </Button>
  );

  if (!tooltipEnabled || !voiceName) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">
          {isThisMessagePlaying ? "Stop" : "Play"} TTS ({voiceName})
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
