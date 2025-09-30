import { NDKArticle } from "@nostr-dev-kit/ndk-hooks";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMarkdownComponents } from "@/lib/markdown/config";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useMemo, useState, useCallback } from "react";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import type { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { useUser, useProfileValue } from "@nostr-dev-kit/ndk-hooks";
import { cn } from "@/lib/utils";
import { ArticleHeader } from "./ArticleHeader";
import { MetadataSection } from "./MetadataSection";
import { CommentsSidebar } from "./CommentsSidebar";
import { ChangelogSidebar } from "./ChangelogSidebar";
import { useContentWidth } from "./useContentWidth";
import { calculateReadingTime, extractTags } from "./documentationHelpers";

interface DocumentationViewerProps {
  article: NDKArticle;
  onBack?: () => void;
  onDetach?: () => void;
  onEdit?: () => void;
  projectTitle?: string;
  project?: NDKProject;
}

export function DocumentationViewer({
  article,
  onBack,
  onDetach,
  onEdit,
  projectTitle,
  project,
}: DocumentationViewerProps) {
  const [showComments, setShowComments] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [chatThread, setChatThread] = useState<NDKEvent | undefined>(undefined);

  const authorUser = useUser(article.pubkey);
  const profile = useProfileValue(authorUser);
  const authorName = profile?.displayName || profile?.name || "Unknown Author";
  const authorAvatar = profile?.image || profile?.picture;

  const markdownComponents = useMarkdownComponents();

  const readingTime = useMemo(
    () => calculateReadingTime(article.content || ""),
    [article.content],
  );

  const tags = useMemo(() => extractTags(article.tags), [article.tags]);

  const contentWidth = useContentWidth(showComments, showChangelog);

  const handleThreadCreated = useCallback(async (thread: NDKEvent) => {
    setChatThread(thread);
  }, []);

  const handleCopyLink = async () => {
    try {
      const encoded = article.encode();
      await navigator.clipboard.writeText(encoded);
      toast.success("Article link copied to clipboard");
    } catch (error) {
      console.error("Failed to copy link:", error);
      toast.error("Failed to copy link");
    }
  };

  const handleToggleChangelog = () => {
    setShowChangelog(!showChangelog);
    if (!showChangelog) setShowComments(false);
  };

  const handleToggleComments = () => {
    setShowComments(!showComments);
    if (!showComments) setShowChangelog(false);
  };

  return (
    <div className="h-full flex w-full">
      <div
        className={cn(
          "flex flex-col transition-all duration-300",
          contentWidth,
        )}
      >
        <ArticleHeader
          title={article.title}
          projectTitle={projectTitle}
          onBack={onBack}
          onEdit={onEdit}
          onToggleChangelog={handleToggleChangelog}
          onToggleComments={handleToggleComments}
          onCopyLink={handleCopyLink}
          onDetach={onDetach}
          hasProject={!!project}
        />

        <ScrollArea className="flex-1">
          <div className="p-6 max-w-3xl mx-auto">
            <MetadataSection
              authorName={authorName}
              authorAvatar={authorAvatar}
              createdAt={article.created_at || 0}
              readingTime={readingTime}
              tags={tags}
              summary={article.summary}
            />

            <div className="prose prose-neutral dark:prose-invert max-w-none [&_.mermaid-container]:!max-w-none [&_.mermaid-container]:overflow-x-auto">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {article.content || ""}
              </ReactMarkdown>
            </div>
          </div>
        </ScrollArea>
      </div>

      {showChangelog && <ChangelogSidebar article={article} />}

      {showComments && project && (
        <CommentsSidebar
          project={project}
          chatThread={chatThread}
          extraTags={[article.tagReference()]}
          onThreadCreated={handleThreadCreated}
        />
      )}
    </div>
  );
}