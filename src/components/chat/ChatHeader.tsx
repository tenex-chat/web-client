import type { NDKEvent, NDKProject } from "@nostr-dev-kit/ndk";
import { ArrowLeft, Copy, Check, Phone, PhoneOff } from "lucide-react";
import { useState, useMemo } from "react";
import { copyThreadToClipboard } from "../../lib/utils/copyConversation";
import { useProfilesMap } from "../../hooks/useProfilesMap";
import { ParticipantAvatarsWithModels } from "../common/ParticipantAvatarsWithModels";
import { Button } from "../ui/button";

interface ChatHeaderProps {
    title: string;
    subtitle?: string;
    participants?: string[];
    messages?: NDKEvent[];
    projectPubkey?: string;
    projectId?: string;
    projectEvent?: NDKProject;
    availableModels?: Record<string, unknown>;
    onBack?: () => void;
    autoTTS?: boolean;
    onAutoTTSToggle?: () => void;
}

export function ChatHeader({
    title,
    subtitle,
    participants,
    messages,
    projectPubkey,
    projectId,
    projectEvent,
    availableModels,
    onBack,
    autoTTS = false,
    onAutoTTSToggle,
}: ChatHeaderProps) {
    const [copied, setCopied] = useState(false);

    // Get all unique participants from messages
    const allParticipants = useMemo(() => {
        if (!messages || messages.length === 0) return [];
        const participantSet = new Set<string>();
        for (const message of messages) {
            participantSet.add(message.pubkey);
        }
        return Array.from(participantSet);
    }, [messages]);

    // Fetch profiles for all participants
    const profiles = useProfilesMap();

    const handleCopyConversation = async () => {
        if (!messages || messages.length === 0) return;

        const success = await copyThreadToClipboard(messages, profiles, title);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!onBack) return null;

    return (
        <div className="bg-card border-b border-border/60 backdrop-blur-xl bg-card/95 sticky top-0 z-50">
            <div className="flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4">
                <div className="flex items-center gap-2 sm:gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onBack}
                        className="w-8 h-8 sm:w-9 sm:h-9 hover:bg-accent"
                    >
                        <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate max-w-48">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Auto-TTS toggle */}
                    {onAutoTTSToggle && (
                        <Button
                            variant={autoTTS ? "default" : "ghost"}
                            size="icon"
                            onClick={onAutoTTSToggle}
                            className={`w-8 h-8 sm:w-9 sm:h-9 ${autoTTS ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-accent'}`}
                            title={autoTTS ? "Disable auto-speak for new messages" : "Enable auto-speak for new messages"}
                        >
                            {autoTTS ? (
                                <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            ) : (
                                <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
                            )}
                        </Button>
                    )}
                    {/* Copy conversation button */}
                    {messages && messages.length > 0 && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCopyConversation}
                            className="w-8 h-8 sm:w-9 sm:h-9 hover:bg-accent"
                            title="Copy conversation to clipboard"
                        >
                            {copied ? (
                                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                            ) : (
                                <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                            )}
                        </Button>
                    )}
                    {participants && participants.length > 0 && (
                        <ParticipantAvatarsWithModels
                            participants={participants}
                            messages={messages || []}
                            projectId={projectId}
                            projectEvent={projectEvent}
                            availableModels={availableModels}
                            maxVisible={4}
                            size="sm"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
