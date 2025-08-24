import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PhoneOff, Mic, MicOff, Bot, AlertCircle, Send } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ProjectAvatar } from '@/components/ui/project-avatar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { useChromeSpeechRecognition } from '@/hooks/useChromeSpeechRecognition'
import { useSpeechToText } from '@/hooks/useSpeechToText'
import { useThreadManagement } from '@/components/chat/hooks/useThreadManagement'
import { useChatMessages } from '@/components/chat/hooks/useChatMessages'
import { useProjectOnlineAgents } from '@/hooks/useProjectOnlineAgents'
import { useMurfTTS } from '@/hooks/useMurfTTS'
import { useTTS } from '@/stores/ai-config-store'
import { extractTTSContent } from '@/lib/utils/extractTTSContent'
import { isAudioEvent } from '@/lib/utils/audioEvents'
import { useProfile, useSubscribe } from '@nostr-dev-kit/ndk-hooks'
import { useNDKCurrentUser } from '@nostr-dev-kit/ndk-hooks'
import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk'
import { useCallSettings } from '@/stores/call-settings-store'
import { CallSettings } from './CallSettings'
import { EVENT_KINDS } from '@/lib/constants'
import type { NDKProject } from '@/lib/ndk-events/NDKProject'
import type { AgentInstance } from '@/types/agent'
import type { Message } from '@/components/chat/hooks/useChatMessages'

interface CallViewProps {
  project: NDKProject
  onClose: (rootEvent?: NDKEvent | null) => void
  extraTags?: string[][]
}

// Conversation state machine
type ConversationState = 
  | 'initializing'
  | 'idle' 
  | 'user_speaking' 
  | 'processing_user_input'
  | 'agent_speaking'
  | 'error'

interface AgentDisplayProps {
  agent: AgentInstance
  isTyping: boolean
  isSpeaking: boolean
  isTargeted: boolean
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
}

function AgentDisplay({ agent, isTyping, isSpeaking, isTargeted, onClick, size = 'md' }: AgentDisplayProps) {
  const profile = useProfile(agent.pubkey)
  const avatarUrl = profile?.image || profile?.picture
  const displayName = agent.slug || profile?.displayName || profile?.name || 'Agent'
  
  const sizeClasses = {
    sm: isTargeted ? 'h-[52px] w-[52px]' : 'h-12 w-12',
    md: isTargeted ? 'h-[68px] w-[68px]' : 'h-16 w-16',
    lg: isTargeted ? 'h-[84px] w-[84px]' : 'h-20 w-20'
  }
  
  return (
    <button 
      onClick={onClick}
      className="relative flex flex-col items-center gap-2 focus:outline-none"
    >
      <motion.div
        animate={{
          scale: isSpeaking ? 1.1 : 1,
          opacity: isTargeted ? 1 : 0.95,
        }}
        transition={{ duration: 0.3 }}
        className="relative"
      >
        {/* Ripple effect for speaking */}
        {isSpeaking && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full bg-white/20"
              animate={{
                scale: [1, 1.5],
                opacity: [0.5, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
            <motion.div
              className="absolute inset-0 rounded-full bg-white/20"
              animate={{
                scale: [1, 1.5],
                opacity: [0.5, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeOut",
                delay: 0.5,
              }}
            />
          </>
        )}
        
        <Avatar className={cn(
          sizeClasses[size], 
          "relative z-10 transition-all"
        )}>
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback className="bg-white/10 text-white">
            <Bot className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="absolute -bottom-1 -right-1 bg-black/80 rounded-full px-2 py-1 z-20">
            <div className="flex gap-0.5">
              <span className="inline-block w-1 h-1 bg-white/80 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="inline-block w-1 h-1 bg-white/80 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="inline-block w-1 h-1 bg-white/80 rounded-full animate-bounce" />
            </div>
          </div>
        )}
      </motion.div>
      
      <span className="text-xs text-white/90 max-w-[80px] truncate text-center">
        {agent.slug || displayName}
      </span>
    </button>
  )
}

function AgentSelector({ 
  agent, 
  onClick 
}: { 
  agent: AgentInstance
  onClick: () => void 
}) {
  const profile = useProfile(agent.pubkey)
  const avatarUrl = profile?.image || profile?.picture
  const displayName = agent.slug || profile?.displayName || profile?.name || 'Agent'
  
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 p-2 rounded-lg transition-all opacity-70 hover:opacity-100"
    >
      <Avatar className="h-12 w-12">
        <AvatarImage src={avatarUrl} alt={displayName} />
        <AvatarFallback className="bg-white/10 text-white">
          <Bot className="h-6 w-6" />
        </AvatarFallback>
      </Avatar>
      <span className="text-[10px] text-white/90 max-w-[60px] truncate">
        {agent.slug || displayName}
      </span>
    </button>
  )
}

export function CallView({ project, onClose, extraTags }: CallViewProps) {
  const user = useNDKCurrentUser()
  const [conversationState, setConversationState] = useState<ConversationState>('initializing')
  const [selectedAgent, setSelectedAgent] = useState<AgentInstance | null>(null)
  const [localRootEvent, setLocalRootEvent] = useState<NDKEvent | null>(null)
  const [playedMessageIds, setPlayedMessageIds] = useState<Set<string>>(new Set())
  const [currentAgentMessage, setCurrentAgentMessage] = useState<Message | null>(null)
  const [callDuration, setCallDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [participatingAgents, setParticipatingAgents] = useState<Set<string>>(new Set())
  const [typingAgents, setTypingAgents] = useState<Set<string>>(new Set())
  const [speakingAgent, setSpeakingAgent] = useState<string | null>(null)
  const [targetAgent, setTargetAgent] = useState<AgentInstance | null>(null) // Agent to p-tag
  
  // Audio settings
  const { audioSettings } = useCallSettings()
  
  
  // Refs
  const callStartTimeRef = useRef<number>(Date.now())
  const selectedAgentRef = useRef<AgentInstance | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioBlobPromiseRef = useRef<Promise<Blob> | null>(null)
  const audioBlobResolveRef = useRef<((blob: Blob) => void) | null>(null)
  
  // Hooks
  const agentsRaw = useProjectOnlineAgents(project.dTag)
  const threadManagement = useThreadManagement(project, localRootEvent, extraTags)
  const messages = useChatMessages(project, localRootEvent)
  const { transcribe } = useSpeechToText()
  
  // Subscribe to typing indicators
  const { events: typingEvents } = useSubscribe(
    localRootEvent
      ? [
          {
            kinds: [EVENT_KINDS.TYPING_INDICATOR as NDKKind, EVENT_KINDS.TYPING_INDICATOR_STOP as NDKKind],
            "#E": [localRootEvent.id],
          },
        ]
      : false,
    { closeOnEose: false, groupable: true },
    [localRootEvent?.id]
  )
  
  // Update typing agents based on typing events
  useEffect(() => {
    if (!typingEvents) return
    
    const newTypingAgents = new Set<string>()
    const now = Date.now()
    
    typingEvents.forEach(event => {
      // Only show typing if event is recent (within 5 seconds)
      if (event.created_at && (now - event.created_at * 1000) < 5000) {
        if (event.kind === EVENT_KINDS.TYPING_INDICATOR) {
          newTypingAgents.add(event.pubkey)
        }
      }
    })
    
    setTypingAgents(newTypingAgents)
  }, [typingEvents])
  
  // Track participating agents from messages and auto-select target
  useEffect(() => {
    const agents = new Set<string>()
    let lastAgentPubkey: string | null = null
    
    messages.forEach(msg => {
      if (msg.event.pubkey !== user?.pubkey) {
        agents.add(msg.event.pubkey)
        lastAgentPubkey = msg.event.pubkey
      }
    })
    
    setParticipatingAgents(agents)
    
    // Auto-target the last agent who sent a message
    if (lastAgentPubkey && !targetAgent) {
      const agent = agentsRaw.find(a => a.pubkey === lastAgentPubkey)
      if (agent) {
        setTargetAgent(agent)
      }
    }
  }, [messages, user?.pubkey, agentsRaw, targetAgent])
  
  // TTS configuration - For voice calls, we ALWAYS want TTS enabled if credentials exist
  const { config: ttsConfig, apiKey: ttsApiKey } = useTTS()
  
  // Force TTS enabled for voice calls, even if not globally enabled
  const ttsOptions = useMemo(() => {
    // If we have API credentials, force enable TTS for voice calls
    if (ttsApiKey && ttsConfig?.voiceId) {
      return {
        apiKey: ttsApiKey,
        voiceId: ttsConfig.voiceId,
        style: ttsConfig.style || 'Conversational',
        rate: ttsConfig.rate || 1.0,
        pitch: ttsConfig.pitch || 1.0,
        volume: ttsConfig.volume || 1.0,
        enabled: true // ALWAYS enabled for voice calls when credentials exist
      }
    }
    
    return null
  }, [ttsConfig, ttsApiKey, selectedAgent?.slug])
  
  const tts = useMurfTTS(ttsOptions || { apiKey: '', voiceId: '', enabled: false })
  
  // Apply output device to TTS audio when it plays
  useEffect(() => {
    if (audioSettings.outputDeviceId && 'audioElement' in tts && tts.audioElement) {
      const audio = tts.audioElement as HTMLAudioElement
      if (audio && typeof audio.setSinkId === 'function') {
        audio.setSinkId(audioSettings.outputDeviceId).catch((err: Error) => {
          console.error('Failed to set audio output device:', err)
        })
      }
    }
  }, [audioSettings.outputDeviceId, tts])
  
  // Sort agents to put project-manager first
  const agents = useMemo(() => {
    const sorted = [...agentsRaw]
    sorted.sort((a, b) => {
      if (a.slug === 'project-manager') return -1
      if (b.slug === 'project-manager') return 1
      return (a.slug || '').localeCompare(b.slug || '')
    })
    return sorted
  }, [agentsRaw])
  
  // Chrome speech recognition for real-time transcription
  const {
    fullTranscript,
    isSupported: isChromeTranscriptionSupported,
    isListening,
    startListening,
    stopListening,
    resetTranscript
  } = useChromeSpeechRecognition()
  
  // Select project-manager by default
  useEffect(() => {
    if (agents.length > 0 && !selectedAgent) {
      const projectManager = agents.find(a => a.slug === 'project-manager')
      const agentToSelect = projectManager || agents[0]
      setSelectedAgent(agentToSelect)
      selectedAgentRef.current = agentToSelect
    }
  }, [agents, selectedAgent])
  
  // Keep ref in sync with state
  useEffect(() => {
    selectedAgentRef.current = selectedAgent
  }, [selectedAgent])
  
  // Update call duration
  useEffect(() => {
    const interval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])
  
  
  // Handle sending user message
  const handleSendMessage = useCallback(async (transcript: string) => {
    if (!transcript.trim()) return
    
    // Use targetAgent if set, otherwise use selectedAgent as fallback
    const agentToTag = targetAgent || selectedAgentRef.current
    if (!agentToTag) {
      toast.error('Please select an agent')
      return
    }
    
    setConversationState('processing_user_input')
    
    try {
      if (!localRootEvent) {
        // Create initial thread
        const newThread = await threadManagement.createThread(
          transcript,
          [agentToTag],
          [],
          true // Auto-TTS enabled for voice mode
        )
        
        if (newThread) {
          setLocalRootEvent(newThread)
        }
      } else {
        // Send reply to existing thread with target agent
        await threadManagement.sendReply(
          transcript,
          [agentToTag],
          [],
          true,
          messages
        )
      }
      
      setConversationState('idle')
    } catch (error) {
      // Error sending message
      toast.error('Failed to send message')
      setConversationState('error')
      setTimeout(() => setConversationState('idle'), 2000)
    }
  }, [localRootEvent, threadManagement, messages, targetAgent])
  
  // Start recording audio (for browsers without Chrome Speech API)
  const startRecording = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: audioSettings.inputDeviceId 
          ? {
              deviceId: { exact: audioSettings.inputDeviceId },
              noiseSuppression: audioSettings.noiseSuppression,
              echoCancellation: audioSettings.echoCancellation,
              autoGainControl: audioSettings.voiceActivityDetection,
            }
          : {
              noiseSuppression: audioSettings.noiseSuppression,
              echoCancellation: audioSettings.echoCancellation,
              autoGainControl: audioSettings.voiceActivityDetection,
            }
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      
      // Apply volume adjustment
      if (audioSettings.inputVolume < 100) {
        const audioContext = new AudioContext()
        const source = audioContext.createMediaStreamSource(stream)
        const gainNode = audioContext.createGain()
        gainNode.gain.value = audioSettings.inputVolume / 100
        const destination = audioContext.createMediaStreamDestination()
        source.connect(gainNode)
        gainNode.connect(destination)
        streamRef.current = destination.stream
      }
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      
      // Create a promise that will resolve when recording stops
      audioBlobPromiseRef.current = new Promise<Blob>((resolve) => {
        audioBlobResolveRef.current = resolve
      })
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        // Resolve the promise with the blob
        if (audioBlobResolveRef.current) {
          audioBlobResolveRef.current(blob)
        }
      }
      
      mediaRecorder.start(1000)
      setConversationState('user_speaking')
      setIsRecording(true)
    } catch (error) {
      toast.error('Failed to access microphone')
    }
  }, [audioSettings])
  
  // Stop recording audio
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsRecording(false)
  }, [])
  
  // Handle auto-send on silence
  const handleSilenceDetected = useCallback(() => {
    if (fullTranscript.trim() && isListening) {
      // Auto-send after silence
      stopListening()
      handleSendMessage(fullTranscript)
      resetTranscript()
    }
  }, [fullTranscript, isListening, stopListening, handleSendMessage, resetTranscript])
  
  
  // Track if we've initialized to prevent double initialization
  const initializedRef = useRef(false)
  
  // Initialize call and START RECORDING IMMEDIATELY
  useEffect(() => {
    // Only run once when component mounts and we have a selected agent
    if (initializedRef.current || !selectedAgent) {
      return
    }
    
    const initializeAudio = async () => {
      try {
        // Mark as initialized immediately to prevent double initialization
        initializedRef.current = true
        
        // Request microphone permission first
        await navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => {
            // Immediately stop the stream - we just needed permission
            stream.getTracks().forEach(track => track.stop())
          })
        
        // Set state to user_speaking
        setConversationState('user_speaking')
        
        // Small delay to ensure everything is ready
        setTimeout(() => {
          if (isChromeTranscriptionSupported) {
            console.log('Starting Chrome speech recognition, isSupported:', isChromeTranscriptionSupported)
            try {
              startListening(handleSilenceDetected)
              console.log('Chrome speech recognition started successfully')
            } catch (error) {
              console.error('Failed to start Chrome speech recognition:', error)
              // Fallback to MediaRecorder
              console.log('Falling back to MediaRecorder')
              startRecording()
            }
          } else {
            console.log('Starting MediaRecorder for non-Chrome browser')
            startRecording()
          }
        }, 500) // Increased delay to ensure everything is ready
      } catch (error) {
        console.error('Failed to get microphone permission:', error)
        toast.error('Microphone access required for voice calls')
        setConversationState('error')
        // Reset initialized flag on error so user can retry
        initializedRef.current = false
      }
    }
    
    if (conversationState === 'initializing') {
      initializeAudio()
    }
  }, [selectedAgent]) // Only depend on selectedAgent being available
  
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up all audio resources
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])
  
  // Handle microphone toggle
  const handleMicrophoneToggle = useCallback(() => {
    
    if (conversationState === 'user_speaking') {
      // STOP capturing
      if (isChromeTranscriptionSupported) {
        stopListening()
        resetTranscript()
      } else {
        stopRecording()
      }
      setConversationState('idle')
    } else {
      // START capturing
      if (isChromeTranscriptionSupported) {
        startListening(handleSilenceDetected)
      } else {
        startRecording()
      }
      setConversationState('user_speaking')
    }
  }, [conversationState, isChromeTranscriptionSupported, startListening, stopListening, resetTranscript, handleSilenceDetected, startRecording, stopRecording])
  
  // Handle manual send button
  const handleManualSend = useCallback(async () => {
    // If we have Chrome transcript, use it
    if (fullTranscript && fullTranscript.trim()) {
      stopListening()
      handleSendMessage(fullTranscript)
      resetTranscript()
    } 
    // If we're recording (Safari/non-Chrome), stop and wait for blob
    else if (isRecording && !isChromeTranscriptionSupported) {
      setConversationState('processing_user_input')
      
      // Stop recording which will trigger the blob creation
      stopRecording()
      
      // Wait for the blob using the promise
      if (audioBlobPromiseRef.current) {
        try {
          const blob = await audioBlobPromiseRef.current
          const whisperTranscript = await transcribe(blob)
          if (whisperTranscript?.trim()) {
            handleSendMessage(whisperTranscript)
          } else {
            toast.error('Failed to transcribe audio')
            setConversationState('idle')
          }
        } catch (error) {
          toast.error('Failed to transcribe audio')
          setConversationState('idle')
        } finally {
          setAudioBlob(null)
          audioBlobPromiseRef.current = null
          audioBlobResolveRef.current = null
        }
      }
    }
    // Otherwise if we have recorded audio already, transcribe with Whisper
    else if (audioBlob) {
      setConversationState('processing_user_input')
      try {
        const whisperTranscript = await transcribe(audioBlob)
        if (whisperTranscript?.trim()) {
          handleSendMessage(whisperTranscript)
        } else {
          toast.error('Failed to transcribe audio')
          setConversationState('idle')
        }
      } catch (error) {
        toast.error('Failed to transcribe audio')
        setConversationState('idle')
      } finally {
        setAudioBlob(null)
      }
    }
  }, [fullTranscript, audioBlob, isRecording, isChromeTranscriptionSupported, stopListening, stopRecording, handleSendMessage, resetTranscript, transcribe])
  
  // Auto-play new agent messages with TTS
  useEffect(() => {
    if (!ttsOptions?.enabled || !user) {
      return
    }
    
    // Find unplayed agent messages
    const agentMessages = messages.filter(
      msg => msg.event.pubkey !== user.pubkey && 
             !playedMessageIds.has(msg.id) && 
             !isAudioEvent(msg.event)
    )
    
    if (agentMessages.length > 0 && !tts.isPlaying) {
      const latestAgentMessage = agentMessages[agentMessages.length - 1]
      const ttsContent = extractTTSContent(latestAgentMessage.event.content)
      
      if (ttsContent) {
        // Auto-target the agent that just spoke
        const speakingAgentInstance = agentsRaw.find(a => a.pubkey === latestAgentMessage.event.pubkey)
        if (speakingAgentInstance) {
          setTargetAgent(speakingAgentInstance)
        }
        
        setCurrentAgentMessage(latestAgentMessage)
        setConversationState('agent_speaking')
        setSpeakingAgent(latestAgentMessage.event.pubkey)
        
        tts.play(ttsContent).then(() => {
          setPlayedMessageIds(prev => new Set(prev).add(latestAgentMessage.id))
          setCurrentAgentMessage(null)
          setSpeakingAgent(null)
          
          // Auto-resume listening after TTS completes
          setConversationState('user_speaking')
          if (isChromeTranscriptionSupported) {
            resetTranscript()
            startListening(handleSilenceDetected)
          } else {
            setAudioBlob(null)
            chunksRef.current = []
            startRecording()
          }
        }).catch(() => {
          toast.error('Voice playback failed - check TTS configuration')
          setCurrentAgentMessage(null)
          setConversationState('idle')
          setSpeakingAgent(null)
        })
      }
    }
  }, [messages.length, ttsOptions?.enabled, user?.pubkey, playedMessageIds.size, tts.isPlaying, agentsRaw]) // Use primitive values instead of objects
  
  // Format duration display
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  // Get display text based on state
  const getDisplayText = () => {
    switch (conversationState) {
      case 'user_speaking':
        if (isChromeTranscriptionSupported) {
          return fullTranscript || (isListening ? 'Listening...' : 'Starting...')
        } else {
          return isRecording ? 'Recording... Tap Send when done' : 'Starting recording...'
        }
      case 'processing_user_input':
        return 'Processing...'
      case 'agent_speaking':
        return currentAgentMessage ? extractTTSContent(currentAgentMessage.event.content) : ''
      default:
        return ''
    }
  }
  
  // Get the last few messages for history display
  const recentMessages = useMemo(() => {
    return messages.slice(-3).map(msg => ({
      id: msg.id,
      isUser: msg.event.pubkey === user?.pubkey,
      author: msg.event.pubkey === user?.pubkey ? 'You' : 
              agents.find(a => a.pubkey === msg.event.pubkey)?.slug || 'Agent',
      content: extractTTSContent(msg.event.content)
    }))
  }, [messages, user, agents])
  
  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="relative flex flex-col h-full text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pt-safe-top">
          <div className="w-20" />
          <div className="flex items-center gap-2">
            <ProjectAvatar 
              project={project}
              className="h-6 w-6"
              fallbackClassName="text-xs"
            />
            <span className="text-sm font-medium">{project.title || 'Project'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm tabular-nums">
              {formatDuration(callDuration)}
            </div>
            <CallSettings />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {/* Participating Agents Display */}
          <div className="relative w-full max-w-2xl flex items-center justify-center">
            <div className="flex items-center justify-center gap-8">
              {agents.length > 0 && (
                <AnimatePresence mode="popLayout">
                  {agents
                    .filter(agent => participatingAgents.has(agent.pubkey))
                    .map((agent) => (
                      <motion.div
                        key={agent.pubkey}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <AgentDisplay
                          agent={agent}
                          isTyping={typingAgents.has(agent.pubkey)}
                          isSpeaking={speakingAgent === agent.pubkey}
                          isTargeted={targetAgent?.pubkey === agent.pubkey}
                          onClick={() => setTargetAgent(agent)}
                          size={participatingAgents.size <= 2 ? 'lg' : participatingAgents.size <= 4 ? 'md' : 'sm'}
                        />
                      </motion.div>
                    ))}
                </AnimatePresence>
              )}
              
              {/* Show placeholder if no agents have participated yet */}
              {participatingAgents.size === 0 && selectedAgent && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <AgentDisplay
                    agent={selectedAgent}
                    isTyping={false}
                    isSpeaking={false}
                    isTargeted={targetAgent?.pubkey === selectedAgent.pubkey}
                    onClick={() => setTargetAgent(selectedAgent)}
                    size="lg"
                  />
                </motion.div>
              )}
            </div>
          </div>

          {/* Conversation title */}
          <h1 className="mt-6 text-xl font-semibold text-white/80">
            {participatingAgents.size > 1 ? 'Group Conversation' : 
             participatingAgents.size === 1 ? `Talking with ${agents.find(a => participatingAgents.has(a.pubkey))?.slug || 'Agent'}` :
             'Ready to Start'}
          </h1>

          {/* Current conversation display */}
          <div className="mt-8 min-h-[100px] max-w-md w-full">
            {(conversationState === 'user_speaking' || 
              conversationState === 'processing_user_input' ||
              conversationState === 'agent_speaking') && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
              >
                <p className="text-sm text-white/90 leading-relaxed">
                  {getDisplayText()}
                </p>
                {conversationState === 'user_speaking' && (
                  <p className="text-xs text-white/50 mt-2">
                    {isChromeTranscriptionSupported 
                      ? "Pause for 2 seconds to auto-send, or tap Send" 
                      : "Tap Send to stop recording and send"}
                  </p>
                )}
              </motion.div>
            )}
            
            {/* Message history when idle */}
            {conversationState === 'idle' && recentMessages.length > 0 && (
              <div className="space-y-2">
                {recentMessages.map(msg => (
                  <div key={msg.id} className="text-white/60 text-sm">
                    <span className="font-semibold">{msg.author}: </span>
                    <span>
                      {msg.content.length > 100 
                        ? msg.content.slice(0, 100) + '...' 
                        : msg.content}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Agent selector - only show agents not in conversation */}
        <div className="px-4 pb-4">
          {(() => {
            const availableAgents = agents.filter(agent => !participatingAgents.has(agent.pubkey))
            
            if (availableAgents.length === 0) {
              return (
                <div className="flex items-center justify-center gap-2 text-white/60 py-4">
                  <span className="text-sm">All agents are in the conversation</span>
                </div>
              )
            }
            
            return (
              <ScrollArea className="w-full">
                <div className="flex gap-2 px-2 pb-1">
                  {availableAgents.map((agent) => (
                    <AgentSelector
                      key={agent.pubkey}
                      agent={agent}
                      onClick={() => {
                        setSelectedAgent(agent)
                        selectedAgentRef.current = agent
                        setTargetAgent(agent)
                        setParticipatingAgents(prev => new Set(prev).add(agent.pubkey))
                      }}
                    />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="bg-white/10" />
              </ScrollArea>
            )
          })()}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-6 p-6 pb-safe-bottom">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onClose(localRootEvent)}
            className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-xl hover:bg-red-700 transition-colors"
          >
            <PhoneOff className="h-7 w-7" />
          </motion.button>
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleMicrophoneToggle}
            disabled={conversationState === 'processing_user_input'}
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-colors",
              conversationState === 'user_speaking'
                ? "bg-white text-black hover:bg-white/90" 
                : "bg-white/20 text-white hover:bg-white/30",
              conversationState === 'processing_user_input' && 
                "opacity-50 cursor-not-allowed"
            )}
          >
            {conversationState === 'user_speaking' ? <Mic className="h-8 w-8" /> : <MicOff className="h-8 w-8" />}
          </motion.button>
          
          {/* ALWAYS SHOW THE FUCKING SEND BUTTON */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleManualSend}
            disabled={(!fullTranscript && !audioBlob && !isRecording && !isListening) || conversationState === 'processing_user_input'}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-colors",
              (fullTranscript || audioBlob || isRecording || isListening) && conversationState !== 'processing_user_input'
                ? "bg-green-600 hover:bg-green-700"
                : "bg-gray-600 opacity-50 cursor-not-allowed"
            )}
          >
            <Send className="h-7 w-7" />
          </motion.button>
        </div>
      </div>
    </div>
  )
}