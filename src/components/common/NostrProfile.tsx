import { useProfileValue } from "@nostr-dev-kit/ndk-hooks";
import { NDKUser } from "@nostr-dev-kit/ndk-hooks";
import { NostrAvatar } from "@/components/ui/nostr-avatar";
import { cn } from "@/lib/utils";

interface NostrProfileProps {
  pubkey: string;
  variant?: "full" | "name" | "avatar" | "compact";
  size?: "xs" | "sm" | "md" | "lg";
  fallback?: string; // Optional fallback name (e.g., agent slug)
  className?: string;
  avatarClassName?: string;
  nameClassName?: string;
}

export function NostrProfile({
  pubkey,
  variant = "full",
  size = "sm",
  fallback,
  className = "",
  nameClassName = "",
  avatarClassName = "",
}: NostrProfileProps) {
  const userProfile = useProfileValue(pubkey);

  const sizeClasses = {
    xs: { avatar: "w-5 h-5", text: "text-xs" },
    sm: { avatar: "w-6 h-6", text: "text-sm" },
    md: { avatar: "w-8 h-8", text: "text-base" },
    lg: { avatar: "w-10 h-10", text: "text-lg" },
  };

  // Generate display name with fallback hierarchy
  const getDisplayName = () => {
    if (userProfile?.displayName) return userProfile.displayName;
    if (userProfile?.name) return userProfile.name;
    if (fallback) return fallback;

    // Default fallback to npub slice
    const user = new NDKUser({ pubkey });
    return `${user.npub.slice(0, 8)}...`;
  };

  const displayName = getDisplayName();
  const avatarUrl = userProfile?.image || userProfile?.picture;

  const getInitials = (name: string) => {
    const words = name.split(" ");
    if (words.length >= 2) {
      return words[0][0] + words[1][0];
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Handle different variants
  if (variant === "name") {
    return (
      <span
        className={cn(
          sizeClasses[size].text,
          "truncate",
          nameClassName,
          className,
        )}
      >
        {displayName}
      </span>
    );
  }

  if (variant === "avatar") {
    return (
      <NostrAvatar
        pubkey={pubkey}
        src={avatarUrl}
        alt={displayName}
        fallback={<span className="text-xs">{getInitials(displayName)}</span>}
        className={cn(sizeClasses[size].avatar, avatarClassName, className)}
      />
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("inline-flex items-center gap-1", className)}>
        <NostrAvatar
          pubkey={pubkey}
          src={avatarUrl}
          alt={displayName}
          fallback={<span className="text-xs">{getInitials(displayName)}</span>}
          className={cn(sizeClasses.xs.avatar, avatarClassName)}
        />
        <span className={cn(sizeClasses.xs.text, "truncate", nameClassName)}>
          {displayName}
        </span>
      </div>
    );
  }

  // Default 'full' variant
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <NostrAvatar
        pubkey={pubkey}
        src={avatarUrl}
        alt={displayName}
        fallback={<span className="text-xs">{getInitials(displayName)}</span>}
        className={cn(sizeClasses[size].avatar, avatarClassName)}
      />
      <span className={cn(sizeClasses[size].text, "truncate", nameClassName)}>
        {displayName}
      </span>
    </div>
  );
}
