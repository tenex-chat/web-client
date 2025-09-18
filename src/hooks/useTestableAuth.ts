import { useNDKCurrentUser } from "@nostr-dev-kit/ndk-hooks";
import { useMemo } from "react";
import { getTestAuth, injectTestAuth } from "@/lib/testing/test-auth";

/**
 * A wrapper around useNDKCurrentUser that supports test authentication
 * This allows automated tests to bypass real authentication
 */
export function useTestableAuth() {
  const realUser = useNDKCurrentUser();
  
  const user = useMemo(() => {
    // In test mode, check for test auth
    const testUser = getTestAuth();
    if (testUser) {
      console.log('[Test Auth] Using test user:', testUser.pubkey);
      return testUser;
    }
    
    // Otherwise use real authentication
    return realUser;
  }, [realUser]);
  
  return user;
}

/**
 * Initialize test auth if in test environment
 * This should be called early in the app lifecycle
 */
export function initTestAuth() {
  // Auto-inject test auth if we detect a test environment
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('test-auth')) {
      const testUser = injectTestAuth();
      if (testUser) {
        console.log('[Test Auth] Injected test user:', testUser.pubkey);
      }
    }
  }
}