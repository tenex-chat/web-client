import { useState, useEffect, useCallback } from 'react';
import NDK, { NDKEvent, NDKPrivateKeySigner, NDKFilter, NDKSubscription } from '@nostr-dev-kit/ndk';
import { nip19 } from 'nostr-tools';

const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.primal.net',
];

interface NostrMessage {
  id: string;
  content: string;
  pubkey: string;
  created_at: number;
  isFromUser: boolean;
}

export function useNostr(projectId: string | null) {
  const [ndk, setNdk] = useState<NDK | null>(null);
  const [signer, setSigner] = useState<NDKPrivateKeySigner | null>(null);
  const [userPubkey, setUserPubkey] = useState<string | null>(null);
  const [messages, setMessages] = useState<NostrMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize NDK instance
  useEffect(() => {
    const ndkInstance = new NDK({
      explicitRelayUrls: DEFAULT_RELAYS,
    });
    
    ndkInstance.connect().then(() => {
      setIsConnected(true);
      setNdk(ndkInstance);
    });

    return () => {
      ndkInstance.pool?.disconnect();
    };
  }, []);

  // Authenticate with nsec
  const authenticate = useCallback(async (nsec: string) => {
    if (!ndk) return false;

    try {
      // Decode nsec to get the private key
      const decoded = nip19.decode(nsec);
      if (decoded.type !== 'nsec') {
        throw new Error('Invalid nsec format');
      }

      const privateKey = decoded.data as string;
      const signerInstance = new NDKPrivateKeySigner(privateKey);
      
      // Get the user's public key
      const user = await signerInstance.user();
      const pubkey = user.pubkey;

      setSigner(signerInstance);
      setUserPubkey(pubkey);
      ndk.signer = signerInstance;

      // Store nsec in localStorage for session persistence
      localStorage.setItem('tenex-widget-nsec', nsec);

      return true;
    } catch (error) {
      console.error('Failed to authenticate:', error);
      return false;
    }
  }, [ndk]);

  // Load stored nsec from localStorage
  useEffect(() => {
    const storedNsec = localStorage.getItem('tenex-widget-nsec');
    if (storedNsec && ndk && !signer) {
      authenticate(storedNsec);
    }
  }, [ndk, signer, authenticate]);

  // Subscribe to messages
  useEffect(() => {
    if (!ndk || !userPubkey || !projectId || !isConnected) return;

    setIsLoading(true);
    let subscription: NDKSubscription | null = null;

    const subscribeToMessages = async () => {
      const filter: NDKFilter = {
        kinds: [1],
        '#p': [userPubkey],
        '#a': [projectId],
      };

      subscription = ndk.subscribe(filter, { closeOnEose: false });

      const messageMap = new Map<string, NostrMessage>();

      subscription.on('event', (event: NDKEvent) => {
        if (!event.id) return;

        const message: NostrMessage = {
          id: event.id,
          content: event.content,
          pubkey: event.pubkey,
          created_at: event.created_at || 0,
          isFromUser: event.pubkey === userPubkey,
        };

        messageMap.set(event.id, message);
        
        // Sort messages by timestamp
        const sortedMessages = Array.from(messageMap.values()).sort(
          (a, b) => a.created_at - b.created_at
        );
        
        setMessages(sortedMessages);
      });

      subscription.on('eose', () => {
        setIsLoading(false);
      });
    };

    subscribeToMessages();

    return () => {
      subscription?.stop();
    };
  }, [ndk, userPubkey, projectId, isConnected]);

  // Send a message
  const sendMessage = useCallback(async (content: string) => {
    if (!ndk || !signer || !userPubkey || !projectId) {
      throw new Error('Not authenticated or missing project ID');
    }

    const event = new NDKEvent(ndk);
    event.kind = 1;
    event.content = content;
    event.tags = [
      ['p', userPubkey],
      ['a', projectId],
    ];

    await event.sign(signer);
    await event.publish();

    // Optimistically add the message to the UI
    const newMessage: NostrMessage = {
      id: event.id || `temp-${Date.now()}`,
      content: event.content,
      pubkey: userPubkey,
      created_at: event.created_at || Math.floor(Date.now() / 1000),
      isFromUser: true,
    };

    setMessages((prev) => [...prev, newMessage]);
  }, [ndk, signer, userPubkey, projectId]);

  // Logout
  const logout = useCallback(() => {
    localStorage.removeItem('tenex-widget-nsec');
    setSigner(null);
    setUserPubkey(null);
    setMessages([]);
    if (ndk) {
      ndk.signer = undefined;
    }
  }, [ndk]);

  return {
    isConnected,
    isLoading,
    isAuthenticated: !!signer && !!userPubkey,
    messages,
    authenticate,
    sendMessage,
    logout,
  };
}