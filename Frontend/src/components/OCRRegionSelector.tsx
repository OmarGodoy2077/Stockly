import { useState, useRef, useEffect } from 'react';
import { Check, X, RotateCw } from 'lucide-react';

interface OCRRegionSelectorProps {
  imageUrl: string;
  onConfirm: (croppedImage: Blob) => void;
  onCancel: () => void;
}

export const OCRRegionSelector = ({
  imageUrl,
  onConfirm,
  onCancel,
}: OCRRegionSelectorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [endPos, setEndPos] = useState<{ x: number; y: number } | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      setImage(img);
      drawImage(img, 0);
    };
  }, [imageUrl]);

  const drawImage = (img: HTMLImageElement, rotationAngle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate canvas size based on rotation
    const angle = (rotationAngle * Math.PI) / 180;
    const cos = Math.abs(Math.cos(angle));
    const sin = Math.abs(Math.sin(angle));
    const newWidth = img.width * cos + img.height * sin;
    const newHeight = img.width * sin + img.height * cos;

    canvas.width = newWidth;
    canvas.height = newHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(angle);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setStartPos({ x, y });
    setEndPos({ x, y });
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setEndPos({ x, y });
    redrawCanvas();
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const redrawCanvas = () => {
    if (!image) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawImage(image, rotation);

    // Draw selection rectangle
    if (startPos && endPos) {
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      const width = endPos.x - startPos.x;
      const height = endPos.y - startPos.y;
      
      ctx.strokeRect(startPos.x, startPos.y, width, height);
      
      // Draw semi-transparent overlay outside selection
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, canvas.width, startPos.y);
      ctx.fillRect(0, startPos.y, startPos.x, height);
      ctx.fillRect(endPos.x, startPos.y, canvas.width - endPos.x, height);
      ctx.fillRect(0, endPos.y, canvas.width, canvas.height - endPos.y);
      
      ctx.setLineDash([]);
    }
  };

  const handleRotate = () => {
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
    setStartPos(null);
    setEndPos(null);
    if (image) {
      drawImage(image, newRotation);
    }
  };

  const handleConfirm = async () => {
    if (!startPos || !endPos || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate crop dimensions
    const x = Math.min(startPos.x, endPos.x);
    const y = Math.min(startPos.y, endPos.y);
    const width = Math.abs(endPos.x - startPos.x);
    const height = Math.abs(endPos.y - startPos.y);

    // If no selection made, use entire image
    const cropX = width > 10 ? x : 0;
    const cropY = height > 10 ? y : 0;
    const cropWidth = width > 10 ? width : canvas.width;
    const cropHeight = height > 10 ? height : canvas.height;

    // Create cropped canvas
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropWidth;
    croppedCanvas.height = cropHeight;
    const croppedCtx = croppedCanvas.getContext('2d');
    
    if (croppedCtx) {
      croppedCtx.drawImage(
        canvas,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      );

      // Convert to blob
      croppedCanvas.toBlob((blob) => {
        if (blob) {
          onConfirm(blob);
        }
      }, 'image/jpeg', 0.95);
    }
  };

  useEffect(() => {
    redrawCanvas();
  }, [startPos, endPos, image, rotation]);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-900 font-medium">
          📸 Selecciona la región del número de serie
        </p>
        <p className="text-xs text-blue-700 mt-1">
          Arrastra el mouse sobre el área que contiene el número de serie. Si no seleccionas nada, se procesará toda la imagen.
        </p>
      </div>

      <div className="relative bg-gray-900 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="max-w-full h-auto cursor-crosshair"
          style={{ display: 'block', margin: '0 auto' }}
        />
      </div>

      <div className="flex gap-2 justify-center">
        <button
          type="button"
          onClick={handleRotate}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
        >
          <RotateCw className="w-4 h-4" />
          Rotar
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <Check className="w-5 h-5" />
          Procesar OCR
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Cancelar
        </button>
      </div>
    </div>
  );
};
