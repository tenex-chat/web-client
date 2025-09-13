import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  text?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export function LoadingSpinner({
  className,
  size = "sm",
  text,
}: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center", className)}>
      <Loader2
        className={cn(sizeClasses[size], "animate-spin", text && "mr-2")}
      />
      {text && <span>{text}</span>}
    </div>
  );
}

interface LoadingStateProps {
  text?: string;
  className?: string;
}

export function LoadingState({
  text = "Loading...",
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center p-8", className)}
    >
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
