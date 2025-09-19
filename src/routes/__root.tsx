import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Provider as JotaiProvider } from "jotai";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "sonner";
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
import {
  NDKHeadless,
  NDKSessionLocalStorage,
  registerEventClass,
} from "@nostr-dev-kit/ndk-hooks";
import NDKCacheDexie from "@nostr-dev-kit/ndk-cache-dexie";
import { useRef, useEffect } from "react";
import { DEFAULT_RELAYS } from "@/lib/constants";
import type { NDKCacheAdapter } from "@nostr-dev-kit/ndk-hooks";
import { registerServiceWorker } from "@/lib/pwa/registerSW";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import { NDKAgentDefinition } from "@/lib/ndk-events/NDKAgentDefinition";
import { NDKTask } from "@/lib/ndk-events/NDKTask";
import { NDKMCPTool } from "@/lib/ndk-events/NDKMCPTool";
import { NDKAgentLesson } from "@/lib/ndk-events/NDKAgentLesson";
import { GlobalTTSPlayer } from "@/components/tts/GlobalTTSPlayer";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QuoteModal } from "@/components/chat/QuoteModal";
import ConversationMetadataSubscriber from "@/components/nostr/ConversationMetadataSubscriber";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const sessionStorage = useRef(new NDKSessionLocalStorage());

  // Initialize cache synchronously instead of in useEffect
  const cache = useRef<NDKCacheAdapter>(
    new NDKCacheDexie({
      dbName: "tenex-cache",
    }),
  );

  // Register custom event classes
  useEffect(() => {
    registerEventClass(NDKProject);
    registerEventClass(NDKAgentDefinition);
    registerEventClass(NDKAgentLesson);
    registerEventClass(NDKTask);
    registerEventClass(NDKMCPTool);
  }, []);

  // Register service worker for PWA functionality
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <>
      <NDKHeadless
        ndk={{
          explicitRelayUrls: DEFAULT_RELAYS,
          cacheAdapter: cache.current,
          enableOutboxModel: true,
          autoConnectUserRelays: false,
        }}
        session={{
          storage: sessionStorage.current,
          opts: { follows: true, profile: true },
        }}
      />
      <JotaiProvider>
        <ThemeProvider>
          <TooltipProvider>
            <ErrorBoundary>
              <div className="min-h-screen bg-background">
                <Outlet />
                <GlobalTTSPlayer />
                <QuoteModal />
                <ConversationMetadataSubscriber />
                <Toaster
                  richColors
                  position="top-center"
                  toastOptions={{
                    className: "font-sans",
                  }}
                />
                <ShadcnToaster />
              </div>
            </ErrorBoundary>
          </TooltipProvider>
        </ThemeProvider>
      </JotaiProvider>
    </>
  );
}
