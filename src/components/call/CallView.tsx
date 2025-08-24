import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { PhoneOff, Send, Mic, MicOff, ChevronDown, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProjectAvatar } from '@/components/ui/project-avatar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { useChromeSpeechRecognition } from '@/hooks/useChromeSpeechRecognition'
import { useSpeechToText } from '@/hooks/useSpeechToText'
import { useThreadManagement } from '@/components/chat/hooks/useThreadManagement'
import { useProjectOnlineAgents } from '@/hooks/useProjectOnlineAgents'
import { useProfile } from '@nostr-dev-kit/ndk-hooks'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { NDKEvent } from '@nostr-dev-kit/ndk'
import type { NDKProject } from '@/lib/ndk-events/NDKProject'
import type { AgentInstance } from '@/types/agent'

interface CallViewProps {
  project: NDKProject
  onClose: () => void
  extraTags?: string[][]
}

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
  const [isRecording, setIsRecording] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<AgentInstance | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [localRootEvent, setLocalRootEvent] = useState<NDKEvent | null>(null)
  const [showChat, setShowChat] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const animationFrameRef = useRef<number>(0)

  // Hooks
  const agentsRaw = useProjectOnlineAgents(project.dTag)
  const { transcribe } = useSpeechToText()
  const threadManagement = useThreadManagement(project, null, extraTags)
  
  // Sort agents to put project-manager first
  const agents = useMemo(() => {
    const sorted = [...agentsRaw]
    sorted.sort((a, b) => {
      // Project manager always comes first
      if (a.slug === 'project-manager') return -1
      if (b.slug === 'project-manager') return 1
      // Then sort alphabetically
      return (a.slug || '').localeCompare(b.slug || '')
    })
    return sorted
  }, [agentsRaw])
  
  // Chrome speech recognition for real-time transcription
  const {
    fullTranscript,
    isSupported: isChromeTranscriptionSupported,
    startListening,
    stopListening,
    resetTranscript
  } = useChromeSpeechRecognition()

  // Select project-manager by default, or first agent if not available
  useEffect(() => {
    if (agents.length > 0 && !selectedAgent) {
      const projectManager = agents.find(a => a.slug === 'project-manager')
      setSelectedAgent(projectManager || agents[0])
    }
  }, [agents, selectedAgent])

  // Update duration
  const updateDuration = useCallback(() => {
    if (isRecording && startTimeRef.current > 0) {
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000)
      setRecordingDuration(duration)
      animationFrameRef.current = requestAnimationFrame(updateDuration)
    }
  }, [isRecording])

  // Draw waveform
  const drawWaveform = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      if (!isRecording || !analyserRef.current) return

      analyserRef.current.getByteFrequencyData(dataArray)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const barWidth = 3
      const gap = 2
      const barCount = Math.floor(canvas.width / (barWidth + gap))
      const centerY = canvas.height / 2

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * bufferLength)
        const amplitude = (dataArray[dataIndex] || 0) / 255
        const barHeight = amplitude * canvas.height * 0.6
        
        const x = i * (barWidth + gap)
        const y = centerY - barHeight / 2

        // Create gradient for each bar
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight)
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.7)')
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.5)')

        ctx.fillStyle = gradient
        ctx.fillRect(x, y, barWidth, barHeight)
      }

      if (isRecording) {
        requestAnimationFrame(draw)
      }
    }

    draw()
  }, [isRecording])

  // Start recording
  const startRecording = async () => {
    try {
      setAudioBlob(null)
      setRecordingDuration(0)
      resetTranscript()

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Setup audio context for waveform
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      analyserRef.current.fftSize = 256

      // Setup media recorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstart = () => {
        startTimeRef.current = Date.now()
        setIsRecording(true)
        // Start Chrome transcription if supported
        if (isChromeTranscriptionSupported) {
          startListening()
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        setIsRecording(false)
        // Stop Chrome transcription
        if (isChromeTranscriptionSupported) {
          stopListening()
        }
      }

      mediaRecorder.start(1000)
    } catch (error) {
      console.error('Error starting recording:', error)
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = 0
    }
  }

  // Send message
  const handleSend = async () => {
    if (!audioBlob || !selectedAgent) return

    setIsProcessing(true)
    try {
      // Use Whisper API for final transcription
      const finalTranscript = await transcribe(audioBlob)
      
      if (finalTranscript && finalTranscript.trim()) {
        // Create thread with the transcribed message
        const newThread = await threadManagement.createThread(
          finalTranscript,
          [selectedAgent], // Pass selected agent as mention
          [], // No images
          true // Auto-TTS enabled for voice mode
        )
        
        if (newThread) {
          setLocalRootEvent(newThread)
          setShowChat(true)
        }
      }
    } catch (error) {
      console.error('Error processing voice message:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  // Start recording on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      startRecording()
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  // Update waveform
  useEffect(() => {
    if (isRecording) {
      updateDuration()
      drawWaveform()
    }
  }, [isRecording, updateDuration, drawWaveform])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording()
    }
  }, [])

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // If we've created a thread and have messages, show chat interface
  if (showChat && localRootEvent) {
    return (
      <ChatInterface
        project={project}
        rootEvent={localRootEvent}
        extraTags={extraTags}
        onBack={onClose}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      
      {/* Content */}
      <div className="relative flex flex-col h-full text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pt-safe-top">
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-white/80 hover:text-white"
          >
            <ChevronDown className="h-5 w-5" />
            <span className="text-sm">Cancel</span>
          </button>
          <span className="text-sm font-medium">
            {isRecording ? 'Recording' : 'Voice Call'}
          </span>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {/* Project Avatar */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <ProjectAvatar 
              project={project}
              className="h-32 w-32 border-4 border-white/20 shadow-2xl"
              fallbackClassName="text-3xl"
            />
          </motion.div>

          {/* Project name */}
          <h1 className="mt-6 text-2xl font-semibold">{project.title || 'Project'}</h1>
          
          {/* Duration */}
          <div className="mt-2 text-4xl font-light tabular-nums">
            {formatDuration(recordingDuration)}
          </div>

          {/* Status */}
          <div className="mt-2 text-sm text-white/80">
            {isProcessing ? 'Processing...' : isRecording ? 'Recording...' : audioBlob ? 'Processing...' : 'Initializing...'}
          </div>

          {/* Waveform */}
          <div className="mt-8 w-full max-w-md">
            <canvas
              ref={canvasRef}
              width={400}
              height={80}
              className="w-full h-20"
              style={{ maxWidth: '100%' }}
            />
          </div>

          {/* Live transcription (if supported) */}
          {isChromeTranscriptionSupported && fullTranscript && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 max-w-md w-full"
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <p className="text-sm text-white/90 leading-relaxed">
                  {fullTranscript}
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Agent selector */}
        <div className="px-4 pb-4">
          <ScrollArea className="w-full">
            <div className="flex gap-2 px-2 pb-1">
              {agents.map((agent) => (
                <AgentSelector
                  key={agent.pubkey}
                  agent={agent}
                  isSelected={selectedAgent?.pubkey === agent.pubkey}
                  onClick={() => setSelectedAgent(agent)}
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="bg-white/10" />
          </ScrollArea>
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
          
          {isRecording ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={stopRecording}
              className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-xl hover:bg-red-700 transition-colors"
            >
              <MicOff className="h-8 w-8" />
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={startRecording}
              className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-xl hover:bg-white/30 transition-colors"
            >
              <Mic className="h-7 w-7" />
            </motion.button>
          )}

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={async () => {
              if (isRecording) {
                // Set processing immediately to avoid "Ready to send" state
                setIsProcessing(true)
                stopRecording()
                // Wait a bit for the recording to finalize
                setTimeout(() => {
                  handleSend()
                }, 100)
              } else {
                handleSend()
              }
            }}
            disabled={(!isRecording && !audioBlob) || !selectedAgent || isProcessing}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-colors",
              ((isRecording || audioBlob) && selectedAgent && !isProcessing)
                ? "bg-white text-black hover:bg-white/90"
                : "bg-white/10 text-white/50 cursor-not-allowed"
            )}
          >
            {isProcessing ? (
              <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-7 w-7" />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  )
}