import { cn } from '@/lib/utils'

interface StreamingCaretProps {
  className?: string
}

/**
 * A blinking caret indicator for streaming content
 */
export function StreamingCaret({ className }: StreamingCaretProps) {
  return (
    <>
      <style>{`
        @keyframes blink-caret {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
      <span 
        className={cn(
          "inline-block w-0.5 h-4 bg-foreground/70 align-text-bottom",
          className
        )}
        style={{
          animation: 'blink-caret 1s infinite',
        }}
      />
    </>
  )
}