import { useCallback, useEffect } from "react";
import { useAtomValue } from "jotai";
import {
  activeProviderAtom,
  voiceSettingsAtom,
  openAIApiKeyAtom,
} from "@/stores/ai-config-store";
import { aiService } from "@/services/ai/ai-service";
import { toast } from "sonner";

export function useAI() {
  const activeProvider = useAtomValue(activeProviderAtom);
  const voiceSettings = useAtomValue(voiceSettingsAtom);
  const openAIApiKey = useAtomValue(openAIApiKeyAtom);

  // Update AI service when provider changes
  useEffect(() => {
    if (activeProvider) {
      aiService.setProvider(activeProvider);
    }
  }, [activeProvider]);

  const cleanupText = useCallback(async (text: string): Promise<string> => {
    try {
      return await aiService.cleanText(text);
    } catch (error) {
      console.error("Text cleanup error:", error);
      toast.error("Failed to clean up text");
      // Return original text on error
      return text;
    }
  }, []);

  const transcribe = useCallback(
    async (audio: Blob): Promise<string> => {
      if (!openAIApiKey) {
        throw new Error("OpenAI API key required for speech-to-text");
      }

      try {
        return await aiService.transcribe(audio, openAIApiKey);
      } catch (error) {
        console.error("Transcription error:", error);
        throw error;
      }
    },
    [openAIApiKey],
  );

  const speak = useCallback(
    async (text: string): Promise<Blob> => {
      if (!voiceSettings.enabled) {
        throw new Error("Text-to-speech is disabled");
      }

      const apiKey =
        voiceSettings.provider === "openai"
          ? openAIApiKey
          : voiceSettings.apiKey;

      if (!apiKey) {
        throw new Error(
          `${voiceSettings.provider} API key required for text-to-speech`,
        );
      }

      if (!voiceSettings.voiceId) {
        throw new Error("No voice selected");
      }

      try {
        return await aiService.speak(
          text,
          voiceSettings.voiceId,
          voiceSettings.provider,
          apiKey,
        );
      } catch (error) {
        console.error("TTS error:", error);
        throw error;
      }
    },
    [voiceSettings, openAIApiKey],
  );

  return {
    // Text operations
    cleanupText,

    // Voice operations
    transcribe,
    speak,

    // Configuration state
    hasProvider: !!activeProvider,
    hasTTS: voiceSettings.enabled && !!voiceSettings.voiceId,
    hasSTT: !!openAIApiKey,

    // Settings
    voiceSettings,
    activeProvider,
  };
}
