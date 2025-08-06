import { NDKAgent } from "@/events";
import { useAgentLessonsByEventId } from "../../hooks/useAgentLessons";
import { BookOpen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AgentLessonsTabSimpleProps {
    agent: NDKAgent;
}

export function AgentLessonsTabSimple({ agent }: AgentLessonsTabSimpleProps) {
    const lessons = useAgentLessonsByEventId(agent.id);

    if (lessons.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                    No lessons yet
                </h3>
                <p className="text-muted-foreground max-w-sm">
                    This agent hasn't published any lessons yet.
                </p>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="space-y-4">
                {lessons.map((lesson) => {
                    const title = lesson.title || "Untitled Lesson";
                    const content = lesson.lesson || lesson.content || "";
                    const createdAt = lesson.created_at ? 
                        formatDistanceToNow(new Date(lesson.created_at * 1000), { addSuffix: true }) :
                        "Unknown time";

                    return (
                        <div 
                            key={lesson.id} 
                            className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <h3 className="font-semibold text-foreground">{title}</h3>
                                <span className="text-xs text-muted-foreground">{createdAt}</span>
                            </div>
                            {content && (
                                <p className="text-sm text-muted-foreground line-clamp-3">
                                    {content}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}