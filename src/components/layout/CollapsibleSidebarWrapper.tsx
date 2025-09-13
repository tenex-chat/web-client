import { ReactNode } from "react";
import { useAtom } from "jotai";
import { sidebarCollapsedAtom } from "@/stores/ui";
import { CollapsibleProjectsSidebar } from "./CollapsibleProjectsSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface CollapsibleSidebarWrapperProps {
  children: ReactNode;
  className?: string;
}

export function CollapsibleSidebarWrapper({
  children,
  className,
}: CollapsibleSidebarWrapperProps) {
  const [collapsed, setCollapsed] = useAtom(sidebarCollapsedAtom);

  return (
    <SidebarProvider
      open={!collapsed}
      onOpenChange={(open) => setCollapsed(!open)}
    >
      <div className={cn("flex h-full w-full", className)}>
        <CollapsibleProjectsSidebar />
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </SidebarProvider>
  );
}
