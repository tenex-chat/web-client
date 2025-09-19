import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useConversationUpdater } from "@/hooks/useConversationUpdater";

interface ChatHeaderTitleProps {
  title: string;
  rootEventId?: string;
  isMobile: boolean;
}

/**
 * Editable title component for the chat header
 * Single responsibility: Display and edit conversation title
 */
export function ChatHeaderTitle({
  title,
  rootEventId,
  isMobile,
}: ChatHeaderTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { updateTitle } = useConversationUpdater(rootEventId);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEditing = () => {
    if (!rootEventId) return; // Don't allow editing for new threads
    setEditedTitle(title);
    setIsEditing(true);
  };

  const handleSave = async () => {
    const trimmedTitle = editedTitle.trim();
    
    if (!trimmedTitle || trimmedTitle === title) {
      setIsEditing(false);
      return;
    }

    const success = await updateTitle(trimmedTitle);
    if (success) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedTitle("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  return isEditing ? (
    <input
      ref={inputRef}
      type="text"
      value={editedTitle}
      onChange={(e) => setEditedTitle(e.target.value)}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      className={cn(
        "font-semibold bg-transparent border-none outline-none w-full",
        "text-foreground placeholder:text-muted-foreground",
        "focus:ring-1 focus:ring-primary/20 rounded px-1 -mx-1",
        isMobile ? "text-base" : "text-lg sm:text-xl",
      )}
      placeholder="Enter title..."
    />
  ) : (
    <h1
      className={cn(
        "font-semibold text-foreground truncate",
        isMobile ? "text-base" : "text-lg sm:text-xl",
        rootEventId && "cursor-pointer hover:text-foreground/80 transition-colors",
      )}
      onClick={handleStartEditing}
    >
      {title}
    </h1>
  );
}