import { useUser, useProfileValue } from "@nostr-dev-kit/ndk-hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface InlineProfileMentionProps {
  pubkey: string;
  className?: string;
}

export function InlineProfileMention({
  pubkey,
  className = "",
}: InlineProfileMentionProps) {
  const user = useUser(pubkey);
  const userProfile = useProfileValue(user);

  const displayName =
    userProfile?.displayName || userProfile?.name || pubkey.slice(0, 8);
  const avatarUrl = userProfile?.image || userProfile?.picture;

  const getInitials = (name: string) => {
    const words = name.split(" ");
    if (words.length >= 2) {
      return words[0][0] + words[1][0];
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <span
      className={cn("inline-flex items-center gap-1 align-middle", className)}
    >
      <Avatar className="inline-block w-4 h-4 align-middle">
        <AvatarImage src={avatarUrl} alt={displayName} />
        <AvatarFallback className="text-[8px]">
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>
      <span className="font-medium text-blue-500 hover:text-blue-600 align-middle">
        @{displayName}
      </span>
    </span>
  );
}
