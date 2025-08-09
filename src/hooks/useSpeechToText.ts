import { useCallback } from "react";
import { toast } from "sonner";

export function useSpeechToText() {
    const transcribe = useCallback(async (audioBlob: Blob): Promise<string | null> => {
        try {
            // Get OpenAI API key from environment
            const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
            if (!apiKey) {
                console.warn("OpenAI API key not configured, skipping transcription");
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
                const error = await response.json();
                throw new Error(error.error?.message || "Transcription failed");
            }

            const data = await response.json();
            return data.text || null;
        } catch (error) {
            console.error("Transcription error:", error);
            toast.error("Failed to transcribe audio");
            return null;
        }
    }, []);

    return { transcribe };
}