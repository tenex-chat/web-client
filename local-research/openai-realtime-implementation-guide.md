# OpenAI Realtime API Implementation Guide

## Quick Start Code Example

### 1. Create the Realtime Hook

```typescript
// src/hooks/useOpenAIRealtime.ts
import { useEffect, useRef, useState, useCallback } from 'react'

interface RealtimeConfig {
  apiKey: string
  model?: 'gpt-4o-realtime-preview' | 'gpt-4o-realtime-preview-2024-10-01'
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  instructions?: string
  turnDetection?: 'server_vad' | 'none'
  temperature?: number
  maxOutputTokens?: number
}

interface RealtimeEvents {
  onConnect?: () => void
  onDisconnect?: () => void
  onTranscript?: (text: string, isFinal: boolean) => void
  onAudioDelta?: (base64Audio: string) => void
  onAudioTranscript?: (text: string) => void
  onFunctionCall?: (name: string, args: any) => void
  onError?: (error: any) => void
  onConversationUpdate?: (conversation: any) => void
}

export function useOpenAIRealtime(config: RealtimeConfig, events: RealtimeEvents) {
  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  
  // Audio playback queue for smooth streaming
  const audioQueueRef = useRef<ArrayBuffer[]>([])
  const isPlayingRef = useRef(false)

  // Connect to OpenAI Realtime API
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01'
    
    wsRef.current = new WebSocket(url, [], {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    })

    wsRef.current.onopen = () => {
      console.log('Connected to OpenAI Realtime')
      setIsConnected(true)
      
      // Configure session
      wsRef.current?.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: config.instructions,
          voice: config.voice || 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1'
          },
          turn_detection: config.turnDetection === 'server_vad' ? {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500
          } : null,
          temperature: config.temperature || 0.8,
          max_response_output_tokens: config.maxOutputTokens || 4096
        }
      }))

      events.onConnect?.()
    }

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data)
      handleServerEvent(data)
    }

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error)
      events.onError?.(error)
    }

    wsRef.current.onclose = () => {
      console.log('Disconnected from OpenAI Realtime')
      setIsConnected(false)
      setIsListening(false)
      setIsSpeaking(false)
      events.onDisconnect?.()
    }
  }, [config, events])

  // Handle server events
  const handleServerEvent = (event: any) => {
    switch (event.type) {
      case 'error':
        console.error('Server error:', event.error)
        events.onError?.(event.error)
        break

      case 'session.created':
      case 'session.updated':
        console.log('Session configured:', event.session)
        break

      case 'input_audio_buffer.speech_started':
        setIsListening(true)
        break

      case 'input_audio_buffer.speech_stopped':
        setIsListening(false)
        break

      case 'conversation.item.created':
        if (event.item.role === 'assistant') {
          setIsSpeaking(true)
        }
        break

      case 'conversation.item.input_audio_transcription.completed':
        // User's speech was transcribed
        events.onTranscript?.(event.transcript, true)
        break

      case 'response.audio_transcript.delta':
        // Assistant's response text (incremental)
        events.onAudioTranscript?.(event.delta)
        break

      case 'response.audio.delta':
        // Assistant's audio response (base64 encoded PCM16)
        events.onAudioDelta?.(event.delta)
        queueAudioForPlayback(event.delta)
        break

      case 'response.audio.done':
        setIsSpeaking(false)
        break

      case 'response.function_call_arguments.done':
        events.onFunctionCall?.(event.name, JSON.parse(event.arguments))
        break

      case 'conversation.updated':
        events.onConversationUpdate?.(event.conversation)
        break
    }
  }

  // Send audio to the API
  const sendAudio = useCallback((audioData: ArrayBuffer) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    // Convert to base64
    const base64 = btoa(String.fromCharCode(...new Uint8Array(audioData)))
    
    wsRef.current.send(JSON.stringify({
      type: 'input_audio_buffer.append',
      audio: base64
    }))
  }, [])

  // Create a response (for manual turn-taking)
  const createResponse = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    wsRef.current.send(JSON.stringify({
      type: 'response.create'
    }))
  }, [])

  // Queue audio for smooth playback
  const queueAudioForPlayback = async (base64Audio: string) => {
    // Decode base64 to ArrayBuffer
    const binaryString = atob(base64Audio)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    
    audioQueueRef.current.push(bytes.buffer)
    
    // Start playback if not already playing
    if (!isPlayingRef.current) {
      playNextAudioChunk()
    }
  }

  // Play audio chunks sequentially
  const playNextAudioChunk = async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false
      return
    }

    isPlayingRef.current = true
    const audioData = audioQueueRef.current.shift()!

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 })
    }

    // Convert PCM16 to Float32 for Web Audio API
    const pcm16 = new Int16Array(audioData)
    const float32 = new Float32Array(pcm16.length)
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768
    }

    // Create and play audio buffer
    const audioBuffer = audioContextRef.current.createBuffer(1, float32.length, 24000)
    audioBuffer.copyToChannel(float32, 0)
    
    const source = audioContextRef.current.createBufferSource()
    source.buffer = audioBuffer
    source.connect(audioContextRef.current.destination)
    
    source.onended = () => {
      playNextAudioChunk() // Play next chunk when this one ends
    }
    
    source.start()
  }

  // Disconnect from the API
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    audioQueueRef.current = []
    isPlayingRef.current = false
  }, [])

  // Send text message
  const sendText = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    wsRef.current.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'input_text',
          text
        }]
      }
    }))

    // Trigger response
    createResponse()
  }, [createResponse])

  // Interrupt the assistant
  const interrupt = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    wsRef.current.send(JSON.stringify({
      type: 'response.cancel'
    }))
    
    // Clear audio queue
    audioQueueRef.current = []
    setIsSpeaking(false)
  }, [])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    // Connection state
    isConnected,
    isListening,
    isSpeaking,
    
    // Actions
    connect,
    disconnect,
    sendAudio,
    sendText,
    createResponse,
    interrupt,
  }
}
```

### 2. Microphone Input Handler

```typescript
// src/hooks/useRealtimeMicrophone.ts
import { useEffect, useRef, useCallback } from 'react'

interface MicrophoneConfig {
  onAudioData: (audioData: ArrayBuffer) => void
  sampleRate?: number
  enabled: boolean
}

export function useRealtimeMicrophone({ onAudioData, sampleRate = 24000, enabled }: MicrophoneConfig) {
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)

  const startMicrophone = useCallback(async () => {
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      
      streamRef.current = stream

      // Setup audio processing
      audioContextRef.current = new AudioContext({ sampleRate })
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream)
      
      // Create processor for PCM16 conversion
      processorRef.current = audioContextRef.current.createScriptProcessor(512, 1, 1)
      
      processorRef.current.onaudioprocess = (e) => {
        if (!enabled) return
        
        const inputData = e.inputBuffer.getChannelData(0)
        
        // Convert Float32 to PCM16
        const pcm16 = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]))
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
        }
        
        onAudioData(pcm16.buffer)
      }
      
      // Connect the nodes
      sourceRef.current.connect(processorRef.current)
      processorRef.current.connect(audioContextRef.current.destination)
      
    } catch (error) {
      console.error('Failed to start microphone:', error)
    }
  }, [enabled, onAudioData, sampleRate])

  const stopMicrophone = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }
    
    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    if (enabled) {
      startMicrophone()
    } else {
      stopMicrophone()
    }
    
    return () => {
      stopMicrophone()
    }
  }, [enabled, startMicrophone, stopMicrophone])

  return {
    startMicrophone,
    stopMicrophone
  }
}
```

### 3. Enhanced CallView with Realtime Mode

```typescript
// src/components/call/CallViewRealtime.tsx
import { useState, useEffect, useCallback } from 'react'
import { useOpenAIRealtime } from '@/hooks/useOpenAIRealtime'
import { useRealtimeMicrophone } from '@/hooks/useRealtimeMicrophone'

export function CallViewRealtime({ project, agent, onClose }) {
  const [transcript, setTranscript] = useState('')
  const [assistantTranscript, setAssistantTranscript] = useState('')
  const [isConnecting, setIsConnecting] = useState(true)

  const realtime = useOpenAIRealtime(
    {
      apiKey: process.env.VITE_OPENAI_API_KEY!,
      voice: 'alloy',
      instructions: `You are ${agent.name}, an AI assistant for ${project.title}.
        ${agent.systemPrompt}
        Be conversational and concise. Allow natural interruptions.`,
      turnDetection: 'server_vad',
      temperature: 0.8,
    },
    {
      onConnect: () => {
        setIsConnecting(false)
        console.log('Realtime connected')
      },
      onDisconnect: () => {
        console.log('Realtime disconnected')
      },
      onTranscript: (text, isFinal) => {
        if (isFinal) {
          setTranscript(prev => prev + ' ' + text)
        }
      },
      onAudioTranscript: (text) => {
        setAssistantTranscript(prev => prev + text)
      },
      onError: (error) => {
        console.error('Realtime error:', error)
      }
    }
  )

  // Setup microphone
  const { } = useRealtimeMicrophone({
    enabled: realtime.isConnected && !realtime.isSpeaking,
    onAudioData: realtime.sendAudio
  })

  // Connect on mount
  useEffect(() => {
    realtime.connect()
    return () => {
      realtime.disconnect()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-purple-600 to-purple-400">
      <div className="flex flex-col h-full text-white p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Realtime Voice Chat</h1>
          <button onClick={onClose} className="p-2 bg-white/20 rounded-lg">
            Close
          </button>
        </div>

        {/* Status */}
        <div className="text-center mb-8">
          {isConnecting ? (
            <div>Connecting to OpenAI Realtime...</div>
          ) : (
            <div className="space-y-2">
              <div>Status: {realtime.isConnected ? 'Connected' : 'Disconnected'}</div>
              <div>{realtime.isListening && '🎤 Listening...'}</div>
              <div>{realtime.isSpeaking && '🔊 Speaking...'}</div>
            </div>
          )}
        </div>

        {/* Transcripts */}
        <div className="flex-1 space-y-4 overflow-y-auto">
          {transcript && (
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-sm opacity-70">You:</div>
              <div>{transcript}</div>
            </div>
          )}
          
          {assistantTranscript && (
            <div className="bg-white/20 rounded-lg p-4">
              <div className="text-sm opacity-70">{agent.name}:</div>
              <div>{assistantTranscript}</div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4 mt-8">
          <button
            onClick={realtime.interrupt}
            disabled={!realtime.isSpeaking}
            className="px-6 py-3 bg-red-500 rounded-lg disabled:opacity-50"
          >
            Interrupt
          </button>
        </div>
      </div>
    </div>
  )
}
```

## Key Implementation Details

### 1. Audio Format Handling
- **Input**: PCM16 @ 24kHz mono (browser mic → PCM16 → base64)
- **Output**: PCM16 @ 24kHz mono (base64 → PCM16 → Web Audio)
- **Critical**: Sample rate must match (24kHz) for proper playback

### 2. Turn Detection (VAD)
- **server_vad**: OpenAI detects speech start/stop automatically
- **none**: Manual control via response.create()
- **Tuning**: Adjust threshold, padding, and silence duration

### 3. Error Handling
```typescript
// Reconnection logic
const reconnect = async () => {
  let retries = 0
  const maxRetries = 5
  
  while (retries < maxRetries) {
    try {
      await connect()
      break
    } catch (error) {
      retries++
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)))
    }
  }
}
```

### 4. State Management
```typescript
// Zustand store for realtime session
interface RealtimeStore {
  session: {
    id: string
    isConnected: boolean
    conversation: ConversationItem[]
  }
  audio: {
    isListening: boolean
    isSpeaking: boolean
    vadState: 'idle' | 'listening' | 'processing'
  }
  actions: {
    connect: () => void
    disconnect: () => void
    sendMessage: (text: string) => void
    interrupt: () => void
  }
}
```

### 5. Multi-Agent Orchestration
```typescript
// Agent switching during conversation
const switchAgent = async (newAgent: Agent) => {
  // 1. Interrupt current response
  realtime.interrupt()
  
  // 2. Update session instructions
  await realtime.updateSession({
    instructions: buildInstructionsForAgent(newAgent)
  })
  
  // 3. Notify user of agent switch
  realtime.sendText(`Switching to ${newAgent.name}...`)
}
```

## Integration with Existing System

### 1. Thread Creation from Realtime Session
```typescript
const saveRealtimeConversation = async (
  conversation: ConversationItem[],
  project: NDKProject
) => {
  // Extract messages
  const messages = conversation.filter(item => item.type === 'message')
  
  // Create Nostr event for the conversation
  const thread = new NDKEvent(ndk)
  thread.kind = 1
  thread.content = messages.map(m => m.content).join('\n\n')
  thread.tags = [
    ['t', 'voice-conversation'],
    ['p', project.pubkey],
    ['realtime-session', sessionId]
  ]
  
  await thread.publish()
  return thread
}
```

### 2. Fallback to Classic Mode
```typescript
const CallViewWrapper = ({ project, ...props }) => {
  const [mode, setMode] = useState<'classic' | 'realtime'>('classic')
  const [error, setError] = useState<string | null>(null)
  
  // Check if Realtime is available
  useEffect(() => {
    checkRealtimeAvailability()
      .then(available => {
        if (available && userPreferences.preferRealtime) {
          setMode('realtime')
        }
      })
      .catch(err => {
        setError('Realtime not available')
        setMode('classic')
      })
  }, [])
  
  if (mode === 'realtime' && !error) {
    return <CallViewRealtime {...props} />
  }
  
  return <CallView {...props} />
}
```

### 3. Cost Tracking
```typescript
// Track usage for billing
const trackRealtimeUsage = (session: RealtimeSession) => {
  const duration = session.endTime - session.startTime
  const audioMinutes = Math.ceil(duration / 60000)
  
  analytics.track('realtime_usage', {
    sessionId: session.id,
    durationMs: duration,
    audioMinutes,
    estimatedCost: audioMinutes * 0.06 // $0.06 per minute
  })
}
```

## Testing Strategy

### 1. Unit Tests
```typescript
// Test VAD behavior
it('should detect speech and trigger response', async () => {
  const { result } = renderHook(() => useOpenAIRealtime(config, events))
  
  await act(async () => {
    await result.current.connect()
  })
  
  // Simulate speech detection
  mockWebSocket.simulateMessage({
    type: 'input_audio_buffer.speech_started'
  })
  
  expect(result.current.isListening).toBe(true)
})
```

### 2. Integration Tests
- Test WebSocket connection/reconnection
- Test audio streaming pipeline
- Test interruption handling
- Test multi-turn conversations

### 3. E2E Tests
- Record test audio files
- Verify transcription accuracy
- Test latency requirements
- Validate audio quality

## Performance Optimizations

### 1. Audio Buffering
```typescript
// Adaptive buffer size based on network conditions
const adaptiveBuffering = (latency: number) => {
  if (latency < 100) return 256  // Low latency
  if (latency < 300) return 512  // Medium latency
  return 1024 // High latency
}
```

### 2. WebWorker for Audio Processing
```typescript
// Move audio conversion to WebWorker
const audioWorker = new Worker('/audio-processor.js')
audioWorker.postMessage({ 
  type: 'convert',
  data: float32Array 
})
```

### 3. Connection Pooling
```typescript
// Pre-warm connections for faster switching
const connectionPool = new Map<string, WebSocket>()
const preconnect = async (agents: Agent[]) => {
  for (const agent of agents) {
    const ws = createRealtimeConnection(agent)
    connectionPool.set(agent.id, ws)
  }
}
```

## Deployment Checklist

- [ ] API key management (use environment variables)
- [ ] CORS configuration for WebSocket
- [ ] SSL/TLS for secure WebSocket (wss://)
- [ ] Rate limiting and usage quotas
- [ ] Error tracking (Sentry integration)
- [ ] Analytics for usage patterns
- [ ] A/B testing framework
- [ ] Feature flags for gradual rollout
- [ ] Monitoring and alerting
- [ ] Documentation for users
- [ ] Training materials for support team