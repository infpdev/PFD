import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, Pen } from 'lucide-react';
import { SignatureData } from '@/types/epf-forms';

interface SignatureCanvasProps {
  onSignatureChange: (sig: SignatureData | null) => void;
  initialSignature?: string; // still just the image
  width?: number;
  height?: number;
}


export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  onSignatureChange,
  initialSignature,
  width = 400,
  height = 150,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const minXRef = useRef<number>(Infinity);
  const minYRef = useRef<number>(Infinity);
  const maxXRef = useRef<number>(-Infinity);
  const maxYRef = useRef<number>(-Infinity);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas
    ctx.strokeStyle = '#1a365d';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Fill with white background
    // ctx.fillStyle = '#ffffff';
    // ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.clearRect(0, 0, canvas.width, canvas.height);


    // Load initial signature if provided
    if (initialSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setHasSignature(true);
      };
      img.src = initialSignature;
    }
  }, [initialSignature]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();

    minXRef.current = Infinity;
    minYRef.current = Infinity;
    maxXRef.current = -Infinity;
    maxYRef.current = -Infinity;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d')
    ctx.globalCompositeOperation = "source-over";
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    // update bounding box

    minXRef.current = Math.min(minXRef.current, x);
    minYRef.current = Math.min(minYRef.current, y);
    maxXRef.current = Math.max(maxXRef.current, x);
    maxYRef.current = Math.max(maxYRef.current, y);


    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (canvas && hasSignature) {

      const signatureData = canvas.toDataURL('image/png');

      const bbox = {
        x: minXRef.current,
        y: minYRef.current,
        width: maxXRef.current - minXRef.current,
        height: maxYRef.current - minYRef.current,
      };

      onSignatureChange({
        image: signatureData,
        bbox,
      });
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    // ctx.fillStyle = '#ffffff';
    // ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.clearRect(0, 0, canvas.width, canvas.height);


    minXRef.current = Infinity;
    minYRef.current = Infinity;
    maxXRef.current = -Infinity;
    maxYRef.current = -Infinity;


    setHasSignature(false);
    onSignatureChange(null);
  };

  return (
    <div className="space-y-3 flex flex-col items-center justify-center">
      <div className="relative rounded-xl border-2 border-dashed border-border bg-card overflow-hidden">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="signature-canvas w-full cursor-crosshair"
          style={{ maxWidth: `${width}px` }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Pen className="h-4 w-4" />
              <span className="text-sm">Sign here</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="formOutline"
          size="sm"
          onClick={clearSignature}
          disabled={!hasSignature}
        >
          <Eraser className="h-4 w-4" />
          Clear
        </Button>
      </div>
    </div>
  );
};
