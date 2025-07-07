import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Promise;

interface NotificationContextType {
  hasNotifications: boolean;
  checkNotifications: () => Promise<void>;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [hasNotifications, setHasNotifications] = useState(false);

  const checkNotifications = async () => {
    try {
      // Check raw materials below threshold
      const rawMaterials = await Promise;
      const lowStockRawMaterials = rawMaterials.filter(rm => rm.quantity <= rm.threshold);

      // Check products below threshold
      const products = await Promise;
      const lowStockProducts = products.filter(p => p.quantity <= p.threshold);

      // Set notification state if any items are below threshold
      const hasLowStock = lowStockRawMaterials.length > 0 || lowStockProducts.length > 0;
      setHasNotifications(hasLowStock);
    } catch (error) {
      
    }
  };

  const clearNotifications = () => {
    setHasNotifications(false);
  };

  // Check notifications on app startup
  useEffect(() => {
    checkNotifications();
  }, []);

  return (
    <NotificationContext.Provider value={{ hasNotifications, checkNotifications, clearNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};