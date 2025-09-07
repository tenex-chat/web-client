import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NDKAgentLesson } from "@/lib/ndk-events/NDKAgentLesson";
import { formatRelativeTime } from "@/lib/utils/time";
import { useNavigate } from "@tanstack/react-router";

interface LessonCardProps {
  lesson: NDKAgentLesson;
  onClick?: () => void;
  compact?: boolean;
}

export function LessonCard({ lesson, onClick, compact = false }: LessonCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Default navigation to lesson view
      navigate({
        to: "/lesson/$lessonId",
        params: {
          lessonId: lesson.id,
        },
      });
    }
  };

  return (
    <Card
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={handleClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">
              {lesson.title || "Untitled Lesson"}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <CardDescription>
                {formatRelativeTime(lesson.created_at || 0)}
              </CardDescription>
              {lesson.category && (
                <span className="text-xs bg-muted px-2 py-1 rounded">
                  {lesson.category}
                </span>
              )}
              {lesson.detailed && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                  Detailed
                </span>
              )}
            </div>
            {lesson.hashtags && lesson.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {lesson.hashtags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-xs text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      {!compact && (
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">
              Lesson{" "}
              {lesson.detailed && (
                <span className="text-xs font-normal text-muted-foreground">
                  (summary)
                </span>
              )}
            </h4>
            <p className="text-muted-foreground line-clamp-3">
              {lesson.lesson}
            </p>
          </div>

          {lesson.reasoning && (
            <div>
              <h4 className="font-medium mb-2">Reasoning</h4>
              <p className="text-muted-foreground line-clamp-2">
                {lesson.reasoning}
              </p>
            </div>
          )}

          {lesson.metacognition && (
            <div>
              <h4 className="font-medium mb-2">Metacognition</h4>
              <p className="text-muted-foreground line-clamp-2">
                {lesson.metacognition}
              </p>
            </div>
          )}

          {lesson.reflection && (
            <div>
              <h4 className="font-medium mb-2">Reflection</h4>
              <p className="text-muted-foreground line-clamp-2">
                {lesson.reflection}
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}