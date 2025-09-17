// Debug helper to track navigation events
let navigationStack: { from: string; to: string; timestamp: number; source?: string }[] = [];

export function trackNavigation(from: string, to: string, source?: string) {
  const entry = {
    from,
    to,
    timestamp: Date.now(),
    source: source || 'unknown'
  };
  
  navigationStack.push(entry);
  console.log('[Navigation Debug]', entry);
  
  // Keep only last 20 entries
  if (navigationStack.length > 20) {
    navigationStack = navigationStack.slice(-20);
  }
}

export function getNavigationHistory() {
  return navigationStack;
}

// Attach to window for debugging
if (typeof window !== 'undefined') {
  (window as any).__getNavigationHistory = getNavigationHistory;
  (window as any).__trackNavigation = trackNavigation;
}