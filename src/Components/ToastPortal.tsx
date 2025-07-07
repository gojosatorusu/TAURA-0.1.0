import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, X, Info, AlertTriangle, LucideIcon } from 'lucide-react';
import { useMessage } from '../Pages/context/Message';
import type { Toast, ToastType } from '../types/toasts';

interface ToastStyles {
  bg: string;
  icon: LucideIcon;
}

// Component Props Types
interface ToastNotificationProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

// Enhanced Toast Notification Component with more types
const ToastNotification: React.FC<ToastNotificationProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration || 3000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const getToastStyles = (type: ToastType): ToastStyles => {
    switch (type) {
      case 'success':
        return { bg: 'bg-green-500/95', icon: CheckCircle };
      case 'error':
        return { bg: 'bg-red-500/95', icon: AlertCircle };
      case 'warning':
        return { bg: 'bg-yellow-500/95', icon: AlertTriangle };
      case 'info':
        return { bg: 'bg-blue-500/95', icon: Info };
      default:
        return { bg: 'bg-gray-500/95', icon: Info };
    }
  };

  const styles = getToastStyles(toast.type);
  const Icon = styles.icon;
 
  return (
    <motion.div
      initial={{ y: -100, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -100, opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`${styles.bg} backdrop-blur-md text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3 min-w-[300px] max-w-[500px]`}
      style={{ position: 'relative' }}
    >
      <Icon size={20} className="flex-shrink-0" />
      <span className="font-medium flex-1">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="ml-auto hover:bg-white/20 p-1 rounded transition-colors flex-shrink-0"
        aria-label="Dismiss notification"
        type="button"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
};

// Enhanced Toast Portal Component - now uses context
const ToastPortal: React.FC = () => {
  const { toasts, dismissToast } = useMessage();
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Ensure document.body is available
    if (typeof document !== 'undefined') {
      setPortalContainer(document.body);
    }
  }, []);

  // Don't render anything if no toasts or no container
  if (!toasts || toasts.length === 0 || !portalContainer) {
    return null;
  }

  // Create a portal to render directly to document.body
  return createPortal(
    <div
      className="fixed top-4 left-0 right-0 z-[9999] flex flex-col items-center pointer-events-none px-4"
      style={{ position: 'fixed' as const }} // Ensure it's always fixed
    >
      <div className="pointer-events-auto flex flex-col w-full max-w-md">
        <AnimatePresence mode="wait">
          {toasts.map((toast: Toast) => (
            <ToastNotification
              key={toast.id}
              toast={toast}
              onDismiss={dismissToast}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>,
    portalContainer
  );
};

export default ToastPortal;