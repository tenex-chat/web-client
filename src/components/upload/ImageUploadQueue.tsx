import { useAtom } from 'jotai'
import { X, RotateCw, Upload, Check, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  uploadQueueAtom,
  removeUploadItemAtom,
  retryUploadAtom,
  clearCompletedUploadsAtom
} from '@/stores/blossomStore'
import type { UploadQueueItem } from '@/stores/blossomStore'

export function ImageUploadQueue() {
  const [uploadQueue] = useAtom(uploadQueueAtom)
  const [, removeItem] = useAtom(removeUploadItemAtom)
  const [, retryUpload] = useAtom(retryUploadAtom)
  const [, clearCompleted] = useAtom(clearCompletedUploadsAtom)
  const [isCollapsed, setIsCollapsed] = useState(false)

  if (uploadQueue.length === 0) {
    return null
  }

  const activeUploads = uploadQueue.filter(item => item.status === 'uploading')
  const completedUploads = uploadQueue.filter(item => item.status === 'completed')
  const failedUploads = uploadQueue.filter(item => item.status === 'failed')
  const pendingUploads = uploadQueue.filter(item => item.status === 'pending')

  const getStatusIcon = (status: UploadQueueItem['status']) => {
    switch (status) {
      case 'uploading':
        return <Upload className="w-4 h-4 animate-pulse" />
      case 'completed':
        return <Check className="w-4 h-4 text-green-500" />
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <Upload className="w-4 h-4 text-muted-foreground" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-background border rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4" />
          <span className="font-medium text-sm">
            Uploads ({activeUploads.length + pendingUploads.length} active)
          </span>
        </div>
        <div className="flex items-center gap-1">
          {completedUploads.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearCompleted()}
              className="h-7 px-2 text-xs"
            >
              Clear completed
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Upload list */}
      {!isCollapsed && (
        <div className="max-h-96 overflow-y-auto">
          {uploadQueue.map((item) => (
            <div
              key={item.id}
              className={cn(
                "p-3 border-b last:border-b-0",
                item.status === 'failed' && "bg-red-50 dark:bg-red-950/20"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Thumbnail */}
                <div className="w-10 h-10 rounded overflow-hidden bg-muted flex-shrink-0">
                  {item.file.type.startsWith('image/') ? (
                    <img
                      src={URL.createObjectURL(item.file)}
                      alt={item.file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {getStatusIcon(item.status)}
                    </div>
                  )}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">
                      {item.file.name}
                    </p>
                    <div className="flex items-center gap-1">
                      {item.status === 'failed' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => retryUpload(item.id)}
                          title="Retry upload"
                        >
                          <RotateCw className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeItem(item.id)}
                        title="Remove"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(item.file.size)}
                    </span>
                    {getStatusIcon(item.status)}
                    <span className="text-xs text-muted-foreground">
                      {item.status === 'uploading' && `${item.progress}%`}
                      {item.status === 'completed' && 'Completed'}
                      {item.status === 'failed' && 'Failed'}
                      {item.status === 'pending' && 'Waiting...'}
                    </span>
                  </div>

                  {/* Progress bar */}
                  {item.status === 'uploading' && (
                    <Progress value={item.progress} className="h-1 mt-2" />
                  )}

                  {/* Error message */}
                  {item.status === 'failed' && item.error && (
                    <p className="text-xs text-red-500 mt-1">{item.error}</p>
                  )}

                  {/* Success - show URL */}
                  {item.status === 'completed' && item.url && (
                    <div className="mt-1">
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => {
                          navigator.clipboard.writeText(item.url!)
                        }}
                      >
                        Copy URL
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary when collapsed */}
      {isCollapsed && (
        <div className="p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {activeUploads.length > 0 && `${activeUploads.length} uploading`}
              {pendingUploads.length > 0 && `, ${pendingUploads.length} pending`}
              {completedUploads.length > 0 && `, ${completedUploads.length} completed`}
              {failedUploads.length > 0 && `, ${failedUploads.length} failed`}
            </span>
          </div>
          {activeUploads.length > 0 && (
            <Progress 
              value={
                activeUploads.reduce((acc, item) => acc + item.progress, 0) / 
                activeUploads.length
              } 
              className="h-1 mt-2" 
            />
          )}
        </div>
      )}
    </div>
  )
}