import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useNDKCurrentUser } from "@nostr-dev-kit/ndk-hooks";
import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useProjectSubscriptions } from "@/hooks/useProjectSubscriptions";
import { InboxFABMenu } from "@/components/inbox/InboxFABMenu";
import { useIsMobile } from "@/hooks/useMediaQuery";

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
});

function AuthLayout() {
  const user = useNDKCurrentUser();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Initialize project subscriptions once at the auth layout level
  useProjectSubscriptions();

  // Check if we're in test mode
  const isTestMode = typeof window !== 'undefined' && (
    new URLSearchParams(window.location.search).has('test-mode') ||
    /playwright|puppeteer|headless/i.test(navigator.userAgent)
  );

  useEffect(() => {
    // Allow test mode to bypass authentication
    if (!user && !isTestMode) {
      navigate({ to: "/login" });
    }
  }, [user, isTestMode, navigate]);

  // If no user and not in test mode, don't render
  if (!user && !isTestMode) {
    return null;
  }

  // In test mode, we render the app shell even without a user
  // The components inside need to handle the absence of user data gracefully
  return (
    <>
      <AppShell>
        <Outlet />
      </AppShell>
      {/* Floating inbox menu - only show on desktop */}
      {!isMobile && <InboxFABMenu />}
    </>
  );
}
