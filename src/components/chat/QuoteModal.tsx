import { useRef, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import { ChatInputArea } from "./components/ChatInputArea";
import { useProjectStatus } from "@/stores/projects";
import type { AgentInstance } from "@/types/agent";

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotedText: string;
  project: NDKProject | null;
}

export function QuoteModal({
  isOpen,
  onClose,
  quotedText,
  project,
}: QuoteModalProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null) as React.RefObject<HTMLTextAreaElement>;

  // Get project status for available agents
  const projectDTag = project?.dTag;
  const projectStatus = useProjectStatus(projectDTag);

  // Convert ProjectAgent[] to AgentInstance[]
  const onlineAgents = useMemo<AgentInstance[] | null>(() => {
    if (!projectStatus?.agents) return null;

    return projectStatus.agents.map((agent) => ({
      pubkey: agent.pubkey,
      slug: agent.name, // The 'name' field from 24010 is actually the agent slug
      projectName: project?.title,
      projectDTag: project?.dTag,
    }));
  }, [projectStatus?.agents, project]);

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen) {
      // Focus after a short delay to ensure the modal is fully rendered
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          // Set cursor position to the beginning so user can type before the quoted event
          textareaRef.current.setSelectionRange(0, 0);
        }
      }, 100);
    }
  }, [isOpen]);

  const handleThreadCreated = () => {
    // Close modal after successful publication
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] h-[500px] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle>Quote Event</DialogTitle>
        </DialogHeader>
        <div className="flex-1 relative overflow-hidden">
          <ChatInputArea
            project={project}
            onlineAgents={onlineAgents}
            showVoiceButton={false}
            className="absolute inset-0"
            onThreadCreated={handleThreadCreated}
            textareaRef={textareaRef}
            initialContent={quotedText}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}