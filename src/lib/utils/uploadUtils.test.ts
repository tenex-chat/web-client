import { describe, it, expect } from 'vitest'
import { 
  filterUploadsByStatus, 
  getActiveUploads, 
  getCompletedUploads,
  getFailedUploads,
  formatFileSize,
  getUploadStatusIcon
} from './uploadUtils'
import { UPLOAD_STATUS } from '../constants'

describe('uploadUtils', () => {
  const mockUploads = [
    { id: '1', status: UPLOAD_STATUS.PENDING },
    { id: '2', status: UPLOAD_STATUS.UPLOADING },
    { id: '3', status: UPLOAD_STATUS.COMPLETED },
    { id: '4', status: UPLOAD_STATUS.FAILED },
    { id: '5', status: UPLOAD_STATUS.COMPLETED }
  ]

  describe('filterUploadsByStatus', () => {
    it('should filter uploads by status', () => {
      const completed = filterUploadsByStatus(mockUploads, UPLOAD_STATUS.COMPLETED)
      expect(completed).toHaveLength(2)
      expect(completed[0].id).toBe('3')
      expect(completed[1].id).toBe('5')
    })
  })

  describe('getActiveUploads', () => {
    it('should return pending and uploading items', () => {
      const active = getActiveUploads(mockUploads)
      expect(active).toHaveLength(2)
      expect(active.map(u => u.id)).toEqual(['1', '2'])
    })
  })

  describe('getCompletedUploads', () => {
    it('should return only completed items', () => {
      const completed = getCompletedUploads(mockUploads)
      expect(completed).toHaveLength(2)
      expect(completed.map(u => u.status)).toEqual([UPLOAD_STATUS.COMPLETED, UPLOAD_STATUS.COMPLETED])
    })
  })

  describe('getFailedUploads', () => {
    it('should return only failed items', () => {
      const failed = getFailedUploads(mockUploads)
      expect(failed).toHaveLength(1)
      expect(failed[0].id).toBe('4')
    })
  })

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(500)).toBe('500 B')
      expect(formatFileSize(1500)).toBe('1.5 KB')
      expect(formatFileSize(1500000)).toBe('1.4 MB')
      expect(formatFileSize(1500000000)).toBe('1.4 GB')
    })
  })

  describe('getUploadStatusIcon', () => {
    it('should return correct icons for statuses', () => {
      expect(getUploadStatusIcon(UPLOAD_STATUS.PENDING)).toBe('clock')
      expect(getUploadStatusIcon(UPLOAD_STATUS.UPLOADING)).toBe('loader')
      expect(getUploadStatusIcon(UPLOAD_STATUS.COMPLETED)).toBe('check-circle')
      expect(getUploadStatusIcon(UPLOAD_STATUS.FAILED)).toBe('x-circle')
    })
  })
})