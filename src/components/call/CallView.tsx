import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneOff, Mic, MicOff, Bot, Send, Volume2, AudioLines, RotateCcw, Activity, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ProjectAvatar } from "@/components/ui/project-avatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUnifiedSTT } from "@/hooks/useUnifiedSTT";
import { useThreadManagement } from "@/components/chat/hooks/useThreadManagement";
import { useChatMessages } from "@/components/chat/hooks/useChatMessages";
import { useProjectOnlineAgents } from "@/hooks/useProjectOnlineAgents";
import { useAI } from "@/hooks/useAI";
import { extractTTSContent } from "@/lib/utils/extractTTSContent";
import { isAudioEvent } from "@/lib/utils/audioEvents";
import { useProfileValue, useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { useNDKCurrentUser } from "@nostr-dev-kit/ndk-hooks";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk-hooks";
import { useCallSettings } from "@/stores/call-settings-store";
import { CallSettings } from "./CallSettings";
import { EVENT_KINDS } from "@/lib/constants";
import { StreamingTTSPlayer } from "@/lib/audio/streaming-tts-player";
import { VADService } from "@/lib/audio/vad-service";
import { useAudioDevices } from "@/hooks/useAudioDevices";
import type { NDKProject } from "@/lib/ndk-events/NDKProject";
import type { AgentInstance } from "@/types/agent";
import type { Message } from "@/components/chat/hooks/useChatMessages";

interface CallViewProps {
  project: NDKProject;
  onClose: (rootEvent?: NDKEvent | null) => void;
  extraTags?: string[][];
  rootEvent?: NDKEvent | null;
  isEmbedded?: boolean; // Whether this is embedded in a floating window
}

// Conversation state machine
type ConversationState =
  | "initializing"
  | "idle"
  | "user_speaking"
  | "processing_user_input"
  | "agent_speaking"
  | "error";

interface AgentDisplayProps {
  agent: AgentInstance;
  isTyping: boolean;
  isSpeaking: boolean;
  isTargeted: boolean;
  isReasoning: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}

function AgentDisplay({
  agent,
  isTyping,
  isSpeaking,
  isTargeted,
  isReasoning,
  onClick,
  size = "md",
}: AgentDisplayProps) {
  const profile = useProfileValue(agent.pubkey);
  const avatarUrl = profile?.image || profile?.picture;
  const displayName =
    agent.slug || profile?.displayName || profile?.name || "Agent";

  const sizeClasses = {
    sm: isTargeted ? "h-[52px] w-[52px]" : "h-12 w-12",
    md: isTargeted ? "h-[68px] w-[68px]" : "h-16 w-16",
    lg: isTargeted ? "h-[84px] w-[84px]" : "h-20 w-20",
  };

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

        <Avatar
          className={cn(sizeClasses[size], "relative z-10 transition-all")}
        >
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback className="bg-white/10 text-white">
            <Bot className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>

        {/* Reasoning indicator - thinking animation */}
        {isReasoning && !isTyping && (
          <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full p-1.5 z-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
              }}
              className="w-4 h-4"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2C13.3132 2 14.6136 2.25866 15.8268 2.7612C17.0401 3.26375 18.1425 4.00035 19.0711 4.92893C19.9997 5.85752 20.7362 6.95991 21.2388 8.17317C21.7413 9.38643 22 10.6868 22 12C22 14.6522 20.9464 17.1957 19.0711 19.0711C17.1957 20.9464 14.6522 22 12 22C10.6868 22 9.38643 21.7413 8.17317 21.2388C6.95991 20.7362 5.85752 19.9997 4.92893 19.0711C3.05357 17.1957 2 14.6522 2 12C2 9.34784 3.05357 6.8043 4.92893 4.92893C6.8043 3.05357 9.34784 2 12 2ZM12 7C11.7348 7 11.4804 7.10536 11.2929 7.29289C11.1054 7.48043 11 7.73478 11 8C11 8.26522 11.1054 8.51957 11.2929 8.70711C11.4804 8.89464 11.7348 9 12 9C12.2652 9 12.5196 8.89464 12.7071 8.70711C12.8946 8.51957 13 8.26522 13 8C13 7.73478 12.8946 7.48043 12.7071 7.29289C12.5196 7.10536 12.2652 7 12 7ZM12 11C11.7348 11 11.4804 11.1054 11.2929 11.2929C11.1054 11.4804 11 11.7348 11 12C11 12.2652 11.1054 12.5196 11.2929 12.7071C11.4804 12.8946 11.7348 13 12 13C12.2652 13 12.5196 12.8946 12.7071 12.7071C12.8946 12.5196 13 12.2652 13 12C13 11.7348 12.8946 11.4804 12.7071 11.2929C12.5196 11.1054 12.2652 11 12 11ZM12 15C11.7348 15 11.4804 15.1054 11.2929 15.2929C11.1054 15.4804 11 15.7348 11 16C11 16.2652 11.1054 16.5196 11.2929 16.7071C11.4804 16.8946 11.7348 17 12 17C12.2652 17 12.5196 16.8946 12.7071 16.7071C12.8946 16.5196 13 16.2652 13 16C13 15.7348 12.8946 15.4804 12.7071 15.2929C12.5196 15.1054 12.2652 15 12 15Z"
                  fill="white"
                  fillOpacity="0.9"
                />
              </svg>
            </motion.div>
          </div>
        )}

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
  );
}

function AgentSelector({
  agent,
  onClick,
}: {
  agent: AgentInstance;
  onClick: () => void;
}) {
  const profile = useProfileValue(agent.pubkey);
  const avatarUrl = profile?.image || profile?.picture;
  const displayName =
    agent.slug || profile?.displayName || profile?.name || "Agent";

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
  );
}

export function CallView({ project, onClose, extraTags, rootEvent, isEmbedded = false }: CallViewProps) {
  const user = useNDKCurrentUser();
  const [conversationState, setConversationState] =
    useState<ConversationState>("initializing");
  const [selectedAgent, setSelectedAgent] = useState<AgentInstance | null>(
    null,
  );
  const [localRootEvent, setLocalRootEvent] = useState<NDKEvent | null>(rootEvent || null);
  const localRootEventRef = useRef<NDKEvent | null>(rootEvent || null);

  // Keep ref in sync with state
  useEffect(() => {
    localRootEventRef.current = localRootEvent;
  }, [localRootEvent]);
  const [playedMessageIds, setPlayedMessageIds] = useState<Set<string>>(
    new Set(),
  );
  const [currentAgentMessage, setCurrentAgentMessage] =
    useState<Message | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [participatingAgents, setParticipatingAgents] = useState<Set<string>>(
    new Set(),
  );
  const [typingAgents, setTypingAgents] = useState<Set<string>>(new Set());
  const [speakingAgent, setSpeakingAgent] = useState<string | null>(null);
  const [targetAgent, setTargetAgent] = useState<AgentInstance | null>(null); // Agent to p-tag
  const [reasoningAgents, setReasoningAgents] = useState<Set<string>>(new Set());
  const [lastPlayedMessage, setLastPlayedMessage] = useState<Message | null>(null);
  const [isRepeating, setIsRepeating] = useState(false);
  const [isChangingDevice, setIsChangingDevice] = useState(false);

  // Audio settings for microphone name display
  const { audioSettings, updateAudioSettings } = useCallSettings();
  
  // Audio devices hook for dropdown
  const { inputDevices, outputDevices, refreshDevices } = useAudioDevices();

  // Refs
  const callStartTimeRef = useRef<number>(Date.now());
  const selectedAgentRef = useRef<AgentInstance | null>(null);
  const vadServiceRef = useRef<VADService | null>(null);
  const isVadProcessingRef = useRef(false);

  // Hooks
  const agentsRaw = useProjectOnlineAgents(project.dTag);
  const threadManagement = useThreadManagement(
    project,
    localRootEvent,  // Use the state, not the prop!
    extraTags,
    undefined,
    agentsRaw,
  );
  const messages = useChatMessages(localRootEvent);

  // Subscribe to typing indicators
  const { events: typingEvents } = useSubscribe(
    localRootEvent
      ? [
          {
            kinds: [
              EVENT_KINDS.TYPING_INDICATOR as NDKKind,
              EVENT_KINDS.TYPING_INDICATOR_STOP as NDKKind,
            ],
            "#E": [localRootEvent.id],
          },
        ]
      : false,
    { closeOnEose: false, groupable: true },
    [localRootEvent?.id],
  );

  // Update typing agents based on typing events
  useEffect(() => {
    if (!typingEvents) return;

    const newTypingAgents = new Set<string>();
    const now = Date.now();

    typingEvents.forEach((event) => {
      // Only show typing if event is recent (within 5 seconds)
      if (event.created_at && now - event.created_at * 1000 < 5000) {
        if (event.kind === EVENT_KINDS.TYPING_INDICATOR) {
          newTypingAgents.add(event.pubkey);
        }
      }
    });

    setTypingAgents(newTypingAgents);
  }, [typingEvents]);

  // Initialize target agent when opening an existing conversation
  useEffect(() => {
    // Only run this initialization once when we have messages from an existing conversation
    if (!rootEvent || targetAgent || messages.length === 0) return;
    
    // Find the last agent (non-user) message
    const lastAgentMessage = [...messages]
      .reverse()
      .find((msg) => 
        msg.event.pubkey !== user?.pubkey && 
        msg.event.kind === 1111 && // Only consider actual messages
        !msg.event.hasTag("reasoning") // Exclude reasoning messages
      );
    
    if (lastAgentMessage) {
      const agent = agentsRaw.find((a) => a.pubkey === lastAgentMessage.event.pubkey);
      if (agent) {
        setTargetAgent(agent);
      }
    }
  }, [rootEvent, messages, user?.pubkey, agentsRaw]); // Note: targetAgent is intentionally excluded to run only once

  // Track participating agents from messages and auto-select target
  useEffect(() => {
    const agents = new Set<string>();
    const reasoning = new Set<string>();
    let lastAgentPubkey: string | null = null;

    // Track which agents have sent their final (non-reasoning) message
    const agentFinalMessages = new Map<string, number>();
    const agentReasoningMessages = new Map<string, number>();

    messages.forEach((msg) => {
      if (msg.event.pubkey !== user?.pubkey) {
        agents.add(msg.event.pubkey);
        
        // Track reasoning vs non-reasoning messages
        if (msg.event.hasTag("reasoning")) {
          const lastReasoning = agentReasoningMessages.get(msg.event.pubkey) || 0;
          agentReasoningMessages.set(msg.event.pubkey, Math.max(lastReasoning, msg.event.created_at || 0));
        } else if (msg.event.kind === 1111) { // Only track actual messages, not typing indicators
          const lastFinal = agentFinalMessages.get(msg.event.pubkey) || 0;
          agentFinalMessages.set(msg.event.pubkey, Math.max(lastFinal, msg.event.created_at || 0));
          // Update lastAgentPubkey only for non-reasoning messages
          lastAgentPubkey = msg.event.pubkey;
        }
      }
    });

    // Only show reasoning animation if reasoning message is newer than final message
    agentReasoningMessages.forEach((reasoningTime, pubkey) => {
      const finalTime = agentFinalMessages.get(pubkey) || 0;
      if (reasoningTime > finalTime) {
        reasoning.add(pubkey);
      }
    });

    setParticipatingAgents(agents);
    setReasoningAgents(reasoning);

    // Auto-target the last agent who sent a message during the call
    // This dynamically updates to always target the last speaker
    if (lastAgentPubkey) {
      const agent = agentsRaw.find((a) => a.pubkey === lastAgentPubkey);
      if (agent) {
        setTargetAgent(agent);
      }
    }
  }, [messages, user?.pubkey, agentsRaw, targetAgent]);

  // TTS configuration from AI hook
  const { streamSpeak, hasTTS, voiceSettings } = useAI();
  const [isPlaying, setIsPlaying] = useState(false);
  const streamingPlayerRef = useRef<StreamingTTSPlayer | null>(null);

  // Helper to play TTS audio with streaming
  const playTTS = useCallback(
    async (text: string) => {
      if (!hasTTS) return;

      try {
        setIsPlaying(true);
        
        // Create new streaming player
        const player = new StreamingTTSPlayer(audioSettings.outputDeviceId || undefined);
        streamingPlayerRef.current = player;
        
        // Initialize the player
        await player.initialize();
        
        // Set playback speed
        player.setPlaybackRate(voiceSettings.speed || 1.0);
        
        // Set up ended callback
        player.onEnded(() => {
          setIsPlaying(false);
          streamingPlayerRef.current = null;
        });

        // Start streaming with chunk callback
        await streamSpeak(text, async (chunk) => {
          // Add each chunk as it arrives for immediate playback
          await player.addChunk(chunk);
        });
        
        // Signal that stream has ended
        await player.endStream();
        
      } catch (error) {
        console.error("TTS streaming playback error:", error);
        setIsPlaying(false);
        if (streamingPlayerRef.current) {
          streamingPlayerRef.current.stop();
          streamingPlayerRef.current = null;
        }
      }
    },
    [streamSpeak, hasTTS, audioSettings.outputDeviceId, voiceSettings.speed],
  );

  // Helper to stop TTS
  const stopTTS = useCallback(() => {
    if (streamingPlayerRef.current) {
      streamingPlayerRef.current.stop();
      streamingPlayerRef.current = null;
      setIsPlaying(false);
    }
  }, []);

  // Create a ref to hold the STT instance for use in callbacks
  const sttRef = useRef<ReturnType<typeof useUnifiedSTT> | null>(null);
  const [isVadActive, setIsVadActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);

  // Use agents in their original order from project configuration
  // The first agent is always the project manager by convention
  const agents = useMemo(() => {
    return [...agentsRaw];
  }, [agentsRaw]);

  // Callback ref for silence detection to avoid circular dependency
  const onSilenceDetectedRef = useRef<(() => void) | null>(null);

  // Unified STT hook - only use silence detection in push-to-talk mode
  const stt = useUnifiedSTT({
    onSilenceDetected: audioSettings.vadMode === "push-to-talk" 
      ? () => onSilenceDetectedRef.current?.() 
      : undefined,
  });

  // Store STT instance in ref for use in callbacks
  useEffect(() => {
    sttRef.current = stt;
  }, [stt]);

  // Handle repeat functionality
  const handleRepeat = useCallback(async () => {
    if (!lastPlayedMessage || !hasTTS || isRepeating || isPlaying) {
      return;
    }

    const ttsContent = extractTTSContent(lastPlayedMessage.event.content);
    if (!ttsContent) {
      toast.error("No audio content to repeat");
      return;
    }

    try {
      setIsRepeating(true);

      // Stop any currently playing audio
      stopTTS();

      // Stop listening if currently listening
      if (sttRef.current?.isListening) {
        sttRef.current.stopListening();
        setConversationState("idle");
      }

      // Set the agent who spoke as the speaking agent
      setSpeakingAgent(lastPlayedMessage.event.pubkey);
      setConversationState("agent_speaking");

      // Auto-target the agent whose message we're repeating
      const speakingAgentInstance = agentsRaw.find(
        (a) => a.pubkey === lastPlayedMessage.event.pubkey,
      );
      if (speakingAgentInstance) {
        setTargetAgent(speakingAgentInstance);
      }

      // Replay the TTS with fresh generation
      await playTTS(ttsContent);

      setSpeakingAgent(null);
      setConversationState("idle");
    } catch (error) {
      console.error("Failed to repeat audio:", error);
      toast.error("Failed to repeat audio");
      setSpeakingAgent(null);
      setConversationState("idle");
    } finally {
      setIsRepeating(false);
    }
  }, [lastPlayedMessage, hasTTS, isRepeating, isPlaying, stopTTS, playTTS, agentsRaw]);

  // Select first agent (project manager) by default
  useEffect(() => {
    if (agents.length > 0 && !selectedAgent) {
      // First agent in the array is always the project manager
      // This follows the convention used throughout the app
      const projectManager = agents[0];
      setSelectedAgent(projectManager);
      selectedAgentRef.current = projectManager;
    }
  }, [agents, selectedAgent]);

  // Keep ref in sync with state
  useEffect(() => {
    selectedAgentRef.current = selectedAgent;
  }, [selectedAgent]);

  // Update call duration
  useEffect(() => {
    const interval = setInterval(() => {
      setCallDuration(
        Math.floor((Date.now() - callStartTimeRef.current) / 1000),
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle sending user message
  const handleSendMessage = useCallback(
    async (transcript: string) => {
      if (!transcript.trim()) return;

      // Use targetAgent if set, otherwise use selectedAgent as fallback
      const agentToTag = targetAgent || selectedAgentRef.current;
      if (!agentToTag) {
        toast.error("Please select an agent");
        return;
      }

      setConversationState("processing_user_input");

      try {
        if (!localRootEventRef.current) {
          // Create initial thread
          const newThread = await threadManagement.createThread(
            transcript,
            [agentToTag],
            [],
            true, // Auto-TTS enabled for voice mode
            agentToTag.pubkey, // Target agent
          );

          if (newThread) {
            localRootEventRef.current = newThread;  // Update ref immediately
            setLocalRootEvent(newThread);           // Update state for UI
          } else {
          }
        } else {
          // Send reply to existing thread with target agent
          await threadManagement.sendReply(
            transcript,
            [agentToTag],
            [],
            true,
            messages,
            agentToTag.pubkey, // Target agent
          );
        }

        setConversationState("idle");
      } catch {
        // Error sending message
        toast.error("Failed to send message");
        setConversationState("error");
        setTimeout(() => setConversationState("idle"), 2000);
      }
    },
    [localRootEvent, threadManagement, messages, targetAgent],
  );

  // Handle auto-send on silence (only for push-to-talk mode)
  const handleSilenceDetected = useCallback(() => {
    if (audioSettings.vadMode === "push-to-talk" && stt.transcript.trim() && stt.isListening) {
      // Auto-send after silence
      stt.stopListening().then((finalTranscript) => {
        if (finalTranscript?.trim()) {
          handleSendMessage(finalTranscript);
        }
      });
    }
  }, [stt, handleSendMessage, audioSettings.vadMode]);

  // Update the ref whenever the callback changes
  useEffect(() => {
    onSilenceDetectedRef.current = handleSilenceDetected;
  }, [handleSilenceDetected]);

  // Track if we've initialized to prevent double initialization
  const initializedRef = useRef(false);
  
  // Initialize VAD service when in auto mode
  useEffect(() => {
    if (audioSettings.vadMode === "auto" && audioSettings.voiceActivityDetection && selectedAgent) {
      // Clean up existing VAD if any
      if (vadServiceRef.current) {
        vadServiceRef.current.destroy();
        vadServiceRef.current = null;
      }
      
      // Create new VAD service with better tuned settings
      const vadService = new VADService({
        onSpeechStart: () => {
          // Don't start if muted (use ref for current value)
          if (isMutedRef.current) {
            return;
          }
          if (!isVadProcessingRef.current && conversationState !== "agent_speaking") {
            setIsVadActive(true);
            setConversationState("user_speaking");
            sttRef.current?.resetTranscript();
            sttRef.current?.startListening();
          }
        },
        onSpeechEnd: async () => {
          const currentStt = sttRef.current;

          if (currentStt?.isListening && !isVadProcessingRef.current) {
            isVadProcessingRef.current = true;
            setIsVadActive(false);

            // Stop listening and get transcript
            const finalTranscript = await currentStt.stopListening();

            if (finalTranscript?.trim()) {
              await handleSendMessage(finalTranscript);
            } else {
              setConversationState("idle");
            }

            isVadProcessingRef.current = false;
          } else {
          }
        },
        onError: (error) => {
          console.error("VAD Error:", error);
          toast.error("Voice detection error - falling back to push-to-talk");
          updateAudioSettings({ vadMode: "push-to-talk" });
        },
        // Better tuned VAD settings for natural speech with ElevenLabs
        positiveSpeechThreshold: 0.5,  // Lower threshold for detecting speech start
        negativeSpeechThreshold: 0.15, // Much lower threshold for detecting speech end
        redemptionFrames: 50,          // Wait ~1.6 seconds of silence before ending
        preSpeechPadFrames: 15,        // Capture more audio before speech starts
        minSpeechFrames: 10,           // Minimum frames (~320ms) for valid speech
      });
      
      vadServiceRef.current = vadService;
      
      // Initialize and start VAD
      vadService.initialize(audioSettings.inputDeviceId || undefined)
        .then(async () => {
          // Always start VAD immediately when switching agents if we've already initialized
          if (initializedRef.current) {
            try {
              await vadService.start();
            } catch (error) {
              console.error("Failed to start VAD after agent switch:", error);
            }
          }
        })
        .catch((error) => {
          console.error("Failed to initialize VAD:", error);
          toast.error("Voice detection unavailable - using push-to-talk");
          updateAudioSettings({ vadMode: "push-to-talk" });
        });
    }
    
    return () => {
      if (vadServiceRef.current) {
        vadServiceRef.current.destroy();
        vadServiceRef.current = null;
      }
    };
  }, [audioSettings.vadMode, audioSettings.voiceActivityDetection, audioSettings.vadSensitivity, audioSettings.inputDeviceId, selectedAgent]);

  // Initialize call based on VAD mode
  useEffect(() => {
    // Only run once when component mounts and we have a selected agent
    if (initializedRef.current || !selectedAgent) {
      return;
    }

    const initializeAudio = async () => {
      try {
        // Mark as initialized immediately to prevent double initialization
        initializedRef.current = true;

        // Request microphone permission first
        await navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((stream) => {
            // Immediately stop the stream - we just needed permission
            stream.getTracks().forEach((track) => track.stop());
          });

        if (audioSettings.vadMode === "auto" && vadServiceRef.current) {
          // In auto mode, start VAD and wait for speech
          setConversationState("idle");
          await vadServiceRef.current.start();
          toast.success("Voice detection active - just start speaking!");
        } else {
          // In push-to-talk or disabled mode, start recording immediately
          setConversationState("user_speaking");
          // Small delay to ensure everything is ready
          setTimeout(() => {
            if (!initializedRef.current) return; // Double-check we haven't been cleaned up
            stt.startListening();
          }, 500); // Increased delay to ensure everything is ready
        }
      } catch {
        toast.error("Microphone access required for voice calls");
        setConversationState("error");
        // Reset initialized flag on error so user can retry
        initializedRef.current = false;
      }
    };

    if (conversationState === "initializing") {
      initializeAudio();
    }
    // Remove stt from dependencies to prevent re-initialization
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedAgent,
    conversationState,
    audioSettings.vadMode,
  ]);

  // Comprehensive cleanup function
  const performCleanup = useCallback(() => {
    console.log("CallView: Performing comprehensive cleanup");
    
    // Reset initialization flag so it can work next time
    initializedRef.current = false;
    
    // Clean up VAD
    if (vadServiceRef.current) {
      console.log("CallView: Destroying VAD service");
      vadServiceRef.current.destroy();
      vadServiceRef.current = null;
    }
    
    // Clean up STT
    if (sttRef.current?.isListening) {
      console.log("CallView: Stopping STT");
      sttRef.current.stopListening();
    }
    
    // Stop any playing TTS
    console.log("CallView: Stopping TTS");
    stopTTS();
  }, [stopTTS]);

  // Cleanup on unmount
  useEffect(() => {
    // Store current values to avoid stale closures
    const currentStt = stt;
    const currentPerformCleanup = performCleanup;
    
    // Also handle window unload events for floating windows
    const handleWindowUnload = (e: BeforeUnloadEvent) => {
      console.log("CallView: Window unload detected, performing cleanup");
      currentPerformCleanup();
    };
    
    // Add beforeunload listener to catch window close events
    window.addEventListener('beforeunload', handleWindowUnload);
    
    // Cleanup function
    return () => {
      console.log("CallView: Component unmounting, performing cleanup");
      
      // Remove event listener
      window.removeEventListener('beforeunload', handleWindowUnload);
      
      // Perform all cleanup
      currentPerformCleanup();
      
      // Additional cleanup for current STT instance
      if (currentStt.isListening) {
        currentStt.stopListening();
      }
    };
  }, [stt, performCleanup]); // Include dependencies

  // Add visibility change handler to pause/resume when window is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && stt.isListening) {
        console.log("CallView: Window hidden, pausing recording");
        // When window is hidden, pause recording
        stt.stopListening();
        stt.resetTranscript();
        setConversationState("idle");
        
        // Pause VAD if active
        if (vadServiceRef.current) {
          vadServiceRef.current.pause();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [stt]);

  // Handle microphone toggle
  const handleMicrophoneToggle = useCallback(() => {
    if (audioSettings.vadMode === "auto") {
      // In auto mode, toggle mute/unmute
      if (isMuted) {
        // Unmute - resume VAD
        setIsMuted(false);
        isMutedRef.current = false;
        vadServiceRef.current?.resume();
        toast.info("Voice detection resumed - start speaking");
      } else {
        // Mute - pause VAD and stop any active recording
        setIsMuted(true);
        isMutedRef.current = true;
        if (stt.isListening) {
          stt.stopListening();
          stt.resetTranscript();
        }
        vadServiceRef.current?.pause();
        setIsVadActive(false);
        setConversationState("idle");
        toast.info("Voice detection paused - tap mic to resume");
      }
    } else {
      // Push-to-talk or disabled mode
      if (conversationState === "user_speaking") {
        // STOP capturing
        stt.stopListening();
        stt.resetTranscript();
        setConversationState("idle");
      } else {
        // START capturing
        stt.startListening();
        setConversationState("user_speaking");
      }
    }
  }, [
    conversationState,
    stt,
    audioSettings.vadMode,
    isVadActive,
  ]);

  // Handle manual send button
  const handleManualSend = useCallback(async () => {
    if (stt.isRealtime && stt.transcript.trim()) {
      // Real-time STT (Chrome) - use current transcript
      stt.stopListening();
      handleSendMessage(stt.transcript);
      stt.resetTranscript();
    } else if (stt.isListening) {
      // Non-realtime STT (ElevenLabs/Whisper) - stop and get final transcript
      setConversationState("processing_user_input");
      const finalTranscript = await stt.stopListening();
      if (finalTranscript?.trim()) {
        handleSendMessage(finalTranscript);
      } else {
        toast.error("No speech detected");
        setConversationState("idle");
      }
    }
  }, [
    stt,
    handleSendMessage,
  ]);

  // Auto-play new agent messages with TTS
  useEffect(() => {
    if (!hasTTS || !user || isPlaying) {
      return;
    }

    // Calculate the call start time in seconds (Nostr event timestamps are in seconds)
    const callStartTimeInSeconds = Math.floor(callStartTimeRef.current / 1000);

    // Find unplayed agent messages, excluding typing indicators and reasoning events
    // IMPORTANT: Only consider messages created AFTER the call started
    const agentMessages = messages.filter(
      (msg) =>
        msg.event.pubkey !== user.pubkey &&
        !playedMessageIds.has(msg.id) &&
        !isAudioEvent(msg.event) &&
        // Only messages created after the call started
        (msg.event.created_at || 0) > callStartTimeInSeconds &&
        // Exclude typing indicators
        msg.event.kind !== EVENT_KINDS.TYPING_INDICATOR &&
        msg.event.kind !== EVENT_KINDS.TYPING_INDICATOR_STOP &&
        msg.event.kind !== EVENT_KINDS.STREAMING_RESPONSE &&
        // Exclude reasoning events (they have the "reasoning" tag)
        !msg.event.hasTag("reasoning") &&
        // Exclude tool events (they have the "tool" tag)
        !msg.event.hasTag("tool"),
    );

    if (agentMessages.length > 0) {
      const latestAgentMessage = agentMessages[agentMessages.length - 1];
      const ttsContent = extractTTSContent(latestAgentMessage.event.content);

      if (ttsContent) {
        // Auto-target the agent that just spoke
        const speakingAgentInstance = agentsRaw.find(
          (a) => a.pubkey === latestAgentMessage.event.pubkey,
        );
        if (speakingAgentInstance) {
          setTargetAgent(speakingAgentInstance);
        }

        setCurrentAgentMessage(latestAgentMessage);
        setConversationState("agent_speaking");
        setSpeakingAgent(latestAgentMessage.event.pubkey);

        playTTS(ttsContent)
          .then(() => {
            setPlayedMessageIds((prev) =>
              new Set(prev).add(latestAgentMessage.id),
            );
            setCurrentAgentMessage(null);
            setSpeakingAgent(null);
            // Save this message as the last played for repeat functionality
            setLastPlayedMessage(latestAgentMessage);

            // Auto-resume based on VAD mode
            if (audioSettings.vadMode === "auto" && vadServiceRef.current) {
              // In auto mode, resume VAD
              setConversationState("idle");
              vadServiceRef.current.resume();
            } else if (audioSettings.vadMode === "push-to-talk") {
              // In push-to-talk mode, auto-resume listening
              setConversationState("user_speaking");
              stt.resetTranscript();
              stt.startListening();
            } else {
              // In disabled mode, stay idle
              setConversationState("idle");
            }
          })
          .catch(() => {
            toast.error("Voice playback failed - check TTS configuration");
            setCurrentAgentMessage(null);
            setConversationState("idle");
            setSpeakingAgent(null);
          });
      }
    }
  }, [
    messages.length,
    hasTTS,
    user?.pubkey,
    playedMessageIds.size,
    isPlaying,
    agentsRaw,
    playTTS,
    stt,
    messages,
    playedMessageIds,
    user,
  ]);

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => {
      stopTTS();
    };
  }, [stopTTS]);

  // Format duration display
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Helper to get display names for audio providers
  const getSTTProviderName = () => {
    if (!stt.isSupported) return "Disabled";
    switch (stt.provider) {
      case "whisper": return "Whisper";
      case "elevenlabs": return "ElevenLabs";
      case "chrome": return "Chrome";
      case "built-in-chrome": return "Chrome";
      default: return "Unknown";
    }
  };

  const getTTSProviderName = () => {
    if (!voiceSettings.enabled) return "Disabled";
    switch (voiceSettings.provider) {
      case "openai": return "OpenAI";
      case "elevenlabs": return "ElevenLabs";
      default: return "Unknown";
    }
  };

  const getMicrophoneName = () => {
    if (!audioSettings.inputDeviceId || audioSettings.inputDeviceId === "default") {
      return "Default Mic";
    }
    const device = inputDevices.find(d => d.deviceId === audioSettings.inputDeviceId);
    return device?.label || "Unknown Mic";
  };

  const getSpeakerName = () => {
    if (!audioSettings.outputDeviceId || audioSettings.outputDeviceId === "default") {
      return "Default Speaker";
    }
    const device = outputDevices.find(d => d.deviceId === audioSettings.outputDeviceId);
    return device?.label || "Unknown Speaker";
  };

  // Get display text based on state
  const getDisplayText = () => {
    switch (conversationState) {
      case "user_speaking":
        if (stt.isRealtime) {
          // For real-time (Chrome), show transcript or "Listening..."
          return stt.transcript || (stt.isListening ? "Listening..." : "");
        } else {
          // For non-realtime (ElevenLabs/Whisper), only show message when actually recording
          return stt.isListening ? "Recording... Tap Send when done" : "";
        }
      case "processing_user_input":
        return "Processing...";
      case "agent_speaking":
        return currentAgentMessage
          ? extractTTSContent(currentAgentMessage.event.content)
          : "";
      case "idle":
        if (audioSettings.vadMode === "auto" && vadServiceRef.current?.isActive) {
          return "Listening for speech...";
        }
        return "";
      default:
        return "";
    }
  };

  // Get the last few messages for history display
  const recentMessages = useMemo(() => {
    return messages.slice(-3).map((msg) => ({
      id: msg.id,
      isUser: msg.event.pubkey === user?.pubkey,
      author:
        msg.event.pubkey === user?.pubkey
          ? "You"
          : agents.find((a) => a.pubkey === msg.event.pubkey)?.slug || "Agent",
      content: extractTTSContent(msg.event.content),
    }));
  }, [messages, user, agents]);

  // Get provider names for status bar
  const sttProviderName = getSTTProviderName();
  const ttsProviderName = getTTSProviderName();
  const sameVoiceProvider = sttProviderName === ttsProviderName;

  return (
    <div className={cn(
      "bg-black overflow-hidden",
      isEmbedded ? "h-full" : "fixed inset-0 z-50"
    )}>
      <div className="relative flex flex-col h-full text-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pt-safe-top flex-shrink-0">
          <div className="w-20" />
          <div className="flex items-center gap-2">
            <ProjectAvatar
              project={project}
              className="h-6 w-6"
              fallbackClassName="text-xs"
            />
            <span className="text-sm font-medium">
              {project.title || "Project"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm tabular-nums">
              {formatDuration(callDuration)}
            </div>
            <CallSettings />
          </div>
        </div>

        {/* Audio Status Bar */}
        <div className="px-4 py-2 bg-black/40 backdrop-blur-md border-t border-white/10 flex-shrink-0">
          <div className="flex items-center justify-center gap-4 text-xs">
            {/* Microphone Status with Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors cursor-pointer hover:bg-white/25",
                  conversationState === "user_speaking" || stt.isListening
                    ? "bg-white/20 text-white"
                    : "bg-white/5 text-white/60",
                  isChangingDevice && "animate-pulse"
                )}>
                  <Mic className={cn(
                    "h-3.5 w-3.5",
                    conversationState === "user_speaking" || stt.isListening ? "text-green-400" : "",
                    isChangingDevice && "animate-spin"
                  )} />
                  <span className="font-medium">
                    {isChangingDevice ? "Changing..." : getMicrophoneName()}
                  </span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-64">
                <DropdownMenuLabel>Select Microphone</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    setIsChangingDevice(true);
                    updateAudioSettings({ inputDeviceId: null });
                    // Restart VAD if in auto mode with new device
                    if (audioSettings.vadMode === "auto" && vadServiceRef.current) {
                      await vadServiceRef.current.destroy();
                      vadServiceRef.current = null;
                      // VAD will be reinitialized by the effect
                    }
                    toast.success("Switched to system default microphone");
                    setIsChangingDevice(false);
                  }}
                  className={cn(
                    "cursor-pointer",
                    (!audioSettings.inputDeviceId || audioSettings.inputDeviceId === "default") && "bg-accent"
                  )}
                >
                  <Mic className="h-3.5 w-3.5 mr-2" />
                  System Default
                </DropdownMenuItem>
                {inputDevices.map((device) => (
                  <DropdownMenuItem
                    key={device.deviceId}
                    onClick={async () => {
                      setIsChangingDevice(true);
                      updateAudioSettings({ inputDeviceId: device.deviceId });
                      // Restart VAD if in auto mode with new device
                      if (audioSettings.vadMode === "auto" && vadServiceRef.current) {
                        await vadServiceRef.current.destroy();
                        vadServiceRef.current = null;
                        // VAD will be reinitialized by the effect
                      }
                      toast.success(`Switched to ${device.label}`);
                      setIsChangingDevice(false);
                    }}
                    className={cn(
                      "cursor-pointer",
                      audioSettings.inputDeviceId === device.deviceId && "bg-accent"
                    )}
                  >
                    <Mic className="h-3.5 w-3.5 mr-2" />
                    {device.label}
                  </DropdownMenuItem>
                ))}
                {inputDevices.length === 0 && (
                  <DropdownMenuItem disabled className="text-muted-foreground">
                    No microphones detected
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => refreshDevices()}
                  className="cursor-pointer"
                >
                  <Activity className="h-3.5 w-3.5 mr-2" />
                  Refresh Devices
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Speaker/Output Status with Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors cursor-pointer hover:bg-white/25",
                  isPlaying || conversationState === "agent_speaking"
                    ? "bg-white/20 text-white"
                    : "bg-white/5 text-white/60"
                )}>
                  <Volume2 className={cn(
                    "h-3.5 w-3.5",
                    isPlaying || conversationState === "agent_speaking" ? "text-blue-400" : ""
                  )} />
                  <span className="font-medium">
                    {getSpeakerName()}
                  </span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-64">
                <DropdownMenuLabel>Select Speaker</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    updateAudioSettings({ outputDeviceId: null });
                    toast.success("Switched to system default speaker");
                  }}
                  className={cn(
                    "cursor-pointer",
                    (!audioSettings.outputDeviceId || audioSettings.outputDeviceId === "default") && "bg-accent"
                  )}
                >
                  <Volume2 className="h-3.5 w-3.5 mr-2" />
                  System Default
                </DropdownMenuItem>
                {outputDevices.map((device) => (
                  <DropdownMenuItem
                    key={device.deviceId}
                    onClick={() => {
                      updateAudioSettings({ outputDeviceId: device.deviceId });
                      toast.success(`Switched to ${device.label}`);
                    }}
                    className={cn(
                      "cursor-pointer",
                      audioSettings.outputDeviceId === device.deviceId && "bg-accent"
                    )}
                  >
                    <Volume2 className="h-3.5 w-3.5 mr-2" />
                    {device.label}
                  </DropdownMenuItem>
                ))}
                {outputDevices.length === 0 && (
                  <DropdownMenuItem disabled className="text-muted-foreground">
                    No speakers detected
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => refreshDevices()}
                  className="cursor-pointer"
                >
                  <Activity className="h-3.5 w-3.5 mr-2" />
                  Refresh Devices
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Voice Provider(s) - consolidate if STT and TTS are the same */}
            {sameVoiceProvider ? (
              // Combined voice provider display
              <div className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors",
                (stt.isProcessing || isPlaying || conversationState === "agent_speaking")
                  ? "bg-white/20 text-white"
                  : "bg-white/5 text-white/60"
              )}>
                <AudioLines className={cn(
                  "h-3.5 w-3.5",
                  stt.isProcessing ? "text-yellow-400" :
                  (isPlaying || conversationState === "agent_speaking") ? "text-blue-400" : ""
                )} />
                <span>
                  <span className="font-medium">Voice:</span> {sttProviderName}
                </span>
                {(stt.isSupported || voiceSettings.enabled) && (
                  <span className={cn(
                    "inline-block w-1.5 h-1.5 rounded-full",
                    stt.isProcessing
                      ? "bg-yellow-400 animate-pulse"
                      : (isPlaying || conversationState === "agent_speaking")
                      ? "bg-blue-400 animate-pulse"
                      : "bg-green-400"
                  )} />
                )}
              </div>
            ) : (
              // Separate STT and TTS displays
              <>
                {/* STT Provider */}
                <div className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors",
                  stt.isProcessing
                    ? "bg-white/20 text-white"
                    : "bg-white/5 text-white/60"
                )}>
                  <AudioLines className={cn(
                    "h-3.5 w-3.5",
                    stt.isProcessing ? "text-yellow-400" : ""
                  )} />
                  <span>
                    <span className="font-medium">STT:</span> {sttProviderName}
                  </span>
                  {stt.isSupported && (
                    <span className={cn(
                      "inline-block w-1.5 h-1.5 rounded-full",
                      stt.isProcessing
                        ? "bg-yellow-400 animate-pulse"
                        : stt.isRealtime
                          ? "bg-green-400"
                          : "bg-blue-400"
                    )} />
                  )}
                </div>

                {/* TTS Provider */}
                <div className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors",
                  isPlaying || conversationState === "agent_speaking"
                    ? "bg-white/20 text-white"
                    : "bg-white/5 text-white/60"
                )}>
                  <Volume2 className={cn(
                    "h-3.5 w-3.5",
                    isPlaying || conversationState === "agent_speaking" ? "text-blue-400" : ""
                  )} />
                  <span>
                    <span className="font-medium">TTS:</span> {ttsProviderName}
                  </span>
                  {voiceSettings.enabled && (
                    <span className={cn(
                      "inline-block w-1.5 h-1.5 rounded-full",
                      isPlaying || conversationState === "agent_speaking"
                        ? "bg-blue-400 animate-pulse"
                        : "bg-green-400"
                    )} />
                  )}
                </div>
              </>
            )}
            
            {/* VAD Mode Indicator */}
            {audioSettings.vadMode !== "disabled" && (
              <div className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors",
                audioSettings.vadMode === "auto" && vadServiceRef.current?.isActive
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-white/5 text-white/60"
              )}>
                <Activity className="h-3.5 w-3.5" />
                <span className="font-medium">
                  {audioSettings.vadMode === "auto" ? "Auto-detect" : "Push-to-talk"}
                </span>
                {audioSettings.vadMode === "auto" && vadServiceRef.current?.isActive && (
                  <motion.span 
                    className="inline-block w-1.5 h-1.5 rounded-full bg-green-400"
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto min-h-0">
          {/* Participating Agents Display */}
          <div className="relative w-full max-w-2xl flex items-center justify-center">
            <div className="flex items-center justify-center gap-8">
              {agents.length > 0 && (
                <AnimatePresence mode="popLayout">
                  {agents
                    .filter((agent) => participatingAgents.has(agent.pubkey))
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
                          isReasoning={reasoningAgents.has(agent.pubkey)}
                          onClick={() => setTargetAgent(agent)}
                          size={
                            participatingAgents.size <= 2
                              ? "lg"
                              : participatingAgents.size <= 4
                                ? "md"
                                : "sm"
                          }
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
                    isReasoning={reasoningAgents.has(selectedAgent.pubkey)}
                    onClick={() => setTargetAgent(selectedAgent)}
                    size="lg"
                  />
                </motion.div>
              )}
            </div>
          </div>

          {/* Conversation title */}
          <h1 className="mt-6 text-xl font-semibold text-white/80">
            {participatingAgents.size > 1
              ? "Group Conversation"
              : participatingAgents.size === 1
                ? `Talking with ${agents.find((a) => participatingAgents.has(a.pubkey))?.slug || "Agent"}`
                : "Ready to Start"}
          </h1>

          {/* Current conversation display */}
          <div className="mt-8 min-h-[100px] max-w-md w-full">
            {(() => {
              const displayText = getDisplayText();
              const shouldShowBox = displayText || conversationState === "processing_user_input";

              if (!shouldShowBox) return null;

              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
                >
                  <p className="text-sm text-white/90 leading-relaxed">
                    {displayText}
                  </p>
                  {conversationState === "user_speaking" && stt.isListening && (
                    <p className="text-xs text-white/50 mt-2">
                      {audioSettings.vadMode === "auto"
                        ? "Stop speaking to send automatically"
                        : audioSettings.vadMode === "push-to-talk" && stt.isRealtime
                        ? "Pause for 2 seconds to auto-send, or tap Send"
                        : "Tap Send to stop recording and send"}
                    </p>
                  )}
                </motion.div>
              );
            })()}

            {/* Message history when idle */}
            {conversationState === "idle" && recentMessages.length > 0 && (
              <div className="space-y-2">
                {recentMessages.map((msg) => (
                  <div key={msg.id} className="text-white/60 text-sm">
                    <span className="font-semibold">{msg.author}: </span>
                    <span>
                      {msg.content.length > 100
                        ? msg.content.slice(0, 100) + "..."
                        : msg.content}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Agent selector - only show agents not in conversation */}
        <div className="px-4 pb-2 flex-shrink-0">
          {(() => {
            const availableAgents = agents.filter(
              (agent) => !participatingAgents.has(agent.pubkey),
            );

            if (availableAgents.length === 0) {
              return (
                <div className="flex items-center justify-center gap-2 text-white/60 py-2">
                  <span className="text-sm">
                    All agents are in the conversation
                  </span>
                </div>
              );
            }

            return (
              <ScrollArea className="w-full max-h-24">
                <div className="flex gap-2 px-2 pb-1">
                  {availableAgents.map((agent) => (
                    <AgentSelector
                      key={agent.pubkey}
                      agent={agent}
                      onClick={() => {
                        setSelectedAgent(agent);
                        selectedAgentRef.current = agent;
                        setTargetAgent(agent);
                        setParticipatingAgents((prev) =>
                          new Set(prev).add(agent.pubkey),
                        );
                      }}
                    />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="bg-white/10" />
              </ScrollArea>
            );
          })()}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-4 px-6 pt-6 pb-10 flex-shrink-0">
          {/* End call button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              // Use the comprehensive cleanup function
              performCleanup();
              onClose(localRootEvent);
            }}
            className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
          >
            <PhoneOff className="h-7 w-7 text-white" />
          </motion.button>

          {/* Mic toggle button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleMicrophoneToggle}
            disabled={conversationState === "processing_user_input"}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-colors relative",
              isMuted
                ? "bg-red-500 text-white hover:bg-red-600"
                : conversationState === "user_speaking" || isVadActive
                ? "bg-white text-black hover:bg-gray-100"
                : "bg-gray-700 text-white hover:bg-gray-600",
              conversationState === "processing_user_input" &&
                "opacity-50 cursor-not-allowed",
            )}
          >
            {isMuted ? (
              <MicOff className="h-7 w-7" />
            ) : conversationState === "user_speaking" || isVadActive ? (
              <Mic className="h-7 w-7" />
            ) : (
              <MicOff className="h-7 w-7" />
            )}
            {/* VAD indicator */}
            {audioSettings.vadMode === "auto" && vadServiceRef.current?.isActive && !isVadActive && (
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </motion.button>

          {/* Send button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleManualSend}
            disabled={
              stt.isProcessing ||
              (conversationState !== "user_speaking" && !stt.transcript)
            }
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-colors",
              conversationState === "user_speaking" && !stt.isProcessing
                ? "bg-green-500 hover:bg-green-600 text-white"
                : stt.isProcessing
                ? "bg-yellow-500 hover:bg-yellow-600 text-white animate-pulse"
                : "bg-gray-700 text-gray-400 cursor-not-allowed",
            )}
          >
            <Send className="h-7 w-7" />
          </motion.button>

          {/* Repeat button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleRepeat}
            disabled={!lastPlayedMessage || isRepeating || isPlaying || conversationState === "agent_speaking"}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-colors relative",
              lastPlayedMessage && !isRepeating && !isPlaying && conversationState !== "agent_speaking"
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "bg-gray-700 text-gray-400 cursor-not-allowed",
              isRepeating && "animate-pulse"
            )}
            title={lastPlayedMessage ? "Repeat last message" : "No message to repeat"}
          >
            <RotateCcw className="h-7 w-7" />
            {isRepeating && (
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-white/50"
                animate={{
                  scale: [1, 1.2],
                  opacity: [0.5, 0],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                }}
              />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
