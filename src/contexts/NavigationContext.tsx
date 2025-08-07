import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NavigationContext, type NavigationContextType } from "./NavigationContextTypes";

interface NavigationProviderProps {
    children: ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
    const navigate = useNavigate();
    const location = useLocation();

    const navigationActions: NavigationContextType = {
        navigate,
        location,
        goBack: () => navigate(-1),
        goToProject: (project) => navigate(`/project/${project.encode()}`),
        goToProjectProfile: (project) => navigate(`/project/${project.encode()}/profile`),
        goToTask: (project, taskId) => navigate(`/project/${project.encode()}/task/${taskId}`),
        goToThread: (project, threadId) =>
            navigate(`/project/${project.encode()}/thread/${threadId}`),
        goToNewThread: (project, title, agentPubkeys) => {
            const searchParams = new URLSearchParams();
            if (title) searchParams.set("title", title);
            if (agentPubkeys && agentPubkeys.length > 0) {
                searchParams.set("agents", agentPubkeys.join(","));
            }
            const queryString = searchParams.toString();
            navigate(
                `/project/${project.encode()}/thread/new${queryString ? `?${queryString}` : ""}`
            );
        },
        goToArticle: (project, article) =>
            navigate(`/project/${project.encode()}/article/${article.encode()}`),
        goToSettings: () => navigate("/settings"),
        goToAgents: () => navigate("/agents"),
        goToInstructions: () => navigate("/instructions"),
        goToAgentRequests: () => navigate("/agent-requests"),
        goToChats: () => navigate("/chats"),
        goToDocs: () => navigate("/docs"),
    };

    return (
        <NavigationContext.Provider value={navigationActions}>
            {children}
        </NavigationContext.Provider>
    );
}

