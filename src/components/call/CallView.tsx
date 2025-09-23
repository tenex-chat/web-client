import { useState, useEffect, useCallback, useRef } from "react";
import { PhoneOff, Mic, MicOff, Send } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNDKCurrentUser, useProfileValue } from "@nostr-dev-kit/ndk-hooks";
import type { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { useAudioSettings } from "@/stores/ai-config-store";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useVAD } from "@/hooks/useVAD";
import { useAI } from "@/hooks/useAI";
import { useTTSPlayer } from "@/hooks/useTTSPlayer";
import { useThreadManagement } from "@/components/chat/hooks/useThreadManagement";
import { useChatMessages } from "@/components/chat/hooks/useChatMessages";
import { useProjectOnlineAgents } from "@/hooks/useProjectOnlineAgents";
import { extractTTSContent } from "@/lib/utils/extractTTSContent";
import { AgentSelector } from "@/components/chat/components/AgentSelector";
import { VoiceVisualizer } from "./VoiceVisualizer";
import type { NDKProject } from "@/lib/ndk-events/NDKProject";
import type { AgentInstance } from "@/types/agent";

/**
 * Generate a deterministic color from project's d-tag
 * (Same logic as ProjectAvatar component)
 */
function getProjectColor(project: NDKProject): string {
  // Get d-tag from project
  const dTag = project.tags?.find(tag => tag[0] === "d")?.[1] || project.id || project.title || "";

  if (!dTag) return "#94a3b8"; // Default slate-400

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < dTag.length; i++) {
    const char = dTag.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  // Convert to hue (0-360)
  const hue = Math.abs(hash) % 360;

  // Return HSL color with fixed saturation/lightness
  return `hsl(${hue}, 65%, 55%)`;
}

interface CallViewProps {
  project: NDKProject;
  onClose: (rootEvent?: NDKEvent | null) => void;
  extraTags?: string[][];
  rootEvent?: NDKEvent | null;
  isEmbedded?: boolean; // Added for compatibility
}

type CallState = 'initializing' | 'idle' | 'recording' | 'processing' | 'playing';

export function CallView({
  project,
  onClose,
  extraTags,
  rootEvent: initialRootEvent,
  isEmbedded = false
}: CallViewProps) {
  const user = useNDKCurrentUser();
  const { audioSettings } = useAudioSettings();

  // Provide default audio settings if not loaded yet
  const settings = audioSettings || {
    vadMode: 'push-to-talk' as const,
    inputDeviceId: null,
    outputDeviceId: null,
    inputVolume: 100,
    noiseSuppression: true,
    echoCancellation: true,
    voiceActivityDetection: true,
    vadSensitivity: 50,
    interruptionMode: 'disabled' as const,
    interruptionSensitivity: 'medium' as const
  };
  
  // Core state
  const [callState, setCallState] = useState<CallState>('initializing');
  const [rootEvent, setRootEvent] = useState<NDKEvent | null>(initialRootEvent || null);
  const rootEventRef = useRef<NDKEvent | null>(initialRootEvent); // Use ref for immediate updates
  const [selectedAgentPubkey, setSelectedAgentPubkey] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');

  // Use ref to track call state for VAD callbacks
  const callStateRef = useRef<CallState>('initializing');
  const processingRef = useRef(false); // Prevent duplicate processing
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // Log rootEvent state changes
  useEffect(() => {
    console.log('CallView: rootEvent state changed', { id: rootEvent?.id });
  }, [rootEvent]);

  // Hooks
  const agents = useProjectOnlineAgents(project.dTag);
  console.log('CallView: useThreadManagement initialized with rootEvent:', { id: rootEvent?.id });
  const threadManagement = useThreadManagement(
    project,
    rootEvent, // Pass as is (NDKEvent | null)
    extraTags,
    (thread) => {
      console.log('CallView: setRootEvent callback from useThreadManagement triggered.', { newThreadId: thread?.id, oldRootEventId: rootEventRef.current?.id });
      setRootEvent(thread);
      rootEventRef.current = thread;
    },
    agents
  );
  console.log("CallView: useChatMessages initialized with root event:", { id: (threadManagement.localRootEvent || rootEvent || null)?.id });
  const messages = useChatMessages(threadManagement.localRootEvent || rootEvent || null);

  // Keep rootEventRef in sync with threadManagement's state
  useEffect(() => {
    if (threadManagement.localRootEvent) {
      console.log('CallView: Syncing rootEvent from threadManagement.localRootEvent.', {
        newRootEventId: threadManagement.localRootEvent.id,
        oldRootEventInState: rootEvent?.id,
        oldRootEventInRef: rootEventRef.current?.id,
      });
      setRootEvent(threadManagement.localRootEvent);
      rootEventRef.current = threadManagement.localRootEvent;
    }
  }, [threadManagement.localRootEvent]);
  
  // Audio hooks
  const { sttSettings, transcribe } = useAI();
  const audioRecorder = useAudioRecorder();

  const ttsPlayer = useTTSPlayer();

  const vad = useVAD({
    enabled: settings.vadMode === 'auto',
    onSpeechStart: () => {
      if (callStateRef.current === 'idle') {
        startRecording();
      }
    },
    onSpeechEnd: () => {
      if (callStateRef.current === 'recording') {
        stopRecording();
      }
    }
  });
  
  const playedMessageIdsRef = useRef(new Set<string>());
  const isInitialLoad = useRef(true);
  const ttsQueueRef = useRef<Array<{ content: string; id: string; pubkey: string }>>([]);
  const isProcessingQueueRef = useRef(false);

  // Get active agent based on selection or default to first
  const activeAgent = selectedAgentPubkey
    ? agents.find(a => a.pubkey === selectedAgentPubkey) || agents[0]
    : agents[0];
  
  // Initialize call
  useEffect(() => {
    const init = async () => {
      try {
        // Request mic permission
        await navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => stream.getTracks().forEach(track => track.stop()));

        if (settings.vadMode === 'auto') {
          await vad.start();
          toast.success("Voice detection active - just start speaking!");
        }
        
        setCallState('idle');
      } catch (error) {
        console.error("Failed to initialize:", error);
        toast.error("Microphone access required");
      }
    };
    
    if (callState === 'initializing') {
      init();
    }
  }, [callState, settings.vadMode, vad]);
  
  // Start recording
  const startRecording = useCallback(async () => {
    if (callStateRef.current !== 'idle') {
      console.log(`STT: Skipping start, already in state: ${callStateRef.current}`);
      return;
    }

    console.log(`STT: Starting recording, vadMode: ${settings.vadMode}, sttEnabled: ${sttSettings.enabled}, provider: ${sttSettings.provider}`);
    setCallState('recording');
    callStateRef.current = 'recording'; // Update ref immediately
    setTranscript('');

    if (settings.vadMode !== 'disabled' && sttSettings.enabled) {
      // Use MediaRecorder for transcription providers (ElevenLabs/Whisper)
      console.log('STT: Starting MediaRecorder for transcription');
      await audioRecorder.startRecording();
    } else {
      // No STT enabled or disabled VAD mode
      console.log('STT: Starting MediaRecorder without STT');
      await audioRecorder.startRecording();
    }
  }, [settings.vadMode, sttSettings.enabled, sttSettings.provider, audioRecorder]);
  
  // Stop recording
  const stopRecording = useCallback(async () => {
    if (callStateRef.current !== 'recording') {
      console.log(`STT: Skipping stop, state is: ${callStateRef.current}`);
      return;
    }

    // Prevent duplicate processing
    if (processingRef.current) {
      console.log('STT: Already processing, skipping duplicate');
      return;
    }
    processingRef.current = true;

    setCallState('processing');
    callStateRef.current = 'processing'; // Update ref immediately
    
    if (settings.vadMode !== 'disabled' && sttSettings.enabled) {
      // Use MediaRecorder and transcribe with AI service
      console.log(`STT: Stopping recording, provider: ${sttSettings.provider}, enabled: ${sttSettings.enabled}`);
      const blob = await audioRecorder.stopRecording();
      console.log(`STT: Got blob, size: ${blob?.size}, type: ${blob?.type}`);

      if (blob && blob.size >= 1000) {
        try {
          console.log(`STT: Sending audio to transcription service (${sttSettings.provider}) - ${Date.now()}ms`);
          const transcribedText = await transcribe(blob);
          console.log(`STT: Transcription result: "${transcribedText}" - ${Date.now()}ms`);

          if (transcribedText?.trim()) {
            // Send the transcribed message
            setTranscript(transcribedText);

            if (!activeAgent) {
              setCallState('idle');
              callStateRef.current = 'idle';
              return;
            }

            console.log('CallView: Preparing to send message via stopRecording.', {
              rootEventId: rootEventRef.current?.id,
              hasRootEvent: !!rootEventRef.current,
              transcript: transcribedText,
            });

            try {
              if (!rootEventRef.current) {
                console.log('CallView: No rootEvent in ref, creating new thread.');
                // Create new thread
                const newThread = await threadManagement.createThread(
                  transcribedText,
                  [activeAgent],
                  [],
                  true, // Auto-TTS enabled
                  activeAgent.pubkey
                );

                if (newThread) {
                  console.log('CallView: New thread created in stopRecording.', { newThreadId: newThread.id });
                  rootEventRef.current = newThread; // Update ref immediately
                  setRootEvent(newThread);
                }
              } else {
                console.log('CallView: Existing rootEvent in ref, sending reply in stopRecording.', { rootEventId: rootEventRef.current.id });
                // Reply to existing thread
                await threadManagement.sendReply(
                  transcribedText,
                  [activeAgent],
                  [],
                  true,
                  messages,
                  activeAgent.pubkey
                );
              }

              setTranscript('');
              setCallState('idle');
              callStateRef.current = 'idle';
              processingRef.current = false;
            } catch (error) {
              console.error("Failed to send message:", error);
              toast.error("Failed to send message");
              setCallState('idle');
              callStateRef.current = 'idle';
              processingRef.current = false;
            }
          } else {
            setCallState('idle');
            callStateRef.current = 'idle';
            processingRef.current = false;
          }
        } catch (error) {
          console.error("Transcription failed:", error);
          toast.error("Failed to transcribe audio");
          setCallState('idle');
          callStateRef.current = 'idle';
          processingRef.current = false;
        }
      } else {
        console.warn(`STT: Audio too small or empty, skipping transcription - ${Date.now()}ms`);
        setCallState('idle');
        callStateRef.current = 'idle';
        processingRef.current = false;
      }
    } else {
      // No STT or manual mode
      await audioRecorder.stopRecording();
      setCallState('idle');
      callStateRef.current = 'idle';
      processingRef.current = false;
    }
  }, [settings.vadMode, sttSettings.enabled, sttSettings.provider, audioRecorder, transcribe, activeAgent, rootEvent, threadManagement, messages]);
  
  // Send message
  const handleSendMessage = useCallback(async (text?: string) => {
    const messageText = text || transcript;
    if (!messageText.trim() || !activeAgent) return;
    
    setCallState('processing');
    
    console.log('CallView: Preparing to send message via handleSendMessage.', {
      rootEventIdFromState: rootEvent?.id,
      rootEventIdFromRef: rootEventRef.current?.id,
      hasRootEvent: !!rootEvent,
      message: messageText,
    });

    try {
      if (!rootEvent) {
        console.log('CallView: No rootEvent in state, creating new thread in handleSendMessage.');
        // Create new thread
        const newThread = await threadManagement.createThread(
          messageText,
          [activeAgent],
          [],
          true, // Auto-TTS enabled
          activeAgent.pubkey
        );
        
        if (newThread) {
          console.log('CallView: New thread created in handleSendMessage.', { newThreadId: newThread.id });
          setRootEvent(newThread);
        }
      } else {
        console.log('CallView: Existing rootEvent in state, sending reply in handleSendMessage.', { rootEventId: rootEvent.id });
        // Reply to existing thread
        await threadManagement.sendReply(
          messageText,
          [activeAgent],
          [],
          true,
          messages,
          activeAgent.pubkey
        );
      }
      
      setTranscript('');
      setCallState('idle');
      callStateRef.current = 'idle';
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
      setCallState('idle');
      callStateRef.current = 'idle';
    }
  }, [transcript, activeAgent, rootEvent, threadManagement, messages]);
  
  // Process TTS queue - plays messages one at a time
  const processNextInQueue = useCallback(async () => {
    // Check if already processing or queue is empty
    if (isProcessingQueueRef.current || ttsQueueRef.current.length === 0) {
      return;
    }

    // Check if TTS is currently playing
    if (ttsPlayer.isPlaying) {
      return;
    }

    // Mark as processing
    isProcessingQueueRef.current = true;

    // Get next message from queue
    const nextMessage = ttsQueueRef.current.shift();
    if (!nextMessage) {
      isProcessingQueueRef.current = false;
      return;
    }

    try {
      setCallState('playing');
      
      await ttsPlayer.play(nextMessage.content, nextMessage.id, nextMessage.pubkey)
        .then(() => {
          setCallState('idle');
          
          // Resume VAD if in auto mode
          if (settings.vadMode === 'auto' && vad.isActive) {
            vad.resume();
          }

          // Mark processing as done
          isProcessingQueueRef.current = false;
          
          // Process next message in queue after a small delay
          setTimeout(() => {
            processNextInQueue();
          }, 100);
        })
        .catch(error => {
          console.error("TTS playback failed:", error);
          setCallState('idle');
          isProcessingQueueRef.current = false;
          
          // Try next message in queue
          setTimeout(() => {
            processNextInQueue();
          }, 100);
        });
    } catch (error) {
      console.error("Failed to process TTS queue:", error);
      isProcessingQueueRef.current = false;
      setCallState('idle');
    }
  }, [ttsPlayer, settings.vadMode, vad]);
  
  // Auto-play agent messages - adds them to the queue
  useEffect(() => {
    // Initialize playedMessageIdsRef with all existing messages on first load
    if (isInitialLoad.current && messages.length > 0) {
      messages.forEach(msg => playedMessageIdsRef.current.add(msg.id));
      isInitialLoad.current = false;
      return;
    }

    if (!ttsPlayer.hasTTS || !user) return;
    
    const unplayedMessages = messages.filter(msg => {
      if (msg.event.pubkey === user.pubkey) return false;
      if (playedMessageIdsRef.current.has(msg.id)) return false;
      if (msg.event.kind !== 1111) return false; // Only GenericReply
      
      const hasContent = extractTTSContent(msg.event.content);
      return !!hasContent;
    });
    
    if (unplayedMessages.length > 0) {
      // Add all unplayed messages to queue
      unplayedMessages.forEach(message => {
        const content = extractTTSContent(message.event.content);
        
        if (content && !playedMessageIdsRef.current.has(message.id)) {
          // Mark as played (added to queue)
          playedMessageIdsRef.current.add(message.id);
          
          // Add to TTS queue
          ttsQueueRef.current.push({
            content,
            id: message.id,
            pubkey: message.event.pubkey
          });
        }
      });
      
      // Start processing the queue
      processNextInQueue();
    }
  }, [messages, user, ttsPlayer.hasTTS, processNextInQueue]);
  
  // Monitor TTS player state to process queue when playback ends
  useEffect(() => {
    // When TTS stops playing and we have items in queue, process next
    if (!ttsPlayer.isPlaying && !isProcessingQueueRef.current && ttsQueueRef.current.length > 0) {
      processNextInQueue();
    }
  }, [ttsPlayer.isPlaying, processNextInQueue]);
  
  // Handle mic button
  const handleMicButton = () => {
    if (settings.vadMode === 'auto') {
      // Toggle mute in auto mode
      if (vad.isActive) {
        vad.pause();
        toast.info("Voice detection paused");
      } else {
        vad.resume();
        toast.info("Voice detection resumed");
      }
    } else {
      // Push-to-talk or disabled mode
      if (callState === 'recording') {
        stopRecording();
      } else if (callState === 'idle') {
        startRecording();
      }
    }
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      vad.stop();
      ttsPlayer.stop();
      if (audioRecorder.isRecording) {
        audioRecorder.stopRecording();
      }
      // Clear the TTS queue
      ttsQueueRef.current = [];
      isProcessingQueueRef.current = false;
    };
  }, []);
  
  return (
    <div className={cn(
      "bg-black flex flex-col",
      isEmbedded ? "h-full" : "fixed inset-0 z-50"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <h2 className="text-white text-lg font-medium">{project.title}</h2>
          {agents.length > 0 && (
            <AgentSelector
              onlineAgents={agents}
              recentMessages={messages}
              selectedAgent={selectedAgentPubkey}
              onAgentSelect={setSelectedAgentPubkey}
              disabled={callState === 'processing'}
              className="bg-white/5 hover:bg-white/10 text-white"
            />
          )}
        </div>
        <div className="text-white/60 text-sm">
          {settings.vadMode === 'auto' ? 'Auto-detect' :
           settings.vadMode === 'push-to-talk' ? 'Push-to-talk' :
           'Manual'}
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Agent display */}
        {activeAgent && <AgentAvatar agent={activeAgent} isActive={callState === 'playing'} />}

        {/* Voice Visualizer */}
        <div className="mt-8 mb-4">
          <VoiceVisualizer
            isActive={callState === 'recording'}
            audioLevel={audioRecorder.audioLevel}
            color={getProjectColor(project)}
          />
        </div>

        {/* Status display */}
        <div className="mt-4 min-h-[60px] max-w-md w-full text-center">
          {callState === 'recording' && (
            <div className="text-white">
              <span className="inline-flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Listening...
              </span>
            </div>
          )}
          {callState === 'processing' && (
            <div className="text-white/60">
              <div className="mb-2">Processing...</div>
              {transcript && (
                <div className="text-white/40 text-sm italic">
                  "{transcript}"
                </div>
              )}
            </div>
          )}
          {callState === 'playing' && (
            <div className="text-white/60">Agent speaking...</div>
          )}
          {callState === 'idle' && transcript && (
            <div className="text-white/40 text-sm">
              Last: "{transcript}"
            </div>
          )}
        </div>
      </div>
      
      {/* Controls */}
      <div className="flex items-center justify-center gap-4 p-6">
        {/* End call */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            // Clear the TTS queue before closing
            ttsQueueRef.current = [];
            isProcessingQueueRef.current = false;
            ttsPlayer.stop();
            onClose(threadManagement.localRootEvent || rootEvent);
          }}
          className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600"
        >
          <PhoneOff className="h-7 w-7 text-white" />
        </motion.button>
        
        {/* Mic toggle */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleMicButton}
          disabled={callState === 'processing'}
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center relative overflow-hidden",
            callState === 'recording'
              ? "bg-white text-black"
              : "bg-gray-700 text-white hover:bg-gray-600"
          )}
        >
          {/* Recording indicator ring */}
          {callState === 'recording' && (
            <motion.div
              className="absolute inset-0 rounded-full border-3 border-red-500"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [1, 0, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          )}

          {/* Audio level background */}
          {callState === 'recording' && (
            <motion.div
              className="absolute inset-0 bg-red-500/20"
              animate={{
                scale: 1 + audioRecorder.audioLevel * 0.5,
              }}
              transition={{
                duration: 0.05,
                ease: "easeOut",
              }}
            />
          )}

          <div className="relative z-10">
            {callState === 'recording' ? (
              <Mic className="h-7 w-7 animate-pulse" />
            ) : (
              <MicOff className="h-7 w-7" />
            )}
          </div>
        </motion.button>
        
        {/* Send button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => handleSendMessage()}
          disabled={!transcript.trim() || callState === 'processing'}
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center",
            transcript.trim() && callState !== 'processing'
              ? "bg-green-500 hover:bg-green-600 text-white"
              : "bg-gray-700 text-gray-400 cursor-not-allowed"
          )}
        >
          <Send className="h-7 w-7" />
        </motion.button>
      </div>
    </div>
  );
}

// Simple agent avatar component
function AgentAvatar({ agent, isActive }: { agent: AgentInstance; isActive: boolean }) {
  const profile = useProfileValue(agent.pubkey);
  const avatarUrl = profile?.image || profile?.picture;
  const displayName = agent.slug || profile?.displayName || profile?.name || "Agent";
  
  return (
    <div className="relative">
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-white/30"
          animate={{
            scale: [1, 1.15],
            opacity: [0.6, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: [0.4, 0, 0.6, 1],
          }}
        />
      )}
      
      <Avatar className="h-20 w-20">
        <AvatarImage src={avatarUrl} alt={displayName} />
        <AvatarFallback className="bg-white/10 text-white">
          {displayName[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="mt-4 text-white text-center">
        {displayName}
      </div>
    </div>
  );
}