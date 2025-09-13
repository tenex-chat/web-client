import { NDKArticle, NDKKind, NDKUser } from "@nostr-dev-kit/ndk-hooks";
import { useEvent } from "@nostr-dev-kit/ndk-hooks";
import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { NostrProfile } from "@/components/common/NostrProfile";
import { InlineProfileMention } from "@/components/common/InlineProfileMention";
import { cn } from "@/lib/utils";
import { NDKTask } from "@/lib/ndk-events/NDKTask";
import { NDKMCPTool } from "@/lib/ndk-events/NDKMCPTool";
import { NDKAgentDefinition } from "@/lib/ndk-events/NDKAgentDefinition";
import { NDKAgentLesson } from "@/lib/ndk-events/NDKAgentLesson";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Sheet, SheetContent } from "@/components/ui/sheet";

// Import specialized card components
import { TaskEmbedCard } from "@/components/embeds/TaskEmbedCard";
import { ArticleEmbedCard } from "@/components/embeds/ArticleEmbedCard";
import { NoteEmbedCard } from "@/components/embeds/NoteEmbedCard";
import { MCPToolEmbedCard } from "@/components/embeds/MCPToolEmbedCard";
import { AgentDefinitionEmbedCard } from "@/components/embeds/AgentDefinitionEmbedCard";
import { DefaultEmbedCard } from "@/components/embeds/DefaultEmbedCard";
import { ChatMessageEmbedCard } from "@/components/embeds/ChatMessageEmbedCard";
import { DocumentationViewer } from "@/components/documentation/DocumentationViewer";

interface NostrEntityCardProps {
  bech32: string;
  className?: string;
  compact?: boolean;
  onConversationClick?: (event: NDKEvent) => void;
}

export function NostrEntityCard({
  bech32,
  className = "",
  compact = false,
  onConversationClick,
}: NostrEntityCardProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Just pass the bech32 to useEvent - it handles everything!
  const isEventEntity =
    bech32.startsWith("nevent1") ||
    bech32.startsWith("note1") ||
    bech32.startsWith("naddr1");
  const event = useEvent(isEventEntity ? bech32 : false, {});

  // Handle profile types (npub, nprofile)
  let user: NDKUser | undefined;
  let decodingError: string | undefined;

  try {
    if (bech32.startsWith("npub")) user = new NDKUser({ npub: bech32 });
    else if (bech32.startsWith("nprofile"))
      user = new NDKUser({ nprofile: bech32 });
  } catch (error) {
    // Capture the decoding error for display
    decodingError =
      error instanceof Error ? error.message : "Invalid entity format";
  }

  if (user) {
    // Use inline mention for compact mode, card for full mode
    if (compact) {
      return (
        <InlineProfileMention pubkey={user.pubkey} className={className} />
      );
    }

    return (
      <Card className={cn("inline-flex items-center gap-2", className)}>
        <NostrProfile pubkey={user.pubkey} />
      </Card>
    );
  }

  // If there was a decoding error, show it gracefully
  if (decodingError) {
    return (
      <Card
        className={cn(
          "inline-flex items-center gap-2 px-3 py-2",
          "bg-destructive/10 border-destructive/20",
          className,
        )}
      >
        <span className="text-sm text-destructive">
          Failed to decode: {bech32.slice(0, 20)}...
        </span>
        <span className="text-xs text-muted-foreground">({decodingError})</span>
      </Card>
    );
  }

  // Handle click events
  const handleClick = () => {
    // For kind:11 (Thread) events, use the callback if provided
    if (event && event.kind === NDKKind.Thread && onConversationClick) {
      onConversationClick(event);
    } else if (event?.content) {
      setDrawerOpen(true);
    } else {
      // Open in njump if no content to display
      window.open(`https://njump.me/${bech32}`, "_blank");
    }
  };

  // If we don't have the event yet, show loading state
  if (isEventEntity && !event) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md",
          "bg-muted/50 animate-pulse",
          "text-sm my-1",
          className,
        )}
      >
        <span className="font-medium">Loading...</span>
      </span>
    );
  }

  // Route to specialized card components based on event kind
  if (event) {
    switch (event.kind) {
      case NDKTask.kind:
        return (
          <>
            <TaskEmbedCard
              event={event}
              compact={compact}
              className={className}
              onClick={handleClick}
            />
            <EventDrawer
              event={event}
              title={`Task: ${event.tags?.find((tag) => tag[0] === "title")?.[1] || "Untitled"}`}
              open={drawerOpen}
              onOpenChange={setDrawerOpen}
            />
          </>
        );

      case NDKKind.Thread: // kind:11 - Use navigation callback
        return (
          <ChatMessageEmbedCard
            event={event}
            compact={compact}
            className={className}
            onClick={handleClick}
          />
        );

      case NDKArticle.kind: // 30023
        return (
          <>
            <ArticleEmbedCard
              event={event}
              compact={compact}
              className={className}
              onClick={() => setSheetOpen(true)}
            />
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetContent
                className="p-0 flex flex-col w-[65%] sm:max-w-[65%]"
                side="right"
              >
                <DocumentationViewer
                  article={NDKArticle.from(event)}
                  onBack={() => setSheetOpen(false)}
                />
              </SheetContent>
            </Sheet>
          </>
        );

      case 1: // Regular note
        return (
          <>
            <NoteEmbedCard
              event={event}
              compact={compact}
              className={className}
              onClick={handleClick}
            />
            <EventDrawer
              event={event}
              title="Note"
              open={drawerOpen}
              onOpenChange={setDrawerOpen}
            />
          </>
        );

      case NDKMCPTool.kind: // 4200
        return (
          <MCPToolEmbedCard
            event={event}
            compact={compact}
            className={className}
          />
        );

      case NDKAgentDefinition.kind: // 4199
        return (
          <AgentDefinitionEmbedCard
            event={event}
            compact={compact}
            className={className}
          />
        );

      case NDKAgentLesson.kind: // 4129
        // This might need a specialized card in the future
        return (
          <>
            <DefaultEmbedCard
              event={event}
              compact={compact}
              className={className}
              onClick={handleClick}
            />
            <EventDrawer
              event={event}
              title="Agent Lesson"
              open={drawerOpen}
              onOpenChange={setDrawerOpen}
            />
          </>
        );

      default:
        return (
          <>
            <DefaultEmbedCard
              event={event}
              compact={compact}
              className={className}
              onClick={handleClick}
            />
            <EventDrawer
              event={event}
              title="Event Details"
              open={drawerOpen}
              onOpenChange={setDrawerOpen}
            />
          </>
        );
    }
  }

  // If we couldn't load the event or it's not a recognized entity type, show error card
  return (
    <Card
      className={cn(
        "inline-flex items-center gap-2 px-3 py-2",
        "bg-muted/50 border-muted-foreground/20",
        className,
      )}
    >
      <span className="text-sm text-muted-foreground">
        Unknown entity: {bech32.slice(0, 20)}...
      </span>
    </Card>
  );
}

// Shared drawer component for viewing full event content
function EventDrawer({
  event,
  title,
  open,
  onOpenChange,
}: {
  event: any;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!event.content) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            {title}
            <ExternalLink
              className="w-4 h-4 opacity-50 cursor-pointer hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                window.open(`https://njump.me/${event.encode()}`, "_blank");
              }}
            />
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-6 pb-6 overflow-y-auto">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {event.content}
            </ReactMarkdown>
          </div>

          {/* Event metadata */}
          <div className="mt-6 pt-6 border-t space-y-2 text-sm text-muted-foreground">
            <div>
              <span className="font-medium">Event ID:</span>{" "}
              {event.id.substring(0, 16)}...
            </div>
            <div>
              <span className="font-medium">Kind:</span> {event.kind}
            </div>
            {event.created_at && (
              <div>
                <span className="font-medium">Created:</span>{" "}
                {new Date(event.created_at * 1000).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
