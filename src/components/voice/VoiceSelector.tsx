import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMurfVoices, getCountryFromLocale, getLanguageFromLocale } from "@/hooks/useMurfVoices";
import { Loader2, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMurfTTS } from "@/hooks/useMurfTTS";
import { logger } from "@/lib/logger";

interface VoiceSelectorProps {
    value: string;
    onValueChange: (value: string) => void;
    label?: string;
    disabled?: boolean;
    placeholder?: string;
    apiKey?: string;
}

export function VoiceSelector({ 
    value, 
    onValueChange, 
    label = "Text-to-Speech Voice",
    disabled = false,
    placeholder = "Select a voice",
    apiKey
}: VoiceSelectorProps) {
    const { voices, loading, error } = useMurfVoices(apiKey);
    
    const tts = useMurfTTS({
        apiKey: apiKey || '',
        voiceId: value,
        style: 'Conversational',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        enabled: !!apiKey && !!value
    });

    // Filter for English voices only
    const englishVoices = voices.filter(voice => {
        const locale = voice.locale?.toLowerCase() || '';
        const language = voice.displayLanguage?.toLowerCase() || '';
        return locale.startsWith('en') || language.includes('english');
    });

    // Group voices by language and locale
    const groupedVoices = englishVoices.reduce((acc, voice) => {
        const language = voice.displayLanguage || getLanguageFromLocale(voice.locale);
        const country = getCountryFromLocale(voice.locale);
        const key = `${language}${country ? ` (${country})` : ''}`;
        
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(voice);
        return acc;
    }, {} as Record<string, typeof voices>);

    // Sort groups with US/American first, then alphabetically
    const sortedGroups = Object.keys(groupedVoices).sort((a, b) => {
        // Check if either group is US/American
        const aIsUS = a.toLowerCase().includes('us') || a.toLowerCase().includes('america');
        const bIsUS = b.toLowerCase().includes('us') || b.toLowerCase().includes('america');
        
        if (aIsUS && !bIsUS) return -1;
        if (!aIsUS && bIsUS) return 1;
        
        // Otherwise sort alphabetically
        return a.localeCompare(b);
    });

    // Find selected voice for display
    const selectedVoice = englishVoices.find(v => v.voiceId === value);
    
    const handlePlaySample = async () => {
        if (!value || !apiKey) return;
        
        try {
            const sampleText = selectedVoice?.gender === 'Female' 
                ? "Hello! This is a sample of my voice. I can help you with various tasks."
                : "Hello! This is a sample of my voice. I can assist you with your projects.";
            
            await tts.play(sampleText);
        } catch (error) {
            logger.error("Failed to play sample:", error);
        }
    };
    
    const handleStopSample = () => {
        tts.stop();
    };

    if (loading) {
        return (
            <div className="space-y-2">
                {label && <Label htmlFor="voice-select">{label}</Label>}
                <div className="flex items-center justify-center h-10 w-full rounded-md border border-input bg-background px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading voices...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-2">
                {label && <Label htmlFor="voice-select">{label}</Label>}
                <div className="h-10 w-full rounded-md border border-destructive bg-destructive/10 px-3 py-2">
                    <span className="text-sm text-destructive">Failed to load voices: {error.message}</span>
                </div>
            </div>
        );
    }

    if (englishVoices.length === 0) {
        return (
            <div className="space-y-2">
                {label && <Label htmlFor="voice-select">{label}</Label>}
                <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2">
                    <span className="text-sm text-muted-foreground">No English voices available</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {label && <Label htmlFor="voice-select">{label}</Label>}
            <div className="flex gap-2">
                <Select value={value} onValueChange={onValueChange} disabled={disabled}>
                    <SelectTrigger id="voice-select" className="flex-1">
                        <SelectValue placeholder={placeholder}>
                            {selectedVoice ? (
                                `${selectedVoice.displayName} - ${selectedVoice.displayLanguage || getLanguageFromLocale(selectedVoice.locale)}${selectedVoice.accent ? ` (${selectedVoice.accent})` : ''} (${selectedVoice.gender})`
                            ) : (
                                placeholder
                            )}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                        {sortedGroups.map((group) => (
                        <div key={group}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground sticky top-0 bg-background">
                                {group}
                            </div>
                            {groupedVoices[group] && groupedVoices[group].map((voice) => (
                                <SelectItem key={voice.voiceId} value={voice.voiceId}>
                                    <div className="flex items-center justify-between w-full gap-4">
                                        <span className="font-medium">{voice.displayName}</span>
                                        <div className="flex items-center gap-2">
                                            {voice.accent && (
                                                <span className="text-xs text-muted-foreground">
                                                    {voice.accent}
                                                </span>
                                            )}
                                            <span className="text-xs text-muted-foreground">
                                                {voice.gender}
                                            </span>
                                        </div>
                                    </div>
                                </SelectItem>
                            ))}
                        </div>
                    ))}
                    </SelectContent>
                </Select>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={tts.isPlaying ? handleStopSample : handlePlaySample}
                    disabled={!value || !apiKey || disabled}
                    title={tts.isPlaying ? "Stop sample" : "Play sample"}
                >
                    {tts.isPlaying ? (
                        <Square className="w-4 h-4" />
                    ) : (
                        <Play className="w-4 h-4" />
                    )}
                </Button>
            </div>
        </div>
    );
}