import type { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { useNavigate } from "@tanstack/react-router";
import { FileText, FolderOpen, MessageCircle } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useProjectsStore } from "@/stores/projects";
import { useTimeFormat } from "@/hooks/useTimeFormat";
import type { NDKProject } from "@/lib/ndk-events/NDKProject";
import { NDKTask } from "@/lib/ndk-events/NDKTask";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchBar } from "@/components/common/SearchBar";
import { useNDK, useSubscribe } from "@nostr-dev-kit/ndk-hooks";

interface GlobalSearchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const { formatRelativeTime } = useTimeFormat();
    const { ndk } = useNDK();
    
    // Get all projects from store
    const allProjectsArray = useProjectsStore((state) => state.projectsArray);
    
    // Filter out deleted projects - memoize to prevent re-renders
    const projectsArray = useMemo(() => 
        allProjectsArray.filter(p => !p.hasTag('deleted')),
        [allProjectsArray]
    );
    
    // Subscribe to tasks for all projects
    const { events: taskEvents } = useSubscribe(
        projectsArray.length > 0 ? [{
            kinds: [NDKTask.kind],
            "#a": projectsArray.map(p => p.tagId())
        }] : []
    );
    
    const tasks = useMemo(() => {
        if (!ndk) return [];
        return taskEvents.map(event => NDKTask.from(event));
    }, [taskEvents]);
    
    // Helper functions
    const getTaskTitle = useCallback((task: NDKTask) => {
        const titleTag = task.tags?.find((tag) => tag[0] === "title")?.[1];
        if (titleTag) return titleTag;
        
        const firstLine = task.content?.split("\n")[0] || "Untitled Task";
        return firstLine.length > 40 ? `${firstLine.slice(0, 40)}...` : firstLine;
    }, []);
    
    const getProjectForTask = useCallback((task: NDKTask) => {
        const projectReference = task.tags?.find((tag) => tag[0] === "a")?.[1];
        if (projectReference) {
            const parts = projectReference.split(":");
            if (parts.length >= 3) {
                const projectPubkey = parts[1];
                const projectDTag = parts[2];
                return projectsArray.find(
                    p => p.pubkey === projectPubkey && p.dTag === projectDTag
                );
            }
        }
        return null;
    }, [projectsArray]);
    
    // Filter results based on search query
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return { projects: [], tasks: [], threads: [] };
        
        const query = searchQuery.toLowerCase();
        
        // Search projects
        const matchedProjects = projectsArray.filter((project) => {
            const title = project.title || "";
            const summary = project.summary || "";
            const tags = project.hashtags?.join(" ") || "";
            return (
                title.toLowerCase().includes(query) ||
                summary.toLowerCase().includes(query) ||
                tags.toLowerCase().includes(query)
            );
        });
        
        // Search tasks
        const matchedTasks = tasks.filter((task) => {
            const title = getTaskTitle(task);
            const content = task.content || "";
            return title.toLowerCase().includes(query) || content.toLowerCase().includes(query);
        });
        
        // TODO: Add thread search when thread store is implemented
        const matchedThreads: NDKEvent[] = [];
        
        return {
            projects: matchedProjects.slice(0, 5),
            tasks: matchedTasks.slice(0, 5),
            threads: matchedThreads.slice(0, 5),
        };
    }, [searchQuery, projectsArray, tasks, getTaskTitle]);
    
    const handleProjectClick = (project: NDKProject) => {
        onOpenChange(false);
        navigate({
            to: "/projects/$projectId",
            params: { projectId: project.encode() }
        });
    };
    
    const handleTaskClick = (task: NDKTask) => {
        const project = getProjectForTask(task);
        if (project) {
            onOpenChange(false);
            navigate({
                to: "/projects/$projectId",
                params: { projectId: project.encode() },
                search: { tab: "tasks", taskId: task.id }
            });
        }
    };
    
    const totalResults =
        searchResults.projects.length + 
        searchResults.tasks.length + 
        searchResults.threads.length;
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Search</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    {/* Search Input */}
                    <SearchBar
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Search projects, tasks, and threads..."
                    />
                    
                    {/* Search Results */}
                    {searchQuery.trim() && (
                        <div className="space-y-6 max-h-[60vh] overflow-y-auto">
                            {totalResults === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground">
                                        No results found for "{searchQuery}"
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Projects */}
                                    {searchResults.projects.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-medium text-muted-foreground mb-2">
                                                Projects
                                            </h3>
                                            <div className="space-y-2">
                                                {searchResults.projects.map((project) => (
                                                    <button
                                                        key={project.dTag}
                                                        onClick={() => handleProjectClick(project)}
                                                        className="w-full p-3 bg-card hover:bg-accent rounded-lg transition-colors text-left"
                                                        type="button"
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <FolderOpen className="w-4 h-4 text-muted-foreground mt-0.5" />
                                                            <div className="flex-1">
                                                                <div className="font-medium">
                                                                    {project.title || "Untitled Project"}
                                                                </div>
                                                                {project.summary && (
                                                                    <div className="text-sm text-muted-foreground line-clamp-2">
                                                                        {project.summary}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Tasks */}
                                    {searchResults.tasks.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-medium text-muted-foreground mb-2">
                                                Tasks
                                            </h3>
                                            <div className="space-y-2">
                                                {searchResults.tasks.map((task) => {
                                                    const project = getProjectForTask(task);
                                                    return (
                                                        <button
                                                            key={task.id}
                                                            onClick={() => handleTaskClick(task)}
                                                            className="w-full p-3 bg-card hover:bg-accent rounded-lg transition-colors text-left"
                                                            type="button"
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                                                                <div className="flex-1">
                                                                    <div className="font-medium">
                                                                        {getTaskTitle(task)}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        {project && (
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="text-xs"
                                                                            >
                                                                                {project.title || "Project"}
                                                                            </Badge>
                                                                        )}
                                                                        <span className="text-xs text-muted-foreground">
                                                                            {formatRelativeTime(task.created_at!)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Threads - placeholder for now */}
                                    {searchResults.threads.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-medium text-muted-foreground mb-2">
                                                Threads
                                            </h3>
                                            <div className="space-y-2">
                                                {searchResults.threads.map((thread) => (
                                                    <div key={thread.id} className="p-3 bg-card rounded-lg">
                                                        <div className="flex items-start gap-3">
                                                            <MessageCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
                                                            <div className="flex-1">
                                                                <div className="text-sm line-clamp-2">
                                                                    {thread.content}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}