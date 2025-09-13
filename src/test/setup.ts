import "@testing-library/jest-dom";
import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Mock window.nostr for tests
interface NostrExtension {
  getPublicKey: () => Promise<string>;
  signEvent: (event: unknown) => Promise<unknown>;
  getRelays: () => Promise<unknown>;
  nip04: {
    encrypt: (pubkey: string, text: string) => Promise<string>;
    decrypt: (pubkey: string, ciphertext: string) => Promise<string>;
  };
}

(window as unknown as { nostr: NostrExtension }).nostr = {
  getPublicKey: vi.fn(),
  signEvent: vi.fn(),
  getRelays: vi.fn(),
  nip04: {
    encrypt: vi.fn(),
    decrypt: vi.fn(),
  },
};

// Mock crypto for NDK
if (!global.crypto) {
  global.crypto = {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    randomUUID: () => {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },
    subtle: {} as SubtleCrypto,
  } as Crypto;
}
