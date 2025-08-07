import { useProfileValue } from "@nostr-dev-kit/ndk-hooks";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { StringUtils, ProfileUtils } from "../lib/utils/business";

interface ProfileDisplayProps {
    pubkey: string;
    size?: "sm" | "md" | "lg";
    showName?: boolean;
    showAvatar?: boolean;
    className?: string;
    nameClassName?: string;
    avatarClassName?: string;
}

export function ProfileDisplay({
    pubkey,
    size = "sm",
    showName = true,
    showAvatar = true,
    className = "",
    nameClassName = "",
    avatarClassName = "",
}: ProfileDisplayProps) {
    const profile = useProfileValue(pubkey);

    const sizeClasses = {
        sm: { avatar: "w-6 h-6", text: "text-sm" },
        md: { avatar: "w-8 h-8", text: "text-base" },
        lg: { avatar: "w-10 h-10", text: "text-lg" },
    };

    const displayName = profile?.displayName || profile?.name || ProfileUtils.formatPubkeyShort(pubkey);
    const avatarUrl = profile?.image || profile?.picture;

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {showAvatar && (
                <Avatar className={`${sizeClasses[size].avatar} ${avatarClassName}`}>
                    <AvatarImage src={avatarUrl} alt={displayName} />
                    <AvatarFallback className="text-xs">{StringUtils.getInitials(displayName)}</AvatarFallback>
                </Avatar>
            )}
            {showName && (
                <span className={`${sizeClasses[size].text} truncate ${nameClassName}`}>
                    {displayName}
                </span>
            )}
        </div>
    );
}
