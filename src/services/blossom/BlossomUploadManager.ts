import { BlossomService, type BlobDescriptor } from './BlossomService'

export interface UploadTask {
  id: string
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'failed'
  error?: Error
  url?: string
  descriptor?: BlobDescriptor
  retryCount: number
  timestamp: number
}

export interface UploadManagerOptions {
  maxConcurrentUploads?: number
  maxRetries?: number
  retryDelay?: number
}

export class BlossomUploadManager {
  private static instance: BlossomUploadManager | null = null
  private uploadQueue: Map<string, UploadTask> = new Map()
  private activeUploads: Set<string> = new Set()
  private blossomService: BlossomService
  private options: Required<UploadManagerOptions>
  private listeners: Map<string, Set<(task: UploadTask) => void>> = new Map()

  private constructor(options: UploadManagerOptions = {}) {
    this.blossomService = BlossomService.getInstance()
    this.options = {
      maxConcurrentUploads: options.maxConcurrentUploads ?? 3,
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 1000,
    }
  }

  static getInstance(options?: UploadManagerOptions): BlossomUploadManager {
    if (!BlossomUploadManager.instance) {
      BlossomUploadManager.instance = new BlossomUploadManager(options)
    }
    return BlossomUploadManager.instance
  }

  async addToQueue(files: File[]): Promise<string[]> {
    const taskIds: string[] = []

    for (const file of files) {
      const id = this.generateTaskId()
      const task: UploadTask = {
        id,
        file,
        progress: 0,
        status: 'pending',
        retryCount: 0,
        timestamp: Date.now(),
      }

      this.uploadQueue.set(id, task)
      taskIds.push(id)
      this.notifyListeners(id, task)
    }

    // Start processing the queue
    this.processQueue()

    return taskIds
  }

  private async processQueue(): Promise<void> {
    // Check if we can start more uploads
    while (
      this.activeUploads.size < this.options.maxConcurrentUploads &&
      this.hasPendingTasks()
    ) {
      const nextTask = this.getNextPendingTask()
      if (!nextTask) break

      this.activeUploads.add(nextTask.id)
      this.processTask(nextTask.id)
    }
  }

  private async processTask(taskId: string): Promise<void> {
    const task = this.uploadQueue.get(taskId)
    if (!task) return

    try {
      task.status = 'uploading'
      this.notifyListeners(taskId, task)

      const result = await this.blossomService.uploadFile(task.file, {
        onProgress: (progress) => {
          task.progress = progress
          this.notifyListeners(taskId, task)
        },
        onError: (error) => {
          console.error(`Upload error for ${task.file.name}:`, error)
        },
      })

      task.status = 'completed'
      task.progress = 100
      task.url = result.url
      task.descriptor = result.descriptor
      this.notifyListeners(taskId, task)

      // Create file metadata event
      await this.blossomService.createFileMetadataEvent(
        result.url,
        task.file,
        result.descriptor
      )
    } catch (error) {
      task.error = error instanceof Error ? error : new Error('Upload failed')
      task.retryCount++

      if (task.retryCount < this.options.maxRetries) {
        // Schedule retry
        task.status = 'pending'
        setTimeout(() => {
          this.processTask(taskId)
        }, this.options.retryDelay * Math.pow(2, task.retryCount - 1))
      } else {
        task.status = 'failed'
        this.notifyListeners(taskId, task)
      }
    } finally {
      this.activeUploads.delete(taskId)
      // Process next task in queue
      this.processQueue()
    }
  }

  cancelUpload(taskId: string): void {
    const task = this.uploadQueue.get(taskId)
    if (!task) return

    if (task.status === 'uploading') {
      // TODO: Implement actual upload cancellation
      task.status = 'failed'
      task.error = new Error('Upload cancelled')
      this.activeUploads.delete(taskId)
      this.notifyListeners(taskId, task)
      this.processQueue()
    } else if (task.status === 'pending') {
      this.uploadQueue.delete(taskId)
    }
  }

  retryUpload(taskId: string): void {
    const task = this.uploadQueue.get(taskId)
    if (!task || task.status !== 'failed') return

    task.status = 'pending'
    task.retryCount = 0
    task.error = undefined
    this.notifyListeners(taskId, task)
    this.processQueue()
  }

  clearCompleted(): void {
    for (const [id, task] of this.uploadQueue.entries()) {
      if (task.status === 'completed') {
        this.uploadQueue.delete(id)
      }
    }
  }

  getTask(taskId: string): UploadTask | undefined {
    return this.uploadQueue.get(taskId)
  }

  getAllTasks(): UploadTask[] {
    return Array.from(this.uploadQueue.values())
  }

  subscribe(taskId: string, callback: (task: UploadTask) => void): () => void {
    if (!this.listeners.has(taskId)) {
      this.listeners.set(taskId, new Set())
    }
    this.listeners.get(taskId)!.add(callback)

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(taskId)
      if (callbacks) {
        callbacks.delete(callback)
        if (callbacks.size === 0) {
          this.listeners.delete(taskId)
        }
      }
    }
  }

  subscribeToAll(callback: (task: UploadTask) => void): () => void {
    const subscriptions: (() => void)[] = []
    
    // Subscribe to existing tasks
    for (const taskId of this.uploadQueue.keys()) {
      subscriptions.push(this.subscribe(taskId, callback))
    }

    // Return unsubscribe function
    return () => {
      subscriptions.forEach(unsubscribe => unsubscribe())
    }
  }

  private notifyListeners(taskId: string, task: UploadTask): void {
    const callbacks = this.listeners.get(taskId)
    if (callbacks) {
      callbacks.forEach(callback => callback(task))
    }
  }

  private hasPendingTasks(): boolean {
    return Array.from(this.uploadQueue.values()).some(
      task => task.status === 'pending'
    )
  }

  private getNextPendingTask(): UploadTask | null {
    for (const task of this.uploadQueue.values()) {
      if (task.status === 'pending') {
        return task
      }
    }
    return null
  }

  private generateTaskId(): string {
    return `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}