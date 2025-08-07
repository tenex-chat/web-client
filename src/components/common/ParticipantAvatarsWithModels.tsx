import { NDKEvent, type NDKProject } from "@nostr-dev-kit/ndk-hooks";
import { useNDK } from "@nostr-dev-kit/ndk-hooks";
import { CSSUtils } from "../../lib/utils/business";
import { EVENT_KINDS } from "../../lib/constants";
import { Check, ChevronDown, Cpu } from "lucide-react";
import { useState } from "react";
import { useAgentLLMTracking } from "../../hooks/useAgentLLMTracking";
import { useProjectAgents } from "../../stores/project/hooks";
import { ParticipantAvatar } from "./ParticipantAvatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface ParticipantAvatarsWithModelsProps {
    participants: string[];
    messages: NDKEvent[];
    projectId?: string;
    projectEvent?: NDKProject;
    availableModels?: Record<string, unknown>;
    maxVisible?: number;
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function ParticipantAvatarsWithModels({
    participants,
    messages,
    projectId,
    projectEvent,
    availableModels = {},
    maxVisible = 4,
    size = "sm",
    className = "",
}: ParticipantAvatarsWithModelsProps) {
    const sizeClasses = CSSUtils.getAvatarClasses(size).avatar;
    const agentModels = useAgentLLMTracking(messages);
    const projectAgents = useProjectAgents(projectId);

    // Create a set of agent pubkeys for quick lookup
    const agentPubkeys = new Set(projectAgents.map((agent) => agent.pubkey));

    const visibleParticipants = participants.slice(0, maxVisible);
    const remainingCount = participants.length - maxVisible;

    // Extract model names from the configurations
    const modelNames = Object.keys(availableModels).filter(
        (key) => key !== "default" && key !== "orchestrator"
    );

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {visibleParticipants.map((pubkey) => {
                const isAgent = agentPubkeys.has(pubkey);
                const modelInfo = agentModels.get(pubkey);

                return (
                    <ParticipantAvatar
                        key={pubkey}
                        pubkey={pubkey}
                        className={`border-2 border-background ${sizeClasses}`}
                        hoverCardChildren={
                            isAgent ? (
                                <ModelDropdown
                                    agentPubkey={pubkey}
                                    currentModel={modelInfo?.model}
                                    availableModels={modelNames}
                                    projectEvent={projectEvent}
                                />
                            ) : undefined
                        }
                    />
                );
            })}
            {remainingCount > 0 && (
                <div
                    className={`${sizeClasses} rounded-full bg-muted border-2 border-background flex items-center justify-center`}
                >
                    <span className="text-xs font-medium text-muted-foreground">
                        +{remainingCount}
                    </span>
                </div>
            )}
        </div>
    );
}

interface ModelDropdownProps {
    agentPubkey: string;
    currentModel?: string;
    availableModels: string[];
    projectEvent?: NDKProject;
}

function ModelDropdown({
    agentPubkey,
    currentModel,
    availableModels,
    projectEvent,
}: ModelDropdownProps) {
    const { ndk } = useNDK();
    const [isChanging, setIsChanging] = useState(false);

    const handleModelChange = async (newModel: string) => {
        if (!ndk || newModel === currentModel) return;

        setIsChanging(true);
        try {
            const event = new NDKEvent(ndk);
            event.kind = EVENT_KINDS.LLM_CONFIG_CHANGE;
            event.content = "";

            event.tags = [
                ["p", agentPubkey],
                ["model", newModel],
            ];

            if (projectEvent) {
                event.tag(projectEvent);
            }

            await event.publish();
        } catch (error) {
            console.error("Failed to change model:", error);
        } finally {
            setIsChanging(false);
        }
    };

    // Extract just the model name from "provider/model" format
    const displayModel = currentModel?.split("/").pop() || "Select model";

    return (
        <div className="space-y-2">
            <div className="text-xs text-muted-foreground font-medium">Model</div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-muted hover:bg-accent transition-colors border border-border"
                        disabled={isChanging}
                    >
                        <Cpu className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-left truncate font-medium">{displayModel}</span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    {availableModels.map((model) => (
                        <DropdownMenuItem
                            key={model}
                            onClick={() => handleModelChange(model)}
                            className="flex items-center justify-between"
                        >
                            <span>{model}</span>
                            {model === currentModel && <Check className="h-4 w-4 text-primary" />}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
