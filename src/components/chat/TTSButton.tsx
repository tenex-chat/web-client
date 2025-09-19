import { Button } from "@/components/ui/button";
import { Volume2, Square, Pause, Mic } from "lucide-react";
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
    isPaused,
    hasTTS,
    isInterrupted,
    interruptionReason
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

  // Determine icon and styling based on state
  const getButtonIcon = () => {
    if (isThisMessagePlaying && isInterrupted && interruptionReason === "user_speaking") {
      return <Mic className="h-3.5 w-3.5 animate-pulse text-orange-500" />;
    }
    if (isThisMessagePlaying && isPaused) {
      return <Pause className="h-3.5 w-3.5" />;
    }
    if (isThisMessagePlaying) {
      return <Square className="h-3.5 w-3.5" />;
    }
    return <Volume2 className="h-3.5 w-3.5" />;
  };

  const button = (
    <Button
      size={size}
      variant={variant}
      className={cn(
        "transition-all",
        isThisMessagePlaying && isInterrupted && "ring-2 ring-orange-500/50",
        className
      )}
      onClick={handleClick}
    >
      {getButtonIcon()}
    </Button>
  );

  if (!tooltipEnabled || !voiceName) {
    return button;
  }

  const getTooltipText = () => {
    if (isThisMessagePlaying && isInterrupted && interruptionReason === "user_speaking") {
      return "TTS paused - you're speaking";
    }
    if (isThisMessagePlaying && isPaused) {
      return "TTS paused";
    }
    if (isThisMessagePlaying) {
      return `Stop TTS (${voiceName})`;
    }
    return `Play TTS (${voiceName})`;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">
          {getTooltipText()}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
