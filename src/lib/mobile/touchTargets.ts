/**
 * Mobile touch target optimization utilities
 * Based on Material Design and iOS Human Interface Guidelines
 */

/**
 * Minimum touch target sizes for mobile
 * - Material Design recommends 48x48dp
 * - iOS HIG recommends 44x44pt
 * We use 44px as minimum for consistency
 */
export const TOUCH_TARGET = {
  MIN_SIZE: 44, // Minimum touch target size in pixels
  RECOMMENDED_SIZE: 48, // Recommended size for comfortable tapping
  SPACING: 8, // Minimum spacing between touch targets
} as const;

/**
 * CSS classes for touch-optimized components
 */
export const touchClasses = {
  button: "min-h-[44px] min-w-[44px] touch-manipulation",
  link: "min-h-[44px] inline-flex items-center touch-manipulation",
  input: "min-h-[44px] px-3 touch-manipulation",
  textarea: "min-h-[44px] px-3 py-2 touch-manipulation",
  checkbox: "h-5 w-5 touch-manipulation",
  radio: "h-5 w-5 touch-manipulation",
  select: "min-h-[44px] touch-manipulation",
  tab: "min-h-[44px] px-4 touch-manipulation",
  menuItem: "min-h-[44px] px-4 touch-manipulation",
  card: "p-4 touch-manipulation",
  listItem: "min-h-[44px] px-4 py-2 touch-manipulation",
} as const;

/**
 * Helper to ensure touch target meets minimum size
 */
export function ensureTouchTarget(className: string = ""): string {
  return `${className} min-h-[44px] min-w-[44px] touch-manipulation`.trim();
}

/**
 * Helper to add proper spacing between touch targets
 */
export function touchSpacing(className: string = ""): string {
  return `${className} space-y-2`.trim();
}

/**
 * Mobile-optimized tap highlight colors
 */
export const tapHighlight = {
  none: "tap-highlight-transparent",
  default:
    "tap-highlight-color-[rgba(0,0,0,0.1)] dark:tap-highlight-color-[rgba(255,255,255,0.1)]",
} as const;
