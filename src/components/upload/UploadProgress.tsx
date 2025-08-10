import { X, RefreshCw, CheckCircle, AlertCircle, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { useAtomValue, useSetAtom } from 'jotai'
import { 
  uploadQueueAtom, 
  removeUploadItemAtom, 
  retryUploadAtom,
  type UploadQueueItem 
} from '@/stores/blossomStore'

interface UploadProgressProps {
  className?: string
  onCancel?: (id: string) => void
  onRetry?: (id: string) => void
}

export function UploadProgress({ 
  className,
  onCancel,
  onRetry 
}: UploadProgressProps) {
  const uploadQueue = useAtomValue(uploadQueueAtom)
  const removeUpload = useSetAtom(removeUploadItemAtom)
  const retryUpload = useSetAtom(retryUploadAtom)

  // Only show items that are not completed (or are failed)
  const visibleItems = uploadQueue.filter(
    item => item.status !== 'completed'
  )

  if (visibleItems.length === 0) {
    return null
  }

  const handleCancel = (item: UploadQueueItem) => {
    if (item.status === 'uploading' && onCancel) {
      onCancel(item.id)
    }
    removeUpload(item.id)
  }

  const handleRetry = (item: UploadQueueItem) => {
    retryUpload(item.id)
    if (onRetry) {
      onRetry(item.id)
    }
  }

  const getStatusIcon = (status: UploadQueueItem['status']) => {
    switch (status) {
      case 'pending':
        return <Upload className="w-4 h-4 text-muted-foreground" />
      case 'uploading':
        return <Upload className="w-4 h-4 text-primary animate-pulse" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-destructive" />
    }
  }

  const getStatusText = (item: UploadQueueItem) => {
    switch (item.status) {
      case 'pending':
        return 'Waiting...'
      case 'uploading':
        return `Uploading ${item.progress}%`
      case 'completed':
        return 'Uploaded'
      case 'failed':
        return item.error || 'Upload failed'
    }
  }

  return (
    <div className={cn('space-y-2 p-2 bg-muted/50 rounded-lg', className)}>
      {visibleItems.map(item => (
        <div
          key={item.id}
          className="flex items-center gap-3 p-2 bg-background rounded-md"
        >
          {/* Thumbnail */}
          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
            {item.file.type.startsWith('image/') ? (
              <img
                src={URL.createObjectURL(item.file)}
                alt={item.file.name}
                className="w-full h-full object-cover rounded"
              />
            ) : (
              getStatusIcon(item.status)
            )}
          </div>

          {/* File info and progress */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium truncate">
                {item.file.name}
              </span>
              <span className="text-xs text-muted-foreground ml-2">
                {(item.file.size / 1024 / 1024).toFixed(2)}MB
              </span>
            </div>
            
            {item.status === 'uploading' && (
              <Progress value={item.progress} className="h-1.5" />
            )}
            
            <div className="flex items-center gap-2 mt-1">
              {getStatusIcon(item.status)}
              <span className="text-xs text-muted-foreground">
                {getStatusText(item)}
              </span>
              {item.retryCount > 0 && (
                <span className="text-xs text-orange-500">
                  (Retry {item.retryCount}/{item.maxRetries})
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {item.status === 'failed' && item.retryCount < item.maxRetries && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => handleRetry(item)}
                title="Retry upload"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
            
            {(item.status === 'pending' || item.status === 'uploading' || item.status === 'failed') && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => handleCancel(item)}
                title={item.status === 'uploading' ? 'Cancel upload' : 'Remove'}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}