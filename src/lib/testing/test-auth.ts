/**
 * Test authentication utilities for development and testing
 */

// Check if we're in a test environment
export const isTestEnvironment = () => {
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.PLAYWRIGHT_TEST === 'true' ||
    typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    ) && (
      // Check for test query params
      new URLSearchParams(window.location.search).has('test-mode') ||
      // Check for test user agent
      /playwright|puppeteer|headless/i.test(navigator.userAgent)
    )
  );
};

// Mock user for testing
export const TEST_USER = {
  pubkey: 'test-user-pubkey-' + Math.random().toString(36).substring(7),
  npub: 'npub1testuser' + Math.random().toString(36).substring(7),
  profile: {
    name: 'Test User',
    displayName: 'Test User',
    nip05: 'testuser@example.com',
  }
};

// Function to inject test authentication
export const injectTestAuth = () => {
  if (isTestEnvironment()) {
    // Store test auth in sessionStorage
    sessionStorage.setItem('test-auth', JSON.stringify({
      user: TEST_USER,
      timestamp: Date.now()
    }));
    return TEST_USER;
  }
  return null;
};

// Function to get test auth
export const getTestAuth = () => {
  if (!isTestEnvironment()) return null;
  
  const testAuth = sessionStorage.getItem('test-auth');
  if (testAuth) {
    try {
      const data = JSON.parse(testAuth);
      // Check if auth is not older than 1 hour
      if (Date.now() - data.timestamp < 3600000) {
        return data.user;
      }
    } catch (e) {
      console.error('Failed to parse test auth:', e);
    }
  }
  return null;
};