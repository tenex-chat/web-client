import type { NDKEvent } from "@nostr-dev-kit/ndk";
import { createContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export interface NavigationContextType {
    navigate: ReturnType<typeof useNavigate>;
    location: ReturnType<typeof useLocation>;
    goBack: () => void;
    goToProject: (project: NDKEvent) => void;
    goToProjectProfile: (project: NDKEvent) => void;
    goToTask: (project: NDKEvent, taskId: string) => void;
    goToThread: (project: NDKEvent, threadId: string) => void;
    goToNewThread: (project: NDKEvent, title?: string, agentPubkeys?: string[]) => void;
    goToArticle: (project: NDKEvent, article: NDKEvent) => void;
    goToSettings: () => void;
    goToAgents: () => void;
    goToInstructions: () => void;
    goToAgentRequests: () => void;
    goToChats: () => void;
    goToDocs: () => void;
}

export const NavigationContext = createContext<NavigationContextType | null>(null);