import { NDKArticle, NDKKind } from "@nostr-dev-kit/ndk-hooks";
import { useSubscribe, useUser, useProfileValue } from "@nostr-dev-kit/ndk-hooks";
import { FileText, Clock, Hash, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatRelativeTime } from "@/lib/utils/time";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useProjectsStore } from "@/stores/projects";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface DocumentationListSimpleProps {
  projectId?: string;
  onArticleSelect?: (article: NDKArticle) => void;
  className?: string;
}

function DocumentationItem({
  article,
  onSelect,
}: {
  article: NDKArticle;
  onSelect: () => void;
}) {
  const user = useUser(article.pubkey);
  const profile = useProfileValue(user);
  const avatarUrl = profile?.image || profile?.picture;
  const displayName = profile?.displayName || profile?.name || "Unknown Author";

  // Extract hashtags from the article
  const hashtags = useMemo(() => {
    return article.tags
      .filter((tag) => tag[0] === "t" && tag[1])
      .map((tag) => tag[1])
      .slice(0, 3); // Limit to 3 hashtags for space
  }, [article.tags]);

  const getReadingTime = (content?: string) => {
    if (!content) return "1 min";
    const wordsPerMinute = 200;
    const words = content.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} min`;
  };

  return (
    <div
      className="flex items-start gap-3 px-3 py-2.5 hover:bg-accent/50 cursor-pointer transition-colors border-b"
      onClick={onSelect}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={avatarUrl} alt={displayName} />
        <AvatarFallback className="text-xs">
          {displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">
          {article.title || "Untitled"}
        </div>
        {article.summary && (
          <div className="text-xs text-muted-foreground truncate">
            {article.summary}
          </div>
        )}
        {hashtags.length > 0 && (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {hashtags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="h-5 px-1.5 text-[10px] font-normal"
              >
                <Hash className="h-2.5 w-2.5 mr-0.5" />
                {tag}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 mt-1">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(article.created_at || 0)} ·{" "}
            {getReadingTime(article.content)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function DocumentationListSimple({
  projectId,
  onArticleSelect,
  className,
}: DocumentationListSimpleProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const projectsMap = useProjectsStore((state) => state.projects);

  // Get the project
  const project = useMemo(() => {
    if (!projectId || !projectsMap) return null;
    // Convert Map to array and find the project
    const projectsArray = Array.from(projectsMap.values());
    return projectsArray.find((p) => p.dTag === projectId);
  }, [projectId, projectsMap]);

  // Subscribe to articles tagged with this project
  const { events: articles } = useSubscribe<NDKArticle>(
    project
      ? [
          {
            kinds: [30023 as NDKKind], // NDK Article kind
            "#a": [project.tagId()],
          },
        ]
      : false,
    {
      wrap: true,
      closeOnEose: false,
      groupable: true,
      subId: "proj-docs-simple",
    },
  );

  // Filter and sort articles by date
  const sortedArticles = useMemo(() => {
    if (!articles) return [];

    let filteredArticles = [...articles];

    // Apply search filter if there's a search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredArticles = filteredArticles.filter((article) => {
        // Search in title
        if (article.title?.toLowerCase().includes(query)) return true;

        // Search in summary
        if (article.summary?.toLowerCase().includes(query)) return true;

        // Search in content
        if (article.content?.toLowerCase().includes(query)) return true;

        // Search in tags
        const tags = article.tags
          .filter((tag) => tag[0] === "t")
          .map((tag) => tag[1].toLowerCase());
        if (tags.some((tag) => tag.includes(query))) return true;

        return false;
      });
    }

    return filteredArticles.sort(
      (a, b) => (b.created_at || 0) - (a.created_at || 0),
    );
  }, [articles, searchQuery]);

  // Show empty state only when no search query and no articles
  if (sortedArticles.length === 0 && !searchQuery.trim()) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center h-32 gap-2",
          className,
        )}
      >
        <FileText className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No documentation yet</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Search Input */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search docs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      {/* Results */}
      {sortedArticles.length === 0 && searchQuery.trim() ? (
        <div className="flex flex-col items-center justify-center h-32 gap-2 text-center px-3">
          <FileText className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            No documentation matches your search
          </p>
          <p className="text-xs text-muted-foreground">
            Try a different search term
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="flex flex-col">
            {sortedArticles.map((article) => (
              <DocumentationItem
                key={article.id}
                article={article}
                onSelect={() => onArticleSelect?.(article)}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
