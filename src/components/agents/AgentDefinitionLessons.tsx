import { useSubscribe, type NDKKind } from "@nostr-dev-kit/ndk-hooks";
import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/common/EmptyState";
import { LessonCard } from "./LessonCard";
import { NDKAgentLesson } from "@/lib/ndk-events/NDKAgentLesson";
import { BookOpen, Lightbulb } from "lucide-react";

interface AgentDefinitionLessonsProps {
  agentDefinitionId: string;
}

export function AgentDefinitionLessons({
  agentDefinitionId,
}: AgentDefinitionLessonsProps) {
  // Subscribe to lessons that e-tag this agent definition
  const { events: lessonEvents } = useSubscribe([
    {
      kinds: [4129 as NDKKind],
      "#e": [agentDefinitionId],
    },
  ]);

  const lessons = useMemo(() => {
    if (!lessonEvents || lessonEvents.length === 0) return [];
    return lessonEvents
      .map((event) => NDKAgentLesson.from(event))
      .sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  }, [lessonEvents]);

  if (lessons.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <EmptyState
          icon={<BookOpen className="w-12 h-12" />}
          title="No lessons learned yet"
          description="This agent definition doesn't have any published lessons yet. Lessons are created when agents learn from their interactions and experiences."
        />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <Lightbulb className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">
            {lessons.length} {lessons.length === 1 ? "Lesson" : "Lessons"} Learned
          </h2>
        </div>
        
        <div className="space-y-4">
          {lessons.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} />
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}