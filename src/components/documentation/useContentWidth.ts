import { useMemo } from "react";

export function useContentWidth(showComments: boolean, showChangelog: boolean): string {
  return useMemo(() => {
    if (showComments || showChangelog) {
      return "w-2/3";
    }
    return "w-full";
  }, [showComments, showChangelog]);
}