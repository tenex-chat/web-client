import { Button } from '@/components/ui/button'
import { Volume2, Square } from 'lucide-react'
import { useMemo, useState, useRef } from 'react'
import { useProjectOnlineAgents } from '@/hooks/useProjectOnlineAgents'
import { useAI } from '@/hooks/useAI'
import { useAgentVoiceConfig } from '@/hooks/useAgentVoiceConfig'
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
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { speak, hasTTS } = useAI()
  
  // Get online agents to find the agent's slug
  const onlineAgents = useProjectOnlineAgents(projectId)
  
  // Get the agent's slug from the online agents
  const agentSlug = useMemo(() => {
    if (!onlineAgents || onlineAgents.length === 0) return null
    const agent = onlineAgents.find(a => a.pubkey === authorPubkey)
    return agent?.slug ?? null
  }, [onlineAgents, authorPubkey])
  
  // Get voice configuration for this agent
  const { config: voiceConfig } = useAgentVoiceConfig(agentSlug ?? undefined)
  const voiceName = voiceConfig?.voiceId || 'Default'
  
  // Don't render if TTS is not configured
  if (!hasTTS || !content) return null
  
  const handleClick = async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setIsPlaying(false)
    } else {
      const ttsContent = extractTTSContent(content)
      if (ttsContent) {
        try {
          setIsPlaying(true)
          const audioBlob = await speak(ttsContent)
          const audioUrl = URL.createObjectURL(audioBlob)
          const audio = new Audio(audioUrl)
          audioRef.current = audio
          
          audio.onended = () => {
            setIsPlaying(false)
            URL.revokeObjectURL(audioUrl)
            audioRef.current = null
          }
          
          await audio.play()
        } catch (error) {
          console.error('TTS playback failed:', error)
          setIsPlaying(false)
        }
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
      {isPlaying ? (
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
          {isPlaying ? 'Stop' : 'Play'} TTS ({voiceName})
        </p>
      </TooltipContent>
    </Tooltip>
  )
}