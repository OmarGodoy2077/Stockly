import { useState, useRef, useEffect } from 'react';
import { Crop, Check, X, RotateCw, ZoomIn, ZoomOut, Move } from 'lucide-react';

interface ImageCropperProps {
  imageUrl: string;
  onCrop: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

export const ImageCropper = ({ imageUrl, onCrop, onCancel }: ImageCropperProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (imgRef.current && imageLoaded) {
      // Initialize crop area to center 70% width x 25% height (good for serial numbers)
      const img = imgRef.current;
      const width = img.naturalWidth * 0.7;
      const height = img.naturalHeight * 0.25;
      const x = (img.naturalWidth - width) / 2;
      const y = (img.naturalHeight - height) / 2;
      
      setCropArea({ x, y, width, height });
    }
  }, [imageLoaded]);

  const getScaledCoordinates = (clientX: number, clientY: number) => {
    if (!imgRef.current) return { x: 0, y: 0 };
    
    const rect = imgRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const scaleX = imgRef.current.naturalWidth / rect.width;
    const scaleY = imgRef.current.naturalHeight / rect.height;
    
    return {
      x: Math.max(0, Math.min(x * scaleX, imgRef.current.naturalWidth)),
      y: Math.max(0, Math.min(y * scaleY, imgRef.current.naturalHeight))
    };
  };

  const handleMouseDown = (e: React.MouseEvent, handle?: string) => {
    e.preventDefault();
    const coords = getScaledCoordinates(e.clientX, e.clientY);
    
    if (handle) {
      setIsResizing(handle);
    } else {
      setIsDragging(true);
    }
    
    setDragStart({ x: coords.x, y: coords.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!imgRef.current) return;
    
    const coords = getScaledCoordinates(e.clientX, e.clientY);
    const deltaX = coords.x - dragStart.x;
    const deltaY = coords.y - dragStart.y;
    
    if (isDragging && !isResizing) {
      // Draw new selection
      setCropArea({
        x: Math.min(dragStart.x, coords.x),
        y: Math.min(dragStart.y, coords.y),
        width: Math.abs(coords.x - dragStart.x),
        height: Math.abs(coords.y - dragStart.y),
      });
    } else if (isResizing) {
      // Resize from handle
      const newArea = { ...cropArea };
      
      switch (isResizing) {
        case 'nw':
          newArea.x = coords.x;
          newArea.y = coords.y;
          newArea.width = cropArea.width - deltaX;
          newArea.height = cropArea.height - deltaY;
          break;
        case 'ne':
          newArea.y = coords.y;
          newArea.width = cropArea.width + deltaX;
          newArea.height = cropArea.height - deltaY;
          break;
        case 'sw':
          newArea.x = coords.x;
          newArea.width = cropArea.width - deltaX;
          newArea.height = cropArea.height + deltaY;
          break;
        case 'se':
          newArea.width = cropArea.width + deltaX;
          newArea.height = cropArea.height + deltaY;
          break;
      }
      
      // Ensure positive dimensions
      if (newArea.width > 10 && newArea.height > 10) {
        setCropArea(newArea);
        setDragStart({ x: coords.x, y: coords.y });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(null);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.2, 0.5));
  };

  const handleCrop = async () => {
    if (!imgRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imgRef.current;

    // Set canvas size to crop area
    canvas.width = cropArea.width;
    canvas.height = cropArea.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply rotation if needed
    if (rotation !== 0) {
      const centerX = cropArea.width / 2;
      const centerY = cropArea.height / 2;
      
      ctx.translate(centerX, centerY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
    }

    // Draw cropped image
    ctx.drawImage(
      img,
      cropArea.x,
      cropArea.y,
      cropArea.width,
      cropArea.height,
      0,
      0,
      cropArea.width,
      cropArea.height
    );

    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        onCrop(blob);
      }
    }, 'image/jpeg', 0.95);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Crop className="w-5 h-5" />
                Seleccionar Región del Número de Serie
              </h3>
              <p className="text-sm text-blue-100 mt-1">
                Arrastra para crear un área de selección sobre el serial
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tools */}
        <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleRotate}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-sm"
            title="Rotar 90°"
          >
            <RotateCw className="w-4 h-4" />
            <span className="hidden sm:inline">Rotar</span>
          </button>
          
          <button
            type="button"
            onClick={handleZoomIn}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-sm"
            title="Acercar"
          >
            <ZoomIn className="w-4 h-4" />
            <span className="hidden sm:inline">Zoom +</span>
          </button>
          
          <button
            type="button"
            onClick={handleZoomOut}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-sm"
            title="Alejar"
          >
            <ZoomOut className="w-4 h-4" />
            <span className="hidden sm:inline">Zoom -</span>
          </button>

          <div className="px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg flex items-center gap-2">
            <Move className="w-4 h-4" />
            <span className="text-sm font-medium">Zoom: {(zoom * 100).toFixed(0)}%</span>
          </div>
        </div>

        {/* Image Container */}
        <div className="flex-1 overflow-auto bg-gray-900 p-4">
          <div className="flex items-center justify-center min-h-full">
            <div
              ref={containerRef}
              className="relative inline-block"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center',
                transition: 'transform 0.2s ease',
              }}
            >
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Crop"
                onLoad={() => setImageLoaded(true)}
                onMouseDown={(e) => handleMouseDown(e)}
                className="max-w-full h-auto cursor-crosshair select-none"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: 'transform 0.3s ease',
                }}
                draggable={false}
              />

              {/* Crop overlay */}
              {imageLoaded && imgRef.current && (
                <svg
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  viewBox={`0 0 ${imgRef.current.naturalWidth} ${imgRef.current.naturalHeight}`}
                  preserveAspectRatio="none"
                >
                  <defs>
                    <mask id="crop-mask">
                      <rect
                        width={imgRef.current.naturalWidth}
                        height={imgRef.current.naturalHeight}
                        fill="white"
                      />
                      <rect
                        x={cropArea.x}
                        y={cropArea.y}
                        width={cropArea.width}
                        height={cropArea.height}
                        fill="black"
                      />
                    </mask>
                  </defs>
                  
                  {/* Darken outside */}
                  <rect
                    width={imgRef.current.naturalWidth}
                    height={imgRef.current.naturalHeight}
                    fill="black"
                    opacity="0.6"
                    mask="url(#crop-mask)"
                  />
                  
                  {/* Grid lines inside crop area */}
                  <line
                    x1={cropArea.x + cropArea.width / 3}
                    y1={cropArea.y}
                    x2={cropArea.x + cropArea.width / 3}
                    y2={cropArea.y + cropArea.height}
                    stroke="#3b82f6"
                    strokeWidth="1"
                    opacity="0.5"
                    strokeDasharray="5,5"
                  />
                  <line
                    x1={cropArea.x + (cropArea.width * 2) / 3}
                    y1={cropArea.y}
                    x2={cropArea.x + (cropArea.width * 2) / 3}
                    y2={cropArea.y + cropArea.height}
                    stroke="#3b82f6"
                    strokeWidth="1"
                    opacity="0.5"
                    strokeDasharray="5,5"
                  />
                  
                  {/* Crop area border */}
                  <rect
                    x={cropArea.x}
                    y={cropArea.y}
                    width={cropArea.width}
                    height={cropArea.height}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                  />
                  
                  {/* Corner handles */}
                  {[
                    { x: cropArea.x, y: cropArea.y, cursor: 'nw-resize', handle: 'nw' },
                    { x: cropArea.x + cropArea.width, y: cropArea.y, cursor: 'ne-resize', handle: 'ne' },
                    { x: cropArea.x, y: cropArea.y + cropArea.height, cursor: 'sw-resize', handle: 'sw' },
                    { x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height, cursor: 'se-resize', handle: 'se' },
                  ].map((corner, i) => (
                    <g key={i}>
                      <circle
                        cx={corner.x}
                        cy={corner.y}
                        r="12"
                        fill="#3b82f6"
                        stroke="white"
                        strokeWidth="3"
                        className="pointer-events-auto cursor-pointer"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleMouseDown(e as any, corner.handle);
                        }}
                        style={{ cursor: corner.cursor }}
                      />
                      <circle
                        cx={corner.x}
                        cy={corner.y}
                        r="4"
                        fill="white"
                        className="pointer-events-none"
                      />
                    </g>
                  ))}
                  
                  {/* Size label */}
                  <text
                    x={cropArea.x + cropArea.width / 2}
                    y={cropArea.y - 10}
                    fill="white"
                    fontSize="16"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="pointer-events-none select-none"
                    style={{ textShadow: '0 0 4px black' }}
                  >
                    {Math.round(cropArea.width)} × {Math.round(cropArea.height)} px
                  </text>
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium shadow-sm"
            >
              Cancelar
            </button>
            
            <button
              type="button"
              onClick={handleCrop}
              disabled={cropArea.width === 0 || cropArea.height === 0}
              className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-lg"
            >
              <Check className="w-5 h-5" />
              Procesar con OCR
            </button>
          </div>
        </div>

        {/* Hidden canvas for cropping */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};
