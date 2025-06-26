import type { NDKProject } from "@nostr-dev-kit/ndk-hooks";
import { NDKEvent, useNDK, useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { useAtomValue } from "jotai";
import { Circle, Plus } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { EVENT_KINDS } from "../../lib/constants";
import { onlineProjectsAtom } from "../../lib/store";
import { ThreadCard } from "../tasks/ThreadCard";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";

interface ProjectColumnProps {
    project: NDKProject;
    onProjectClick?: (project: NDKProject) => void;
    onTaskCreate?: (project: NDKProject) => void;
    onVoiceRecord?: (project: NDKProject) => void;
    onThreadClick?: (thread: NDKEvent) => void;
}

export function ProjectColumn({
    project,
    onProjectClick,
    onTaskCreate,
    onVoiceRecord,
    onThreadClick,
}: ProjectColumnProps) {
    const { ndk } = useNDK();
    const title = project.title || project.tagValue("title") || "Untitled Project";
    const onlineProjects = useAtomValue(onlineProjectsAtom);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [isLongPressing, setIsLongPressing] = useState(false);

    // Get project directory name from d tag
    const projectDir = project.tagValue("d") || "";
    const isOnline = onlineProjects.has(projectDir);

    // Long-press handlers
    const handlePointerDown = (e: React.PointerEvent) => {
        e.stopPropagation();
        e.preventDefault();
        
        setIsLongPressing(true);
        
        // Start long-press timer (500ms)
        longPressTimerRef.current = setTimeout(() => {
            // Long press triggered - clear the timer to indicate it fired
            longPressTimerRef.current = null;
            setIsLongPressing(false);
            onVoiceRecord?.(project);
        }, 500);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        e.stopPropagation();
        e.preventDefault();
        
        setIsLongPressing(false);
        
        // Check if timer is still active (means long-press didn't fire)
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
            
            // Timer was still active, so this was a regular click
            onTaskCreate?.(project);
        }
        // If timer is null, long-press already fired, so don't do regular click
    };

    const handlePointerLeave = () => {
        setIsLongPressing(false);
        
        // Clear timer if pointer leaves the button (cancels both long-press and click)
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    // Subscribe to threads (kind 11) for this project
    const { events: projectThreads } = useSubscribe(
        project
            ? [
                  {
                      kinds: [EVENT_KINDS.CHAT],
                      ...project.filter(),
                      limit: 50,
                  },
              ]
            : false,
        {},
        [project?.tagId()]
    );

    const getProjectAvatar = (project: NDKProject) => {
        if (project.picture) {
            return project.picture;
        }
        const seed = project.tagValue("d") || project.title || "default";
        return `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(seed)}`;
    };

    const getInitials = (title: string) => {
        return title
            .split(" ")
            .map((word) => word.charAt(0))
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const getAvatarColors = (title: string) => {
        const colors = [
            "bg-gradient-to-br from-blue-500 to-blue-600",
            "bg-gradient-to-br from-emerald-500 to-emerald-600",
            "bg-gradient-to-br from-purple-500 to-purple-600",
            "bg-gradient-to-br from-amber-500 to-amber-600",
            "bg-gradient-to-br from-rose-500 to-rose-600",
            "bg-gradient-to-br from-indigo-500 to-indigo-600",
            "bg-gradient-to-br from-teal-500 to-teal-600",
            "bg-gradient-to-br from-orange-500 to-orange-600",
        ];
        const index =
            title.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
        return colors[index];
    };

    // Get thread replies
    const threadReplies = useMemo(() => {
        return projectThreads.filter((thread: NDKEvent) => {
            // Check if this is a reply to another thread
            const rootTag = thread.tags?.find((tag: string[]) => tag[0] === "e" && tag[3] === "root")?.[1];
            const replyTag = thread.tags?.find((tag: string[]) => tag[0] === "e" && tag[3] === "reply")?.[1];
            return rootTag || replyTag;
        });
    }, [projectThreads]);

    // Only include threads in the column view (tasks are excluded)
    const combinedItems = useMemo(() => {
        const items: Array<{
            type: "thread";
            item: NDKEvent;
            createdAt: number;
        }> = [];

        // Add threads only (tasks are excluded from column view)
        for (const thread of projectThreads) {
            items.push({
                type: "thread",
                item: thread,
                createdAt: thread.created_at || 0,
            });
        }

        // Sort by creation time, most recent first
        return items.sort((a, b) => b.createdAt - a.createdAt);
    }, [projectThreads]);

    return (
        <div className="w-80 flex-shrink-0 bg-muted/50 border-x-[1px] border-border flex flex-col h-full">
            {/* Column Header */}
            <div className="p-4 bg-card/80 rounded-t-lg border-b border-border">
                <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                        <AvatarImage src={getProjectAvatar(project)} alt={title} />
                        <AvatarFallback
                            className={`text-white font-semibold text-sm ${getAvatarColors(title)}`}
                        >
                            {getInitials(title)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3
                                className="font-semibold text-foreground truncate cursor-pointer hover:underline"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onProjectClick?.(project);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onProjectClick?.(project);
                                    }
                                }}
                            >
                                {title}
                            </h3>
                            <div
                                title={
                                    isOnline
                                        ? "Project is online in a backend"
                                        : "Click to start project"
                                }
                            >
                                {isOnline ? (
                                    <Circle className="w-2 h-2 text-green-500 fill-green-500" />
                                ) : (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!ndk) return;
                                            const event = new NDKEvent(ndk);
                                            event.kind = 24020;
                                            event.tag(project);
                                            event.publish();
                                        }}
                                        className="hover:opacity-80 transition-opacity"
                                    >
                                        <Circle className="w-2 h-2 text-gray-400 fill-gray-400" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`w-8 h-8 text-muted-foreground hover:text-foreground transition-all ${
                                isLongPressing ? "bg-green-100 text-green-600 scale-110" : ""
                            }`}
                            onPointerDown={handlePointerDown}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerLeave}
                            title="Click to create thread, hold to record voice"
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Column Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Threads Only (Tasks Excluded) */}
                {combinedItems.map((item) => (
                    <ThreadCard
                        key={item.item.id}
                        thread={item.item as NDKEvent}
                        replies={threadReplies}
                        onClick={() => onThreadClick?.(item.item as NDKEvent)}
                    />
                ))}

                {/* Empty State */}
                {combinedItems.length === 0 && (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center mx-auto mb-3">
                            <Plus className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                            No threads yet
                        </p>
                        <Button variant="ghost" size="sm" onClick={() => onTaskCreate?.(project)}>
                            Create content
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
