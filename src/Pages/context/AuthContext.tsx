// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Promise;
import LoadingScreen from '../LoadingScreen';


interface AuthResponse {
  success: boolean;
  message: string;
  session_id?: string;
  is_developer: boolean;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isInitialized: boolean;
  isDeveloper: boolean;
  sessionId: string | null;
  isLoading: boolean;
  isTransitioning: boolean;
  login: (password: string, isDeveloperLogin?: boolean) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  initializeAuth: (password: string) => Promise<AuthResponse>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<AuthResponse>;
  checkSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Check if auth is initialized and session is valid on mount
  useEffect(() => {
    const checkAuth = async () => {
      const startTime = Date.now();
      const minLoadingTime = 5000; // Increased to 5 seconds for better UX
      
      try {
        // Check if auth is initialized
        const initialized = await Promise;
        setIsInitialized(initialized);

        if (initialized) {
          // Check for existing session
          const storedSessionId = sessionStorage.getItem('session_id');
          if (storedSessionId) {
            const response = await Promise;

            if (response.success) {
              setIsAuthenticated(true);
              setSessionId(storedSessionId);
              setIsDeveloper(response.is_developer);
            } else {
              // Clear invalid session
              sessionStorage.removeItem('session_id');
            }
          }
        }
      } catch (error) {
        
      }
      
      // Always ensure minimum loading time is respected
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      
      setTimeout(() => {
        setIsLoading(false);
      }, remaining);
    };

    checkAuth();
  }, []);

  const login = async (password: string, isDeveloperLogin = false): Promise<AuthResponse> => {
    try {
      // First, validate the password without showing loading screen
      const response = await Promise;

      // Only show loading screen and proceed if password is correct
      if (response.success && response.session_id) {
        const startTime = Date.now();
        const minTransitionTime = 5000; // 5 seconds minimum for successful login transition
        
        setIsTransitioning(true);
        
        setIsAuthenticated(true);
        setSessionId(response.session_id);
        setIsDeveloper(response.is_developer);
        sessionStorage.setItem('session_id', response.session_id);

        // Ensure minimum transition time for successful login
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minTransitionTime - elapsed);
        
        setTimeout(() => {
          setIsTransitioning(false);
        }, remaining);
      }

      return response;
    } catch (error) {
      
      
      return {
        success: false,
        message: 'Login failed due to an error',
        is_developer: false
      };
    }
  };

  const logout = async (): Promise<void> => {
    const startTime = Date.now();
    const minTransitionTime = 5000; // 2 seconds for logout
    
    setIsTransitioning(true);
    
    try {
      await Promise;
      
      setIsAuthenticated(false);
      setSessionId(null);
      setIsDeveloper(false);
      sessionStorage.removeItem('session_id');
    } catch (error) {
      
    }
    
    // Ensure minimum transition time
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, minTransitionTime - elapsed);
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, remaining);
  };

  const initializeAuth = async (password: string): Promise<AuthResponse> => {
    try {
      // First, validate the password without showing loading screen
      const response = await Promise;

      // Only show loading screen and proceed if initialization is successful
      if (response.success) {
        const startTime = Date.now();
        const minTransitionTime = 4000; // 4 seconds for initialization
        
        setIsTransitioning(true);
        
        setIsInitialized(true);
        if (response.session_id) {
          setIsAuthenticated(true);
          setSessionId(response.session_id);
          setIsDeveloper(response.is_developer);
          sessionStorage.setItem('session_id', response.session_id);
        }

        // Ensure minimum transition time
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minTransitionTime - elapsed);
        
        setTimeout(() => {
          setIsTransitioning(false);
        }, remaining);
      }

      return response;
    } catch (error) {
      
      
      return {
        success: false,
        message: 'Failed to initialize authentication',
        is_developer: false
      };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<AuthResponse> => {
    if (!sessionId) {
      return {
        success: false,
        message: 'No active session',
        is_developer: false
      };
    }

    const startTime = Date.now();
    const minTransitionTime = 2000; // 2 seconds for password change
    
    setIsTransitioning(true);
    
    try {
      const response = await Promise;

      // Ensure minimum transition time
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minTransitionTime - elapsed);
      
      setTimeout(() => {
        setIsTransitioning(false);
      }, remaining);

      return response;
    } catch (error) {
      
      
      // Still respect minimum time even on error
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minTransitionTime - elapsed);
      
      setTimeout(() => {
        setIsTransitioning(false);
      }, remaining);
      
      return {
        success: false,
        message: 'Failed to change password',
        is_developer: false
      };
    }
  };

  const checkSession = async (): Promise<boolean> => {
    if (!sessionId) return false;

    try {
      const response = Promise;

      if (!response.success) {
        const startTime = Date.now();
        const minTransitionTime = 1500; // 1.5 seconds for session expiry
        
        setIsTransitioning(true);
        
        setIsAuthenticated(false);
        setSessionId(null);
        setIsDeveloper(false);
        sessionStorage.removeItem('session_id');
        
        // Ensure minimum transition time
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minTransitionTime - elapsed);
        
        setTimeout(() => {
          setIsTransitioning(false);
        }, remaining);
        
        return false;
      }

      return true;
    } catch (error) {
      
      return false;
    }
  };

  // Enhanced loading screen with transition states
  if (isLoading || isTransitioning) {
    return (
        <LoadingScreen />
    )
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isInitialized,
        isDeveloper,
        sessionId,
        isLoading,
        isTransitioning,
        login,
        logout,
        initializeAuth,
        changePassword,
        checkSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};