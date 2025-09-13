import { useState, useEffect, useCallback, useRef } from "react";

// TypeScript doesn't have built-in SpeechRecognition types, so we need to define them
interface ISpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
        confidence: number;
      };
      isFinal: boolean;
      length: number;
    };
    length: number;
  };
}

interface ISpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: ISpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface ISpeechRecognitionConstructor {
  new (): ISpeechRecognition;
}

// Extend window interface for webkit prefix
declare global {
  interface Window {
    SpeechRecognition: ISpeechRecognitionConstructor;
    webkitSpeechRecognition: ISpeechRecognitionConstructor;
  }
}

export interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

export function useChromeSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const finalTranscriptRef = useRef("");
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onSilenceCallbackRef = useRef<(() => void) | null>(null);
  const isListeningRef = useRef(false);

  useEffect(() => {
    // Check for browser support
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionAPI);

    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();

      // Configure recognition
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      // Handle results
      recognition.onresult = (event) => {
        let interim = "";
        let final = finalTranscriptRef.current;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript + " ";
          } else {
            interim += result[0].transcript;
          }
        }

        finalTranscriptRef.current = final;
        setTranscript(final);
        setInterimTranscript(interim);

        // Reset silence timer on any speech
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        // Start new silence timer (2 seconds of silence = end of speech)
        if (isListeningRef.current && (final.trim() || interim.trim())) {
          silenceTimerRef.current = setTimeout(() => {
            if (onSilenceCallbackRef.current) {
              onSilenceCallbackRef.current();
            }
          }, 2000);
        }
      };

      // Handle errors
      recognition.onerror = (event) => {
        setError(event.error);

        // Don't try to restart on aborted - it means it was never properly started
        if (event.error === "aborted") {
          setIsListening(false);
          return;
        }

        // Auto-restart on network errors
        if (event.error === "network" && isListeningRef.current) {
          setTimeout(() => {
            if (recognitionRef.current && isListeningRef.current) {
              try {
                recognitionRef.current.start();
              } catch {
                // Failed to restart recognition
              }
            }
          }, 1000);
        }
      };

      // Handle end
      recognition.onend = () => {
        // Auto-restart if still listening (for continuous mode)
        if (isListeningRef.current && recognitionRef.current) {
          setTimeout(() => {
            if (isListeningRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch {
                setIsListening(false);
                isListeningRef.current = false;
              }
            }
          }, 100);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      // Set flags to prevent auto-restart
      isListeningRef.current = false;

      // Stop and release recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // If stop fails, use abort as fallback
          recognitionRef.current.abort();
        }
        // Release the reference completely
        recognitionRef.current = null;
      }

      // Clear any pending timers
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      // Clear callback reference
      onSilenceCallbackRef.current = null;
    };
  }, []); // Remove isListening from dependencies to avoid recreating recognition

  const startListening = useCallback(
    (onSilence?: () => void) => {
      if (!isSupported) {
        setError("Speech recognition not supported");
        return;
      }

      // If recognition was released, try to recreate it
      if (!recognitionRef.current) {
        const SpeechRecognitionAPI =
          window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionAPI) {
          setError("Speech recognition not available");
          return;
        }

        const recognition = new SpeechRecognitionAPI();

        // Configure recognition
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.maxAlternatives = 1;

        // Handle results
        recognition.onresult = (event) => {
          let interim = "";
          let final = finalTranscriptRef.current;

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              final += result[0].transcript + " ";
            } else {
              interim += result[0].transcript;
            }
          }

          finalTranscriptRef.current = final;
          setTranscript(final);
          setInterimTranscript(interim);

          // Reset silence timer on any speech
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }

          // Start new silence timer (2 seconds of silence = end of speech)
          if (isListeningRef.current && (final.trim() || interim.trim())) {
            silenceTimerRef.current = setTimeout(() => {
              if (onSilenceCallbackRef.current) {
                onSilenceCallbackRef.current();
              }
            }, 2000);
          }
        };

        // Handle errors
        recognition.onerror = (event) => {
          setError(event.error);

          // Don't try to restart on aborted - it means it was never properly started
          if (event.error === "aborted") {
            setIsListening(false);
            return;
          }

          // Auto-restart on network errors
          if (event.error === "network" && isListeningRef.current) {
            setTimeout(() => {
              if (recognitionRef.current && isListeningRef.current) {
                try {
                  recognitionRef.current.start();
                } catch {
                  // Failed to restart recognition
                }
              }
            }, 1000);
          }
        };

        // Handle end
        recognition.onend = () => {
          // Auto-restart if still listening (for continuous mode)
          if (isListeningRef.current && recognitionRef.current) {
            setTimeout(() => {
              if (isListeningRef.current && recognitionRef.current) {
                try {
                  recognitionRef.current.start();
                } catch {
                  setIsListening(false);
                  isListeningRef.current = false;
                }
              }
            }, 100);
          }
        };

        recognitionRef.current = recognition;
      }

      try {
        // Reset transcripts
        setTranscript("");
        setInterimTranscript("");
        finalTranscriptRef.current = "";
        setError(null);
        onSilenceCallbackRef.current = onSilence || null;

        recognitionRef.current.start();
        setIsListening(true);
        isListeningRef.current = true;
      } catch {
        setError("Failed to start recognition");
        setIsListening(false);
        isListeningRef.current = false;
      }
    },
    [isSupported],
  );

  const stopListening = useCallback(() => {
    // Set flags first
    setIsListening(false);
    isListeningRef.current = false;

    // Stop and release recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // If stop fails, use abort as fallback
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore abort errors
        }
      }
      // Release the reference completely to free the microphone
      recognitionRef.current = null;
    }

    // Clear all timers and callbacks
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    onSilenceCallbackRef.current = null;
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    finalTranscriptRef.current = "";
  }, []);

  // Get combined transcript (final + interim)
  const getFullTranscript = useCallback(() => {
    return (transcript + " " + interimTranscript).trim();
  }, [transcript, interimTranscript]);

  return {
    isListening,
    transcript,
    interimTranscript,
    fullTranscript: getFullTranscript(),
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
