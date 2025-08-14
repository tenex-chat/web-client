import { useEffect, useState } from 'react'
import { TIMING } from '@/lib/constants'

export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check for iOS devices
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

    if (!isIOS) {
      // For Android and other devices, use visualViewport API
      const handleViewportChange = () => {
        if (window.visualViewport) {
          const hasKeyboard = window.innerHeight > window.visualViewport.height
          const height = hasKeyboard 
            ? window.innerHeight - window.visualViewport.height 
            : 0

          setKeyboardHeight(height)
          setIsKeyboardVisible(hasKeyboard)
        }
      }

      window.visualViewport?.addEventListener('resize', handleViewportChange)
      window.visualViewport?.addEventListener('scroll', handleViewportChange)

      return () => {
        window.visualViewport?.removeEventListener('resize', handleViewportChange)
        window.visualViewport?.removeEventListener('scroll', handleViewportChange)
      }
    } else {
      // For iOS, use focus/blur events and window resize
      let initialHeight = window.innerHeight
      
      const handleResize = () => {
        const currentHeight = window.innerHeight
        const heightDifference = initialHeight - currentHeight
        
        if (heightDifference > 100) {
          // Keyboard is likely visible
          setKeyboardHeight(heightDifference)
          setIsKeyboardVisible(true)
        } else {
          setKeyboardHeight(0)
          setIsKeyboardVisible(false)
        }
      }

      const handleFocus = (e: FocusEvent) => {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          // Store initial height when focusing an input
          initialHeight = window.innerHeight
          setTimeout(handleResize, TIMING.RESIZE_DEBOUNCE_DELAY) // iOS keyboard animation delay
        }
      }

      const handleBlur = () => {
        setTimeout(() => {
          setKeyboardHeight(0)
          setIsKeyboardVisible(false)
        }, 100)
      }

      window.addEventListener('resize', handleResize)
      document.addEventListener('focusin', handleFocus)
      document.addEventListener('focusout', handleBlur)

      return () => {
        window.removeEventListener('resize', handleResize)
        document.removeEventListener('focusin', handleFocus)
        document.removeEventListener('focusout', handleBlur)
      }
    }
  }, [])

  return {
    keyboardHeight,
    isKeyboardVisible,
  }
}