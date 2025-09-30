import { ArrowLeft, Edit, History, MessageSquare, Copy, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ArticleHeaderProps {
  title: string;
  projectTitle?: string;
  onBack?: () => void;
  onEdit?: () => void;
  onToggleChangelog: () => void;
  onToggleComments: () => void;
  onCopyLink: () => void;
  onDetach?: () => void;
  hasProject: boolean;
}

export function ArticleHeader({
  title,
  projectTitle,
  onBack,
  onEdit,
  onToggleChangelog,
  onToggleComments,
  onCopyLink,
  onDetach,
  hasProject,
}: ArticleHeaderProps) {
  return (
    <div className="border-b">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2 absolute left-4">
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
        </div>
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between">
          <div>
            {projectTitle && (
              <p className="text-sm text-muted-foreground">
                {projectTitle} / Documentation
              </p>
            )}
            <h1 className="text-xl font-semibold">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                className="h-9 w-9"
                title="Edit documentation"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleChangelog}
              className="h-9 w-9"
              title="Toggle changelog"
            >
              <History className="h-4 w-4" />
            </Button>
            {hasProject && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleComments}
                className="h-9 w-9"
                title="Toggle comments"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onCopyLink}
              className="h-9 w-9"
              title="Copy link"
            >
              <Copy className="h-4 w-4" />
            </Button>
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
      </div>
    </div>
  );
}