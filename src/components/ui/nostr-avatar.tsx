import * as React from "react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { getAvatarBackgroundColor } from "@/lib/utils/avatar-colors"

interface NostrAvatarProps {
  pubkey?: string
  src?: string | null
  alt?: string
  fallback?: React.ReactNode
  className?: string
}

export function NostrAvatar({ 
  pubkey, 
  src, 
  alt, 
  fallback,
  className 
}: NostrAvatarProps) {
  const backgroundColor = getAvatarBackgroundColor(pubkey)
  
  return (
    <Avatar 
      className={className}
      style={{ backgroundColor }}
    >
      <AvatarImage src={src || undefined} alt={alt} />
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  )
}