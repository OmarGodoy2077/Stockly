import { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ImageCropper } from './ImageCropper';

interface SerialNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  onOCRCapture: (file: File) => Promise<void>;
  disabled?: boolean;
}

export const SerialNumberInput = ({
  value,
  onChange,
  onOCRCapture,
  disabled = false,
}: SerialNumberInputProps) => {
  const [showModal, setShowModal] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showRegionSelector, setShowRegionSelector] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setVideoStream(stream);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('No se pudo acceder a la cámara');
    }
  };

  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      setVideoStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageUrl = canvas.toDataURL('image/jpeg', 0.95);
        setCapturedImage(imageUrl);
        setShowRegionSelector(true);
        stopCamera();
      }
    }
  };

  const processOCR = async (file: File) => {
    try {
      setOcrLoading(true);
      setOcrProgress('Preparando imagen...');

      await new Promise((resolve) => setTimeout(resolve, 300));
      setOcrProgress('Analizando con OCR...');

      // Call the OCR function passed from parent
      await onOCRCapture(file);

      setOcrProgress('¡Serial detectado!');
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Close modal and reset state
      setShowModal(false);
      setCapturedImage(null);
      setShowRegionSelector(false);
      
      toast.success('Número de serie capturado exitosamente');
    } catch (error: any) {
      toast.error('Error al procesar OCR: ' + (error?.message || 'Intente nuevamente'));
    } finally {
      setOcrLoading(false);
      setOcrProgress('');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Convert file to image URL for region selector
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        setCapturedImage(imageUrl);
        setShowRegionSelector(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRegionConfirm = async (croppedBlob: Blob) => {
    setShowRegionSelector(false);
    const file = new File([croppedBlob], 'serial-capture.jpg', { type: 'image/jpeg' });
    await processOCR(file);
  };

  const handleRegionCancel = () => {
    setShowRegionSelector(false);
    setCapturedImage(null);
  };

  const closeModal = () => {
    stopCamera();
    setShowModal(false);
    setCapturedImage(null);
    setOcrProgress('');
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Número de serie"
          disabled={disabled}
          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="button"
          onClick={() => setShowModal(true)}
          disabled={disabled || ocrLoading}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center gap-1 text-sm"
          title="Capturar con OCR"
        >
          <Camera className="w-4 h-4" />
          OCR
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Capturar Número de Serie
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
                disabled={ocrLoading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* OCR Progress */}
              {ocrLoading && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      Procesando OCR...
                    </p>
                    <p className="text-xs text-blue-700 mt-1">{ocrProgress}</p>
                  </div>
                </div>
              )}

              {/* Camera/Photo View */}
              {!capturedImage && !ocrLoading && (
                <>
                  {/* Video Preview */}
                  {videoStream ? (
                    <div className="space-y-4">
                      <div className="relative bg-black rounded-lg overflow-hidden">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-auto"
                        />
                      </div>
                      <div className="flex gap-2 justify-center">
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <Camera className="w-5 h-5" />
                          Capturar Foto
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600 text-center">
                        Elige una opción para capturar el número de serie:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={startCamera}
                          className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors flex flex-col items-center gap-3"
                        >
                          <Camera className="w-12 h-12 text-gray-400" />
                          <span className="font-medium text-gray-700">
                            Usar Cámara
                          </span>
                          <span className="text-xs text-gray-500">
                            Tomar foto del serial
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors flex flex-col items-center gap-3"
                        >
                          <Upload className="w-12 h-12 text-gray-400" />
                          <span className="font-medium text-gray-700">
                            Subir Imagen
                          </span>
                          <span className="text-xs text-gray-500">
                            Desde tu dispositivo
                          </span>
                        </button>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Captured Image - Region Selector */}
              {capturedImage && !ocrLoading && showRegionSelector && (
                <ImageCropper
                  imageUrl={capturedImage}
                  onCrop={handleRegionConfirm}
                  onCancel={handleRegionCancel}
                />
              )}
            </div>

            {/* Hidden canvas for image capture */}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      )}
    </div>
  );
};
