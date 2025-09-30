import { useUser, useProfileValue } from "@nostr-dev-kit/ndk-hooks";
import { Package } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { NDKAgentDefinitionPack } from "@/lib/ndk-events/NDKAgentDefinitionPack";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { getPackColor } from "@/lib/utils/pack-colors";

interface PackCardProps {
  pack: NDKAgentDefinitionPack;
  onClick?: () => void;
  className?: string;
  selected?: boolean;
}

export function PackCard({
  pack,
  onClick,
  className,
  selected,
}: PackCardProps) {
  const user = useUser(pack.pubkey);
  const profile = useProfileValue(user);
  const agentCount = pack.agentEventIds.length;

  const backgroundColor = useMemo(() => {
    if (pack.image) return undefined;
    return getPackColor(pack.id || pack.title || "default");
  }, [pack.id, pack.title, pack.image]);

  const truncateDescription = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + "...";
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden cursor-pointer transition-all hover:scale-105 hover:shadow-2xl",
        "w-64 h-80",
        selected && "ring-2 ring-primary",
        className,
      )}
      onClick={onClick}
    >
      {/* Full bleed image or color background */}
      <div
        className="relative h-full w-full"
        style={pack.image ? undefined : { backgroundColor }}
      >
        {pack.image ? (
          <img
            src={pack.image}
            alt={pack.title || "Pack cover"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-24 h-24 text-white/20" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

        {/* Agent count badge */}
        <div className="absolute top-4 right-4 bg-primary rounded-full px-2.5 py-1 flex items-center gap-1">
          <span className="text-xs text-primary-foreground font-bold">
            {agentCount} AGENTS
          </span>
        </div>

        {/* Content overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h3 className="text-3xl font-black text-white mb-2 uppercase">
            {pack.title || "Untitled Pack"}
          </h3>

          <p className="text-sm text-gray-300 mb-4 line-clamp-2">
            {truncateDescription(pack.description) ||
              "No description available"}
          </p>

          {/* Author */}
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 border-2 border-white/20">
              <AvatarImage
                src={profile?.image || profile?.picture}
                alt={profile?.name || "Author"}
              />
              <AvatarFallback className="text-xs bg-white/20 text-white">
                {profile?.name?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-white">
              {profile?.name || profile?.displayName || "Anonymous"}
            </span>
          </div>
        </div>
      </div>

      {/* Selected indicator */}
      {selected && (
        <div className="absolute top-2 left-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
          <svg
            className="w-4 h-4 text-primary-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}
    </Card>
  );
}
