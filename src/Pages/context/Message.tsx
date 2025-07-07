import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { Toast, CreateToast, MessageContextType } from '../../types/toasts';

// Create the context with proper typing
const MessageContext = createContext<MessageContextType | undefined>(undefined);

// Provider Props
interface MessageProviderProps {
  children: ReactNode;
}

// Custom hook with proper return typing
export const useMessage = (): MessageContextType => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessage must be used within a MessageProvider');
  }
  return context;
};

// Helper function to generate unique IDs
const generateId = (): string => {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Provider Component
export const MessageProvider: React.FC<MessageProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (newToast: CreateToast): void => {
    const toast: Toast = {
      ...newToast,
      id: generateId(),
    };
   
    // Clear existing toasts immediately, then add new one
    setToasts([]);
    // Use setTimeout to ensure the clear happens first
    setTimeout(() => {
      setToasts([toast]);
    }, 0);
  };

  const dismissToast = (id: string): void => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearAllToasts = (): void => {
    setToasts([]);
  };

  // Convenience methods for different toast types
  const addSuccessToast = (message: string, duration?: number): void => {
    addToast({ message, type: 'success', duration });
  };

  const addErrorToast = (message: string, duration?: number): void => {
    addToast({ message, type: 'error', duration });
  };

  const addWarningToast = (message: string, duration?: number): void => {
    addToast({ message, type: 'warning', duration });
  };

  const addInfoToast = (message: string, duration?: number): void => {
    addToast({ message, type: 'info', duration });
  };

  const contextValue: MessageContextType = {
    toasts,
    addToast,
    dismissToast,
    clearAllToasts,
    // You can also expose the convenience methods if you want
    addSuccessToast,
    addErrorToast,
    addWarningToast,
    addInfoToast,
  };

  return (
    <MessageContext.Provider value={contextValue}>
      {children}
    </MessageContext.Provider>
  );
};

export default MessageContext;