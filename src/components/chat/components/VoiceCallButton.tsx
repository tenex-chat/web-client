import { useState } from "react";
import { Phone, PhoneOff, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAI } from "@/hooks/useAI";

interface VoiceCallButtonProps {
  onVoiceCallClick?: () => void;
}

/**
 * Voice call button component
 * Single responsibility: Manage voice call initiation and TTS configuration prompts
 */
export function VoiceCallButton({ onVoiceCallClick }: VoiceCallButtonProps) {
  const [showTTSInfo, setShowTTSInfo] = useState(false);
  const { hasTTS } = useAI();

  if (hasTTS) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={onVoiceCallClick}
        className="w-8 h-8 sm:w-9 sm:h-9 hover:bg-accent"
        aria-label="Start voice call"
      >
        <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
      </Button>
    );
  }

  return (
    <Popover open={showTTSInfo} onOpenChange={setShowTTSInfo}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 sm:w-9 sm:h-9 hover:bg-accent"
          aria-label="Voice mode not configured"
        >
          <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <div className="font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Voice Mode Not Configured
          </div>
          <p className="text-sm text-muted-foreground">
            To enable voice mode, you need to configure Text-to-Speech
            settings.
          </p>
          <p className="text-sm text-muted-foreground">
            Go to Settings → AI and configure your text-to-speech
            settings.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              setShowTTSInfo(false);
              window.location.href = "/settings?tab=tts";
            }}
          >
            Go to Settings
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}