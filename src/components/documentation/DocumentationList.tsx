import { NDKArticle, NDKKind } from '@nostr-dev-kit/ndk'
import { useSubscribe } from '@nostr-dev-kit/ndk-hooks'
import { FileText, Calendar, Clock, Hash } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatRelativeTime } from '@/lib/utils/time'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useProjectsStore } from '@/stores/projects'

interface DocumentationListProps {
  projectId?: string
  onArticleSelect?: (article: NDKArticle) => void
  className?: string
}

export function DocumentationList({
  projectId,
  onArticleSelect,
  className
}: DocumentationListProps) {
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
      <div className={cn('flex flex-col items-center justify-center h-64 gap-3', className)}>
        <FileText className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-muted-foreground">No documentation available</p>
      </div>
    )
  }

  return (
    <ScrollArea className={cn('h-full', className)}>
      <div className="p-4 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documentation
          <Badge variant="secondary">{sortedArticles.length}</Badge>
        </h2>
        
        <div className="grid gap-3">
          {sortedArticles.map((article) => {
            const tags = article.tags
              .filter(tag => tag[0] === 't')
              .map(tag => tag[1])
              .slice(0, 3) // Show max 3 tags

            return (
              <Card
                key={article.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => onArticleSelect?.(article)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base line-clamp-2">
                    {article.title || 'Untitled'}
                  </CardTitle>
                  {article.summary && (
                    <CardDescription className="line-clamp-2 mt-1">
                      {article.summary}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatRelativeTime(article.created_at || 0)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{getReadingTime(article.content)}</span>
                    </div>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tags.map(tag => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-xs py-0 h-5"
                        >
                          <Hash className="h-2.5 w-2.5 mr-0.5" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </ScrollArea>
  )
}