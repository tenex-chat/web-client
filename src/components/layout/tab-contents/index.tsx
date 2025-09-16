import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThreadList } from "@/components/chat/ThreadList";
import { DocumentationListSimple } from "@/components/documentation/DocumentationListSimple";
import { HashtagEventsList } from "@/components/hashtags/HashtagEventsList";
import { CommunityContent } from "./CommunityContent";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import { NDKEvent, NDKArticle } from "@nostr-dev-kit/ndk-hooks";
import { Bot, Settings, ChevronRight, Users, Wrench, Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentListItem } from "./AgentListItem";

export interface TabContentProps {
  project: NDKProject;
  selectedThread?: NDKEvent;
  onThreadSelect?: (thread: NDKEvent) => void;
  onDocumentSelect?: (article: NDKArticle) => void;
  onAgentSelect?: (agentPubkey: string) => void;
  onHashtagEventClick?: (event: NDKEvent) => void;
  onSettingsItemClick?: (item: string) => void;
  onEventClick?: (event: NDKEvent) => void;
  agents?: Array<{ pubkey: string; slug: string; status?: string; lastSeen?: number }>;
}

export const ConversationsContent: React.FC<TabContentProps> = ({
  project,
  selectedThread,
  onThreadSelect,
}) => (
  <ThreadList
    project={project}
    selectedThread={selectedThread}
    onThreadSelect={onThreadSelect!}
    className="h-full"
  />
);

export const DocsContent: React.FC<TabContentProps> = ({
  project,
  onDocumentSelect,
}) => (
  <DocumentationListSimple
    projectId={project.dTag}
    onArticleSelect={onDocumentSelect!}
    className="h-full"
  />
);

export const AgentsContent: React.FC<TabContentProps> = ({
  agents = [],
  onAgentSelect,
}) => (
  <ScrollArea className="h-full">
    <div className="flex flex-col">
      {agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 gap-2 text-center px-3">
          <Bot className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            No agents online
          </p>
        </div>
      ) : (
        agents.map((agent) => (
          <AgentListItem
            key={agent.pubkey}
            agent={agent}
            isOnline={true}
            onClick={() => onAgentSelect?.(agent.pubkey)}
          />
        ))
      )}
    </div>
  </ScrollArea>
);

export const HashtagsContent: React.FC<TabContentProps> = ({
  project,
  onHashtagEventClick,
}) => (
  <HashtagEventsList
    project={project}
    onEventClick={onHashtagEventClick!}
  />
);

export const SettingsContent: React.FC<TabContentProps> = ({
  onSettingsItemClick,
}) => (
  <ScrollArea className="h-full">
    <div className="p-2 space-y-1">
      <Button
        variant="ghost"
        className="w-full justify-start p-2 h-auto"
        onClick={() => onSettingsItemClick?.("general")}
      >
        <div className="flex items-center gap-2 w-full">
          <Settings className="h-4 w-4 shrink-0" />
          <div className="flex-1 text-left">
            <div className="text-sm font-medium">General</div>
            <div className="text-xs text-muted-foreground">
              Basic project information
            </div>
          </div>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        </div>
      </Button>
      <Button
        variant="ghost"
        className="w-full justify-start p-2 h-auto"
        onClick={() => onSettingsItemClick?.("agents")}
      >
        <div className="flex items-center gap-2 w-full">
          <Users className="h-4 w-4 shrink-0" />
          <div className="flex-1 text-left">
            <div className="text-sm font-medium">Agents</div>
            <div className="text-xs text-muted-foreground">
              Manage project agents
            </div>
          </div>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        </div>
      </Button>
      <Button
        variant="ghost"
        className="w-full justify-start p-2 h-auto"
        onClick={() => onSettingsItemClick?.("tools")}
      >
        <div className="flex items-center gap-2 w-full">
          <Wrench className="h-4 w-4 shrink-0" />
          <div className="flex-1 text-left">
            <div className="text-sm font-medium">Tools</div>
            <div className="text-xs text-muted-foreground">
              MCP tools configuration
            </div>
          </div>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        </div>
      </Button>
      <Button
        variant="ghost"
        className="w-full justify-start p-2 h-auto"
        onClick={() => onSettingsItemClick?.("advanced")}
      >
        <div className="flex items-center gap-2 w-full">
          <Shield className="h-4 w-4 shrink-0" />
          <div className="flex-1 text-left">
            <div className="text-sm font-medium">Advanced</div>
            <div className="text-xs text-muted-foreground">
              Advanced configuration
            </div>
          </div>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        </div>
      </Button>
      <Button
        variant="ghost"
        className="w-full justify-start p-2 h-auto"
        onClick={() => onSettingsItemClick?.("danger")}
      >
        <div className="flex items-center gap-2 w-full">
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
          <div className="flex-1 text-left">
            <div className="text-sm font-medium">Danger Zone</div>
            <div className="text-xs text-muted-foreground">
              Irreversible actions
            </div>
          </div>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        </div>
      </Button>
    </div>
  </ScrollArea>
);

// Export the CommunityContent component
export { CommunityContent } from "./CommunityContent";