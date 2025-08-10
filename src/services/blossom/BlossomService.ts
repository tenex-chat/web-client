import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk'
import NDKBlossom from '@nostr-dev-kit/ndk-blossom'
import imageCompression from 'browser-image-compression'
import { encode } from 'blurhash'

export interface BlobDescriptor {
  sha256: string
  size: number
  mimeType: string
}

export interface UploadOptions {
  file: File
  onProgress?: (progress: number) => void
  onError?: (error: Error) => void
  onComplete?: (url: string, descriptor: BlobDescriptor, metadata?: FileMetadata) => void
  compress?: boolean
  maxSizeMB?: number
  maxWidthOrHeight?: number
  abortSignal?: AbortSignal
  retryCount?: number
}

export interface FileMetadata {
  sha256: string
  blurhash?: string
  width?: number
  height?: number
  size: number
  mimeType: string
  originalName: string
}

export interface BlossomServer {
  url: string
  name: string
  supportsAuth: boolean
  maxFileSize?: number
}

export interface BatchUploadOptions {
  files: File[]
  onProgress?: (fileIndex: number, progress: number) => void
  onFileComplete?: (fileIndex: number, url: string, metadata: FileMetadata) => void
  onFileError?: (fileIndex: number, error: Error) => void
  onAllComplete?: (results: Array<{ url: string; metadata: FileMetadata } | Error>) => void
  compress?: boolean
  maxSizeMB?: number
  maxWidthOrHeight?: number
  maxConcurrent?: number
}

export class BlossomService {
  private static instance: BlossomService | null = null
  private blossomClient: NDKBlossom | null = null
  private uploadAbortControllers = new Map<string, AbortController>()
  
  private defaultServers: BlossomServer[] = [
    {
      url: 'https://blossom.primal.net',
      name: 'Primal Blossom',
      supportsAuth: true,
      maxFileSize: 10 * 1024 * 1024 // 10MB
    },
    {
      url: 'https://nostr.build',
      name: 'nostr.build',
      supportsAuth: true,
      maxFileSize: 100 * 1024 * 1024 // 100MB
    },
    {
      url: 'https://files.satellite.earth',
      name: 'Satellite Files',
      supportsAuth: true,
      maxFileSize: 20 * 1024 * 1024 // 20MB
    },
    {
      url: 'https://blossom.oxtr.dev',
      name: 'Oxtr Blossom',
      supportsAuth: true,
      maxFileSize: 50 * 1024 * 1024 // 50MB
    }
  ]

  private supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  private maxUploadSize = 10 * 1024 * 1024 // 10MB default
  private compressionThreshold = 2 * 1024 * 1024 // 2MB

  private constructor() {}

  static getInstance(): BlossomService {
    if (!BlossomService.instance) {
      BlossomService.instance = new BlossomService()
    }
    return BlossomService.instance
  }

  async initialize(ndk: any): Promise<void> {
    if (this.blossomClient) return
    
    const signer = ndk.signer
    if (!signer) {
      throw new Error('NDK signer not available')
    }

    this.blossomClient = new NDKBlossom(ndk)
  }

  async uploadFile(
    file: File,
    options: Partial<UploadOptions> = {}
  ): Promise<{ url: string; descriptor: BlobDescriptor; metadata: FileMetadata }> {
    if (!this.blossomClient) {
      throw new Error('BlossomService not initialized')
    }

    const { 
      onProgress, 
      onError, 
      onComplete,
      compress = true,
      maxSizeMB = 10,
      maxWidthOrHeight = 4096,
      abortSignal,
      retryCount = 0
    } = options

    // Create upload ID for tracking
    const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const abortController = new AbortController()
    this.uploadAbortControllers.set(uploadId, abortController)

    // Link external abort signal if provided
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        abortController.abort()
        this.uploadAbortControllers.delete(uploadId)
      })
    }

    try {
      // Check if upload was aborted
      if (abortController.signal.aborted) {
        throw new Error('Upload aborted')
      }

      // Validate file
      this.validateFile(file)

      // Compress image if needed
      let processedFile = file
      if (compress && this.isImage(file) && file.size > this.compressionThreshold) {
        onProgress?.(5) // Show initial progress for compression
        processedFile = await this.compressImage(file, maxSizeMB, maxWidthOrHeight)
      }

      // Generate metadata including blurhash
      const metadata = await this.generateFileMetadata(processedFile)
      
      // Calculate file hash
      const buffer = await processedFile.arrayBuffer()
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      metadata.sha256 = sha256

      // Find a suitable server
      const server = await this.selectServer(processedFile.size)
      if (!server) {
        throw new Error('No suitable Blossom server available')
      }

      // Upload the file
      onProgress?.(10) // Show we're starting upload
      
      // Create file from buffer
      const uploadFile = new File([buffer], processedFile.name, { type: processedFile.type })
      
      // Upload using NDKBlossom with abort support
      await this.blossomClient.upload(uploadFile, {
        server: server.url,
        onProgress: (progress: { loaded: number; total: number }) => {
          // Check if aborted during upload
          if (abortController.signal.aborted) {
            return 'abort'
          }
          const uploadProgress = Math.round((progress.loaded / progress.total) * 90) + 10
          onProgress?.(uploadProgress)
          return 'continue'
        }
      })

      // Clean up abort controller
      this.uploadAbortControllers.delete(uploadId)
      
      const descriptor: BlobDescriptor = {
        sha256,
        size: processedFile.size,
        mimeType: processedFile.type
      }

      const url = `${server.url}/${sha256}`
      
      onComplete?.(url, descriptor, metadata)
      
      return { url, descriptor, metadata }
    } catch (error) {
      // Clean up abort controller
      this.uploadAbortControllers.delete(uploadId)

      // Handle retries for non-abort errors
      if (retryCount > 0 && error instanceof Error && !error.message.includes('abort')) {
        console.log(`Retrying upload, ${retryCount} attempts remaining...`)
        return this.uploadFile(file, { ...options, retryCount: retryCount - 1 })
      }

      const err = error instanceof Error ? error : new Error('Upload failed')
      onError?.(err)
      throw err
    }
  }

  async uploadBatch(options: BatchUploadOptions): Promise<Array<{ url: string; metadata: FileMetadata } | Error>> {
    const {
      files,
      onProgress,
      onFileComplete,
      onFileError,
      onAllComplete,
      compress = true,
      maxSizeMB = 10,
      maxWidthOrHeight = 4096,
      maxConcurrent = 3
    } = options

    const results: Array<{ url: string; metadata: FileMetadata } | Error> = []
    const uploadPromises: Array<Promise<void>> = []

    // Process files in batches
    for (let i = 0; i < files.length; i += maxConcurrent) {
      const batch = files.slice(i, i + maxConcurrent)
      const batchPromises = batch.map(async (file, batchIndex) => {
        const fileIndex = i + batchIndex
        try {
          const result = await this.uploadFile(file, {
            compress,
            maxSizeMB,
            maxWidthOrHeight,
            onProgress: (progress) => onProgress?.(fileIndex, progress),
            retryCount: 2 // Automatic retries for batch uploads
          })

          results[fileIndex] = { url: result.url, metadata: result.metadata }
          onFileComplete?.(fileIndex, result.url, result.metadata)
        } catch (error) {
          const err = error instanceof Error ? error : new Error('Upload failed')
          results[fileIndex] = err
          onFileError?.(fileIndex, err)
        }
      })

      await Promise.all(batchPromises)
    }

    onAllComplete?.(results)
    return results
  }

  cancelUpload(uploadId: string): void {
    const controller = this.uploadAbortControllers.get(uploadId)
    if (controller) {
      controller.abort()
      this.uploadAbortControllers.delete(uploadId)
    }
  }

  cancelAllUploads(): void {
    this.uploadAbortControllers.forEach(controller => controller.abort())
    this.uploadAbortControllers.clear()
  }

  async selectServer(fileSize: number): Promise<BlossomServer | null> {
    // Filter servers that can handle the file size
    const suitableServers = this.defaultServers.filter(
      server => !server.maxFileSize || fileSize <= server.maxFileSize
    )

    if (suitableServers.length === 0) {
      return null
    }

    // For now, return the first suitable server
    // TODO: Implement server health checks and selection algorithm
    return suitableServers[0]
  }

  private validateFile(file: File): void {
    if (file.size > this.maxUploadSize) {
      throw new Error(`File size exceeds maximum of ${this.maxUploadSize / 1024 / 1024}MB`)
    }

    if (this.isImage(file) && !this.supportedImageTypes.includes(file.type)) {
      throw new Error(`Unsupported image type: ${file.type}`)
    }
  }

  private isImage(file: File): boolean {
    return file.type.startsWith('image/')
  }

  private async compressImage(
    file: File,
    maxSizeMB: number,
    maxWidthOrHeight: number
  ): Promise<File> {
    const options = {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker: true,
      preserveExif: false
    }

    try {
      const compressedFile = await imageCompression(file, options)
      return new File([compressedFile], file.name, { type: compressedFile.type })
    } catch (error) {
      console.warn('Image compression failed, using original', error)
      return file
    }
  }

  private async generateFileMetadata(file: File): Promise<FileMetadata> {
    const metadata: FileMetadata = {
      sha256: '', // Will be filled later
      size: file.size,
      mimeType: file.type,
      originalName: file.name
    }

    if (this.isImage(file)) {
      const dimensions = await this.getImageDimensions(file)
      if (dimensions) {
        metadata.width = dimensions.width
        metadata.height = dimensions.height

        // Generate blurhash for images
        try {
          metadata.blurhash = await this.generateBlurhash(file, dimensions)
        } catch (error) {
          console.warn('Blurhash generation failed', error)
        }
      }
    }

    return metadata
  }

  private async generateBlurhash(
    file: File,
    dimensions: { width: number; height: number }
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          if (!context) {
            reject(new Error('Could not get canvas context'))
            return
          }

          // Use smaller dimensions for blurhash calculation
          const maxDim = 64
          const scale = Math.min(maxDim / dimensions.width, maxDim / dimensions.height, 1)
          canvas.width = Math.floor(dimensions.width * scale)
          canvas.height = Math.floor(dimensions.height * scale)

          context.drawImage(img, 0, 0, canvas.width, canvas.height)
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

          const blurhash = encode(
            imageData.data,
            canvas.width,
            canvas.height,
            4, // x components
            3  // y components
          )

          URL.revokeObjectURL(img.src)
          resolve(blurhash)
        } catch (error) {
          reject(error)
        }
      }
      img.onerror = () => {
        URL.revokeObjectURL(img.src)
        reject(new Error('Failed to load image for blurhash'))
      }
      img.src = URL.createObjectURL(file)
    })
  }

  async createFileMetadataEvent(
    url: string,
    metadata: FileMetadata
  ): Promise<NDKEvent | null> {
    if (!this.blossomClient) return null

    const ndk = (this.blossomClient as any).ndk
    if (!ndk) return null

    // Create NIP-94 file metadata event
    const event = new NDKEvent(ndk)
    event.kind = 1063 as NDKKind // File metadata kind
    event.content = metadata.originalName
    event.tags = [
      ['url', url],
      ['m', metadata.mimeType],
      ['size', metadata.size.toString()],
      ['x', metadata.sha256],
    ]

    // Add image-specific metadata
    if (metadata.width && metadata.height) {
      event.tags.push(['dim', `${metadata.width}x${metadata.height}`])
    }
    
    if (metadata.blurhash) {
      event.tags.push(['blurhash', metadata.blurhash])
    }

    await event.sign()
    await event.publish()

    return event
  }

  private async getImageDimensions(
    file: File
  ): Promise<{ width: number; height: number } | null> {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        resolve({ width: img.width, height: img.height })
      }
      img.onerror = () => {
        resolve(null)
      }
      img.src = URL.createObjectURL(file)
    })
  }

  getServers(): BlossomServer[] {
    return this.defaultServers
  }

  addServer(server: BlossomServer): void {
    if (!this.defaultServers.find(s => s.url === server.url)) {
      this.defaultServers.push(server)
    }
  }

  removeServer(url: string): void {
    this.defaultServers = this.defaultServers.filter(s => s.url !== url)
  }
}