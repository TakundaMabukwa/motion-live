// Utility functions for managing job photos

export interface JobPhoto {
  id: string;
  filename: string;
  storage_path: string;
  public_url: string;
  description: string;
  timestamp: string;
  type: 'before' | 'after';
  uploaded_at: string;
}

export interface PhotoUploadResult {
  success: boolean;
  photos?: JobPhoto[];
  error?: string;
  message?: string;
}

/**
 * Get the display URL for a photo (prioritizes storage URL over local URL)
 */
export function getPhotoDisplayUrl(photo: JobPhoto | any): string {
  if (photo.public_url) {
    return photo.public_url;
  }
  if (photo.url) {
    return photo.url;
  }
  return '/placeholder-image.jpg'; // Fallback image
}

/**
 * Format photo timestamp for display
 */
export function formatPhotoTimestamp(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return 'Unknown time';
  }
}

/**
 * Get photo count by type
 */
export function getPhotoCountByType(photos: JobPhoto[], type: 'before' | 'after'): number {
  if (!photos || !Array.isArray(photos)) return 0;
  return photos.filter(photo => photo.type === type).length;
}

/**
 * Filter photos by type
 */
export function filterPhotosByType(photos: JobPhoto[], type: 'before' | 'after'): JobPhoto[] {
  if (!photos || !Array.isArray(photos)) return [];
  return photos.filter(photo => photo.type === type);
}

/**
 * Validate photo data structure
 */
export function validatePhotoData(photo: any): photo is JobPhoto {
  return (
    photo &&
    typeof photo.id === 'string' &&
    typeof photo.filename === 'string' &&
    typeof photo.public_url === 'string' &&
    typeof photo.description === 'string' &&
    typeof photo.timestamp === 'string' &&
    (photo.type === 'before' || photo.type === 'after')
  );
}

/**
 * Generate photo filename for storage
 */
export function generatePhotoFilename(jobNumber: string, type: 'before' | 'after', extension: string = 'jpg'): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  return `job_${jobNumber}_${type}_${timestamp}_${randomId}.${extension}`;
}

/**
 * Get photo storage path
 */
export function getPhotoStoragePath(filename: string): string {
  return `job-photos/${filename}`;
}

/**
 * Extract file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || 'jpg';
}

/**
 * Check if file is an image
 */
export function isImageFile(filename: string): boolean {
  const extension = getFileExtension(filename);
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  return imageExtensions.includes(extension);
}

/**
 * Get photo dimensions from URL (for display purposes)
 */
export function getPhotoDimensions(photo: JobPhoto): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
    };
    img.src = getPhotoDisplayUrl(photo);
  });
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
