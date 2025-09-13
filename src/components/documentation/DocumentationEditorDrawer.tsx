"use client";

import { useState, useEffect } from "react";
import { NDKArticle } from "@nostr-dev-kit/ndk-hooks";
import { useNDK } from "@nostr-dev-kit/ndk-hooks";
import { Button } from "@/components/ui/button";
import { DocumentationEditor } from "./DocumentationEditor";
import { HashtagInput } from "./HashtagInput";
import { useToast } from "@/hooks/use-toast";
import type { NDKProject } from "@/lib/ndk-events/NDKProject";
import {
  ArrowLeft,
  Loader2,
  FileText,
  Trash2,
  ExternalLink,
  X,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import TurndownService from "turndown";
import { marked } from "marked";

interface DocumentationEditorDrawerProps {
  project: NDKProject;
  projectTitle?: string;
  existingArticle?: NDKArticle | null;
  existingHashtags?: string[];
  onBack?: () => void;
  onDetach?: () => void;
}

export function DocumentationEditorDrawer({
  project,
  projectTitle,
  existingArticle,
  existingHashtags = [],
  onBack,
  onDetach,
}: DocumentationEditorDrawerProps) {
  const { ndk } = useNDK();
  const { toast } = useToast();
  const [isPublishing, setIsPublishing] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const isEditMode = !!existingArticle;

  // Initialize Turndown service for HTML to Markdown conversion
  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });

  // Initialize form with existing article data
  useEffect(() => {
    const loadArticle = async () => {
      if (existingArticle) {
        setTitle(existingArticle.title || "");

        // Convert markdown content to HTML for the editor
        if (existingArticle.content) {
          const htmlContent = await marked(existingArticle.content);
          setContent(htmlContent);
        } else {
          setContent("");
        }

        // Extract hashtags from tags
        const articleHashtags = existingArticle.tags
          .filter((tag) => tag[0] === "t")
          .map((tag) => tag[1]);
        setHashtags(articleHashtags);
      } else {
        // Reset form for new article
        setTitle("");
        setContent("");
        setHashtags([]);
      }
    };

    loadArticle();
  }, [existingArticle]);
  // Generate unique identifier for the article
  const generateIdentifier = () => {
    if (existingArticle) {
      // For edits, use existing identifier (d tag)
      const dTag = existingArticle.tags.find((tag) => tag[0] === "d");
      return dTag?.[1] || `${project.tagId()}-${Date.now()}`;
    }
    // For new articles, create new identifier
    return `${project.tagId()}-${Date.now()}`;
  };

  const handlePublish = async () => {
    if (!ndk?.signer || !title || !content) {
      toast({
        title: "Missing Information",
        description:
          "Please provide a title and content for the documentation.",
        variant: "destructive",
      });
      return;
    }

    setIsPublishing(true);

    try {
      const article = new NDKArticle(ndk);

      // Convert HTML content to Markdown
      const markdownContent = turndownService.turndown(content);

      // Auto-generate summary from content
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = content;
      const plainText = tempDiv.textContent || tempDiv.innerText || "";
      const summary =
        plainText.slice(0, 160).trim() + (plainText.length > 160 ? "..." : "");

      // Set article properties
      article.title = title;
      article.summary = summary || undefined;
      article.content = markdownContent; // Use markdown instead of HTML
      article.published_at = Math.floor(Date.now() / 1000);

      // Build tags array
      const identifier = generateIdentifier();
      article.tags = [
        ["d", identifier], // Unique identifier for replaceable event
        ["title", title],
        ["a", project.tagId()], // Link to project
      ];

      // Add summary tag if provided
      if (summary) {
        article.tags.push(["summary", summary]);
      }

      // Add hashtags
      hashtags.forEach((tag) => {
        article.tags.push(["t", tag]);
      });

      // Add published_at tag
      article.tags.push(["published_at", String(article.published_at)]);

      // Publish the article
      await article.publish();

      toast({
        title: isEditMode ? "Documentation Updated" : "Documentation Published",
        description: `Your article "${title}" has been ${isEditMode ? "updated" : "published"} successfully.`,
      });

      // Clear form and go back
      if (!isEditMode) {
        setTitle("");
        setContent("");
        setHashtags([]);
        localStorage.removeItem(`doc-draft-${project.tagId()}`);
      }

      onBack?.();
    } catch (error) {
      console.error("Failed to publish article:", error);
      toast({
        title: "Publication Failed",
        description: "Failed to publish the documentation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Save draft to localStorage
  useEffect(() => {
    if (!isEditMode && (title || content || hashtags.length > 0)) {
      const draft = { title, content, hashtags };
      localStorage.setItem(
        `doc-draft-${project.tagId()}`,
        JSON.stringify(draft),
      );
    }
  }, [title, content, hashtags, project, isEditMode]);

  // Load draft on mount (only for new articles)
  useEffect(() => {
    if (!isEditMode) {
      const draftKey = `doc-draft-${project.tagId()}`;
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          // Only load draft if it has content
          if (
            draft.title ||
            draft.content ||
            (draft.hashtags && draft.hashtags.length > 0)
          ) {
            setTitle(draft.title || "");
            setContent(draft.content || "");
            setHashtags(draft.hashtags || []);
            setDraftLoaded(true);
          }
        } catch (e) {
          console.error("Failed to load draft:", e);
        }
      }
    }
  }, [isEditMode, project]);

  // Function to clear draft and start fresh
  const clearDraft = () => {
    setTitle("");
    setContent("");
    setHashtags([]);
    setDraftLoaded(false);
    localStorage.removeItem(`doc-draft-${project.tagId()}`);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header - similar to DocumentationViewer */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          {onDetach && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDetach}
              className="h-9 w-9"
              title="Detach to floating window"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          <div>
            {projectTitle && (
              <p className="text-sm text-muted-foreground">
                {projectTitle} / Documentation
              </p>
            )}
            <p className="text-lg font-semibold">
              {isEditMode ? "Edit Article" : "New Article"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {draftLoaded && !isEditMode && (
            <Button variant="outline" size="sm" onClick={clearDraft}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear draft
            </Button>
          )}
          <Button
            onClick={handlePublish}
            disabled={!title || !content || isPublishing}
            size="sm"
          >
            {isPublishing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : isEditMode ? (
              "Update"
            ) : (
              "Publish"
            )}
          </Button>
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-9 w-9"
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Draft notification */}
      {draftLoaded && !isEditMode && (
        <div className="bg-blue-50 dark:bg-blue-950/30 px-4 py-2 text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span>Restored from draft</span>
        </div>
      )}

      {/* Content area - similar layout to viewer */}
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Title input - more compact */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full border-0 outline-none bg-transparent text-3xl font-bold placeholder:text-muted-foreground/30 mb-4"
          />

          {/* Hashtag input - inline and compact */}
          <div className="mb-8">
            <HashtagInput
              value={hashtags}
              onChange={setHashtags}
              suggestions={existingHashtags}
              maxTags={5}
              placeholder="Add tags..."
            />
          </div>

          {/* Content editor */}
          <div className="prose prose-zinc dark:prose-invert max-w-none">
            <DocumentationEditor
              content={content}
              onChange={setContent}
              placeholder="Tell your story..."
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
