import { useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import type { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { useProfileValue } from "@nostr-dev-kit/ndk-hooks";
import {
  Bot,
  ChevronRight,
  MessageCircle,
  Reply,
  Heart,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NostrProfile } from "@/components/common/NostrProfile";
import { Button } from "@/components/ui/button";
import { useProjectsStore } from "@/stores/projects";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InboxEventCardProps {
  event: NDKEvent;
  isUnread?: boolean;
  compact?: boolean;
}

export function InboxEventCard({ event, isUnread = false, compact = false }: InboxEventCardProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const profile = useProfileValue(event.pubkey);
  const getProjectByTagId = useProjectsStore((state) => state.getProjectByTagId);
  
  // Note: p-tagged user removed as it's redundant in the inbox context
  
  // Get project from 'a' tag
  const project = useMemo(() => {
    const aTag = event.tags.find(tag => tag[0] === 'a');
    if (!aTag || !aTag[1]) return null;
    
    // Parse the 'a' tag format: kind:pubkey:identifier
    const [kind, pubkey, identifier] = aTag[1].split(':');
    if (kind === '30078' && identifier) {
      // Try multiple lookup methods to find the project
      // First try tagId lookup
      let foundProject = getProjectByTagId(aTag[1]);
      
      // If not found, try by identifier (dTag)
      if (!foundProject) {
        const getProjectByDTag = useProjectsStore.getState().getProjectByDTag;
        foundProject = getProjectByDTag(identifier);
      }
      
      return foundProject;
    }
    return null;
  }, [event.tags, getProjectByTagId]);

  // Determine event type and get appropriate icon/label
  const getEventTypeInfo = () => {
    switch (event.kind) {
      case 1: // Regular note/mention
        return { icon: MessageCircle, label: "Mention", color: "text-blue-500" };
      case 1111: // Generic reply
        return { icon: Reply, label: "Reply", color: "text-green-500" };
      case 1112: // Agent completion
        return { icon: Bot, label: "Agent Response", color: "text-purple-500" };
      case 7: // Reaction
        return { icon: Heart, label: "Reaction", color: "text-pink-500" };
      case 30023: // Long-form content
        return { icon: FileText, label: "Article Mention", color: "text-orange-500" };
      default:
        return { icon: MessageCircle, label: "Event", color: "text-gray-500" };
    }
  };

  const { icon: Icon, label, color } = getEventTypeInfo();

  // Get content preview (first 150 characters)
  const contentPreview = event.content?.substring(0, 150) + 
    (event.content?.length > 150 ? "..." : "");

  // Format timestamp
  const timeAgo = event.created_at
    ? formatTimeAgo(new Date(event.created_at * 1000))
    : "Unknown time";

  // Navigate to the appropriate context
  const handleNavigate = () => {
    // Check if event has an 'e' tag (reply to another event)
    const eTag = event.tags.find(tag => tag[0] === 'e');
    const aTag = event.tags.find(tag => tag[0] === 'a');
    
    if (eTag && eTag[1]) {
      // Navigate to the thread/conversation
      navigate({ to: "/chat/$eventId", params: { eventId: eTag[1] } });
    } else if (aTag && aTag[1]) {
      // Handle 'a' tag references (parameterized replaceable events)
      const [kind, pubkey, identifier] = aTag[1].split(':');
      if (kind === '30078') {
        // This is a project reference
        navigate({ to: "/projects/$projectId", params: { projectId: identifier } });
      } else {
        // Default: expand in place
        setIsExpanded(!isExpanded);
      }
    } else if (event.kind === 1112) {
      // For agent responses, try to find the project context
      const projectTag = event.tags.find(tag => tag[0] === 'd');
      if (projectTag && projectTag[1]) {
        navigate({ to: "/projects/$projectId", params: { projectId: projectTag[1] } });
      } else {
        // Try to find root 'E' tag for thread context
        const rootTag = event.tags.find(tag => tag[0] === 'E');
        if (rootTag && rootTag[1]) {
          navigate({ to: "/chat/$eventId", params: { eventId: rootTag[1] } });
        } else {
          setIsExpanded(!isExpanded);
        }
      }
    } else if (event.kind === 1111) {
      // Generic reply - check for root event
      const rootTag = event.tags.find(tag => tag[0] === 'E');
      if (rootTag && rootTag[1]) {
        navigate({ to: "/chat/$eventId", params: { eventId: rootTag[1] } });
      } else {
        setIsExpanded(!isExpanded);
      }
    } else {
      // Default: expand in place to show full content
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div
      className={cn(
        "relative flex gap-3 hover:bg-muted/50 transition-colors cursor-pointer group",
        compact ? "p-3" : "p-4",
        isUnread && "bg-primary/5"
      )}
      onClick={handleNavigate}
    >
      {/* Unread indicator (blue bar with enhanced glow) */}
      {isUnread && (
        <>
          <div 
            className="absolute left-0 top-0 bottom-0 w-1 bg-primary animate-glow-bar" 
            aria-label="New message indicator"
            style={{ boxShadow: '0 0 15px rgba(59, 130, 246, 0.8)' }}
          />
          {/* Additional glow layer for enhanced visibility */}
          <div 
            className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-primary/30 to-transparent" 
            aria-hidden="true"
          />
        </>
      )}

      {/* Avatar */}
      <NostrProfile 
        pubkey={event.pubkey}
        variant="avatar"
        size={compact ? "sm" : "md"}
        className={cn("flex-shrink-0", isUnread && "ml-3")}
      />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2">
            <NostrProfile 
              pubkey={event.pubkey}
              variant="name"
              size="sm"
              className="font-medium"
            />
            <div className={cn("flex items-center gap-1", color)}>
              <Icon className="h-3 w-3" />
              <span className="text-xs">{label}</span>
            </div>
            {isUnread && (
              <span className="px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full animate-pulse-glow shadow-lg">
                New
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>

        {/* Project info (if present) - show prominently */}
        {project && !compact && (
          <div className="flex items-center gap-1.5 mb-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm flex items-center gap-1.5 px-2 py-0.5 bg-secondary/50 rounded-md border border-border/50 hover:bg-secondary/70 transition-colors">
                    <span className="text-muted-foreground">in project</span>
                    <span className="text-foreground font-semibold">📁 {project.title || project.dTag}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <div className="font-semibold">{project.title || "Untitled Project"}</div>
                    {project.description && (
                      <div className="text-xs text-muted-foreground max-w-xs">{project.description.substring(0, 100)}</div>
                    )}
                    <div className="text-xs text-muted-foreground">Click to view in context</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Content */}
        <div className="text-sm text-muted-foreground">
          {isExpanded ? (
            <div className="whitespace-pre-wrap break-words">
              {event.content}
            </div>
          ) : (
            <div className={compact ? "line-clamp-1" : "line-clamp-2"}>{contentPreview}</div>
          )}
        </div>

        {/* Action buttons (shown on hover) - hide in compact mode */}
        {!compact && (
          <div className="mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                handleNavigate();
              }}
            >
              View Context
              <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Format timestamp to relative time
 */
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return format(date, "MMM d");
}