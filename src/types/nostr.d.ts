// NIP-07 Browser Extension Interface
declare global {
  interface Window {
    nostr?: {
      // Get the public key of the user
      getPublicKey(): Promise<string>;

      // Sign an event with the user's private key
      signEvent(event: {
        created_at: number;
        kind: number;
        tags: string[][];
        content: string;
        pubkey?: string;
      }): Promise<{
        id: string;
        pubkey: string;
        created_at: number;
        kind: number;
        tags: string[][];
        content: string;
        sig: string;
      }>;

      // Get relay configuration
      getRelays?(): Promise<Record<string, { read: boolean; write: boolean }>>;

      // NIP-04 encryption/decryption (optional)
      nip04?: {
        encrypt(pubkey: string, plaintext: string): Promise<string>;
        decrypt(pubkey: string, ciphertext: string): Promise<string>;
      };

      // NIP-44 encryption/decryption (optional, newer standard)
      nip44?: {
        encrypt(pubkey: string, plaintext: string): Promise<string>;
        decrypt(pubkey: string, ciphertext: string): Promise<string>;
      };
    };
  }
}

export {};
