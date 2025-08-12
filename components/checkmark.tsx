"use client";

import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Image as ImageIcon, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export default function Checkmark() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    setImages(prev => [...prev, ...files]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages(prev => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const startCamera = async () => {
    try {
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Could not access camera. Please check permissions.');
      setIsCapturing(false);
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (context) {
        context.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setImages(prev => [...prev, file]);
          }
        }, 'image/jpeg', 0.9);
      }
      
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCapturing(false);
  };

  const handleSubmit = () => {
    if (images.length === 0) {
      alert('Please select or capture at least one image.');
      return;
    }
    console.log('Submitted images:', images);
    alert(`Successfully submitted ${images.length} image(s)!`);
    setImages([]);
    setIsModalOpen(false);
  };

  const handleClose = () => {
    stopCamera();
    setImages([]);
    setIsModalOpen(false);
  };

  return (
    <div className="flex justify-center items-center p-4">
      <div className="space-y-8 text-center">
        
        {/* Small Checkmark Button */}
        <Button
          onClick={() => setIsModalOpen(true)}
          size="sm"
          className={cn(
            "relative h-10 w-10 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-md",
            "transition-all duration-300 ease-in-out",
            "hover:scale-105 hover:shadow-lg",
            "active:scale-95",
            "focus:ring-2 focus:ring-green-200"
          )}
        >
          <Check className="w-5 h-5" strokeWidth={2.5} />
        </Button>
        
        {/* Image Upload Modal */}
        <Dialog open={isModalOpen} onOpenChange={handleClose}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-semibold text-slate-800 text-2xl">
                Upload Images
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Upload Area */}
              <div
                className={cn(
                  "relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200",
                  dragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-slate-400",
                  "hover:bg-slate-50"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileInput}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
                <div className="space-y-4">
                  <div className="flex justify-center items-center bg-slate-100 mx-auto rounded-full w-16 h-16">
                    <ImageIcon className="w-8 h-8 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-700 text-lg">
                      Drop images here or click to browse
                    </p>
                    <p className="mt-1 text-slate-500 text-sm">
                      Supports JPG, PNG, GIF up to 10MB each
                    </p>
                  </div>
                </div>
              </div>

              {/* Camera Section */}
              <div className="space-y-4">
                <div className="flex justify-center space-x-4">
                  {!isCapturing ? (
                    <Button onClick={startCamera} variant="outline" className="flex items-center space-x-2">
                      <Camera className="w-4 h-4" />
                      <span>Take Photo</span>
                    </Button>
                  ) : (
                    <div className="flex space-x-2">
                      <Button onClick={captureImage} className="flex items-center space-x-2">
                        <Camera className="w-4 h-4" />
                        <span>Capture</span>
                      </Button>
                      <Button onClick={stopCamera} variant="outline">
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>

                {isCapturing && (
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="shadow-lg mx-auto rounded-lg w-full max-w-md"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                )}
              </div>

              {/* Image Preview */}
              {images.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-slate-800 text-lg">
                    Selected Images ({images.length})
                  </h3>
                  <div className="gap-4 grid grid-cols-2 md:grid-cols-3">
                    {images.map((image, index) => (
                      <div key={index} className="group relative">
                        <div className="bg-slate-100 rounded-lg aspect-square overflow-hidden">
                          <img
                            src={URL.createObjectURL(image)}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          onClick={() => removeImage(index)}
                          size="sm"
                          variant="destructive"
                          className="top-2 right-2 absolute opacity-0 group-hover:opacity-100 p-0 w-6 h-6 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                        <div className="bottom-2 left-2 absolute bg-black/70 px-2 py-1 rounded text-white text-xs">
                          {image.name.length > 15 ? `${image.name.substring(0, 15)}...` : image.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button onClick={handleClose} variant="outline">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={images.length === 0}
                  className="flex items-center space-x-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Submit {images.length > 0 && `(${images.length})`}</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}