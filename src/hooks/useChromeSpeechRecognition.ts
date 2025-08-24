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

  useEffect(() => {
    // Check for browser support
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    setIsSupported(!!SpeechRecognitionAPI)

    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI()
      
      // Configure recognition
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'
      recognition.maxAlternatives = 1

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
      }

      // Handle errors
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setError(event.error)
        
        // Auto-restart on network errors
        if (event.error === 'network' && isListening) {
          setTimeout(() => {
            if (recognitionRef.current && isListening) {
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
        // Auto-restart if still listening (for continuous mode)
        if (isListening && recognitionRef.current) {
          try {
            recognitionRef.current.start()
          } catch (e) {
            console.error('Failed to restart recognition:', e)
            setIsListening(false)
          }
        }
      }

      recognitionRef.current = recognition
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [isListening])

  const startListening = useCallback(() => {
    if (!recognitionRef.current || !isSupported) {
      setError('Speech recognition not supported')
      return
    }

    try {
      // Reset transcripts
      setTranscript('')
      setInterimTranscript('')
      finalTranscriptRef.current = ''
      setError(null)
      
      recognitionRef.current.start()
      setIsListening(true)
    } catch (error) {
      console.error('Failed to start recognition:', error)
      setError('Failed to start recognition')
      setIsListening(false)
    }
  }, [isSupported])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop()
        setIsListening(false)
      } catch (error) {
        console.error('Failed to stop recognition:', error)
        recognitionRef.current.abort()
        setIsListening(false)
      }
    }
  }, [isListening])

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