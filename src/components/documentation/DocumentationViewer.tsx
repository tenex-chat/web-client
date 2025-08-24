import { NDKArticle } from '@nostr-dev-kit/ndk'
import { ArrowLeft, Calendar, Clock, Copy, Hash, MessageSquare, Plus, History, Edit, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { formatRelativeTime } from '@/lib/utils/time'
import { useMemo, useState, useCallback } from 'react'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { NDKProject } from '@/lib/ndk-events/NDKProject'
import type { NDKEvent } from '@nostr-dev-kit/ndk-hooks'
import { useProfile } from '@nostr-dev-kit/ndk-hooks'
import { cn } from '@/lib/utils'
import { ChangelogTabContent } from '@/components/changelog/ChangelogTabContent'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface DocumentationViewerProps {
  article: NDKArticle
  onBack?: () => void
  onEdit?: () => void
  projectTitle?: string
  project?: NDKProject
}

export function DocumentationViewer({ article, onBack, onEdit, projectTitle, project }: DocumentationViewerProps) {
  const [showComments, setShowComments] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false)
  const [chatThread, setChatThread] = useState<NDKEvent | undefined>(undefined)
  
  const profile = useProfile(article.pubkey)
  const authorName = profile?.displayName || profile?.name || 'Unknown Author'
  const authorAvatar = profile?.image || profile?.picture
  
  const readingTime = useMemo(() => {
    const content = article.content || ''
    const wordsPerMinute = 200
    const words = content.trim().split(/\s+/).length
    const minutes = Math.ceil(words / wordsPerMinute)
    return `${minutes} min read`
  }, [article.content])
  
  const handleThreadCreated = useCallback(async (thread: NDKEvent) => {
      setChatThread(thread)
  }, [])

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

  // Calculate content width based on active sidebars
  const getContentWidth = () => {
    if (showComments || showChangelog) {
      return "w-2/3" // 66% width when sidebar is active
    }
    return "w-full" // 100% width when no sidebars
  }

  return (
    <div className="h-full flex w-full">
      {/* Main Content Area */}
      <div className={cn(
        "flex flex-col transition-all duration-300",
        getContentWidth()
      )}>
        {/* Header */}
        <div className="border-b">
          <div className="flex items-center justify-between p-4">
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="h-9 w-9 absolute left-4"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="max-w-3xl mx-auto w-full flex items-center justify-between">
              <div>
                {projectTitle && (
                  <p className="text-sm text-muted-foreground">
                    {projectTitle} / Documentation
                  </p>
                )}
                <h1 className="text-xl font-semibold">{article.title}</h1>
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
                  onClick={() => {
                    setShowChangelog(!showChangelog)
                    if (!showChangelog) setShowComments(false) // Close comments when opening changelog
                  }}
                  className="h-9 w-9"
                  title="Toggle changelog"
                >
                  <History className="h-4 w-4" />
                </Button>
                {project && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowComments(!showComments)
                      if (!showComments) setShowChangelog(false) // Close changelog when opening comments
                    }}
                    className="h-9 w-9"
                    title="Toggle comments"
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
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6 max-w-3xl mx-auto">
            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={authorAvatar} alt={authorName} />
                  <AvatarFallback>
                    <User className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
                <span>{authorName}</span>
              </div>
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

      {/* Changelog Sidebar */}
      {showChangelog && (
        <div className="w-1/3 border-l flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">Changelog</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChangelogTabContent article={article} />
          </div>
        </div>
      )}

      {/* Comments Sidebar */}
      {showComments && project && (
        <div className="w-1/3 border-l flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">Comments</h2>
            {!chatThread && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => {/* Start new chat - ChatInterface will handle creation */}}
                title="Start new discussion"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
          <ChatInterface
            project={project}
            rootEvent={chatThread}
            extraTags={[article.tagReference()]}
            className="flex-1"
            onThreadCreated={handleThreadCreated}
          />
        </div>
      )}
    </div>
  )
}