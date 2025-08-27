import { describe, it, expect } from 'vitest'
import { 
  isImageFile, 
  validateFile, 
  validateFiles,
  getFileSize,
  DEFAULT_MAX_SIZE_MB
} from './fileValidation'

describe('fileValidation', () => {
  describe('isImageFile', () => {
    it('returns true for image files', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
      expect(isImageFile(file)).toBe(true)
    })
    
    it('returns false for non-image files', () => {
      const file = new File([''], 'test.pdf', { type: 'application/pdf' })
      expect(isImageFile(file)).toBe(false)
    })
    
    it('handles various image types', () => {
      const types = ['image/png', 'image/gif', 'image/webp', 'image/svg+xml']
      types.forEach(type => {
        const file = new File([''], 'test', { type })
        expect(isImageFile(file)).toBe(true)
      })
    })
  })
  
  describe('validateFile', () => {
    it('validates file under size limit', () => {
      // Create a small file (1KB)
      const file = new File(['a'.repeat(1024)], 'test.jpg', { type: 'image/jpeg' })
      
      const result = validateFile(file)
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })
    
    it('rejects file over size limit', () => {
      // Mock a large file by overriding the size property
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: (DEFAULT_MAX_SIZE_MB + 1) * 1024 * 1024 })
      
      const result = validateFile(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain(`max ${DEFAULT_MAX_SIZE_MB}MB`)
    })
    
    it('respects custom size limit', () => {
      // Mock a 2MB file
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 2 * 1024 * 1024 })
      
      const result = validateFile(file, { maxSizeMB: 1 })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('max 1MB')
    })
    
    it('rejects non-image files when imageOnly is true', () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      
      const result = validateFile(file, { imageOnly: true })
      expect(result.valid).toBe(false)
      expect(result.error).toBe('File is not an image')
    })
    
    it('accepts non-image files when imageOnly is false', () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      
      const result = validateFile(file, { 
        imageOnly: false,
        allowedTypes: ['application/pdf']
      })
      expect(result.valid).toBe(true)
    })
    
    it('validates against allowed types', () => {
      const file = new File([''], 'test.bmp', { type: 'image/bmp' })
      
      const result = validateFile(file, { 
        allowedTypes: ['image/jpeg', 'image/png']
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Unsupported file type')
    })
  })
  
  describe('validateFiles', () => {
    it('validates multiple files', () => {
      const files = [
        new File(['small'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['small'], 'test2.png', { type: 'image/png' }),
        new File(['small'], 'test3.pdf', { type: 'application/pdf' })
      ]
      
      const result = validateFiles(files)
      
      expect(result.validFiles).toHaveLength(2)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].file).toBe('test3.pdf')
      expect(result.errors[0].error).toBe('File is not an image')
    })
    
    it('handles all valid files', () => {
      const files = [
        new File([''], 'test1.jpg', { type: 'image/jpeg' }),
        new File([''], 'test2.png', { type: 'image/png' })
      ]
      
      const result = validateFiles(files)
      
      expect(result.validFiles).toHaveLength(2)
      expect(result.errors).toHaveLength(0)
    })
    
    it('handles all invalid files', () => {
      // Mock a large file
      const file1 = new File(['test'], 'huge.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file1, 'size', { value: 100 * 1024 * 1024 })
      
      const files = [
        file1,
        new File([''], 'test.pdf', { type: 'application/pdf' })
      ]
      
      const result = validateFiles(files)
      
      expect(result.validFiles).toHaveLength(0)
      expect(result.errors).toHaveLength(2)
    })
  })
  
  describe('getFileSize', () => {
    it('formats bytes correctly', () => {
      expect(getFileSize(0)).toBe('0 Bytes')
      expect(getFileSize(500)).toBe('500 Bytes')
      expect(getFileSize(1024)).toBe('1 KB')
      expect(getFileSize(1536)).toBe('1.5 KB')
      expect(getFileSize(1048576)).toBe('1 MB')
      expect(getFileSize(1572864)).toBe('1.5 MB')
      expect(getFileSize(1073741824)).toBe('1 GB')
    })
    
    it('rounds to 2 decimal places', () => {
      expect(getFileSize(1234567)).toBe('1.18 MB')
      expect(getFileSize(9876543)).toBe('9.42 MB')
    })
  })
})