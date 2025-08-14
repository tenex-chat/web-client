import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combines class names using clsx and merges Tailwind CSS classes intelligently.
 * Prevents style conflicts by ensuring later classes override earlier ones.
 * 
 * @param inputs - Class values that can be strings, objects, arrays, etc.
 * @returns A single string of optimized class names
 * 
 * @example
 * cn('px-2 py-1', 'px-4') // Returns: 'py-1 px-4' (px-4 overrides px-2)
 * cn('text-red-500', condition && 'text-blue-500') // Conditionally applies classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}