import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface VoiceVisualizerProps {
  isActive: boolean;
  audioLevel: number;
  type?: "waveform" | "pulse" | "bars" | "orb";
  className?: string;
}

// Waveform Visualizer - Animated sine wave
export function WaveformVisualizer({ isActive, audioLevel, className }: Omit<VoiceVisualizerProps, "type">) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let phase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isActive) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();

        const amplitude = audioLevel * 30;
        const frequency = 0.02;

        for (let x = 0; x < canvas.width; x++) {
          const y = canvas.height / 2 + Math.sin((x * frequency) + phase) * amplitude;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.stroke();
        phase += 0.1;
      } else {
        // Draw flat line when inactive
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, audioLevel]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={100}
      className={cn("w-[300px] h-[100px]", className)}
    />
  );
}

// Circular Pulse Visualizer - Pulsing circle that scales with audio
export function PulseVisualizer({ isActive, audioLevel, className }: Omit<VoiceVisualizerProps, "type">) {
  const scale = isActive ? 1 + (audioLevel * 0.5) : 1;

  return (
    <div className={cn("relative w-32 h-32", className)}>
      {/* Outer ripple effect */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-full bg-white/20"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      )}

      {/* Main pulse circle */}
      <motion.div
        className={cn(
          "absolute inset-2 rounded-full",
          isActive ? "bg-white/40" : "bg-white/20"
        )}
        animate={{ scale }}
        transition={{ duration: 0.1, ease: "easeOut" }}
      />

      {/* Inner core */}
      <motion.div
        className={cn(
          "absolute inset-4 rounded-full",
          isActive ? "bg-white/60" : "bg-white/30"
        )}
        animate={{
          scale: isActive ? [1, 1.1, 1] : 1,
          opacity: isActive ? [0.6, 0.8, 0.6] : 0.3
        }}
        transition={{
          duration: 0.5,
          repeat: isActive ? Infinity : 0,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

// Bar Equalizer Visualizer - Classic audio bars
export function BarsVisualizer({ isActive, audioLevel, className }: Omit<VoiceVisualizerProps, "type">) {
  const barCount = 5;
  const bars = Array.from({ length: barCount }, () => {
    // Create varying heights based on audio level
    const randomFactor = 0.7 + Math.random() * 0.3;
    const height = isActive ? audioLevel * randomFactor * 100 : 10;
    return height;
  });

  return (
    <div className={cn("flex items-end justify-center gap-1 h-20", className)}>
      {bars.map((height, i) => (
        <motion.div
          key={i}
          className={cn(
            "w-3 rounded-full",
            isActive ? "bg-white/80" : "bg-white/30"
          )}
          animate={{ height: `${height}%` }}
          transition={{
            duration: 0.1,
            ease: "easeOut",
            delay: i * 0.02,
          }}
          style={{ minHeight: "10%" }}
        />
      ))}
    </div>
  );
}

// Orb Visualizer - Glowing orb with dynamic glow effect
export function OrbVisualizer({ isActive, audioLevel, className }: Omit<VoiceVisualizerProps, "type">) {
  const glowSize = isActive ? 20 + (audioLevel * 30) : 10;

  return (
    <div className={cn("relative w-24 h-24", className)}>
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          boxShadow: isActive
            ? `0 0 ${glowSize}px ${glowSize/2}px rgba(255, 255, 255, 0.5)`
            : "0 0 10px 5px rgba(255, 255, 255, 0.1)",
        }}
        transition={{ duration: 0.1 }}
      />

      {/* Core orb */}
      <motion.div
        className={cn(
          "absolute inset-2 rounded-full",
          isActive
            ? "bg-gradient-to-br from-white via-white/80 to-white/60"
            : "bg-gradient-to-br from-white/40 via-white/30 to-white/20"
        )}
        animate={{
          scale: isActive ? 1 + (audioLevel * 0.2) : 1,
        }}
        transition={{ duration: 0.05 }}
      />

      {/* Inner light */}
      <motion.div
        className="absolute inset-4 rounded-full bg-white/40 blur-sm"
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

// Main component that renders the selected visualizer
export function VoiceVisualizer({ isActive, audioLevel, type = "pulse", className }: VoiceVisualizerProps) {
  switch (type) {
    case "waveform":
      return <WaveformVisualizer isActive={isActive} audioLevel={audioLevel} className={className} />;
    case "bars":
      return <BarsVisualizer isActive={isActive} audioLevel={audioLevel} className={className} />;
    case "orb":
      return <OrbVisualizer isActive={isActive} audioLevel={audioLevel} className={className} />;
    case "pulse":
    default:
      return <PulseVisualizer isActive={isActive} audioLevel={audioLevel} className={className} />;
  }
}