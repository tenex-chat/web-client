import { useCallback } from "react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useAI } from "./useAI";

export function useSpeechToText() {
  const { transcribe: aiTranscribe, hasSTT, sttSettings } = useAI();

  const transcribe = useCallback(
    async (audioBlob: Blob): Promise<string | null> => {
      try {
        if (!hasSTT) {
          let errorMsg = "Speech-to-text not configured properly.";
          
          if (!sttSettings.enabled) {
            errorMsg = "Speech-to-text is disabled. Please enable it in Settings > AI";
          } else {
            switch (sttSettings.provider) {
              case "whisper":
                errorMsg = "OpenAI API key not configured. Please configure it in Settings > AI";
                break;
              case "elevenlabs":
                errorMsg = "ElevenLabs API key not configured. Please configure it in Settings > AI";
                break;
              case "built-in-chrome":
                errorMsg = "Web Speech API is not supported in this browser";
                break;
            }
          }
          
          logger.warn(errorMsg);
          toast.error(errorMsg, {
            duration: 5000,
            action: {
              label: "Go to Settings",
              onClick: () => {
                window.location.href = "/#/settings?tab=ai";
              },
            },
          });
          return null;
        }

        logger.info("Starting transcription...");
        const text = await aiTranscribe(audioBlob);

        if (!text) {
          logger.warn("No transcription text received");
          toast.warning("No speech detected in the audio");
          return null;
        }

        logger.info("Transcription successful");
        return text;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to transcribe audio";
        logger.error("Transcription error:", error);

        // Show detailed error message with action button for API key issues
        if (errorMessage.includes("API key")) {
          toast.error(errorMessage, {
            duration: 6000,
            action: {
              label: "Fix Settings",
              onClick: () => {
                window.location.href = "/#/settings?tab=ai";
              },
            },
          });
        } else if (errorMessage.includes("rate limit")) {
          const provider = sttSettings.provider === "elevenlabs" ? "ElevenLabs" : "OpenAI";
          toast.error(`${provider} rate limit exceeded. Please try again later.`, {
            duration: 5000,
          });
        } else {
          toast.error(errorMessage, { duration: 5000 });
        }

        return null;
      }
    },
    [aiTranscribe, hasSTT, sttSettings],
  );

  return { transcribe };
}
