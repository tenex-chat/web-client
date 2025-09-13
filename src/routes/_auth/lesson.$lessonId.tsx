import { createFileRoute } from "@tanstack/react-router";
import { LessonView } from "@/components/lessons/LessonView";

export const Route = createFileRoute("/_auth/lesson/$lessonId")({
  component: LessonView,
});
