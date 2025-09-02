import { useProfileValue } from "@nostr-dev-kit/ndk-hooks";
import { Users, Package } from "lucide-react";
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

export function PackCard({ pack, onClick, className, selected }: PackCardProps) {
  const profile = useProfileValue(pack.pubkey);
  const agentCount = pack.agentEventIds.length;
  
  const backgroundColor = useMemo(() => {
    if (pack.image) return undefined;
    return getPackColor(pack.id || pack.title || 'default');
  }, [pack.id, pack.title, pack.image]);

  const truncateDescription = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
  };

  return (
    <Card 
      className={cn(
        "relative overflow-hidden cursor-pointer transition-all hover:scale-105 hover:shadow-lg",
        "w-64 h-80 flex flex-col",
        selected && "ring-2 ring-primary",
        className
      )}
      onClick={onClick}
    >
      {/* Image or color background */}
      <div 
        className="relative h-40 w-full"
        style={pack.image ? undefined : { backgroundColor }}
      >
        {pack.image ? (
          <img 
            src={pack.image} 
            alt={pack.title || 'Pack cover'} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-16 h-16 text-white/80" />
          </div>
        )}
        
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Agent count badge */}
        <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
          <Users className="w-3 h-3 text-white" />
          <span className="text-xs text-white font-medium">{agentCount}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">
          {pack.title || 'Untitled Pack'}
        </h3>
        
        <p className="text-sm text-muted-foreground flex-1 line-clamp-3">
          {truncateDescription(pack.description) || 'No description available'}
        </p>
        
        {/* Author */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t">
          <Avatar className="h-6 w-6">
            <AvatarImage 
              src={profile?.image || profile?.picture} 
              alt={profile?.name || 'Author'} 
            />
            <AvatarFallback className="text-xs">
              {profile?.name?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground truncate">
            {profile?.name || profile?.displayName || 'Anonymous'}
          </span>
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