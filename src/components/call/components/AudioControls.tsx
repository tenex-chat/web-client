import { PhoneOff, Mic, MicOff, Send } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AudioControlsProps {
  isRecording: boolean;
  isProcessing: boolean;
  hasTranscript: boolean;
  audioLevel: number;
  onEndCall: () => void;
  onMicToggle: () => void;
  onSend: () => void;
}

export function AudioControls({
  isRecording,
  isProcessing,
  hasTranscript,
  audioLevel,
  onEndCall,
  onMicToggle,
  onSend
}: AudioControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4 p-6">
      {/* End call button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onEndCall}
        className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600"
      >
        <PhoneOff className="h-7 w-7 text-white" />
      </motion.button>
      
      {/* Mic toggle button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onMicToggle}
        disabled={isProcessing}
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center relative overflow-hidden",
          isRecording
            ? "bg-white text-black"
            : "bg-gray-700 text-white hover:bg-gray-600"
        )}
      >
        {/* Recording indicator ring */}
        {isRecording && (
          <motion.div
            className="absolute inset-0 rounded-full border-3 border-red-500"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [1, 0, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
        )}

        {/* Audio level visualization */}
        {isRecording && (
          <motion.div
            className="absolute inset-0 bg-red-500/20"
            animate={{
              scale: 1 + audioLevel * 0.5,
            }}
            transition={{
              duration: 0.05,
              ease: "easeOut",
            }}
          />
        )}

        <div className="relative z-10">
          {isRecording ? (
            <Mic className="h-7 w-7 animate-pulse" />
          ) : (
            <MicOff className="h-7 w-7" />
          )}
        </div>
      </motion.button>
      
      {/* Send button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onSend}
        disabled={!hasTranscript || isProcessing}
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center",
          hasTranscript && !isProcessing
            ? "bg-green-500 hover:bg-green-600 text-white"
            : "bg-gray-700 text-gray-400 cursor-not-allowed"
        )}
      >
        <Send className="h-7 w-7" />
      </motion.button>
    </div>
  );
}