// types/toast.ts - Shared toast types for your application
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number; // Duration in milliseconds, defaults to 3000ms
}

// Utility type for creating a new toast (without id, as it's usually generated)
export interface CreateToast {
  message: string;
  type: ToastType;
  duration?: number;
}

// Context types (if you're using a message context)
export interface MessageContextType {
  toasts: Toast[];
  addToast: (toast: CreateToast) => void;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
  // Convenience methods
  addSuccessToast?: (message: string, duration?: number) => void;
  addErrorToast?: (message: string, duration?: number) => void;
  addWarningToast?: (message: string, duration?: number) => void;
  addInfoToast?: (message: string, duration?: number) => void;
}

// Hook return type
export interface UseMessageReturn extends MessageContextType {}

export default Toast;