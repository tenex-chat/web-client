import React from "react";
import { NostrEntityCard } from "./NostrEntityCard";
import type { NDKEvent } from "@nostr-dev-kit/ndk-hooks";

interface SafeNostrEntityCardProps {
  bech32: string;
  className?: string;
  compact?: boolean;
  onConversationClick?: (event: NDKEvent) => void;
}

/**
 * Wrapper component that safely handles invalid bech32 strings
 * This is especially important during streaming when partial strings are received
 */
export function SafeNostrEntityCard({
  bech32,
  className = "",
  ...props
}: SafeNostrEntityCardProps) {
  // Validate bech32 format before rendering NostrEntityCard
  // This prevents errors from partial strings during streaming
  const isValidBech32 = /^(npub1|nprofile1|nevent1|naddr1|note1)[a-z0-9]{58,}$/i.test(bech32);

  if (!isValidBech32) {
    // During streaming, we might get partial bech32 strings
    // Just render them as plain text
    return <span className={className}>{bech32}</span>;
  }

  return <NostrEntityCard bech32={bech32} className={className} {...props} />;
}