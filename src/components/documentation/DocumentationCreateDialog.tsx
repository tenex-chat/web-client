"use client";

import { useState, useEffect, useRef } from "react";
import { NDKArticle } from "@nostr-dev-kit/ndk-hooks";
import { useNDK } from "@nostr-dev-kit/ndk-hooks";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DocumentationEditor } from "./DocumentationEditor";
import { HashtagInput } from "./HashtagInput";
import { useToast } from "@/hooks/use-toast";
import type { NDKProject } from "@/lib/ndk-events/NDKProject";
import { Loader2, X, FileText, Trash2 } from "lucide-react";
import TurndownService from "turndown";
import { marked } from "marked";

interface DocumentationCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: NDKProject;
  existingArticle?: NDKArticle | null;
  existingHashtags?: string[];
}

export function DocumentationCreateDialog({
  open,
  onOpenChange,
  project,
  existingArticle,
  existingHashtags = [],
}: DocumentationCreateDialogProps) {
  const { ndk } = useNDK();
  const { toast } = useToast();
  const [isPublishing, setIsPublishing] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);

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

  // Auto-resize title textarea
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = "auto";
      titleRef.current.style.height = titleRef.current.scrollHeight + "px";
    }
  }, [/* effect dep */ title]);

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

      // Clear form and close dialog
      if (!isEditMode) {
        setTitle("");
        setContent("");
        setHashtags([]);
      }
      // Clear draft on successful publish for new articles
      if (!isEditMode) {
        localStorage.removeItem(`doc-draft-${project.tagId()}`);
      }

      onOpenChange(false);
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
    if (title || content || hashtags.length > 0) {
      const draft = { title, content, hashtags };
      localStorage.setItem(
        `doc-draft-${project.tagId()}`,
        JSON.stringify(draft),
      );
    }
  }, [title, content, hashtags, project]);

  // Load draft on mount (only for new articles)
  useEffect(() => {
    if (!isEditMode && open) {
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
    } else {
      // Reset draft loaded state when closing or in edit mode
      setDraftLoaded(false);
    }
  }, [open, isEditMode, project]);

  // Function to clear draft and start fresh
  const clearDraft = () => {
    setTitle("");
    setContent("");
    setHashtags([]);
    setDraftLoaded(false);
    localStorage.removeItem(`doc-draft-${project.tagId()}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-screen h-screen max-w-none p-0 border-0 rounded-none bg-background flex flex-col">
        {/* Minimal header bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-sm border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-9 w-9"
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-3">
            {!isEditMode && (title || content || hashtags.length > 0) && (
              <span className="text-xs text-muted-foreground">Draft saved</span>
            )}
            <Button
              onClick={handlePublish}
              disabled={!title || !content || isPublishing}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Publishing...
                </>
              ) : isEditMode ? (
                "Save changes"
              ) : (
                "Publish"
              )}
            </Button>
          </div>
        </div>

        {/* Draft notification bar */}
        {draftLoaded && !isEditMode && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-900/50 px-6 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
              <FileText className="h-4 w-4" />
              <span>Restored from draft</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearDraft}
              className="text-xs hover:bg-blue-100 dark:hover:bg-blue-900/50 h-7 px-2"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Start fresh
            </Button>
          </div>
        )}

        {/* Main content area - flex-1 to fill remaining height */}
        <div className="flex-1 overflow-hidden flex flex-col bg-background">
          <div className="max-w-[680px] w-full mx-auto px-5 flex-1 flex flex-col overflow-y-auto">
            {/* Title */}
            <textarea
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full resize-none border-0 outline-none bg-transparent text-3xl leading-[1.2] font-bold placeholder:text-muted-foreground/40 overflow-hidden py-4 flex-shrink-0"
              style={{ minHeight: "50px" }}
            />

            {/* Hashtags */}
            <div className="mt-2 mb-6 pb-4 border-b flex-shrink-0">
              <HashtagInput
                value={hashtags}
                onChange={setHashtags}
                suggestions={existingHashtags}
                maxTags={5}
                placeholder="Add up to 5 tags..."
                className="text-sm"
              />
            </div>

            {/* Content editor - fills remaining space */}
            <div className="flex-1 min-h-0">
              <DocumentationEditor
                content={content}
                onChange={setContent}
                placeholder="Tell your story..."
                className="h-full"
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
