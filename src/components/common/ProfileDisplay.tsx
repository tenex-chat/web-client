import { useProfile } from "@nostr-dev-kit/ndk-hooks";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn } from "@/lib/utils";

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
    const userProfile = useProfile(pubkey);

    const sizeClasses = {
        sm: { avatar: "w-6 h-6", text: "text-sm" },
        md: { avatar: "w-8 h-8", text: "text-base" },
        lg: { avatar: "w-10 h-10", text: "text-lg" },
    };

    const displayName = userProfile?.displayName || userProfile?.name || pubkey.slice(0, 8);
    const avatarUrl = userProfile?.image || userProfile?.picture;
    
    const getInitials = (name: string) => {
        const words = name.split(' ');
        if (words.length >= 2) {
            return words[0][0] + words[1][0];
        }
        return name.slice(0, 2).toUpperCase();
    };

    return (
        <div className={cn("flex items-center gap-2", className)}>
            {showAvatar && (
                <Avatar className={cn(sizeClasses[size].avatar, avatarClassName)}>
                    <AvatarImage src={avatarUrl} alt={displayName} />
                    <AvatarFallback className="text-xs">
                        {getInitials(displayName)}
                    </AvatarFallback>
                </Avatar>
            )}
            {showName && (
                <span className={cn(sizeClasses[size].text, "truncate", nameClassName)}>
                    {displayName}
                </span>
            )}
        </div>
    );
}