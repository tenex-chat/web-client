import { Button } from '@/components/ui/button'
import { Volume2, Square } from 'lucide-react'
import { useMemo } from 'react'
import { useProjectOnlineAgents } from '@/hooks/useProjectOnlineAgents'
import { useMurfTTS } from '@/hooks/useMurfTTS'
import { useAgentTTSConfig, getVoiceDisplayName } from '@/hooks/useAgentTTSConfig'
import { extractTTSContent } from '@/lib/utils/extractTTSContent'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface TTSButtonProps {
  content: string
  authorPubkey: string
  projectId?: string
  className?: string
  size?: 'default' | 'sm' | 'icon'
  variant?: 'ghost' | 'default' | 'outline'
  tooltipEnabled?: boolean
}

export function TTSButton({ 
  content, 
  authorPubkey, 
  projectId, 
  className,
  size = 'icon',
  variant = 'ghost',
  tooltipEnabled = true
}: TTSButtonProps) {
  // Get online agents to find the agent's slug
  const onlineAgents = useProjectOnlineAgents(projectId)
  
  // Get the agent's slug from the online agents
  const agentSlug = useMemo(() => {
    if (!onlineAgents || onlineAgents.length === 0) return null
    const agent = onlineAgents.find(a => a.pubkey === authorPubkey)
    return agent?.slug ?? null
  }, [onlineAgents, authorPubkey])
  
  // Get TTS configuration for this agent
  const ttsConfig = useAgentTTSConfig(agentSlug ?? undefined)
  const voiceName = getVoiceDisplayName(ttsConfig)
  
  // Don't render if TTS is not configured
  if (!ttsConfig || !ttsConfig.enabled || !agentSlug || !content) return null
  
  // Initialize TTS only if we have config
  const tts = useMurfTTS(ttsConfig)
  
  const handleClick = () => {
    if (tts.isPlaying) {
      tts.stop()
    } else {
      const ttsContent = extractTTSContent(content)
      if (ttsContent) {
        tts.speak(ttsContent, ttsConfig.voiceId)
      }
    }
  }
  
  const button = (
    <Button
      size={size}
      variant={variant}
      className={cn("transition-all", className)}
      onClick={handleClick}
    >
      {tts.isPlaying ? (
        <Square className="h-3.5 w-3.5" />
      ) : (
        <Volume2 className="h-3.5 w-3.5" />
      )}
    </Button>
  )
  
  if (!tooltipEnabled || !voiceName) {
    return button
  }
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {button}
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">
          {tts.isPlaying ? 'Stop' : 'Play'} TTS ({voiceName})
        </p>
      </TooltipContent>
    </Tooltip>
  )
}