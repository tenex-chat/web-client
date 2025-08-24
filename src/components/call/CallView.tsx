import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { PhoneOff, Mic, MicOff, ChevronDown, Bot, AlertCircle, Send } from 'lucide-react'
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
import { useProfile } from '@nostr-dev-kit/ndk-hooks'
import { useNDKCurrentUser } from '@nostr-dev-kit/ndk-hooks'
import { NDKEvent } from '@nostr-dev-kit/ndk'
import type { NDKProject } from '@/lib/ndk-events/NDKProject'
import type { AgentInstance } from '@/types/agent'
import type { Message } from '@/components/chat/hooks/useChatMessages'

interface CallViewProps {
  project: NDKProject
  onClose: () => void
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

function AgentSelector({ 
  agent, 
  isSelected, 
  onClick 
}: { 
  agent: AgentInstance
  isSelected: boolean
  onClick: () => void 
}) {
  const profile = useProfile(agent.pubkey)
  const avatarUrl = profile?.image || profile?.picture
  const displayName = agent.slug || profile?.displayName || profile?.name || 'Agent'
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 p-2 rounded-lg transition-all",
        isSelected ? "opacity-100" : "opacity-60 hover:opacity-80"
      )}
    >
      <Avatar className="h-12 w-12 border-2 border-white/20">
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
  const [audioLevel, setAudioLevel] = useState(0)
  const [callDuration, setCallDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  
  // Refs for audio monitoring
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const animationFrameRef = useRef<number>(0)
  const callStartTimeRef = useRef<number>(Date.now())
  const selectedAgentRef = useRef<AgentInstance | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  
  // Hooks
  const agentsRaw = useProjectOnlineAgents(project.dTag)
  const threadManagement = useThreadManagement(project, localRootEvent, extraTags)
  const messages = useChatMessages(project, localRootEvent)
  const { transcribe } = useSpeechToText()
  
  // TTS configuration - For voice calls, we ALWAYS want TTS enabled if credentials exist
  const { config: ttsConfig, apiKey: ttsApiKey } = useTTS()
  
  // Force TTS enabled for voice calls, even if not globally enabled
  const ttsOptions = useMemo(() => {
    // If we have API credentials, force enable TTS for voice calls
    if (ttsApiKey && ttsConfig?.voiceId) {
      console.log('TTS config found, forcing enabled for voice call:', {
        hasApiKey: !!ttsApiKey,
        hasVoiceId: !!ttsConfig.voiceId,
        wasEnabled: ttsConfig.enabled
      })
      
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
    
    console.warn('No TTS credentials found2')
    return null
  }, [ttsConfig, ttsApiKey, selectedAgent?.slug])
  
  const tts = useMurfTTS(ttsOptions || { apiKey: '', voiceId: '', enabled: false })
  
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
  
  // Monitor audio level for ripple effect when speaking
  const setupAudioMonitoring = useCallback(async (stream?: MediaStream) => {
    try {
      // Use provided stream or get a new one
      const audioStream = stream || await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStreamRef.current = audioStream
      
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      const source = audioContextRef.current.createMediaStreamSource(audioStream)
      source.connect(analyserRef.current)
      analyserRef.current.fftSize = 256
      
      const monitorLevel = () => {
        if (!analyserRef.current) return
        
        const bufferLength = analyserRef.current.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        analyserRef.current.getByteFrequencyData(dataArray)
        
        let sum = 0
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i]
        }
        const average = sum / bufferLength
        const normalizedLevel = average / 255
        
        setAudioLevel(normalizedLevel)
        
        // Monitor while user is speaking, regardless of Chrome API
        if (conversationState === 'user_speaking') {
          animationFrameRef.current = requestAnimationFrame(monitorLevel)
        }
      }
      
      monitorLevel()
    } catch (error) {
      console.error('Error setting up audio monitoring:', error)
    }
  }, [conversationState])
  
  // Setup audio monitoring when user is speaking
  useEffect(() => {
    if (conversationState === 'user_speaking') {
      // For Chrome Speech API, we need to set up monitoring separately
      // For MediaRecorder, we'll use the same stream
      if (isChromeTranscriptionSupported && !audioStreamRef.current) {
        setupAudioMonitoring()
      } else if (!isChromeTranscriptionSupported && streamRef.current) {
        // Use the existing MediaRecorder stream for monitoring
        setupAudioMonitoring(streamRef.current)
      }
    } else {
      setAudioLevel(0)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [conversationState, isChromeTranscriptionSupported, setupAudioMonitoring])
  
  // Handle sending user message
  const handleSendMessage = useCallback(async (transcript: string) => {
    if (!transcript.trim() || !selectedAgentRef.current) return
    
    setConversationState('processing_user_input')
    
    try {
      if (!localRootEvent) {
        // Create initial thread
        const newThread = await threadManagement.createThread(
          transcript,
          [selectedAgentRef.current],
          [],
          true // Auto-TTS enabled for voice mode
        )
        
        if (newThread) {
          setLocalRootEvent(newThread)
        }
      } else {
        // Send reply to existing thread
        await threadManagement.sendReply(
          transcript,
          [selectedAgentRef.current],
          [],
          true,
          messages
        )
      }
      
      setConversationState('idle')
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
      setConversationState('error')
      setTimeout(() => setConversationState('idle'), 2000)
    }
  }, [localRootEvent, threadManagement, messages])
  
  // Start recording audio (for browsers without Chrome Speech API)
  const startRecording = useCallback(async () => {
    console.log('startRecording called')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      
      // Set up audio monitoring using the same stream
      setupAudioMonitoring(stream)
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setAudioBlob(blob)
      }
      
      mediaRecorder.start(1000)
      setConversationState('user_speaking')
      setIsRecording(true)
      console.log('Recording started successfully')
    } catch (error) {
      console.error('Error starting recording:', error)
      toast.error('Failed to access microphone')
    }
  }, [setupAudioMonitoring])
  
  // Stop recording audio
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    // Also stop audio monitoring stream if separate
    if (audioStreamRef.current && audioStreamRef.current !== streamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop())
      audioStreamRef.current = null
    }
  }, [])
  
  // Handle auto-send on silence
  const handleSilenceDetected = useCallback(() => {
    console.log('Silence detected, checking transcript:', fullTranscript)
    if (fullTranscript.trim() && isListening) {
      // Auto-send after silence
      stopListening()
      handleSendMessage(fullTranscript)
      resetTranscript()
    }
  }, [fullTranscript, isListening, stopListening, handleSendMessage, resetTranscript])
  
  // Store functions in refs to avoid stale closures
  const startListeningRef = useRef(startListening)
  const startRecordingRef = useRef(startRecording)
  const handleSilenceDetectedRef = useRef(handleSilenceDetected)
  
  useEffect(() => {
    startListeningRef.current = startListening
    startRecordingRef.current = startRecording
    handleSilenceDetectedRef.current = handleSilenceDetected
  })
  
  // Initialize call and START RECORDING IMMEDIATELY
  useEffect(() => {
    // Only run once when component mounts and we have a selected agent
    if (conversationState !== 'initializing' || !selectedAgent) {
      return
    }
    
    console.log('Initialize: Starting voice capture immediately')
    
    // Set state to user_speaking IMMEDIATELY
    setConversationState('user_speaking')
    
    // Then start the actual recording/listening
    // Small delay ONLY for Chrome API to be ready
    const startDelay = isChromeTranscriptionSupported ? 100 : 0
    
    const timeoutId = setTimeout(() => {
      console.log('Initialize: Actually starting capture', {
        isChromeTranscriptionSupported
      })
      
      if (isChromeTranscriptionSupported) {
        console.log('Starting Chrome Speech Recognition')
        startListeningRef.current(handleSilenceDetectedRef.current)
      } else {
        console.log('Starting MediaRecorder')
        startRecordingRef.current()
      }
    }, startDelay)
    
    return () => clearTimeout(timeoutId)
  }, [conversationState, selectedAgent, isChromeTranscriptionSupported]) // Only depend on state values
  
  // Check if we're actively capturing audio
  const isCapturingAudio = conversationState === 'user_speaking'
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up all audio resources
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop())
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])
  
  // Handle microphone toggle
  const handleMicrophoneToggle = useCallback(() => {
    console.log('Mic button clicked!', { 
      isChromeTranscriptionSupported, 
      isListening,
      isCapturingAudio,
      conversationState 
    })
    
    if (conversationState === 'user_speaking') {
      // STOP capturing
      if (isChromeTranscriptionSupported) {
        console.log('Stopping Chrome listening')
        stopListening()
        resetTranscript()
      } else {
        console.log('Stopping recording')
        stopRecording()
      }
      setConversationState('idle')
    } else {
      // START capturing
      if (isChromeTranscriptionSupported) {
        console.log('Starting Chrome listening')
        startListening(handleSilenceDetected)
      } else {
        console.log('Starting recording')
        startRecording()
      }
      setConversationState('user_speaking')
    }
  }, [conversationState, isChromeTranscriptionSupported, startListening, stopListening, resetTranscript, handleSilenceDetected, startRecording, stopRecording])
  
  // Handle manual send button
  const handleManualSend = useCallback(async () => {
    // If we have Chrome transcript, use it
    if (fullTranscript.trim()) {
      stopListening()
      handleSendMessage(fullTranscript)
      resetTranscript()
    } 
    // Otherwise if we have recorded audio, transcribe with Whisper
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
        console.error('Transcription error:', error)
        toast.error('Failed to transcribe audio')
        setConversationState('idle')
      } finally {
        setAudioBlob(null)
      }
    }
  }, [fullTranscript, audioBlob, stopListening, handleSendMessage, resetTranscript, transcribe])
  
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
      
      console.log('Playing TTS for message:', latestAgentMessage.id, 'content preview:', ttsContent?.slice(0, 50))
      
      if (ttsContent) {
        setCurrentAgentMessage(latestAgentMessage)
        setConversationState('agent_speaking')
        
        tts.play(ttsContent).then(() => {
          console.log('TTS playback completed')
          setPlayedMessageIds(prev => new Set(prev).add(latestAgentMessage.id))
          setCurrentAgentMessage(null)
          setConversationState('idle')
        }).catch(error => {
          console.error('TTS playback failed:', error)
          toast.error('Voice playback failed - check TTS configuration')
          setCurrentAgentMessage(null)
          setConversationState('idle')
        })
      }
    }
  }, [messages.length, ttsOptions?.enabled, user?.pubkey, playedMessageIds.size, tts.isPlaying]) // Use primitive values instead of objects
  
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
          return fullTranscript || 'Listening...'
        } else {
          return isRecording ? 'Recording... Tap Stop when done' : 'Tap mic to start'
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
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-white/80 hover:text-white"
          >
            <ChevronDown className="h-5 w-5" />
            <span className="text-sm">End Call</span>
          </button>
          <span className="text-sm font-medium">Voice Call</span>
          <div className="w-16" />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {/* Project Avatar with ripple effect */}
          <div className="relative w-80 h-80 flex items-center justify-center">
            {/* Ripple effects when speaking - only show when actually detecting audio */}
            {conversationState === 'user_speaking' && audioLevel > 0.01 && (
              <>
                {/* First ripple ring - starts at avatar size */}
                <motion.div
                  className="absolute rounded-full border-2 border-white"
                  style={{
                    width: '128px',
                    height: '128px',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                  animate={{
                    scale: [1, 2.5],
                    opacity: [0.3 * (1 + audioLevel), 0],
                    borderWidth: ['2px', '1px'],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeOut",
                    repeatDelay: 0
                  }}
                />
                
                {/* Second ripple ring */}
                <motion.div
                  className="absolute rounded-full border-2 border-white"
                  style={{
                    width: '128px',
                    height: '128px',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                  animate={{
                    scale: [1, 2.5],
                    opacity: [0.25 * (1 + audioLevel), 0],
                    borderWidth: ['2px', '1px'],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeOut",
                    delay: 0.6,
                    repeatDelay: 0
                  }}
                />
                
                {/* Third ripple ring */}
                <motion.div
                  className="absolute rounded-full border-2 border-white"
                  style={{
                    width: '128px',
                    height: '128px',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                  animate={{
                    scale: [1, 2.5],
                    opacity: [0.2 * (1 + audioLevel), 0],
                    borderWidth: ['2px', '1px'],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeOut",
                    delay: 1.2,
                    repeatDelay: 0
                  }}
                />
                
                {/* Audio reactive glow behind avatar */}
                <motion.div
                  className="absolute rounded-full bg-white/20 blur-xl"
                  style={{
                    width: '140px',
                    height: '140px',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                  animate={{
                    scale: 0.9 + audioLevel * 0.3,
                    opacity: 0.3 + audioLevel * 0.4,
                  }}
                  transition={{
                    duration: 0.1,
                    ease: "linear"
                  }}
                />
              </>
            )}
            
            {/* Avatar */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="relative z-10"
            >
              <ProjectAvatar 
                project={project}
                className="h-32 w-32 border-4 border-white/20 shadow-2xl"
                fallbackClassName="text-3xl"
              />
            </motion.div>
          </div>

          {/* Project name */}
          <h1 className="mt-6 text-2xl font-semibold">{project.title || 'Project'}</h1>
          
          {/* Duration */}
          <div className="mt-2 text-4xl font-light tabular-nums">
            {formatDuration(callDuration)}
          </div>

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
                      : "Tap Stop when done, then Send"}
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

        {/* Agent selector */}
        <div className="px-4 pb-4">
          {agents.length === 0 ? (
            <div className="flex items-center justify-center gap-2 text-white/60 py-4">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">No agents available</span>
            </div>
          ) : (
            <ScrollArea className="w-full">
              <div className="flex gap-2 px-2 pb-1">
                {agents.map((agent) => (
                  <AgentSelector
                    key={agent.pubkey}
                    agent={agent}
                    isSelected={selectedAgent?.pubkey === agent.pubkey}
                    onClick={() => {
                      setSelectedAgent(agent)
                      selectedAgentRef.current = agent
                    }}
                  />
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="bg-white/10" />
            </ScrollArea>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-6 p-6 pb-safe-bottom">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
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
            onClick={() => {
              console.log('Send clicked!', { fullTranscript, audioBlob })
              handleManualSend()
            }}
            disabled={(!fullTranscript.trim() && !audioBlob) || conversationState === 'processing_user_input'}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-colors",
              (fullTranscript.trim() || audioBlob) && conversationState !== 'processing_user_input'
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