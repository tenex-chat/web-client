import { useCallback } from "react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useAtomValue } from "jotai";
import { openAIApiKeyAtom } from "@/stores/ai-config-store";

export function useSpeechToText() {
    const apiKey = useAtomValue(openAIApiKeyAtom);
    
    const transcribe = useCallback(async (audioBlob: Blob): Promise<string | null> => {
        try {
            
            if (!apiKey) {
                const errorMsg = "OpenAI API key not configured. Please configure it in Settings > AI > Speech-to-Text";
                logger.warn(errorMsg);
                toast.error(errorMsg, {
                    duration: 5000,
                    action: {
                        label: "Go to Settings",
                        onClick: () => {
                            // Navigate to settings page
                            window.location.href = '/#/settings?tab=stt';
                        }
                    }
                });
                return null;
            }

            // Create FormData with the audio file
            const formData = new FormData();
            formData.append("file", audioBlob, "audio.webm");
            formData.append("model", "whisper-1");
            formData.append("language", "en");

            // Send to OpenAI Whisper API
            const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}` } }));
                const errorMessage = errorData.error?.message || `Transcription failed (${response.status})`;
                
                // Provide specific error messages for common issues
                if (response.status === 401) {
                    throw new Error("Invalid OpenAI API key. Please check your settings.");
                } else if (response.status === 429) {
                    throw new Error("OpenAI rate limit exceeded. Please try again later.");
                } else if (response.status === 400) {
                    throw new Error("Invalid audio format or request. Please try again.");
                } else {
                    throw new Error(errorMessage);
                }
            }

            const data = await response.json();
            
            if (!data.text) {
                logger.warn("No transcription text received from OpenAI");
                toast.warning("No speech detected in the audio");
                return null;
            }
            
            logger.info("Transcription successful");
            return data.text;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to transcribe audio";
            logger.error("Transcription error:", error);
            
            // Show detailed error message with action button for API key issues
            if (errorMessage.includes("API key")) {
                toast.error(errorMessage, {
                    duration: 6000,
                    action: {
                        label: "Fix Settings",
                        onClick: () => {
                            window.location.href = '/#/settings?tab=llm';
                        }
                    }
                });
            } else {
                toast.error(errorMessage, { duration: 5000 });
            }
            
            return null;
        }
    }, [apiKey]);

    return { transcribe };
}