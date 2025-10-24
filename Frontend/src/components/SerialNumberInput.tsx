import { useState, useRef, useEffect } from 'react';
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

  // Cleanup video stream when modal closes
  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [videoStream]);

  const startCamera = async () => {
    try {
      // Stop any existing stream first
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop());
      }
      
      const constraints = {
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false,
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setVideoStream(stream);
        
        // Ensure video plays
        videoRef.current.play().catch((error) => {
          console.error('Error playing video:', error);
          toast.error('Error al reproducir video');
        });
      }
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      
      // Provide specific error messages
      if (error.name === 'NotAllowedError') {
        toast.error('Permiso de cámara denegado. Habilítalo en la configuración del dispositivo.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No se encontró ninguna cámara en tu dispositivo.');
      } else if (error.name === 'NotReadableError') {
        toast.error('La cámara está siendo usada por otra aplicación.');
      } else {
        toast.error('No se pudo acceder a la cámara: ' + error.message);
      }
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
    <div className="w-full space-y-2">
      <div className="flex flex-col xs:flex-row gap-2 w-full">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Número de serie"
          disabled={disabled}
          className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded text-xs sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all min-w-0"
        />
        <button
          type="button"
          onClick={() => setShowModal(true)}
          disabled={disabled || ocrLoading}
          className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0 h-full"
          title="Capturar con OCR"
        >
          <Camera className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <span className="hidden xs:inline">OCR</span>
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto border border-gray-200 dark:border-gray-700">
            <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                Capturar Número de Serie
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                disabled={ocrLoading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              {/* OCR Progress */}
              {ocrLoading && (
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                      Procesando OCR...
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1 truncate">{ocrProgress}</p>
                  </div>
                </div>
              )}

              {/* Camera/Photo View */}
              {!capturedImage && !ocrLoading && (
                <>
                  {/* Video Preview */}
                  {videoStream ? (
                    <div className="space-y-4">
                      <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ paddingBottom: '66.67%' }}>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="px-4 sm:px-6 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
                        >
                          <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                          Capturar Foto
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="px-4 sm:px-6 py-2 bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg transition-colors font-medium text-sm sm:text-base"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center">
                        Elige una opción para capturar el número de serie:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        <button
                          type="button"
                          onClick={startCamera}
                          className="p-4 sm:p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:border-blue-500 transition-colors flex flex-col items-center gap-2 sm:gap-3"
                        >
                          <Camera className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 dark:text-gray-500" />
                          <span className="font-medium text-gray-700 dark:text-gray-200 text-sm sm:text-base">
                            Usar Cámara
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Tomar foto del serial
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-4 sm:p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:border-blue-500 transition-colors flex flex-col items-center gap-2 sm:gap-3"
                        >
                          <Upload className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 dark:text-gray-500" />
                          <span className="font-medium text-gray-700 dark:text-gray-200 text-sm sm:text-base">
                            Subir Imagen
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
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
