import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService, type WordPressUser } from '../services/api';

interface AuthContextType {
  user: WordPressUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: WordPressUser) => void;
  logout: () => void;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<WordPressUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = (userData: WordPressUser) => {
    setUser(userData);
    // Store user data in localStorage for persistence
    localStorage.setItem('wordpress_user', JSON.stringify(userData));
    localStorage.setItem('wordpress_authenticated', 'true');
  };

  const logout = async () => {
    try {
      await apiService.logoutWordPress();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('wordpress_user');
      localStorage.removeItem('wordpress_authenticated');
    }
  };

  const checkAuthStatus = async () => {
    setIsLoading(true);
    try {
      // First check if we have stored auth info
      const storedAuth = localStorage.getItem('wordpress_authenticated');
      const storedUser = localStorage.getItem('wordpress_user');
      
      if (storedAuth === 'true' && storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
        } catch (error) {
          console.error('Error parsing stored user data:', error);
          localStorage.removeItem('wordpress_user');
          localStorage.removeItem('wordpress_authenticated');
        }
      }

      // Always verify with the backend
      const authStatus = await apiService.getWordPressAuthStatus();
      
      if (authStatus.authenticated && authStatus.user) {
        // Update with fresh user data from backend
        setUser(authStatus.user);
        localStorage.setItem('wordpress_user', JSON.stringify(authStatus.user));
        localStorage.setItem('wordpress_authenticated', 'true');
      } else {
        // Backend says we're not authenticated, clear local storage
        setUser(null);
        localStorage.removeItem('wordpress_user');
        localStorage.removeItem('wordpress_authenticated');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      // On error, clear local storage to be safe
      setUser(null);
      localStorage.removeItem('wordpress_user');
      localStorage.removeItem('wordpress_authenticated');
    } finally {
      setIsLoading(false);
    }
  };

  // Check auth status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    logout,
    checkAuthStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};