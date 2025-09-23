import type { CallState } from "../types";

interface CallStatusProps {
  callState: CallState;
  transcript: string;
}

export function CallStatus({ callState, transcript }: CallStatusProps) {
  return (
    <div className="mt-4 min-h-[60px] max-w-md w-full text-center">
      {callState === 'recording' && (
        <div className="text-white">
          <span className="inline-flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Listening...
          </span>
        </div>
      )}
      
      {callState === 'processing' && (
        <div className="text-white/60">
          <div className="mb-2">Processing...</div>
          {transcript && (
            <div className="text-white/40 text-sm italic">
              "{transcript}"
            </div>
          )}
        </div>
      )}
      
      {callState === 'playing' && (
        <div className="text-white/60">Agent speaking...</div>
      )}
      
      {callState === 'idle' && transcript && (
        <div className="text-white/40 text-sm">
          Last: "{transcript}"
        </div>
      )}
    </div>
  );
}