//src/context/AuthContext.tsx

import React, { createContext, useState, useEffect, useContext } from 'react';
import { ApiService } from '../services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay sesión activa
    const checkAuth = async () => {
      try {
        const authenticated = await ApiService.isAuthenticated();
        setIsAuthenticated(authenticated);
      } catch (error) {
        console.log('Error verificando autenticación:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    await ApiService.login({ username, password });
    setIsAuthenticated(true);
  };

  const register = async (userData: any) => {
    await ApiService.register(userData);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await ApiService.logout();
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};