import React from "react";
import { Check, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { NostrProfile } from "@/components/common/NostrProfile";
import { useUser, useProfileValue } from "@nostr-dev-kit/ndk-hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { nip19 } from "nostr-tools";

interface AuthorFilterDropdownProps {
  authors: string[]; // Array of pubkeys
  selectedAuthor: string | null;
  onAuthorSelect: (pubkey: string | null) => void;
  currentUserPubkey?: string;
  groupThreads?: boolean;
  onGroupThreadsChange?: (grouped: boolean) => void;
}

// Component to show author avatar in the filter button
const AuthorAvatar: React.FC<{ pubkey: string }> = ({ pubkey }) => {
  const user = useUser(pubkey);
  const profile = useProfileValue(user);

  const fallbackName = React.useMemo(() => {
    if (profile?.displayName || profile?.name) {
      return (profile.displayName || profile.name).slice(0, 2).toUpperCase();
    }
    try {
      const npub = nip19.npubEncode(pubkey);
      return npub.slice(4, 6).toUpperCase();
    } catch {
      return 'UN';
    }
  }, [profile, pubkey]);

  return (
    <Avatar className="h-6 w-6">
      <AvatarImage src={profile?.image || profile?.picture} alt={profile?.displayName || profile?.name} />
      <AvatarFallback className="text-[10px]">
        {fallbackName}
      </AvatarFallback>
    </Avatar>
  );
};

export const AuthorFilterDropdown: React.FC<AuthorFilterDropdownProps> = ({
  authors,
  selectedAuthor,
  onAuthorSelect,
  currentUserPubkey,
  groupThreads = false,
  onGroupThreadsChange,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={selectedAuthor ? "default" : "outline"}
          size="sm"
          className="h-9 w-9 p-0"
        >
          {selectedAuthor ? (
            <AuthorAvatar pubkey={selectedAuthor} />
          ) : (
            <Filter className="h-3.5 w-3.5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        {/* Group threads checkbox - only show if handler provided */}
        {onGroupThreadsChange && (
          <>
            <DropdownMenuCheckboxItem
              checked={groupThreads}
              onCheckedChange={onGroupThreadsChange}
            >
              Group threads
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* All Authors option */}
        <DropdownMenuItem
          onClick={() => onAuthorSelect(null)}
          className={!selectedAuthor ? "bg-accent" : ""}
        >
          <div className="flex items-center justify-between w-full">
            <span>All Authors</span>
            {!selectedAuthor && <Check className="h-3.5 w-3.5" />}
          </div>
        </DropdownMenuItem>

        {authors.length > 0 && <DropdownMenuSeparator />}

        {/* List all authors */}
        {authors.map(pubkey => {
          const isCurrentUser = currentUserPubkey && pubkey === currentUserPubkey;

          return (
            <DropdownMenuItem
              key={pubkey}
              onClick={() => onAuthorSelect(pubkey)}
              className={selectedAuthor === pubkey ? "bg-accent" : ""}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <NostrProfile
                    pubkey={pubkey}
                    variant="avatar"
                    size="xs"
                    className="flex-shrink-0"
                  />
                  {isCurrentUser ? (
                    <span>You</span>
                  ) : (
                    <NostrProfile
                      pubkey={pubkey}
                      variant="name"
                      className="text-sm"
                    />
                  )}
                </div>
                {selectedAuthor === pubkey && <Check className="h-3.5 w-3.5" />}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};