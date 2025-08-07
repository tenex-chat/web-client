import { useState, useCallback } from "react";
import { UI_CONSTANTS } from "../lib/ui-constants";

interface UseCopyWithFeedbackReturn {
    copied: boolean;
    copyToClipboard: (text: string) => Promise<void>;
}

/**
 * Custom hook for copying text to clipboard with feedback
 * @param duration Duration in milliseconds to show the feedback (default: 2000)
 * @returns Object with copied state and copyToClipboard function
 */
export function useCopyWithFeedback(
    duration: number = UI_CONSTANTS.TIMEOUTS.COPY_FEEDBACK
): UseCopyWithFeedbackReturn {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = useCallback(
        async (text: string) => {
            try {
                await navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), duration);
            } catch {
                // Fallback for older browsers
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.left = "-999999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand("copy");
                    setCopied(true);
                    setTimeout(() => setCopied(false), duration);
                } finally {
                    document.body.removeChild(textArea);
                }
            }
        },
        [duration]
    );

    return { copied, copyToClipboard };
}