import { NDKEvent } from '@nostr-dev-kit/ndk'
import { NDKProject } from '@/lib/ndk-events/NDKProject'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Reply, 
  MoreVertical, 
  Cpu, 
  DollarSign, 
  User,
  Copy
} from 'lucide-react'
import { TTSButton } from './TTSButton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatCost } from '@/lib/utils/formatCost'
import { useState } from 'react'

interface MessageActionsToolbarProps {
  event: NDKEvent
  project?: NDKProject | null
  onReply?: () => void
  onMetadataClick?: () => void
  llmMetadata?: Record<string, any> | null
  isMobile: boolean
  isHovered?: boolean
}

export function MessageActionsToolbar({
  event,
  project,
  onReply,
  onMetadataClick,
  llmMetadata,
  isMobile,
  isHovered = false
}: MessageActionsToolbarProps) {
  const [showRawEventDialog, setShowRawEventDialog] = useState(false)
  // Mobile layout: Inline actions integrated with message
  if (isMobile) {
    return (
      <div className="flex items-center gap-0.5">
        {/* Reply button - always visible as primary action */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onReply}
          className="h-5 px-1 text-[10px] text-muted-foreground hover:text-foreground"
        >
          <Reply className="h-2.5 w-2.5" />
        </Button>
        
        {/* TTS button */}
        <TTSButton
          content={event.content}
          authorPubkey={event.pubkey}
          projectId={project?.dTag}
          size="sm"
          variant="ghost"
          className="h-5 px-1 text-[10px] text-muted-foreground hover:text-foreground [&>svg]:h-2.5 [&>svg]:w-2.5"
          tooltipEnabled={false}
        />
        
        {/* More options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1 text-[10px] text-muted-foreground hover:text-foreground"
            >
              <MoreVertical className="h-2.5 w-2.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {llmMetadata && (
              <DropdownMenuItem 
                className="cursor-pointer text-xs"
                onClick={onMetadataClick}
              >
                <Cpu className="h-3 w-3 mr-2" />
                View LLM Info
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              className="cursor-pointer text-xs"
              onClick={() => {
                navigator.clipboard.writeText(event.pubkey)
                toast.success('Author pubkey copied')
              }}
            >
              <User className="h-3 w-3 mr-2" />
              Copy Author
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="cursor-pointer text-xs"
              onClick={() => {
                navigator.clipboard.writeText(event.encode())
                toast.success('ID copied')
              }}
            >
              <Copy className="h-3 w-3 mr-2" />
              Copy ID
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="cursor-pointer text-xs"
              onClick={() => {
                setShowRawEventDialog(true)
              }}
            >
              View Raw Event
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="cursor-pointer text-xs"
              onClick={() => {
                const rawEventString = JSON.stringify(event.rawEvent(), null, 2)
                navigator.clipboard.writeText(rawEventString)
                toast.success('Raw event copied')
              }}
            >
              <Copy className="h-3 w-3 mr-2" />
              Copy Raw Event
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Cost indicator - only show if meaningful */}
        {(() => {
          const cost = formatCost(llmMetadata?.["llm-cost-usd"] || llmMetadata?.["llm-cost"])
          if (!cost) return null
          return (
            <Badge
              variant="outline"
              className="text-[9px] h-4 px-1 text-muted-foreground border-muted ml-auto"
            >
              {cost}
            </Badge>
          )
        })()}
      </div>
    )
  }

  // Desktop layout: Hover-based actions
  return (
    <>
      <div className={cn(
        "flex items-center gap-0.5 transition-opacity",
        isHovered ? "opacity-100" : "opacity-0"
      )}>
      {/* TTS button */}
      <TTSButton
        content={event.content}
        authorPubkey={event.pubkey}
        projectId={project?.dTag}
        size="icon"
        variant="ghost"
        className="h-7 w-7 p-0 hover:bg-muted"
      />
      
      {/* Reply button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onReply}
        className="h-7 w-7 p-0 hover:bg-muted"
        title="Reply to this message"
      >
        <Reply className="h-3.5 w-3.5" />
      </Button>
      
      {/* LLM Metadata Icon */}
      {llmMetadata && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onMetadataClick}
          className="h-7 w-7 p-0 hover:bg-muted"
          title="View LLM metadata"
        >
          <Cpu className="h-3.5 w-3.5" />
        </Button>
      )}
      
      {/* More options dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-muted"
            title="Message options"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem 
            className="cursor-pointer"
            onClick={() => {
              navigator.clipboard.writeText(event.pubkey)
              toast.success('Author pubkey copied')
            }}
          >
            <User className="h-3.5 w-3.5 mr-2" />
            Copy Author
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="cursor-pointer"
            onClick={() => {
              navigator.clipboard.writeText(event.encode())
              toast.success('ID copied')
            }}
          >
            <Copy className="h-3.5 w-3.5 mr-2" />
            Copy ID
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="cursor-pointer"
            onClick={() => {
              setShowRawEventDialog(true)
            }}
          >
            View Raw Event
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="cursor-pointer"
            onClick={() => {
              const rawEventString = JSON.stringify(event.rawEvent(), null, 2)
              navigator.clipboard.writeText(rawEventString)
              toast.success('Raw event copied')
            }}
          >
            <Copy className="h-3.5 w-3.5 mr-2" />
            Copy Raw Event
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Cost indicator - only show if meaningful */}
      {(() => {
        const cost = formatCost(llmMetadata?.["llm-cost-usd"] || llmMetadata?.["llm-cost"])
        if (!cost) return null
        return (
          <Badge
            variant="outline"
            className="text-[10px] h-5 px-1.5 text-green-600 border-green-600"
          >
            <DollarSign className="w-3 h-3 mr-0.5" />
            {cost}
          </Badge>
        )
      })()}
      
      </div>
      
      {/* Raw Event Dialog */}
      <Dialog open={showRawEventDialog} onOpenChange={setShowRawEventDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Raw Event</DialogTitle>
          </DialogHeader>
          <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
            {JSON.stringify(event.rawEvent(), null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  )
}