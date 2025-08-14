import { useState, useCallback } from 'react';
import { uploadToNostrBuild } from '@/lib/nostr-build';

// Generate SHA256 hash for a file
async function generateSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

interface UploadItem {
  id: string;
  file: File;
  url?: string;
  status: 'uploading' | 'completed' | 'failed';
  progress: number;
  metadata?: {
    sha256: string;
    mimeType: string;
    size: number;
    blurhash?: string;
  };
}

interface UploadStats {
  total: number;
  completed: number;
  failed: number;
  uploading: number;
}

export function useImageUpload() {
  const [pendingImageUrls, setPendingImageUrls] = useState<string[]>([]);
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [showUploadProgress, setShowUploadProgress] = useState(false);

  const uploadStats: UploadStats = {
    total: uploadQueue.length,
    completed: uploadQueue.filter(item => item.status === 'completed').length,
    failed: uploadQueue.filter(item => item.status === 'failed').length,
    uploading: uploadQueue.filter(item => item.status === 'uploading').length,
  };

  const uploadFiles = useCallback(async (files: File[]) => {
    const newUploads: UploadItem[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'uploading' as const,
      progress: 0,
      metadata: undefined, // Will be set after upload
    }));

    setUploadQueue(prev => [...prev, ...newUploads]);

    // Upload files in parallel
    const uploadPromises = newUploads.map(async (uploadItem) => {
      try {
        const url = await uploadToNostrBuild(uploadItem.file);
        
        // Generate metadata for the uploaded file
        const metadata = {
          sha256: await generateSHA256(uploadItem.file),
          mimeType: uploadItem.file.type,
          size: uploadItem.file.size,
        };
        
        // Update the upload item with the URL and metadata
        setUploadQueue(prev =>
          prev.map(item =>
            item.id === uploadItem.id
              ? { ...item, url, status: 'completed' as const, progress: 100, metadata }
              : item
          )
        );

        // Add to pending URLs
        setPendingImageUrls(prev => [...prev, url]);
        
        return url;
      } catch (error) {
        console.error('Upload failed:', error);
        
        // Update the upload item with failed status
        setUploadQueue(prev =>
          prev.map(item =>
            item.id === uploadItem.id
              ? { ...item, status: 'failed' as const }
              : item
          )
        );
        
        return null;
      }
    });

    await Promise.all(uploadPromises);
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const files: File[] = [];

    items.forEach(item => {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    });

    if (files.length > 0) {
      e.preventDefault();
      uploadFiles(files);
    }
  }, [uploadFiles]);

  const removeImageUrl = useCallback((url: string) => {
    setPendingImageUrls(prev => prev.filter(u => u !== url));
    setUploadQueue(prev => prev.filter(item => item.url !== url));
  }, []);

  const cancelUpload = useCallback((id: string) => {
    setUploadQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  const retryUpload = useCallback(async (id: string) => {
    const uploadItem = uploadQueue.find(item => item.id === id);
    if (!uploadItem) return;

    // Reset status to uploading
    setUploadQueue(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, status: 'uploading' as const, progress: 0 }
          : item
      )
    );

    try {
      const url = await uploadToNostrBuild(uploadItem.file);
      
      // Generate metadata for the uploaded file
      const metadata = {
        sha256: await generateSHA256(uploadItem.file),
        mimeType: uploadItem.file.type,
        size: uploadItem.file.size,
      };
      
      setUploadQueue(prev =>
        prev.map(item =>
          item.id === id
            ? { ...item, url, status: 'completed' as const, progress: 100, metadata }
            : item
        )
      );

      setPendingImageUrls(prev => [...prev, url]);
    } catch (error) {
      console.error('Retry upload failed:', error);
      
      setUploadQueue(prev =>
        prev.map(item =>
          item.id === id
            ? { ...item, status: 'failed' as const }
            : item
        )
      );
    }
  }, [uploadQueue]);

  const getCompletedUploads = useCallback(() => {
    return uploadQueue.filter(item => item.status === 'completed');
  }, [uploadQueue]);

  const clearUploads = useCallback(() => {
    setPendingImageUrls([]);
    setUploadQueue([]);
    setShowUploadProgress(false);
  }, []);

  return {
    pendingImageUrls,
    uploadQueue,
    uploadStats,
    showUploadProgress,
    setShowUploadProgress,
    uploadFiles,
    handlePaste,
    removeImageUrl,
    cancelUpload,
    retryUpload,
    getCompletedUploads,
    clearUploads,
  };
}