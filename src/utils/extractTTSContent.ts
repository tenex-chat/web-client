/**
 * Extracts clean content for TTS by removing thinking blocks and other non-spoken elements
 */
export function extractTTSContent(content: string): string {
    if (!content) return '';
    
    let cleanContent = content;
    
    // Remove thinking blocks
    cleanContent = cleanContent.replace(/<thinking>[\s\S]*?<\/thinking>/g, '');
    
    // Remove code blocks (they're not great for TTS)
    cleanContent = cleanContent.replace(/```[\s\S]*?```/g, ' [code block] ');
    
    // Remove inline code but keep a marker
    cleanContent = cleanContent.replace(/`[^`]+`/g, (match) => {
        // If it's a short inline code (like a variable name), keep it
        const code = match.slice(1, -1);
        if (code.length <= 20) {
            return code;
        }
        return ' [code] ';
    });
    
    // Remove markdown formatting but keep the text
    cleanContent = cleanContent.replace(/\*\*([^*]+)\*\*/g, '$1'); // Bold
    cleanContent = cleanContent.replace(/\*([^*]+)\*/g, '$1'); // Italic
    cleanContent = cleanContent.replace(/__([^_]+)__/g, '$1'); // Bold
    cleanContent = cleanContent.replace(/_([^_]+)_/g, '$1'); // Italic
    
    // Replace headers with just text
    cleanContent = cleanContent.replace(/^#{1,6}\s+(.+)$/gm, '$1');
    
    // Replace links with just the text
    cleanContent = cleanContent.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    
    // Replace nostr: links with "nostr link"
    cleanContent = cleanContent.replace(/nostr:[a-zA-Z0-9]+/g, ' [nostr link] ');
    
    // Clean up multiple spaces and newlines
    cleanContent = cleanContent.replace(/\s+/g, ' ');
    cleanContent = cleanContent.trim();
    
    return cleanContent;
}

/**
 * Gets a preview of TTS content (first 100 chars)
 */
export function getTTSPreview(content: string): string {
    const clean = extractTTSContent(content);
    if (clean.length <= 100) return clean;
    return clean.substring(0, 100) + '...';
}