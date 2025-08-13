/**
 * Centralized file validation utilities
 */

export interface FileValidationOptions {
  maxSizeMB?: number
  allowedTypes?: string[]
  imageOnly?: boolean
}

export interface FileValidationResult {
  valid: boolean
  error?: string
}

const DEFAULT_MAX_SIZE_MB = 100
const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp'
]

/**
 * Check if a file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

/**
 * Validate a single file
 */
export function validateFile(
  file: File,
  options: FileValidationOptions = {}
): FileValidationResult {
  const {
    maxSizeMB = DEFAULT_MAX_SIZE_MB,
    allowedTypes = SUPPORTED_IMAGE_TYPES,
    imageOnly = true
  } = options

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File is too large (max ${maxSizeMB}MB)`
    }
  }

  // Check if image-only mode
  if (imageOnly && !isImageFile(file)) {
    return {
      valid: false,
      error: 'File is not an image'
    }
  }

  // Check allowed types
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type: ${file.type}`
    }
  }

  return { valid: true }
}

/**
 * Validate multiple files
 */
export function validateFiles(
  files: File[],
  options: FileValidationOptions = {}
): {
  validFiles: File[]
  errors: Array<{ file: string; error: string }>
} {
  const validFiles: File[] = []
  const errors: Array<{ file: string; error: string }> = []

  for (const file of files) {
    const result = validateFile(file, options)
    if (result.valid) {
      validFiles.push(file)
    } else {
      errors.push({
        file: file.name,
        error: result.error || 'Invalid file'
      })
    }
  }

  return { validFiles, errors }
}

/**
 * Get human-readable file size
 */
export function getFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 Bytes'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}