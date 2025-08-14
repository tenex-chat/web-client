import { useCallback } from "react";
import { DEFAULT_MODELS } from "@/services/llm-models";

export function useLLM() {
    const cleanupText = useCallback(async (text: string): Promise<string> => {
        try {
            // Get OpenAI API key from environment
            const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
            if (!apiKey) {
                // If no API key, just return the original text with basic cleanup
                return text.trim()
                    .replace(/\s+/g, ' ')
                    .replace(/([.!?])\s*([a-z])/g, (_, p1, p2) => `${p1} ${p2.toUpperCase()}`);
            }

            // Use GPT to clean up the transcription
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: DEFAULT_MODELS.openai,
                    messages: [
                        {
                            role: "system",
                            content: "You are a helpful assistant that cleans up voice transcriptions. Fix any grammar, punctuation, and capitalization issues. Remove filler words like 'um', 'uh', etc. Keep the meaning and tone exactly the same. Return only the cleaned text without any additional commentary."
                        },
                        {
                            role: "user",
                            content: text
                        }
                    ],
                    temperature: 0.3,
                    max_tokens: 500,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to clean up text");
            }

            const data = await response.json();
            return data.choices[0]?.message?.content || text;
        } catch (error) {
            console.error("Text cleanup error:", error);
            // Return original text with basic cleanup on error
            return text.trim()
                .replace(/\s+/g, ' ')
                .replace(/([.!?])\s*([a-z])/g, (_, p1, p2) => `${p1} ${p2.toUpperCase()}`);
        }
    }, []);

    return { cleanupText };
}