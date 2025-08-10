import { NDKEvent } from '@nostr-dev-kit/ndk'
import { FileText, Calendar, User } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils/time'
import { ProfileDisplay } from '@/components/common/ProfileDisplay'

interface ArticleEmbedCardProps {
  event: NDKEvent
  compact?: boolean
  className?: string
  onClick?: () => void
}

export function ArticleEmbedCard({ event, compact, className, onClick }: ArticleEmbedCardProps) {
  // Extract article metadata from tags
  const title = event.tags?.find(tag => tag[0] === 'title')?.[1] || 
                event.tags?.find(tag => tag[0] === 'd')?.[1]?.toUpperCase() || 
                'Untitled Article'
  
  const summary = event.tags?.find(tag => tag[0] === 'summary')?.[1] || 
                  event.tags?.find(tag => tag[0] === 'description')?.[1] ||
                  event.content?.slice(0, 150) + (event.content?.length > 150 ? '...' : '')
  
  const image = event.tags?.find(tag => tag[0] === 'image')?.[1]
  const publishedAt = event.tags?.find(tag => tag[0] === 'published_at')?.[1]

  if (compact) {
    return (
      <span
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md",
          "bg-muted/50 hover:bg-muted transition-colors cursor-pointer",
          "text-sm my-1",
          className
        )}
      >
        <FileText className="w-3.5 h-3.5 text-blue-500" />
        <span className="font-medium">{title}</span>
      </span>
    )
  }

  return (
    <Card 
      onClick={onClick}
      className={cn(
        "my-3 overflow-hidden cursor-pointer transition-all",
        "hover:shadow-md hover:border-primary/20",
        className
      )}
    >
      {image && (
        <div className="w-full h-48 bg-muted">
          <img 
            src={image} 
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      
      <div className="p-4">
        <div className="flex items-start gap-3">
          {!image && (
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg mb-2">{title}</h3>
            
            {summary && (
              <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                {summary}
              </p>
            )}
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <User className="w-3 h-3" />
                <ProfileDisplay pubkey={event.pubkey} />
              </div>
              
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>
                  {publishedAt 
                    ? formatRelativeTime(parseInt(publishedAt) * 1000)
                    : event.created_at 
                      ? formatRelativeTime(event.created_at * 1000)
                      : 'Unknown date'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}