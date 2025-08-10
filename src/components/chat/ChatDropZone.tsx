import { ReactNode } from 'react'
import { Upload, Image, FileImage } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBlossomUpload } from '@/hooks/useBlossomUpload'
import { motion, AnimatePresence } from 'framer-motion'

interface ChatDropZoneProps {
  children: ReactNode
  className?: string
  dropZoneId?: string
}

export function ChatDropZone({
  children,
  className,
  dropZoneId = 'chat-drop-zone'
}: ChatDropZoneProps) {
  const {
    isDragging,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    uploadStats
  } = useBlossomUpload()

  return (
    <div
      className={cn("relative h-full", className)}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      data-drop-zone={dropZoneId}
    >
      {children}
      
      {/* Enhanced Drop overlay with animation */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-50 pointer-events-none"
          >
            {/* Backdrop with blur */}
            <div className="absolute inset-0 bg-background/95 backdrop-blur-md" />
            
            {/* Animated border */}
            <div className="absolute inset-4 border-2 border-dashed border-primary rounded-xl animate-pulse">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-primary/5 rounded-xl" />
            </div>
            
            {/* Central upload indicator */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-card/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-border"
              >
                <div className="flex flex-col items-center gap-4">
                  {/* Animated icon */}
                  <div className="relative">
                    <motion.div
                      animate={{
                        y: [0, -10, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <Upload className="w-16 h-16 text-primary" />
                    </motion.div>
                    
                    {/* Floating image icons */}
                    <motion.div
                      className="absolute -top-4 -left-8"
                      animate={{
                        y: [0, -5, 0],
                        rotate: [-5, 5, -5],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <Image className="w-8 h-8 text-primary/60" />
                    </motion.div>
                    
                    <motion.div
                      className="absolute -top-4 -right-8"
                      animate={{
                        y: [0, -5, 0],
                        rotate: [5, -5, 5],
                      }}
                      transition={{
                        duration: 3,
                        delay: 0.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <FileImage className="w-8 h-8 text-primary/60" />
                    </motion.div>
                  </div>
                  
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Drop images to upload
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Release to upload images using the Blossom Protocol
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 justify-center">
                    <div className="px-3 py-1 bg-primary/10 rounded-full">
                      <span className="text-xs font-medium text-primary">JPEG</span>
                    </div>
                    <div className="px-3 py-1 bg-primary/10 rounded-full">
                      <span className="text-xs font-medium text-primary">PNG</span>
                    </div>
                    <div className="px-3 py-1 bg-primary/10 rounded-full">
                      <span className="text-xs font-medium text-primary">GIF</span>
                    </div>
                    <div className="px-3 py-1 bg-primary/10 rounded-full">
                      <span className="text-xs font-medium text-primary">WebP</span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Max 100MB per file • Multiple files supported
                  </div>
                  
                  {/* Show current upload stats if any */}
                  {uploadStats.total > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 text-xs text-muted-foreground"
                    >
                      {uploadStats.uploading > 0 && (
                        <span>{uploadStats.uploading} uploading • </span>
                      )}
                      {uploadStats.pending > 0 && (
                        <span>{uploadStats.pending} pending • </span>
                      )}
                      {uploadStats.completed > 0 && (
                        <span className="text-green-600">{uploadStats.completed} completed</span>
                      )}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}