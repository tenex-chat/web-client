import { atom } from 'jotai'
import type { BlossomServerInfo } from '@/services/blossom/BlossomServerRegistry'
import { UPLOAD_LIMITS } from '@/lib/constants'

export interface UploadQueueItem {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled'
  progress: number
  url?: string
  error?: string
  metadata?: {
    sha256: string
    blurhash?: string
    width?: number
    height?: number
    size: number
    mimeType: string
  }
  retryCount: number
  maxRetries: number
  abortController?: AbortController
  thumbnail?: string
}

export interface ServerHealth {
  url: string
  isHealthy: boolean
  lastChecked: number
  responseTime?: number
  error?: string
}

// Drag state management
export interface DragState {
  isDragging: boolean
  draggedFiles: File[]
  dropZoneId?: string
}

// Upload queue atom
export const uploadQueueAtom = atom<UploadQueueItem[]>([])

// Drag state atom
export const dragStateAtom = atom<DragState>({
  isDragging: false,
  draggedFiles: []
})

// Server configurations atom
export const blossomServersAtom = atom<BlossomServerInfo[]>([])

// Server health status atom
export const serverHealthAtom = atom<Map<string, ServerHealth>>(new Map())

// Active uploads count atom
export const activeUploadsAtom = atom(
  (get) => get(uploadQueueAtom).filter(item => item.status === 'uploading').length
)

// Failed uploads atom
export const failedUploadsAtom = atom(
  (get) => get(uploadQueueAtom).filter(item => item.status === 'failed')
)

// Upload history atom (last 50 successful uploads)
export const uploadHistoryAtom = atom<Array<{
  id: string
  url: string
  filename: string
  uploadedAt: number
  metadata?: UploadQueueItem['metadata']
}>>([])

// Add item to upload queue
export const addToUploadQueueAtom = atom(
  null,
  (get, set, file: File) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newItem: UploadQueueItem = {
      id,
      file,
      status: 'pending',
      progress: 0,
      retryCount: 0,
      maxRetries: UPLOAD_LIMITS.MAX_RETRY_COUNT,
      abortController: new AbortController()
    }
    
    // Generate thumbnail for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => {
        set(updateUploadItemAtom, {
          id,
          updates: { thumbnail: reader.result as string }
        })
      }
      reader.readAsDataURL(file)
    }
    
    set(uploadQueueAtom, [...get(uploadQueueAtom), newItem])
    return id
  }
)

// Add batch of items to upload queue
export const addBatchToUploadQueueAtom = atom(
  null,
  (get, set, files: File[]) => {
    const newItems: UploadQueueItem[] = files.map(file => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const item: UploadQueueItem = {
        id,
        file,
        status: 'pending',
        progress: 0,
        retryCount: 0,
        maxRetries: UPLOAD_LIMITS.MAX_RETRY_COUNT,
        abortController: new AbortController()
      }
      
      // Generate thumbnails asynchronously
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = () => {
          set(updateUploadItemAtom, {
            id,
            updates: { thumbnail: reader.result as string }
          })
        }
        reader.readAsDataURL(file)
      }
      
      return item
    })
    
    set(uploadQueueAtom, [...get(uploadQueueAtom), ...newItems])
    return newItems.map(item => item.id)
  }
)

// Update upload item status
export const updateUploadItemAtom = atom(
  null,
  (get, set, { id, updates }: { id: string; updates: Partial<UploadQueueItem> }) => {
    set(
      uploadQueueAtom,
      get(uploadQueueAtom).map(item =>
        item.id === id ? { ...item, ...updates } : item
      )
    )
  }
)

// Remove upload item
export const removeUploadItemAtom = atom(
  null,
  (get, set, id: string) => {
    set(
      uploadQueueAtom,
      get(uploadQueueAtom).filter(item => item.id !== id)
    )
  }
)

// Add to upload history
export const addToUploadHistoryAtom = atom(
  null,
  (get, set, item: UploadQueueItem) => {
    if (item.url && item.status === 'completed') {
      const historyItem = {
        id: item.id,
        url: item.url,
        filename: item.file.name,
        uploadedAt: Date.now(),
        metadata: item.metadata
      }
      
      const history = get(uploadHistoryAtom)
      // Keep only last 50 items
      set(uploadHistoryAtom, [historyItem, ...history].slice(0, 50))
    }
  }
)

// Update server health status
export const updateServerHealthAtom = atom(
  null,
  (get, set, { url, health }: { url: string; health: Partial<ServerHealth> }) => {
    const currentHealth = get(serverHealthAtom)
    const newHealth = new Map(currentHealth)
    
    newHealth.set(url, {
      url,
      isHealthy: health.isHealthy ?? false,
      lastChecked: Date.now(),
      responseTime: health.responseTime,
      error: health.error
    })
    
    set(serverHealthAtom, newHealth)
  }
)

// Get healthy servers sorted by response time
export const healthyServersAtom = atom((get) => {
  const servers = get(blossomServersAtom)
  const health = get(serverHealthAtom)
  
  return servers
    .filter(server => {
      const serverHealth = health.get(server.url)
      return serverHealth?.isHealthy ?? true // Default to healthy if not checked
    })
    .sort((a, b) => {
      const healthA = health.get(a.url)
      const healthB = health.get(b.url)
      const timeA = healthA?.responseTime ?? Infinity
      const timeB = healthB?.responseTime ?? Infinity
      return timeA - timeB
    })
})

// Retry failed upload
export const retryUploadAtom = atom(
  null,
  (get, set, id: string) => {
    const item = get(uploadQueueAtom).find(i => i.id === id)
    if (item && item.status === 'failed' && item.retryCount < item.maxRetries) {
      set(updateUploadItemAtom, {
        id,
        updates: {
          status: 'pending',
          progress: 0,
          error: undefined,
          retryCount: item.retryCount + 1
        }
      })
    }
  }
)

// Clear completed uploads
export const clearCompletedUploadsAtom = atom(
  null,
  (get, set) => {
    set(
      uploadQueueAtom,
      get(uploadQueueAtom).filter(item => item.status !== 'completed')
    )
  }
)

// Cancel upload
export const cancelUploadAtom = atom(
  null,
  (get, set, id: string) => {
    const item = get(uploadQueueAtom).find(i => i.id === id)
    if (item && item.abortController) {
      item.abortController.abort()
      set(updateUploadItemAtom, {
        id,
        updates: { status: 'cancelled', error: 'Upload cancelled by user' }
      })
    }
  }
)

// Cancel all uploads
export const cancelAllUploadsAtom = atom(
  null,
  (get, set) => {
    const items = get(uploadQueueAtom)
    items.forEach(item => {
      if (item.status === 'uploading' || item.status === 'pending') {
        item.abortController?.abort()
        set(updateUploadItemAtom, {
          id: item.id,
          updates: { status: 'cancelled', error: 'All uploads cancelled' }
        })
      }
    })
  }
)

// Update drag state
export const updateDragStateAtom = atom(
  null,
  (get, set, updates: Partial<DragState>) => {
    set(dragStateAtom, { ...get(dragStateAtom), ...updates })
  }
)

// Get upload statistics
export const uploadStatisticsAtom = atom((get) => {
  const queue = get(uploadQueueAtom)
  return {
    total: queue.length,
    pending: queue.filter(i => i.status === 'pending').length,
    uploading: queue.filter(i => i.status === 'uploading').length,
    completed: queue.filter(i => i.status === 'completed').length,
    failed: queue.filter(i => i.status === 'failed').length,
    cancelled: queue.filter(i => i.status === 'cancelled').length,
    totalProgress: queue.reduce((acc, item) => {
      if (item.status === 'uploading') return acc + item.progress
      if (item.status === 'completed') return acc + 100
      return acc
    }, 0) / Math.max(queue.length, 1)
  }
})