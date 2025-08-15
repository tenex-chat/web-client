import { NDKArticle, NDKKind } from '@nostr-dev-kit/ndk'
import { useSubscribe } from '@nostr-dev-kit/ndk-hooks'
import { FileText, Clock } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatRelativeTime } from '@/lib/utils/time'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useProjectsStore } from '@/stores/projects'

interface DocumentationListSimpleProps {
  projectId?: string
  onArticleSelect?: (article: NDKArticle) => void
  className?: string
}

export function DocumentationListSimple({
  projectId,
  onArticleSelect,
  className
}: DocumentationListSimpleProps) {
  const projectsMap = useProjectsStore((state) => state.projects)
  
  // Get the project
  const project = useMemo(() => {
    if (!projectId || !projectsMap) return null
    // Convert Map to array and find the project
    const projectsArray = Array.from(projectsMap.values())
    return projectsArray.find(p => p.dTag === projectId)
  }, [projectId, projectsMap])

  // Build subscription filter for articles tagged with this project
  const filter = useMemo(() => {
    if (!project) return false
    
    return [{
      kinds: [30023 as NDKKind], // NDK Article kind
      '#a': [project.tagId()]
    }]
  }, [project])

  // Subscribe to articles
  const { events: articles } = useSubscribe<NDKArticle>(filter, {
    wrap: true,
    closeOnEose: false,
    groupable: true,
    subId: 'proj-docs-simple'
  }, [project])

  // Sort articles by date
  const sortedArticles = useMemo(() => {
    if (!articles) return []
    return [...articles].sort((a, b) => 
      (b.created_at || 0) - (a.created_at || 0)
    )
  }, [articles])

  const getReadingTime = (content?: string) => {
    if (!content) return '1 min'
    const wordsPerMinute = 200
    const words = content.trim().split(/\s+/).length
    const minutes = Math.ceil(words / wordsPerMinute)
    return `${minutes} min`
  }

  if (sortedArticles.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-32 gap-2', className)}>
        <FileText className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No documentation yet</p>
      </div>
    )
  }

  return (
    <ScrollArea className={cn('h-full', className)}>
      <div className="flex flex-col">
        {sortedArticles.map((article) => (
          <div
            key={article.id}
            className="flex items-start gap-3 px-3 py-2.5 hover:bg-accent/50 cursor-pointer transition-colors border-b"
            onClick={() => onArticleSelect?.(article)}
          >
            <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">
                {article.title || 'Untitled'}
              </div>
              {article.summary && (
                <div className="text-xs text-muted-foreground truncate">
                  {article.summary}
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(article.created_at || 0)} · {getReadingTime(article.content)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}