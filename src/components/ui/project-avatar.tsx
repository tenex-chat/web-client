import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { NDKProject } from '@/lib/ndk-events/NDKProject'

interface ProjectAvatarProps {
  project: NDKProject
  className?: string
  fallbackClassName?: string
}

/**
 * Generate a deterministic hex color based on a string
 * @param str The string to generate color from (project's d-tag)
 * @returns A hex color string
 */
function generateColorFromString(str: string): string {
  if (!str) return '#94a3b8' // Default slate-400 if no string provided
  
  // Simple hash function to convert string to number
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  // Convert to positive number and use it to generate hue (0-360)
  const hue = Math.abs(hash) % 360
  
  // Use HSL with fixed saturation and lightness for consistent, pleasant colors
  // Saturation: 65% for vibrant but not overwhelming colors
  // Lightness: 55% for good contrast with white text
  return `hsl(${hue}, 65%, 55%)`
}

/**
 * Get project initials for avatar fallback
 */
function getProjectInitials(title: string): string {
  if (!title) return '??'
  
  const words = title.trim().split(' ').filter(Boolean)
  if (words.length === 0) return '??'
  
  if (words.length === 1) {
    // For single word, take first two characters
    return words[0].substring(0, 2).toUpperCase()
  }
  
  // For multiple words, take first letter of first two words
  return words.slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase()
}

/**
 * Get the d-tag from a project
 * The d-tag is used in NIP-33 replaceable events as a unique identifier
 */
function getProjectDTag(project: NDKProject): string {
  // Try to get dTag property first (if it exists)
  if ('dTag' in project && typeof project.dTag === 'string') {
    return project.dTag
  }
  
  // Otherwise look for the "d" tag in the tags array
  const dTag = project.tags?.find(tag => tag[0] === 'd')?.[1]
  
  // If no d-tag found, fallback to using the project ID or title for color generation
  return dTag || project.id || project.title || ''
}

export function ProjectAvatar({ 
  project, 
  className,
  fallbackClassName 
}: ProjectAvatarProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const initials = getProjectInitials(project.title)
  const dTag = getProjectDTag(project)
  const backgroundColor = generateColorFromString(dTag)
  
  return (
    <Avatar className={className}>
      <AvatarImage 
        src={project.picture} 
        onLoad={() => setImageLoaded(true)}
        style={{
          // Remove background when image loads successfully
          backgroundColor: imageLoaded ? 'transparent' : undefined
        }}
      />
      <AvatarFallback 
        className={cn(fallbackClassName)}
        style={{ 
          backgroundColor,
          color: 'white'
        }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}