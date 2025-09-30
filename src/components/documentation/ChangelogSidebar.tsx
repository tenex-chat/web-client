import { ChangelogTabContent } from "@/components/changelog/ChangelogTabContent";
import type { NDKArticle } from "@nostr-dev-kit/ndk-hooks";

interface ChangelogSidebarProps {
  article: NDKArticle;
}

export function ChangelogSidebar({ article }: ChangelogSidebarProps) {
  return (
    <div className="w-1/3 border-l flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold">Changelog</h2>
      </div>
      <div className="flex-1 overflow-hidden">
        <ChangelogTabContent article={article} />
      </div>
    </div>
  );
}