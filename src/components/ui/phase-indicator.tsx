import { cn } from '@/lib/utils'

interface PhaseIndicatorProps {
  phase?: string | null
  className?: string
}

const phaseColors = {
  chat: 'bg-blue-500',
  plan: 'bg-purple-500',
  execute: 'bg-green-500',
  review: 'bg-orange-500',
  chores: 'bg-gray-500',
} as const

const phaseNames = {
  chat: 'Chat',
  plan: 'Plan',
  execute: 'Execute',
  review: 'Review',
  chores: 'Chores',
} as const

export function PhaseIndicator({ phase, className }: PhaseIndicatorProps) {
  if (!phase) return null
  
  const normalizedPhase = phase.toLowerCase() as keyof typeof phaseColors
  const color = phaseColors[normalizedPhase] || 'bg-gray-400'
  const phaseName = phaseNames[normalizedPhase] || phase
  
  return (
    <div
      className={cn(
        'rounded-full',
        color,
        className || 'w-2 h-2'
      )}
      title={`Phase: ${phaseName}`}
    />
  )
}