import { useRef, useCallback, useEffect } from "react";
import { useTTSPlayer } from "@/hooks/useTTSPlayer";
import { extractTTSContent } from "@/lib/utils/extractTTSContent";
import type { NDKEvent } from "@nostr-dev-kit/ndk-hooks";

interface TTSMessage {
  content: string;
  id: string;
  pubkey: string;
}

interface ChatMessage {
  id: string;
  event: NDKEvent;
}

interface UseTTSQueueOptions {
  enabled: boolean;
  messages: ChatMessage[];
  userPubkey?: string;
  onPlaybackStateChange?: (isPlaying: boolean) => void;
}

export function useTTSQueue({
  enabled,
  messages,
  userPubkey,
  onPlaybackStateChange
}: UseTTSQueueOptions) {
  const ttsPlayer = useTTSPlayer();
  const playedMessageIdsRef = useRef(new Set<string>());
  const isInitialLoad = useRef(true);
  const queueRef = useRef<TTSMessage[]>([]);
  const isProcessingRef = useRef(false);

  const processNextInQueue = useCallback(async () => {
    if (isProcessingRef.current || queueRef.current.length === 0 || ttsPlayer.isPlaying) {
      return;
    }

    isProcessingRef.current = true;
    const nextMessage = queueRef.current.shift();
    
    if (!nextMessage) {
      isProcessingRef.current = false;
      return;
    }

    try {
      onPlaybackStateChange?.(true);
      
      await ttsPlayer.play(nextMessage.content, nextMessage.id, nextMessage.pubkey);
      
      onPlaybackStateChange?.(false);
      isProcessingRef.current = false;
      
      setTimeout(() => processNextInQueue(), 100);
    } catch (error) {
      console.error("TTS playback failed:", error);
      onPlaybackStateChange?.(false);
      isProcessingRef.current = false;
      
      setTimeout(() => processNextInQueue(), 100);
    }
  }, [ttsPlayer, onPlaybackStateChange]);

  const addToQueue = useCallback((message: TTSMessage) => {
    console.log(`[${performance.now().toFixed(2)}ms] [useTTSQueue] addToQueue called for:`, message.id);
    if (!playedMessageIdsRef.current.has(message.id)) {
      console.log(`[${performance.now().toFixed(2)}ms] [useTTSQueue] Adding message to queue and marking as played:`, message.id);
      playedMessageIdsRef.current.add(message.id);
      queueRef.current.push(message);
      processNextInQueue();
    } else {
      console.log(`[${performance.now().toFixed(2)}ms] [useTTSQueue] Message already played, skipping:`, message.id);
    }
  }, [processNextInQueue]);

  const clearQueue = useCallback(() => {
    queueRef.current = [];
    isProcessingRef.current = false;
    ttsPlayer.stop();
  }, [ttsPlayer]);

  // Auto-play agent messages
  useEffect(() => {
    console.log(`[${performance.now().toFixed(2)}ms] [useTTSQueue] Effect running, messages:`, messages.length, 'isInitialLoad:', isInitialLoad.current);

    if (isInitialLoad.current && messages.length > 0) {
      console.log(`[${performance.now().toFixed(2)}ms] [useTTSQueue] Initial load - marking`, messages.length, 'messages as played');
      messages.forEach(msg => playedMessageIdsRef.current.add(msg.id));
      isInitialLoad.current = false;
      return;
    }

    if (!enabled || !ttsPlayer.hasTTS || !userPubkey) {
      console.log(`[${performance.now().toFixed(2)}ms] [useTTSQueue] Skipping - enabled:`, enabled, 'hasTTS:', ttsPlayer.hasTTS, 'userPubkey:', !!userPubkey);
      return;
    }
    
    const messagesToPlay = messages
      .filter(msg => {
        const isAgentMessage = msg.event.pubkey !== userPubkey;
        const isNotPlayed = !playedMessageIdsRef.current.has(msg.id);
        const isNotReasoning = !msg.event.hasTag?.("reasoning");
        const isCorrectKind = msg.event.kind === 1111;

        if (!isAgentMessage) console.log(`[${performance.now().toFixed(2)}ms] [useTTSQueue] Skipping user message:`, msg.id);
        if (!isNotPlayed) console.log(`[${performance.now().toFixed(2)}ms] [useTTSQueue] Already played:`, msg.id);
        if (!isNotReasoning) console.log(`[${performance.now().toFixed(2)}ms] [useTTSQueue] Reasoning message:`, msg.id);
        if (!isCorrectKind) console.log(`[${performance.now().toFixed(2)}ms] [useTTSQueue] Wrong kind:`, msg.event.kind, 'for', msg.id);

        return isAgentMessage && isNotPlayed && isNotReasoning && isCorrectKind;
      })
      .map(msg => ({
        content: extractTTSContent(msg.event.content),
        id: msg.id,
        pubkey: msg.event.pubkey,
      }))
      .filter(msg => msg.content);

    console.log(`[${performance.now().toFixed(2)}ms] [useTTSQueue] Messages to play:`, messagesToPlay.length);
    messagesToPlay.forEach(msg => {
      console.log(`[${performance.now().toFixed(2)}ms] [useTTSQueue] Adding to queue:`, msg.id, 'content preview:', msg.content.substring(0, 50));
      addToQueue(msg);
    });
  }, [messages, userPubkey, enabled, ttsPlayer.hasTTS]); // Removed addToQueue to prevent infinite loop

  // Monitor TTS player state
  useEffect(() => {
    if (!ttsPlayer.isPlaying && !isProcessingRef.current && queueRef.current.length > 0) {
      processNextInQueue();
    }
  }, [ttsPlayer.isPlaying, processNextInQueue]);

  return {
    clearQueue,
    isPlaying: ttsPlayer.isPlaying,
    hasTTS: ttsPlayer.hasTTS,
  };
}