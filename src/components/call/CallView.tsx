import { useState, useEffect, useCallback, useRef } from "react";
import { PhoneOff, Mic, MicOff, Send, Sparkles, Activity, BarChart3, Circle } from "lucide-react";
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
  const [visualizerType, setVisualizerType] = useState<"waveform" | "pulse" | "bars" | "orb">(
    () => (localStorage.getItem("voice-visualizer-type") as any) || "pulse"
  );

  // Save visualizer preference
  useEffect(() => {
    localStorage.setItem("voice-visualizer-type", visualizerType);
  }, [visualizerType]);

  // Use ref to track call state for VAD callbacks
  const callStateRef = useRef<CallState>('initializing');
  const processingRef = useRef(false); // Prevent duplicate processing
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // Hooks
  const agents = useProjectOnlineAgents(project.dTag);
  const threadManagement = useThreadManagement(
    project,
    rootEvent, // Pass as is (NDKEvent | null)
    extraTags,
    (thread) => {
      setRootEvent(thread);
      rootEventRef.current = thread;
    },
    agents
  );
  const messages = useChatMessages(threadManagement.localRootEvent || rootEvent || null);

  // Keep rootEventRef in sync with threadManagement's state
  useEffect(() => {
    if (threadManagement.localRootEvent) {
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

            try {
              if (!rootEventRef.current) {
                // Create new thread
                const newThread = await threadManagement.createThread(
                  transcribedText,
                  [activeAgent],
                  [],
                  true, // Auto-TTS enabled
                  activeAgent.pubkey
                );

                if (newThread) {
                  rootEventRef.current = newThread; // Update ref immediately
                  setRootEvent(newThread);
                }
              } else {
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
    
    try {
      if (!rootEvent) {
        // Create new thread
        const newThread = await threadManagement.createThread(
          messageText,
          [activeAgent],
          [],
          true, // Auto-TTS enabled
          activeAgent.pubkey
        );
        
        if (newThread) {
          setRootEvent(newThread);
        }
      } else {
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
  
  // Auto-play agent messages
  useEffect(() => {
    if (!ttsPlayer.hasTTS || !user || ttsPlayer.isPlaying) return;
    
    const unplayedMessages = messages.filter(msg => {
      if (msg.event.pubkey === user.pubkey) return false;
      if (playedMessageIdsRef.current.has(msg.id)) return false;
      if (msg.event.kind !== 1111) return false; // Only GenericReply
      
      const hasContent = extractTTSContent(msg.event.content);
      return !!hasContent;
    });
    
    if (unplayedMessages.length > 0) {
      const latestMessage = unplayedMessages[unplayedMessages.length - 1];
      const content = extractTTSContent(latestMessage.event.content);
      
      if (content) {
        setCallState('playing');
        playedMessageIdsRef.current.add(latestMessage.id);
        
        ttsPlayer.play(content, latestMessage.id, latestMessage.event.pubkey)
          .then(() => {
            setCallState('idle');
            
            // Resume VAD if in auto mode
            if (settings.vadMode === 'auto' && vad.isActive) {
              vad.resume();
            }
          })
          .catch(error => {
            console.error("TTS playback failed:", error);
            setCallState('idle');
          });
      }
    }
  }, [messages, user, ttsPlayer, settings.vadMode, vad]);
  
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
            type={visualizerType}
          />
        </div>

        {/* Visualizer Type Selector */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setVisualizerType("pulse")}
            className={cn(
              "p-2 rounded-lg transition-colors",
              visualizerType === "pulse" ? "bg-white/20" : "bg-white/5 hover:bg-white/10"
            )}
            title="Pulse"
          >
            <Circle className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => setVisualizerType("waveform")}
            className={cn(
              "p-2 rounded-lg transition-colors",
              visualizerType === "waveform" ? "bg-white/20" : "bg-white/5 hover:bg-white/10"
            )}
            title="Waveform"
          >
            <Activity className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => setVisualizerType("bars")}
            className={cn(
              "p-2 rounded-lg transition-colors",
              visualizerType === "bars" ? "bg-white/20" : "bg-white/5 hover:bg-white/10"
            )}
            title="Bars"
          >
            <BarChart3 className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => setVisualizerType("orb")}
            className={cn(
              "p-2 rounded-lg transition-colors",
              visualizerType === "orb" ? "bg-white/20" : "bg-white/5 hover:bg-white/10"
            )}
            title="Orb"
          >
            <Sparkles className="w-4 h-4 text-white" />
          </button>
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
          onClick={() => onClose(threadManagement.localRootEvent || rootEvent)}
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