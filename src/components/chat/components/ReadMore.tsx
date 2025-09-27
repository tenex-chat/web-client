import { useState, useRef, useEffect, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ReadMoreProps {
  children: ReactNode;
  maxHeight?: number;
  className?: string;
  buttonClassName?: string;
}

export function ReadMore({
  children,
  maxHeight = 400,
  className,
  buttonClassName,
}: ReadMoreProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldTruncate, setShouldTruncate] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkHeight = () => {
      if (contentRef.current) {
        const contentHeight = contentRef.current.scrollHeight;
        setShouldTruncate(contentHeight > maxHeight);
      }
    };

    checkHeight();
    
    // Check again after a brief delay to handle async content loading
    const timer = setTimeout(checkHeight, 100);
    
    // Also check on window resize
    window.addEventListener('resize', checkHeight);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkHeight);
    };
  }, [/* effect dep */ children, maxHeight]);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={contentRef}
        className={cn(
          "transition-all duration-300 ease-in-out",
          !isExpanded && shouldTruncate && "overflow-hidden"
        )}
        style={{
          maxHeight: !isExpanded && shouldTruncate ? `${maxHeight}px` : undefined,
        }}
      >
        {children}
        
        {/* Gradient overlay when truncated */}
        {!isExpanded && shouldTruncate && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        )}
      </div>

      {shouldTruncate && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "relative z-10 mt-2 flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors",
            buttonClassName
          )}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Read more
            </>
          )}
        </button>
      )}
    </div>
  );
}