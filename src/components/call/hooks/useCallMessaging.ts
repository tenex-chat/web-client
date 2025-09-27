import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import type { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import type { AgentInstance } from "@/types/agent";

interface UseCallMessagingOptions {
  threadManagement: {
    localRootEvent: NDKEvent | null;
    createThread: (
      content: string,
      mentions: AgentInstance[],
      images: any[],
      autoTTS: boolean,
      selectedAgent: string | null
    ) => Promise<NDKEvent | null>;
    sendReply: (
      content: string,
      mentions: AgentInstance[],
      images: any[],
      autoTTS: boolean,
      messages: any[],
      selectedAgent: string | null
    ) => Promise<NDKEvent | null>;
  };
  messages: any[];
  activeAgent: AgentInstance | undefined;
}

interface UseCallMessagingReturn {
  rootEvent: NDKEvent | null;
  sendMessage: (text: string) => Promise<void>;
  isProcessing: boolean;
}

export function useCallMessaging({
  threadManagement,
  messages,
  activeAgent
}: UseCallMessagingOptions): UseCallMessagingReturn {
  const [rootEvent, setRootEvent] = useState<NDKEvent | null>(threadManagement.localRootEvent);
  const [isProcessing, setIsProcessing] = useState(false);
  const rootEventRef = useRef<NDKEvent | null>(threadManagement.localRootEvent);

  const createNewThread = async (message: string): Promise<NDKEvent | null> => {
    if (!activeAgent) return null;
    
    console.log('Creating new thread with message:', message);
    const newThread = await threadManagement.createThread(
      message,
      [activeAgent],
      [], // images
      true,
      activeAgent.pubkey
    );
    
    if (newThread) {
      console.log('New thread created:', newThread.id);
      rootEventRef.current = newThread;
      setRootEvent(newThread);
    }
    
    return newThread;
  };

  const sendReplyToThread = async (message: string): Promise<void> => {
    if (!activeAgent) return;
    
    console.log('Sending reply to thread:', rootEventRef.current?.id);
    await threadManagement.sendReply(
      message,
      [activeAgent],
      [], // images
      true,
      messages,
      activeAgent.pubkey
    );
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !activeAgent || isProcessing) {
      return;
    }

    setIsProcessing(true);

    try {
      if (!rootEventRef.current) {
        await createNewThread(text);
      } else {
        await sendReplyToThread(text);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsProcessing(false);
    }
  }, [activeAgent, isProcessing, threadManagement, messages]);

  return {
    rootEvent: rootEvent || threadManagement.localRootEvent,
    sendMessage,
    isProcessing
  };
}