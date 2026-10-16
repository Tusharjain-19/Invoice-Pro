import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Crop, ZoomIn, RotateCw, Move } from 'lucide-react';

interface ImageCropperProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCrop: (croppedBase64: string) => void;
  title?: string;
  defaultAspect?: number; // width / height
}

export function ImageCropper({
  isOpen,
  onClose,
  imageSrc,
  onCrop,
  title = 'Crop Image',
  defaultAspect = 1.0,
}: ImageCropperProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [xOffset, setXOffset] = useState<number>(0);
  const [yOffset, setYOffset] = useState<number>(0);
  const [rotation, setRotation] = useState<number>(0);
  const [aspect, setAspect] = useState<number>(defaultAspect);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset parameters when a new image is loaded
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setXOffset(0);
      setYOffset(0);
      setRotation(0);
      setAspect(defaultAspect);
    }
  }, [isOpen, imageSrc, defaultAspect]);

  const handleCrop = () => {
    if (!imageSrc) return;

    const canvas = document.createElement('canvas');
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      // Define a high-resolution target width for the crop
      const targetWidth = 800;
      const targetHeight = aspect > 0 ? targetWidth / aspect : img.height * (targetWidth / img.width);

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear the canvas to transparent
      ctx.clearRect(0, 0, targetWidth, targetHeight);

      ctx.save();
      // Move context origin to the center of the crop box
      ctx.translate(targetWidth / 2, targetHeight / 2);

      // Scale coordinates from the 320px preview area to the target canvas resolution
      const scaleFactor = targetWidth / 320;
      ctx.translate(xOffset * scaleFactor, yOffset * scaleFactor);

      // Apply rotation
      ctx.rotate((rotation * Math.PI) / 180);

      // Base scaling to fit the image width to targetWidth
      let baseScale = targetWidth / img.width;
      
      // If the image is taller and we are cropping to a landscape format, we might want to scale it to cover
      if (aspect > 0 && (img.height * baseScale < targetHeight)) {
        baseScale = targetHeight / img.height;
      }

      const drawWidth = img.width * baseScale;
      const drawHeight = img.height * baseScale;

      // Apply user zoom
      ctx.scale(zoom, zoom);

      // Draw the image centered at the origin
      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();

      const croppedBase64 = canvas.toDataURL('image/png');
      onCrop(croppedBase64);
      onClose();
    };
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Preview dimensions
  const previewWidth = 320;
  const previewHeight = aspect > 0 ? previewWidth / aspect : 200;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center space-y-6 py-4">
          {/* Crop Container Window */}
          <div 
            className="relative border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-slate-950 flex items-center justify-center shadow-inner"
            style={{ width: `${previewWidth}px`, height: `${previewHeight}px` }}
          >
            {imageSrc ? (
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Preview to Crop"
                className="max-w-none origin-center transition-transform duration-75 select-none pointer-events-none"
                style={{
                  width: '100%',
                  height: 'auto',
                  transform: `translate(${xOffset}px, ${yOffset}px) scale(${zoom}) rotate(${rotation}deg)`,
                }}
              />
            ) : (
              <span className="text-slate-500 text-sm">No image loaded</span>
            )}
            
            {/* Center Gridline Guide */}
            <div className="absolute inset-0 border border-white/20 pointer-events-none flex items-center justify-center">
              <div className="w-full h-px bg-white/10 absolute"></div>
              <div className="h-full w-px bg-white/10 absolute"></div>
            </div>
          </div>

          {/* Controls */}
          <div className="w-full space-y-4 px-2">
            {/* Aspect Ratio Selector */}
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="aspect-ratio" className="text-right text-xs">Aspect Ratio</Label>
              <div className="col-span-2">
                <Select value={aspect.toString()} onValueChange={v => setAspect(parseFloat(v))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Square (1:1)</SelectItem>
                    <SelectItem value="2.5">Standard Logo (2.5:1)</SelectItem>
                    <SelectItem value="3">Wide Signature (3:1)</SelectItem>
                    <SelectItem value="1.5">Classic Photo (3:2)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Zoom Slider */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1 text-muted-foreground"><ZoomIn className="h-3.5 w-3.5" /> Zoom</span>
                <span className="font-semibold text-[11px]">{zoom.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="0.1"
                value={zoom}
                onChange={e => setZoom(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            {/* Position X Slider */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1 text-muted-foreground"><Move className="h-3.5 w-3.5" /> Horizontal Position</span>
                <span className="font-semibold text-[11px]">{xOffset}px</span>
              </div>
              <input
                type="range"
                min="-200"
                max="200"
                step="1"
                value={xOffset}
                onChange={e => setXOffset(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            {/* Position Y Slider */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1 text-muted-foreground"><Move className="h-3.5 w-3.5 rotate-90" /> Vertical Position</span>
                <span className="font-semibold text-[11px]">{yOffset}px</span>
              </div>
              <input
                type="range"
                min="-200"
                max="200"
                step="1"
                value={yOffset}
                onChange={e => setYOffset(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end pt-2">
              <Button type="button" variant="outline" size="sm" onClick={handleRotate} className="flex items-center gap-1.5 h-8 text-xs">
                <RotateCw className="h-3.5 w-3.5" /> Rotate 90°
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex sm:justify-between gap-2 border-t pt-4">
          <Button variant="outline" size="sm" onClick={onClose} className="h-9">
            Cancel
          </Button>
          <Button size="sm" onClick={handleCrop} className="flex items-center gap-1.5 h-9">
            <Crop className="h-4 w-4" /> Crop & Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
