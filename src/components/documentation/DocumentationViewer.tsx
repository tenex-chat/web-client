import { NDKArticle } from '@nostr-dev-kit/ndk'
import { ArrowLeft, Calendar, Clock, Copy, Hash, MessageSquare } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { formatRelativeTime } from '@/lib/utils/time'
import { useMemo, useState } from 'react'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { NDKProject } from '@/lib/ndk-events/NDKProject'
import { cn } from '@/lib/utils'

interface DocumentationViewerProps {
  article: NDKArticle
  onBack?: () => void
  projectTitle?: string
  project?: NDKProject
}

export function DocumentationViewer({ article, onBack, projectTitle, project }: DocumentationViewerProps) {
  const [showComments, setShowComments] = useState(true)
  const readingTime = useMemo(() => {
    const content = article.content || ''
    const wordsPerMinute = 200
    const words = content.trim().split(/\s+/).length
    const minutes = Math.ceil(words / wordsPerMinute)
    return `${minutes} min read`
  }, [article.content])

  const handleCopyLink = async () => {
    try {
      const encoded = article.encode()
      await navigator.clipboard.writeText(encoded)
      toast.success('Article link copied to clipboard')
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const tags = article.tags
    .filter(tag => tag[0] === 't')
    .map(tag => tag[1])

  return (
    <div className="h-full flex">
      <div className={cn(
        "flex flex-col transition-all duration-300",
        showComments && project ? "flex-1" : "w-full"
      )}>
        {/* Header */}
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
            <div>
              {projectTitle && (
                <p className="text-sm text-muted-foreground">
                  {projectTitle} / Documentation
                </p>
              )}
              <h1 className="text-xl font-semibold">{article.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {project && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowComments(!showComments)}
                className="h-9 w-9"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopyLink}
              className="h-9 w-9"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6 max-w-4xl mx-auto">
            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{formatRelativeTime(article.created_at || 0)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{readingTime}</span>
              </div>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    <Hash className="h-3 w-3" />
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Summary */}
            {article.summary && (
              <div className="mb-8 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-2">Summary</p>
                <p className="text-sm text-muted-foreground">{article.summary}</p>
              </div>
            )}

            {/* Article Content */}
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {article.content || ''}
              </ReactMarkdown>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Comments Panel */}
      {showComments && project && (
        <div className="w-96 border-l flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Comments</h2>
          </div>
          <ChatInterface
            project={project}
            rootEvent={article}
            className="flex-1"
          />
        </div>
      )}
    </div>
  )
}