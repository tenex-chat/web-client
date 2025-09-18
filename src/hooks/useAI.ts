import { useCallback, useEffect } from "react";
import { useAtomValue } from "jotai";
import {
  activeProviderAtom,
  voiceSettingsAtom,
  sttSettingsAtom,
  openAIApiKeyAtom,
} from "@/stores/ai-config-store";
import { aiService } from "@/services/ai/ai-service";
import { toast } from "sonner";

export function useAI() {
  const activeProvider = useAtomValue(activeProviderAtom);
  const voiceSettings = useAtomValue(voiceSettingsAtom);
  const sttSettings = useAtomValue(sttSettingsAtom);
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
      const provider = sttSettings.provider;
      
      // Check API key requirements based on provider
      if (provider === "whisper" && !openAIApiKey) {
        throw new Error("OpenAI API key required for Whisper speech-to-text");
      }
      
      if (provider === "elevenlabs") {
        // Use the shared ElevenLabs API key from voice settings
        if (!voiceSettings.apiKey) {
          throw new Error("ElevenLabs API key required for ElevenLabs speech-to-text");
        }
      }

      try {
        const apiKey = provider === "whisper" 
          ? openAIApiKey 
          : provider === "elevenlabs" 
            ? voiceSettings.apiKey
            : undefined;
            
        return await aiService.transcribe(audio, provider, apiKey);
      } catch (error) {
        console.error("Transcription error:", error);
        throw error;
      }
    },
    [sttSettings.provider, openAIApiKey, voiceSettings.apiKey],
  );

  const speak = useCallback(
    async (text: string, authorPubkey: string): Promise<Blob> => {
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

      // Determine which voice to use
      if (!voiceSettings.voiceIds || voiceSettings.voiceIds.length === 0) {
        throw new Error("No voices configured");
      }

      let selectedVoiceId: string;
      if (voiceSettings.voiceIds.length === 1) {
        // Single voice - use it for everyone
        selectedVoiceId = voiceSettings.voiceIds[0];
      } else {
        // Multi-voice - use deterministic assignment based on pubkey
        const { getDeterministicVoiceIndex } = await import("@/services/ai/voice-profile-manager");
        const index = getDeterministicVoiceIndex(authorPubkey, voiceSettings.voiceIds.length);
        selectedVoiceId = voiceSettings.voiceIds[index];
      }

      try {
        return await aiService.speak(
          text,
          selectedVoiceId,
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

  const streamSpeak = useCallback(
    async (
      text: string,
      authorPubkey: string,
      onChunk?: (chunk: Uint8Array) => void,
    ): Promise<Blob> => {
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

      // Determine which voice to use
      if (!voiceSettings.voiceIds || voiceSettings.voiceIds.length === 0) {
        throw new Error("No voices configured");
      }

      let selectedVoiceId: string;
      if (voiceSettings.voiceIds.length === 1) {
        // Single voice - use it for everyone
        selectedVoiceId = voiceSettings.voiceIds[0];
      } else {
        // Multi-voice - use deterministic assignment based on pubkey
        const { getDeterministicVoiceIndex } = await import("@/services/ai/voice-profile-manager");
        const index = getDeterministicVoiceIndex(authorPubkey, voiceSettings.voiceIds.length);
        selectedVoiceId = voiceSettings.voiceIds[index];
      }

      try {
        return await aiService.streamSpeak(
          text,
          selectedVoiceId,
          voiceSettings.provider,
          apiKey,
          onChunk,
        );
      } catch (error) {
        console.error("Streaming TTS error:", error);
        throw error;
      }
    },
    [voiceSettings, openAIApiKey],
  );

  // Determine if STT is available based on provider
  const hasSTT = (() => {
    if (!sttSettings.enabled) return false;
    
    switch (sttSettings.provider) {
      case "whisper":
        return !!openAIApiKey;
      case "elevenlabs":
        // Use the shared ElevenLabs API key
        return !!voiceSettings.apiKey;
      case "built-in-chrome":
        // Check if Web Speech API is available
        return !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
      default:
        return false;
    }
  })();

  return {
    // Text operations
    cleanupText,

    // Voice operations
    transcribe,
    speak,
    streamSpeak,

    // Configuration state
    hasProvider: !!activeProvider,
    hasTTS: voiceSettings.enabled && voiceSettings.voiceIds.length > 0,
    hasSTT,

    // Settings
    voiceSettings,
    sttSettings,
    activeProvider,
  };
}
