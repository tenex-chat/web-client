import { memo } from 'react'
import { ChevronDown, ChevronRight, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThinkingBlockProps {
  content: string
  index: number
  isExpanded: boolean
  onToggle: () => void
  isMobile?: boolean
}

export const ThinkingBlock = memo(function ThinkingBlock({
  content,
  index,
  isExpanded,
  onToggle,
  isMobile = false
}: ThinkingBlockProps) {
  // Generate preview from first line, truncated to 100 chars
  const firstLine = content.split('\n')[0]
  const preview = firstLine.length > 100 
    ? firstLine.substring(0, 100) + '...' 
    : firstLine

  return (
    <div className="my-2">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors",
          isMobile ? "text-[11px]" : "text-xs"
        )}
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 flex-shrink-0" />
        )}
        <Brain className="w-3 h-3 flex-shrink-0" />
        <span className="truncate max-w-[600px]">
          {isExpanded ? 'Hide thinking' : preview}
        </span>
      </button>
      
      {isExpanded && (
        <div className="mt-1 p-2 bg-muted/20 rounded-md border border-muted/30">
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
            {content}
          </pre>
        </div>
      )}
    </div>
  )
})