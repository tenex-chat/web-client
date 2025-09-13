import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface OfflineIndicatorProps {
  className?: string;
}

export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const isOnline = useOnlineStatus();
  const [show, setShow] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShow(true);
      setWasOffline(true);
    } else if (wasOffline) {
      // Show "Back online" message briefly
      setTimeout(() => {
        setShow(false);
        setWasOffline(false);
      }, 3000);
    }
  }, [isOnline, wasOffline]);

  if (!show) return null;

  return (
    <div
      className={cn(
        "fixed top-14 left-0 right-0 z-50 animate-slide-down",
        "transition-all duration-300",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center gap-2 py-2 px-4",
          "text-sm font-medium",
          isOnline ? "bg-green-500 text-white" : "bg-amber-500 text-white",
        )}
      >
        {isOnline ? (
          <>
            <div className="h-2 w-2 bg-white rounded-full animate-pulse" />
            <span>Back online</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span>You're offline - Some features may be limited</span>
          </>
        )}
      </div>
    </div>
  );
}
