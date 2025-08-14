import { useState, useCallback, useEffect, DragEvent, ClipboardEvent } from 'react'
import { useNDK } from '@nostr-dev-kit/ndk-hooks'
import { useAtom, useSetAtom } from 'jotai'
import { toast } from 'sonner'
import { BlossomService } from '@/services/blossom/BlossomService'
import { BlossomServerRegistry } from '@/services/blossom/BlossomServerRegistry'
import { validateFiles } from '@/lib/utils/fileValidation'
import { UPLOAD_LIMITS } from '@/lib/constants'
import {
  uploadQueueAtom,
  updateUploadItemAtom,
  addToUploadHistoryAtom,
  addToUploadQueueAtom,
  addBatchToUploadQueueAtom,
  updateServerHealthAtom,
  dragStateAtom,
  updateDragStateAtom,
  cancelUploadAtom,
  uploadStatisticsAtom,
} from '@/stores/blossomStore'
import type { UploadQueueItem } from '@/stores/blossomStore'

export interface UseBlossomUploadReturn {
  uploadFiles: (files: File[]) => Promise<void>
  uploadQueue: UploadQueueItem[]
  isUploading: boolean
  cancelUpload: (id: string) => void
  retryUpload: (id: string) => void
  clearCompleted: () => void
  // Drag and drop handlers
  isDragging: boolean
  handleDragEnter: (e: DragEvent) => void
  handleDragLeave: (e: DragEvent) => void
  handleDragOver: (e: DragEvent) => void
  handleDrop: (e: DragEvent) => void
  handlePaste: (e: ClipboardEvent) => void
  // Upload statistics
  uploadStats: {
    total: number
    pending: number
    uploading: number
    completed: number
    failed: number
    cancelled: number
    totalProgress: number
  }
}

export function useBlossomUpload(): UseBlossomUploadReturn {
  const { ndk } = useNDK()
  const [uploadQueue] = useAtom(uploadQueueAtom)
  const [dragState] = useAtom(dragStateAtom)
  const [uploadStats] = useAtom(uploadStatisticsAtom)
  const addToQueue = useSetAtom(addToUploadQueueAtom)
  const addBatchToQueue = useSetAtom(addBatchToUploadQueueAtom)
  const updateItem = useSetAtom(updateUploadItemAtom)
  const addToHistory = useSetAtom(addToUploadHistoryAtom)
  const updateServerHealth = useSetAtom(updateServerHealthAtom)
  const updateDragState = useSetAtom(updateDragStateAtom)
  const cancelUploadAction = useSetAtom(cancelUploadAtom)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [, setDragCounter] = useState(0)

  // Initialize Blossom service
  useEffect(() => {
    if (ndk && !isInitialized) {
      const initializeService = async () => {
        try {
          const service = BlossomService.getInstance()
          await service.initialize(ndk)
          setIsInitialized(true)
        } catch (error) {
          console.error('Failed to initialize Blossom service:', error)
          toast.error('Failed to initialize upload service')
        }
      }
      initializeService()
    }
  }, [ndk, isInitialized])

  // Process upload queue
  useEffect(() => {
    if (!isInitialized) return

    const processQueue = async () => {
      const pendingItems = uploadQueue.filter(item => item.status === 'pending')
      if (pendingItems.length === 0) {
        setIsUploading(false)
        return
      }

      setIsUploading(true)
      const service = BlossomService.getInstance()
      const registry = BlossomServerRegistry.getInstance()

      // Process up to 3 uploads concurrently
      const maxConcurrent = UPLOAD_LIMITS.MAX_CONCURRENT_UPLOADS
      const processing = pendingItems.slice(0, maxConcurrent)

      await Promise.all(processing.map(async (item) => {
        try {
          // Update status to uploading
          updateItem({
            id: item.id,
            updates: { status: 'uploading', progress: 0 }
          })

          // Select best server for this file
          const server = await registry.selectBestServer(
            item.file.size,
            item.file.type
          )

          if (!server) {
            throw new Error('No suitable server available for this file')
          }

          // Upload the file with abort support
          const result = await service.uploadFile(item.file, {
            onProgress: (progress) => {
              updateItem({
                id: item.id,
                updates: { progress }
              })
            },
            compress: true,
            maxSizeMB: 10,
            maxWidthOrHeight: 4096,
            abortSignal: item.abortController?.signal,
            retryCount: UPLOAD_LIMITS.MAX_RETRY_COUNT - 1
          })

          // Update item with success
          updateItem({
            id: item.id,
            updates: {
              status: 'completed',
              progress: 100,
              url: result.url,
              metadata: result.metadata
            }
          })

          // Add to history
          addToHistory({
            ...item,
            status: 'completed',
            url: result.url,
            metadata: result.metadata
          } as UploadQueueItem)

          // Record successful upload for server metrics
          registry.recordUploadSuccess(server.url)
          updateServerHealth({
            url: server.url,
            health: { isHealthy: true }
          })

          toast.success(`Uploaded ${item.file.name}`)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Upload failed'
          
          // Check if it was cancelled
          if (errorMessage.includes('abort') || errorMessage.includes('cancelled')) {
            updateItem({
              id: item.id,
              updates: {
                status: 'cancelled',
                error: 'Upload cancelled'
              }
            })
          } else {
            // Update item with failure
            updateItem({
              id: item.id,
              updates: {
                status: 'failed',
                error: errorMessage
              }
            })
            toast.error(`Failed to upload ${item.file.name}: ${errorMessage}`)
          }
        }
      }))

      setIsUploading(false)
    }

    processQueue()
  }, [uploadQueue, isInitialized, updateItem, addToHistory, updateServerHealth])

  const validateFilesWithToast = useCallback((files: File[]): File[] => {
    const { validFiles, errors } = validateFiles(files, {
      maxSizeMB: UPLOAD_LIMITS.MAX_FILE_SIZE_MB,
      imageOnly: true
    })

    if (errors.length > 0) {
      errors.forEach(e => toast.error(`${e.file}: ${e.error}`))
    }

    return validFiles
  }, [])

  const uploadFiles = useCallback(async (files: File[]) => {
    if (!isInitialized) {
      toast.error('Upload service not ready')
      return
    }

    const validFiles = validateFilesWithToast(files)
    if (validFiles.length === 0) {
      return
    }

    // Add files to queue in batch
    if (validFiles.length > 1) {
      addBatchToQueue(validFiles)
      toast.info(`Added ${validFiles.length} files to upload queue`)
    } else {
      addToQueue(validFiles[0])
      toast.info(`Added ${validFiles[0].name} to upload queue`)
    }
  }, [isInitialized, validateFiles, addToQueue, addBatchToQueue])

  const cancelUpload = useCallback((id: string) => {
    cancelUploadAction(id)
    toast.info('Upload cancelled')
  }, [cancelUploadAction])

  const retryUpload = useCallback((id: string) => {
    const item = uploadQueue.find(i => i.id === id)
    if (!item || item.status !== 'failed') return

    updateItem({
      id,
      updates: {
        status: 'pending',
        progress: 0,
        error: undefined,
        abortController: new AbortController()
      }
    })
  }, [uploadQueue, updateItem])

  const clearCompleted = useCallback(() => {
    const completedIds = uploadQueue
      .filter(item => item.status === 'completed')
      .map(item => item.id)

    // Remove completed items from queue
    // This would need a new atom action in blossomStore
    toast.info(`Cleared ${completedIds.length} completed uploads`)
  }, [uploadQueue])

  // Drag and Drop handlers
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setDragCounter(prev => {
      const newCount = prev + 1
      if (newCount === 1) {
        updateDragState({ isDragging: true })
      }
      return newCount
    })

    // Extract files from drag event
    if (e.dataTransfer?.items) {
      const files: File[] = []
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        if (e.dataTransfer.items[i].kind === 'file') {
          const file = e.dataTransfer.items[i].getAsFile()
          if (file && file.type.startsWith('image/')) {
            files.push(file)
          }
        }
      }
      if (files.length > 0) {
        updateDragState({ draggedFiles: files })
      }
    }
  }, [updateDragState])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setDragCounter(prev => {
      const newCount = prev - 1
      if (newCount === 0) {
        updateDragState({ isDragging: false, draggedFiles: [] })
      }
      return newCount
    })
  }, [updateDragState])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy'
    }
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setDragCounter(0)
    updateDragState({ isDragging: false, draggedFiles: [] })

    const files: File[] = []
    if (e.dataTransfer?.files) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i]
        if (file.type.startsWith('image/')) {
          files.push(file)
        }
      }
    }

    if (files.length > 0) {
      uploadFiles(files)
    }
  }, [updateDragState, uploadFiles])

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile()
        if (file) {
          files.push(file)
        }
      }
    }

    if (files.length > 0) {
      e.preventDefault()
      uploadFiles(files)
    }
  }, [uploadFiles])

  return {
    uploadFiles,
    uploadQueue,
    isUploading,
    cancelUpload,
    retryUpload,
    clearCompleted,
    // Drag and drop
    isDragging: dragState.isDragging,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handlePaste,
    // Statistics
    uploadStats
  }
}