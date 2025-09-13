import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { CollapsibleSidebarWrapper } from "./CollapsibleSidebarWrapper";

interface AppShellProps {
  children: ReactNode;
  className?: string;
}

export function AppShell({ children, className }: AppShellProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    // Mobile: No sidebar, direct content display like Telegram
    return (
      <div className={cn("h-screen overflow-hidden", className)}>
        {children}
      </div>
    );
  }

  // Desktop layout with collapsible sidebar
  return (
    <CollapsibleSidebarWrapper
      className={cn("h-screen overflow-hidden", className)}
    >
      {children}
    </CollapsibleSidebarWrapper>
  );
}
