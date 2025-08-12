import { useCallback } from 'react'

type HapticFeedbackType = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error'

interface HapticOptions {
  duration?: number
  intensity?: number
}

function useHapticFeedback() {
  const isSupported = useCallback(() => {
    return 'vibrate' in navigator
  }, [])

  const trigger = useCallback((type: HapticFeedbackType = 'light', options: HapticOptions = {}) => {
    if (!isSupported()) return

    const { duration, intensity } = options

    // Map feedback types to vibration patterns
    const patterns: Record<HapticFeedbackType, number | number[]> = {
      light: duration || 10,
      medium: duration || 20,
      heavy: duration || 40,
      selection: duration || 15,
      success: [10, 20, 10],
      warning: [30, 10, 30],
      error: [50, 30, 50, 30, 50],
    }

    const pattern = patterns[type]

    try {
      if (typeof pattern === 'number') {
        navigator.vibrate(intensity ? pattern * (intensity / 100) : pattern)
      } else {
        navigator.vibrate(intensity ? pattern.map(p => p * (intensity / 100)) : pattern)
      }
    } catch (error) {
      console.debug('Haptic feedback not available:', error)
    }
  }, [isSupported])

  const triggerImpact = useCallback((style: 'light' | 'medium' | 'heavy' = 'light') => {
    trigger(style)
  }, [trigger])

  const triggerNotification = useCallback((type: 'success' | 'warning' | 'error') => {
    trigger(type)
  }, [trigger])

  const triggerSelection = useCallback(() => {
    trigger('selection')
  }, [trigger])

  return {
    isSupported,
    trigger,
    triggerImpact,
    triggerNotification,
    triggerSelection,
  }
}