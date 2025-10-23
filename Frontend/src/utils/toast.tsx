import toast from 'react-hot-toast';
import type { Toast } from 'react-hot-toast';
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Info,
  X,
} from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

const toastConfig: Record<ToastType, { icon: React.ReactNode; bgColor: string; textColor: string; borderColor: string }> = {
  success: {
    icon: <CheckCircle2 size={20} />,
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    textColor: 'text-green-800 dark:text-green-200',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  error: {
    icon: <XCircle size={20} />,
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    textColor: 'text-red-800 dark:text-red-200',
    borderColor: 'border-red-200 dark:border-red-800',
  },
  warning: {
    icon: <AlertCircle size={20} />,
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    textColor: 'text-yellow-800 dark:text-yellow-200',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
  },
  info: {
    icon: <Info size={20} />,
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    textColor: 'text-blue-800 dark:text-blue-200',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
};

const CustomToast = ({
  t,
  message,
  type,
}: {
  t: Toast;
  message: string;
  type: ToastType;
}) => {
  const config = toastConfig[type];

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${config.bgColor} ${config.borderColor} ${config.textColor} shadow-lg backdrop-blur-sm`}
    >
      <div className="flex-shrink-0">{config.icon}</div>
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button
        onClick={() => toast.dismiss(t.id)}
        className="flex-shrink-0 hover:opacity-70 transition-opacity"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export const showToast = {
  success: (message: string, options?: ToastOptions) => {
    toast.custom(
      (t) => <CustomToast t={t} message={message} type="success" />,
      {
        duration: options?.duration || 3000,
        position: options?.position || 'bottom-right',
      }
    );
  },
  error: (message: string, options?: ToastOptions) => {
    toast.custom(
      (t) => <CustomToast t={t} message={message} type="error" />,
      {
        duration: options?.duration || 4000,
        position: options?.position || 'bottom-right',
      }
    );
  },
  warning: (message: string, options?: ToastOptions) => {
    toast.custom(
      (t) => <CustomToast t={t} message={message} type="warning" />,
      {
        duration: options?.duration || 3000,
        position: options?.position || 'bottom-right',
      }
    );
  },
  info: (message: string, options?: ToastOptions) => {
    toast.custom(
      (t) => <CustomToast t={t} message={message} type="info" />,
      {
        duration: options?.duration || 3000,
        position: options?.position || 'bottom-right',
      }
    );
  },
};

export default showToast;
