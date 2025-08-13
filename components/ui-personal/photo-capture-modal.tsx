'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  Upload, 
  Trash2, 
  Download, 
  CheckCircle, 
  AlertCircle,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface PhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotosSaved: (photos: PhotoData[]) => void;
  jobId?: string;
  jobNumber?: string;
  vehicleRegistration?: string;
  existingPhotos?: PhotoData[];
}

interface PhotoData {
  id: string;
  url: string;
  filename: string;
  timestamp: string;
  description: string;
  type: 'before' | 'after';
}

export default function PhotoCaptureModal({ 
  isOpen, 
  onClose, 
  onPhotosSaved, 
  jobId,
  jobNumber, 
  vehicleRegistration,
  existingPhotos = []
}: PhotoCaptureModalProps) {
  console.log('PhotoCaptureModal rendered with props:', {
    isOpen,
    jobId,
    jobNumber,
    vehicleRegistration,
    existingPhotosCount: existingPhotos.length
  });

  // Don't render if essential props are missing
  if (!jobId || !jobNumber) {
    console.warn('PhotoCaptureModal: Missing essential props', { jobId, jobNumber });
    return null;
  }

  const [photos, setPhotos] = useState<PhotoData[]>(existingPhotos);
  const [capturing, setCapturing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(null);
  const [photoDescription, setPhotoDescription] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<PhotoData | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Failed to access camera. Please check permissions.');
      setCapturing(false);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCapturing(false);
  }, []);

  // Capture photo from camera
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setCurrentPhoto(url);
        setShowPreview(true);
        stopCamera();
      }
    }, 'image/jpeg', 0.9);
  }, [stopCamera]);

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    
    // Process each file
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        const photoData: PhotoData = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          url,
          filename: file.name,
          timestamp: new Date().toISOString(),
          description: `Before photo - ${file.name}`,
          type: 'before'
        };
        
        setPhotos(prev => [...prev, photoData]);
        toast.success(`Photo "${file.name}" uploaded successfully`);
      }
    });
    
    setUploading(false);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Save captured photo
  const saveCapturedPhoto = useCallback(() => {
    if (!currentPhoto) return;

    const photoData: PhotoData = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      url: currentPhoto,
      filename: `before_${Date.now()}.jpg`,
      timestamp: new Date().toISOString(),
      description: photoDescription || 'Before photo from camera',
      type: 'before'
    };

    setPhotos(prev => [...prev, photoData]);
    setCurrentPhoto(null);
    setPhotoDescription('');
    setShowPreview(false);
    toast.success('Photo captured and saved!');
  }, [currentPhoto, photoDescription]);

  // Delete photo
  const deletePhoto = useCallback((photoId: string) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === photoId);
      if (photo) {
        URL.revokeObjectURL(photo.url);
      }
      return prev.filter(p => p.id !== photoId);
    });
    toast.success('Photo deleted');
  }, []);

  // Save all photos and close
  const handleSaveAll = useCallback(async () => {
    if (photos.length === 0) {
      toast.error('Please capture or upload at least one photo');
      return;
    }

    try {
      // Upload photos to Supabase storage
      const response = await fetch('/api/job-photos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId,
          jobNumber,
          vehicleRegistration,
          photos: photos.map(photo => ({
            ...photo,
            url: photo.url.startsWith('data:') ? photo.url : photo.url
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to upload photos');
      }

      const result = await response.json();
      
      if (result.success) {
        onPhotosSaved(result.photos);
        toast.success(`${photos.length} photos uploaded successfully!`);
        onClose();
      } else {
        throw new Error(result.error || 'Failed to upload photos');
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error('Failed to upload photos. Please try again.');
    }
  }, [photos, jobId, jobNumber, vehicleRegistration, onPhotosSaved, onClose]);

  // Cleanup on close
  const handleClose = useCallback(() => {
    stopCamera();
    setPhotos(existingPhotos);
    setCurrentPhoto(null);
    setPhotoDescription('');
    setShowPreview(false);
    onClose();
  }, [stopCamera, onClose, existingPhotos]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Capture Before Photos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Job Info */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="gap-4 grid grid-cols-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Job ID:</span>
                  <span className="ml-2 text-gray-900">{jobId}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Job Number:</span>
                  <span className="ml-2 text-gray-900">{jobNumber}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Vehicle:</span>
                  <span className="ml-2 text-gray-900">
                    {vehicleRegistration || 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Existing Photos:</span>
                  <span className="ml-2 text-gray-900">
                    {existingPhotos.length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Camera Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Camera Capture
              </CardTitle>
              <CardDescription>
                Use your device camera to take before photos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!capturing && !currentPhoto && (
                <div className="flex justify-center">
                  <Button 
                    onClick={startCamera}
                    className="flex items-center gap-2"
                    size="lg"
                  >
                    <Camera className="w-5 h-5" />
                    Start Camera
                  </Button>
                </div>
              )}

              {capturing && (
                <div className="space-y-4">
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="border rounded-lg w-full"
                    />
                    <div className="top-4 right-4 absolute">
                      <Button
                        onClick={stopCamera}
                        variant="destructive"
                        size="sm"
                        className="p-0 rounded-full w-10 h-10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <Button 
                      onClick={capturePhoto}
                      className="flex items-center gap-2"
                      size="lg"
                    >
                      <Camera className="w-5 h-5" />
                      Capture Photo
                    </Button>
                  </div>
                </div>
              )}

              {currentPhoto && showPreview && (
                <div className="space-y-4">
                  <div className="relative">
                    <img
                      src={currentPhoto}
                      alt="Captured photo"
                      className="border rounded-lg w-full"
                    />
                    <div className="top-4 right-4 absolute">
                      <Button
                        onClick={() => {
                          setCurrentPhoto(null);
                          setShowPreview(false);
                          setPhotoDescription('');
                        }}
                        variant="destructive"
                        size="sm"
                        className="p-0 rounded-full w-10 h-10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="photoDescription">Photo Description</Label>
                    <Input
                      id="photoDescription"
                      placeholder="Describe what this photo shows..."
                      value={photoDescription}
                      onChange={(e) => setPhotoDescription(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={saveCapturedPhoto}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Save Photo
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setCurrentPhoto(null);
                        setShowPreview(false);
                        setPhotoDescription('');
                      }}
                    >
                      Retake
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* File Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                File Upload
              </CardTitle>
              <CardDescription>
                Upload existing photos from your device
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-6 border-2 border-gray-300 border-dashed rounded-lg text-center">
                  <Upload className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                  <div className="space-y-2">
                    <p className="text-gray-600 text-sm">
                      Drag and drop photos here, or click to browse
                    </p>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      disabled={uploading}
                    >
                      {uploading ? 'Uploading...' : 'Select Photos'}
                    </Button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Captured Photos */}
          {photos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Captured Photos ({photos.length})
                </CardTitle>
                <CardDescription>
                  Review and manage your captured photos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="gap-4 grid grid-cols-2 md:grid-cols-3">
                  {photos.map((photo) => (
                    <div key={photo.id} className="group relative">
                      <img
                        src={photo.url}
                        alt={photo.description}
                        className="border rounded-lg w-full h-32 object-cover"
                      />
                      <div className="absolute inset-0 flex justify-center items-center bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-lg transition-all duration-200">
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <Button
                            onClick={() => deletePhoto(photo.id)}
                            variant="destructive"
                            size="sm"
                            className="p-0 w-8 h-8"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-gray-600 text-xs truncate">
                          {photo.description}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {new Date(photo.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveAll}
              disabled={photos.length === 0}
              className="flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Save All Photos ({photos.length})
            </Button>
          </div>
        </div>

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
