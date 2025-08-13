import { useMemo } from 'react'
import { ArrowLeft, Phone, PhoneOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/useMediaQuery'
import type { NDKEvent } from '@nostr-dev-kit/ndk-hooks'

interface ChatHeaderProps {
  rootEvent: NDKEvent | null
  onBack?: () => void
  autoTTS: boolean
  onAutoTTSChange: (enabled: boolean) => void
  ttsEnabled: boolean
}

/**
 * Chat header component
 * Handles thread title display, back navigation, and TTS toggle
 */
export function ChatHeader({ 
  rootEvent, 
  onBack, 
  autoTTS, 
  onAutoTTSChange,
  ttsEnabled 
}: ChatHeaderProps) {
  const isMobile = useIsMobile()
  const isNewThread = !rootEvent

  // Get thread title
  const threadTitle = useMemo(() => {
    if (rootEvent) {
      const titleTag = rootEvent.tags?.find(
        (tag: string[]) => tag[0] === 'title'
      )?.[1]
      if (titleTag) return titleTag
      // Fallback to first line of content
      const firstLine = rootEvent.content?.split('\n')[0] || 'Thread'
      return firstLine.length > 50 ? `${firstLine.slice(0, 50)}...` : firstLine
    }
    return isNewThread ? 'New Thread' : 'Thread'
  }, [rootEvent, isNewThread])

  if (!rootEvent) return null

  return (
    <div className="bg-card border-b border-border/60 backdrop-blur-xl bg-card/95 sticky top-0 z-50">
      <div
        className={cn(
          "flex items-center justify-between",
          isMobile ? "px-3 py-2" : "px-3 sm:px-4 py-3 sm:py-4",
        )}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="w-8 h-8 sm:w-9 sm:h-9 hover:bg-accent"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          )}
          <div className="flex-1 min-w-0">
            <h1
              className={cn(
                "font-semibold text-foreground truncate",
                isMobile
                  ? "text-base max-w-40"
                  : "text-lg sm:text-xl max-w-48",
              )}
            >
              {threadTitle}
            </h1>
            <p
              className={cn(
                "text-muted-foreground",
                isMobile ? "text-[10px] mt-0" : "text-xs mt-0.5",
              )}
            >
              Thread discussion
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-TTS toggle */}
          {ttsEnabled && (
            <Button
              variant={autoTTS ? "default" : "ghost"}
              size="icon"
              onClick={() => onAutoTTSChange(!autoTTS)}
              className={cn(
                "w-8 h-8 sm:w-9 sm:h-9",
                autoTTS
                  ? "bg-green-600 hover:bg-green-700"
                  : "hover:bg-accent",
              )}
              title={
                autoTTS ? "Disable voice mode" : "Enable voice mode"
              }
            >
              {autoTTS ? (
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              ) : (
                <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}