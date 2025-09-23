import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface VoiceVisualizerProps {
  isActive: boolean;
  audioLevel: number;
  className?: string;
  color?: string; // Optional color for theming
}

// Orb Visualizer - Glowing orb with dynamic glow effect
function OrbVisualizer({ isActive, audioLevel, className, color = "hsl(0, 0%, 100%)" }: VoiceVisualizerProps) {
  const glowSize = isActive ? 20 + (audioLevel * 30) : 10;

  return (
    <div className={cn("relative w-24 h-24", className)}>
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          boxShadow: isActive
            ? `0 0 ${glowSize}px ${glowSize/2}px ${color.replace(')', ', 0.5)').replace('hsl(', 'hsla(')}`
            : `0 0 10px 5px ${color.replace(')', ', 0.1)').replace('hsl(', 'hsla(')}`,
        }}
        animate={{
          opacity: [1, 0.8, 1]
        }}
        transition={{
          duration: 0.1,
          opacity: {
            duration: 2,
            repeat: isActive ? Infinity : 0,
            ease: "easeInOut"
          }
        }}
      />

      {/* Core orb */}
      <motion.div
        className="absolute inset-2 rounded-full"
        style={{
          background: isActive
            ? color
            : color.replace(')', ', 0.4)').replace('hsl(', 'hsla('),
        }}
        animate={{
          scale: isActive ? 1 + (audioLevel * 0.2) : 1,
          filter: isActive ? `brightness(${1 + audioLevel * 0.3})` : 'brightness(0.6)'
        }}
        transition={{ duration: 0.05 }}
      />

      {/* Inner light */}
      <motion.div
        className="absolute inset-4 rounded-full blur-sm"
        style={{
          backgroundColor: color.replace(')', ', 0.6)').replace('hsl(', 'hsla(')
        }}
        animate={{
          opacity: isActive ? [0.4, 0.8, 0.4] : 0.2,
          scale: isActive ? [1, 1.2, 1] : 1,
        }}
        transition={{
          duration: 1,
          repeat: isActive ? Infinity : 0,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

// Main component - Orb visualizer
export function VoiceVisualizer({ isActive, audioLevel, className, color }: VoiceVisualizerProps) {
  return <OrbVisualizer isActive={isActive} audioLevel={audioLevel} className={className} color={color} />;
}