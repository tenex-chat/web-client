import { useState, useEffect, useCallback, useRef } from 'react'

// TypeScript doesn't have built-in SpeechRecognition types, so we need to define them
interface ISpeechRecognitionEvent extends Event {
  resultIndex: number
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string
        confidence: number
      }
      isFinal: boolean
      length: number
    }
    length: number
  }
}

interface ISpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  onresult: ((event: ISpeechRecognitionEvent) => void) | null
  onerror: ((event: ISpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

interface ISpeechRecognitionConstructor {
  new(): ISpeechRecognition
}

// Extend window interface for webkit prefix
declare global {
  interface Window {
    SpeechRecognition: ISpeechRecognitionConstructor
    webkitSpeechRecognition: ISpeechRecognitionConstructor
  }
}

export interface SpeechRecognitionResult {
  transcript: string
  isFinal: boolean
  confidence: number
}

export function useChromeSpeechRecognition() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const finalTranscriptRef = useRef('')
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const onSilenceCallbackRef = useRef<(() => void) | null>(null)
  const isListeningRef = useRef(false)

  useEffect(() => {
    // Check for browser support
    console.log('Checking for Speech Recognition API support')
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    console.log('SpeechRecognitionAPI found:', !!SpeechRecognitionAPI)
    setIsSupported(!!SpeechRecognitionAPI)

    if (SpeechRecognitionAPI) {
      console.log('Creating new SpeechRecognition instance')
      const recognition = new SpeechRecognitionAPI()
      
      // Configure recognition
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'
      recognition.maxAlternatives = 1
      console.log('SpeechRecognition configured')

      // Handle results
      recognition.onresult = (event) => {
        let interim = ''
        let final = finalTranscriptRef.current

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            final += result[0].transcript + ' '
          } else {
            interim += result[0].transcript
          }
        }

        finalTranscriptRef.current = final
        setTranscript(final)
        setInterimTranscript(interim)
        
        // Reset silence timer on any speech
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current)
        }
        
        // Start new silence timer (2 seconds of silence = end of speech)
        if (isListeningRef.current && (final.trim() || interim.trim())) {
          silenceTimerRef.current = setTimeout(() => {
            if (onSilenceCallbackRef.current) {
              onSilenceCallbackRef.current()
            }
          }, 2000)
        }
      }

      // Handle errors
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error, event)
        setError(event.error)
        
        // Don't try to restart on aborted - it means it was never properly started
        if (event.error === 'aborted') {
          console.error('Speech recognition was aborted - likely permissions issue or not HTTPS')
          setIsListening(false)
          return
        }
        
        // Auto-restart on network errors
        if (event.error === 'network' && isListeningRef.current) {
          setTimeout(() => {
            if (recognitionRef.current && isListeningRef.current) {
              try {
                recognitionRef.current.start()
              } catch (e) {
                console.error('Failed to restart recognition:', e)
              }
            }
          }, 1000)
        }
      }

      // Handle end
      recognition.onend = () => {
        console.log('Recognition ended, isListening:', isListeningRef.current)
        // Auto-restart if still listening (for continuous mode)
        if (isListeningRef.current && recognitionRef.current) {
          setTimeout(() => {
            if (isListeningRef.current && recognitionRef.current) {
              try {
                console.log('Auto-restarting recognition')
                recognitionRef.current.start()
              } catch (e) {
                console.error('Failed to restart recognition:', e)
                setIsListening(false)
                isListeningRef.current = false
              }
            }
          }, 100)
        }
      }

      recognitionRef.current = recognition
    }

    return () => {
      if (recognitionRef.current) {
        console.log('Cleanup: aborting recognition')
        recognitionRef.current.abort()
      }
    }
  }, []) // Remove isListening from dependencies to avoid recreating recognition

  const startListening = useCallback((onSilence?: () => void) => {
    console.log('startListening called', { 
      hasRecognition: !!recognitionRef.current, 
      isSupported,
      currentlyListening: isListening 
    })
    
    if (!recognitionRef.current || !isSupported) {
      console.error('Speech recognition not available', { recognitionRef: recognitionRef.current, isSupported })
      setError('Speech recognition not supported')
      return
    }

    try {
      // Reset transcripts
      console.log('Resetting transcripts and starting recognition')
      setTranscript('')
      setInterimTranscript('')
      finalTranscriptRef.current = ''
      setError(null)
      onSilenceCallbackRef.current = onSilence || null
      
      console.log('Calling recognition.start()')
      recognitionRef.current.start()
      setIsListening(true)
      isListeningRef.current = true
      console.log('Recognition started successfully')
    } catch (error) {
      console.error('Failed to start recognition - full error:', error)
      setError('Failed to start recognition')
      setIsListening(false)
      isListeningRef.current = false
    }
  }, [isSupported])

  const stopListening = useCallback(() => {
    console.log('stopListening called')
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
        setIsListening(false)
        isListeningRef.current = false
        // Clear silence timer
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current)
          silenceTimerRef.current = null
        }
        onSilenceCallbackRef.current = null
      } catch (error) {
        console.error('Failed to stop recognition:', error)
        recognitionRef.current.abort()
        setIsListening(false)
        isListeningRef.current = false
      }
    }
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    finalTranscriptRef.current = ''
  }, [])

  // Get combined transcript (final + interim)
  const getFullTranscript = useCallback(() => {
    return (transcript + ' ' + interimTranscript).trim()
  }, [transcript, interimTranscript])

  return {
    isListening,
    transcript,
    interimTranscript,
    fullTranscript: getFullTranscript(),
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript
  }
}