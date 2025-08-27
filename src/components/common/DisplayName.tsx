import { NDKUser, useProfileValue } from "@nostr-dev-kit/ndk-hooks";
import type { AgentInstance } from "@/types/agent";

interface DisplayNameProps {
  pubkey: string;
  projectAgents?: AgentInstance[];
  className?: string;
}

export function DisplayName({ pubkey, projectAgents, className }: DisplayNameProps) {
  const profile = useProfileValue(pubkey);
  const agent = projectAgents?.find(a => a.pubkey === pubkey);
  
  // Proper hierarchy without swallowing data
  if (profile?.displayName) {
    return <span className={className}>{profile.displayName}</span>;
  }
  
  if (profile?.name) {
    return <span className={className}>{profile.name}</span>;
  }
  
  if (agent?.slug) {
    return <span className={className}>{agent.slug}</span>;
  }
  
  // Final fallback to npub
  const user = new NDKUser({ pubkey });
  return <span className={className}>{user.npub.slice(0, 8)}...</span>;
}