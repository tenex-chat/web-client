import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatInterface } from "@/components/chat/ChatInterface";
import type { NDKProject } from "@/lib/ndk-events/NDKProject";
import type { NDKEvent } from "@nostr-dev-kit/ndk-hooks";

interface CommentsSidebarProps {
  project: NDKProject;
  chatThread?: NDKEvent;
  extraTags: string[][];
  onThreadCreated: (thread: NDKEvent) => void;
}

export function CommentsSidebar({
  project,
  chatThread,
  extraTags,
  onThreadCreated,
}: CommentsSidebarProps) {
  return (
    <div className="w-1/3 border-l flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold">Comments</h2>
        {!chatThread && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => {
              /* Start new chat - ChatInterface will handle creation */
            }}
            title="Start new discussion"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
      <ChatInterface
        project={project}
        rootEvent={chatThread}
        extraTags={extraTags}
        className="flex-1"
        onThreadCreated={onThreadCreated}
      />
    </div>
  );
}