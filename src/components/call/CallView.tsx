import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNDKCurrentUser, useProfileValue } from "@nostr-dev-kit/ndk-hooks";
import type { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { useAudioSettings } from "@/stores/ai-config-store";
import { useVAD } from "@/hooks/useVAD";
import { useThreadManagement } from "@/components/chat/hooks/useThreadManagement";
import { useChatMessages } from "@/components/chat/hooks/useChatMessages";
import { useProjectOnlineAgents } from "@/hooks/useProjectOnlineAgents";
import { AgentSelector } from "@/components/chat/components/AgentSelector";
import { VoiceVisualizer } from "./VoiceVisualizer";
import { AudioControls } from "./components/AudioControls";
import { CallStatus } from "./components/CallStatus";
import { useTTSQueue } from "./hooks/useTTSQueue";
import { useCallAudioRecording } from "./hooks/useCallAudioRecording";
import { useCallMessaging } from "./hooks/useCallMessaging";
import type { CallState } from "./types";
import type { NDKProject } from "@/lib/ndk-events/NDKProject";
import type { AgentInstance } from "@/types/agent";

/**
 * Generate a deterministic color from project's d-tag
 * (Same logic as ProjectAvatar component)
 */
function getProjectColor(project: NDKProject): string {
  const dTag = project.tags?.find(tag => tag[0] === "d")?.[1] || project.id || project.title || "";
  if (!dTag) return "#94a3b8";
  
  let hash = 0;
  for (let i = 0; i < dTag.length; i++) {
    const char = dTag.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

interface CallViewProps {
  project: NDKProject;
  onClose: (rootEvent?: NDKEvent | null) => void;
  extraTags?: string[][];
  rootEvent?: NDKEvent | null;
  isEmbedded?: boolean;
}

export function CallView({
  project,
  onClose,
  extraTags,
  rootEvent: initialRootEvent,
  isEmbedded = false
}: CallViewProps) {
  const user = useNDKCurrentUser();
  const { audioSettings } = useAudioSettings();
  
  // Settings with defaults
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
  
  // State
  const [callState, setCallState] = useState<CallState>('initializing');
  const [selectedAgentPubkey, setSelectedAgentPubkey] = useState<string | null>(null);
  const [rootEvent, setRootEvent] = useState<NDKEvent | null>(initialRootEvent || null);
  const vadToastShownRef = useRef(false);
  
  // Hooks
  const agents = useProjectOnlineAgents(project.dTag);
  const activeAgent = selectedAgentPubkey
    ? agents.find(a => a.pubkey === selectedAgentPubkey) || agents[0]
    : agents[0];
  
  const threadManagement = useThreadManagement(
    project,
    rootEvent,
    extraTags,
    setRootEvent,
    agents
  );
  
  const messages = useChatMessages(threadManagement.localRootEvent || rootEvent || null);
  
  // Custom hooks for audio and messaging  
  const messaging = useCallMessaging({
    threadManagement,
    messages,
    activeAgent
  });
  
  const audioRecording = useCallAudioRecording({
    enabled: true,
    onTranscriptionComplete: async (text) => {
      await messaging.sendMessage(text);
      setCallState('idle');
    },
    onTranscriptionStart: () => {
      setCallState('processing');
    },
    onTranscriptionError: () => {
      setCallState('idle');
    }
  });
  
  const { clearQueue } = useTTSQueue({
    enabled: true,
    messages,
    userPubkey: user?.pubkey,
    onPlaybackStateChange: (isPlaying) => {
      setCallState(isPlaying ? 'playing' : 'idle');
      if (!isPlaying && settings.vadMode === 'auto' && vad.isActive) {
        vad.resume();
      }
    }
  });
  
  // Use refs to provide stable access to mutable state in VAD callbacks, avoiding dependency issues.
  // This pattern prevents the callbacks from being recreated on every render, which would cause
  // the VAD service to lose its connection to the speech detection handlers.
  const callStateRef = useRef(callState);
  const audioRecordingRef = useRef(audioRecording);
  
  // Keep refs synchronized with current state values
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);
  
  useEffect(() => {
    audioRecordingRef.current = audioRecording;
  }, [audioRecording]);
  
  // Create stable callbacks that won't change during the component lifecycle.
  // These callbacks use refs to access current state, preventing stale closures.
  const handleVADSpeechStart = useCallback(() => {
    if (callStateRef.current === 'idle') {
      setCallState('recording');
      audioRecordingRef.current.startRecording();
    }
  }, []);
  
  const handleVADSpeechEnd = useCallback(() => {
    if (callStateRef.current === 'recording') {
      audioRecordingRef.current.stopRecording();
    }
  }, []);
  
  const vad = useVAD({
    enabled: settings.vadMode === 'auto',
    onSpeechStart: handleVADSpeechStart,
    onSpeechEnd: handleVADSpeechEnd
  });
  
  // Sync rootEvent with threadManagement
  useEffect(() => {
    if (threadManagement.localRootEvent) {
      setRootEvent(threadManagement.localRootEvent);
    }
  }, [threadManagement.localRootEvent]);
  
  // Update call state based on recording state
  useEffect(() => {
    if (audioRecording.isRecording && callState !== 'processing') {
      setCallState('recording');
    }
  }, [audioRecording.isRecording, callState]);
  
  // Initialize call
  useEffect(() => {
    const initializeCall = async () => {
      try {
        // Request mic permission
        await navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => stream.getTracks().forEach(track => track.stop()));
        
        if (settings.vadMode === 'auto') {
          await vad.start();
          if (!vadToastShownRef.current) {
            toast.success("Voice detection active - just start speaking!");
            vadToastShownRef.current = true;
          }
        }
        
        setCallState('idle');
      } catch (error) {
        console.error("Failed to initialize:", error);
        toast.error("Microphone access required");
      }
    };
    
    if (callState === 'initializing') {
      initializeCall();
    }
  }, [callState, settings.vadMode, vad]);
  
  // Handle mic button
  const handleMicButton = useCallback(() => {
    if (settings.vadMode === 'auto') {
      if (vad.isActive) {
        vad.pause();
        toast.info("Voice detection paused");
      } else {
        vad.resume();
        toast.info("Voice detection resumed");
      }
    } else {
      if (audioRecording.isRecording) {
        audioRecording.stopRecording();
      } else if (callState === 'idle') {
        setCallState('recording');
        audioRecording.startRecording();
      }
    }
  }, [settings.vadMode, vad, audioRecording, callState]);
  
  // Handle send button
  const handleSendMessage = useCallback(async () => {
    const text = audioRecording.transcript;
    if (!text.trim() || messaging.isProcessing) return;
    
    await messaging.sendMessage(text);
    audioRecording.clearTranscript();
    setCallState('idle');
  }, [audioRecording, messaging]);
  
  // Handle end call
  const handleEndCall = useCallback(() => {
    clearQueue();
    onClose(threadManagement.localRootEvent || rootEvent);
  }, [clearQueue, onClose, threadManagement.localRootEvent, rootEvent]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      vad.stop();
      clearQueue();
      
      if (audioRecording.isRecording) {
        audioRecording.stopRecording().catch(err => {
          console.error("Error stopping audio recorder on unmount:", err);
        });
      }
    };
  }, [vad, clearQueue, audioRecording]);
  
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
            isActive={audioRecording.isRecording}
            audioLevel={audioRecording.audioLevel}
            color={getProjectColor(project)}
          />
        </div>
        
        {/* Status display */}
        <CallStatus 
          callState={callState}
          transcript={audioRecording.transcript}
        />
      </div>
      
      {/* Controls */}
      <AudioControls
        isRecording={audioRecording.isRecording}
        isProcessing={audioRecording.isProcessing || messaging.isProcessing}
        hasTranscript={!!audioRecording.transcript.trim()}
        audioLevel={audioRecording.audioLevel}
        onEndCall={handleEndCall}
        onMicToggle={handleMicButton}
        onSend={handleSendMessage}
      />
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