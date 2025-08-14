/**
 * Upload an image file to nostr.build
 * @param file - The image file to upload
 * @returns The URL of the uploaded image
 */
export async function uploadToNostrBuild(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('https://nostr.build/api/v2/upload/files', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.status === 'success' && data.data && data.data.length > 0) {
      return data.data[0].url;
    }

    throw new Error('Invalid response from nostr.build');
  } catch (error) {
    console.error('Failed to upload to nostr.build:', error);
    throw error;
  }
}