import { NDKEvent } from "@nostr-dev-kit/ndk";
import type { NDKEvent as NDKEventType } from "@nostr-dev-kit/ndk";
import { useNDK } from "@nostr-dev-kit/ndk-hooks";
import { CSSUtils } from "../../lib/utils/business";
import { EVENT_KINDS } from "../../lib/constants";
import { Check, ChevronDown, Cpu } from "lucide-react";
import { useState } from "react";
import { useAgentLLMTracking } from "../../hooks/useAgentLLMTracking";
import { useProjectAgents } from "../../hooks/useProjectAgents";
import { ParticipantAvatar } from "./ParticipantAvatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface ParticipantAvatarsWithModelsProps {
    participants: string[];
    messages: NDKEventType[];
    projectPubkey: string;
    projectId?: string;
    projectEvent?: NDKEventType; // Changed from NDKArticle to NDKEventType
    availableModels?: Record<string, any>;
    maxVisible?: number;
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function ParticipantAvatarsWithModels({
    participants,
    messages,
    projectPubkey: _projectPubkey, // prefix with _ to indicate it's intentionally unused
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
                    <div key={pubkey} className="flex items-center gap-1">
                        <ParticipantAvatar
                            pubkey={pubkey}
                            className={`border-2 border-background ${sizeClasses}`}
                        />
                        {isAgent && (
                            <ModelDropdown
                                agentPubkey={pubkey}
                                currentModel={modelInfo?.model}
                                availableModels={modelNames}
                                projectEvent={projectEvent}
                            />
                        )}
                    </div>
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
    projectEvent?: NDKEventType;
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
        } catch (_error) {
            // // console.error("Failed to change model:", error);
        } finally {
            setIsChanging(false);
        }
    };

    // Extract just the model name from "provider/model" format
    const displayModel = currentModel?.split("/").pop() || "Select model";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-muted hover:bg-accent transition-colors border border-border"
                    disabled={isChanging}
                >
                    <Cpu className="h-3 w-3 text-muted-foreground" />
                    <span className="max-w-[100px] truncate font-medium">{displayModel}</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                {availableModels.map((model) => (
                    <DropdownMenuItem
                        key={model}
                        onClick={() => handleModelChange(model)}
                        className="flex items-center justify-between"
                    >
                        <span>{model}</span>
                        {model === currentModel && <Check className="h-3 w-3 text-primary" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
