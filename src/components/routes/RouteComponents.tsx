import { useLocation, useParams } from "react-router-dom";
import { useNavigation } from "../../contexts/NavigationContext";
import { useArticle } from "../../hooks/useArticle";
import { useProject } from "../../hooks/useProject";
import { AgentRequestsPage } from "../AgentRequestsPage";
import { AgentsPage } from "../AgentsPage";
import { AgentProfile } from "../agents/AgentProfile";
import { ChatInterface } from "../ChatInterface";
import { ChatsPage } from "../ChatsPage";
import { DesktopLayout } from "../DesktopLayout";
import { DocsPage } from "../DocsPage";
import { InstructionsPage } from "../InstructionsPage";
import { MCPToolsPage } from "../MCPToolsPage";
import { SettingsPage } from "../SettingsPage";
import { DocumentationView } from "../documentation/DocumentationView";
import { ProjectList } from "../projects/ProjectList";
import { ProjectProfile } from "../profile/ProjectProfile";
import { TaskUpdates } from "../tasks/TaskUpdates";

// Loading component
function LoadingScreen() {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
}

// Root page component
export function RootPage() {
    return <DesktopLayout />;
}

// Project list page
export function ProjectListPage() {
    return <ProjectList />;
}

// Project detail page - redirects to profile
export function ProjectDetailPage() {
    const { projectId } = useParams();
    const project = useProject(projectId);
    const { goToProjectProfile } = useNavigation();
    
    // Redirect to profile page when project is loaded
    if (project) {
        goToProjectProfile(project);
    }

    if (!project) {
        return <LoadingScreen />;
    }

    return null;
}

// Project profile page
export function ProjectProfilePage() {
    return <ProjectProfile />;
}

// Task updates page
export function TaskUpdatesPage() {
    const { projectId, taskId } = useParams();
    const project = useProject(projectId);
    const { goBack } = useNavigation();

    if (!project) {
        return <LoadingScreen />;
    }

    return <TaskUpdates project={project} taskId={taskId || ""} onBack={goBack} />;
}


// Chat interface page
export function ChatInterfacePage() {
    const { projectId, threadId } = useParams();
    const location = useLocation();
    const project = useProject(projectId);
    const { goBack } = useNavigation();

    // Get thread title and agents from query params
    const searchParams = new URLSearchParams(location.search);
    const threadTitle = searchParams.get("title") || "";
    const agentPubkeys = searchParams.get("agents")?.split(",").filter(Boolean) || [];

    if (!project) {
        return <LoadingScreen />;
    }

    return (
        <ChatInterface
            project={project}
            threadId={threadId || ""}
            threadTitle={threadTitle}
            initialAgentPubkeys={agentPubkeys}
            onBack={goBack}
            className="h-screen"
        />
    );
}

// Documentation view page
export function DocumentationViewPage() {
    const { projectId, articleId } = useParams();
    const project = useProject(projectId);
    const article = useArticle(articleId);
    const { goBack } = useNavigation();

    if (!project || !article) {
        return <LoadingScreen />;
    }

    return <DocumentationView project={project} article={article} onBack={goBack} />;
}

// Settings page
export function SettingsPageWrapper() {
    const { goBack } = useNavigation();
    return <SettingsPage onBack={goBack} />;
}

// Agents page
export function AgentsPageWrapper() {
    const { goBack } = useNavigation();
    return <AgentsPage onBack={goBack} />;
}

// MCP Tools page
export function MCPToolsPageWrapper() {
    const { goBack } = useNavigation();
    return <MCPToolsPage onBack={goBack} />;
}

// Instructions page
export function InstructionsPageWrapper() {
    const { goBack } = useNavigation();
    return <InstructionsPage onBack={goBack} />;
}

// Agent requests page
export function AgentRequestsPageWrapper() {
    const { goBack } = useNavigation();
    return <AgentRequestsPage onBack={goBack} />;
}

// Agent profile page
export function AgentProfilePageWrapper() {
    return <AgentProfile />;
}

// Chats page
export function ChatsPageWrapper() {
    const { goToTask } = useNavigation();
    return <ChatsPage onTaskSelect={goToTask} />;
}

// Docs page
export function DocsPageWrapper() {
    const { goBack } = useNavigation();
    return <DocsPage onBack={goBack} />;
}

// Desktop layout wrapper
export function DesktopLayoutWrapper() {
    return <DesktopLayout />;
}

// Blossom test page
// export function BlossomTestPageWrapper() {
//     return <BlossomTestPage />;
// }
