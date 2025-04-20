// src/context/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Alert, Platform } from 'react-native';
import { ApiService } from '../services/api';
import { initializeFirebase, signInWithGoogle, firebaseSignOut } from '../services/firebase';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  login: (username: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  console.log('DIAGNÓSTICO: Renderizando AuthProvider');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    console.log('DIAGNÓSTICO: Ejecutando useEffect del AuthProvider');
    
    // Verificar si hay sesión activa
    const checkAuth = async () => {
      console.log('DIAGNÓSTICO: Iniciando checkAuth');
      try {
        console.log('DIAGNÓSTICO: Verificando autenticación con ApiService');
        const authenticated = await ApiService.isAuthenticated();
        console.log('DIAGNÓSTICO: Estado de autenticación recibido:', authenticated);
        setIsAuthenticated(authenticated);
        
        if (authenticated) {
          try {
            console.log('DIAGNÓSTICO: Cargando perfil de usuario');
            const profileData = await ApiService.getUserProfile();
            console.log('DIAGNÓSTICO: Perfil cargado correctamente');
            setUser(profileData);
          } catch (profileError) {
            console.error('DIAGNÓSTICO: Error al cargar el perfil:', profileError);
          }
        }
      } catch (error) {
        console.log('DIAGNÓSTICO: Error verificando autenticación:', error);
      } finally {
        console.log('DIAGNÓSTICO: Finalizando verificación de autenticación');
        setIsLoading(false);
      }
    };

    // Inicializar el servicio de autenticación con Google
    const setupAuthService = async () => {
      try {
        // Inicializar servicio de autenticación
        await initializeFirebase();
        console.log('DIAGNÓSTICO: Servicio de autenticación inicializado');
      } catch (error) {
        console.error('DIAGNÓSTICO: Error al configurar servicio de autenticación:', error);
      }
    };

    // Ejecutar ambas operaciones
    checkAuth();
    setupAuthService();
  }, []);

  const login = async (username: string, password: string) => {
    console.log('DIAGNÓSTICO: Iniciando login con usuario y contraseña');
    try {
      const userData = await ApiService.login({ username, password });
      console.log('DIAGNÓSTICO: Login exitoso');
      setUser(userData.user);
      setIsAuthenticated(true);
      return userData;
    } catch (error) {
      console.error('DIAGNÓSTICO: Error en login:', error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    console.log('DIAGNÓSTICO: Iniciando loginWithGoogle');
    try {
      setIsLoading(true);
      
      try {
        // Obtener token de Google
        const result = await signInWithGoogle();
        
        if (result && result.user) {
          const googleUser = result.user;
          console.log('DIAGNÓSTICO: Usuario Google:', googleUser.email);
          
          console.log('DIAGNÓSTICO: Obteniendo token ID de Google');
          const idToken = await googleUser.getIdToken();
          console.log('DIAGNÓSTICO: Token ID obtenido');
          
          // Enviar token al backend con el nuevo método
          try {
            console.log('DIAGNÓSTICO: Enviando token a API');
            const backendResponse = await ApiService.loginWithGoogle(idToken, {
              email: googleUser.email || '',
              name: googleUser.displayName || '',
              photoURL: googleUser.photoURL || ''
            });
            console.log('DIAGNÓSTICO: Respuesta recibida del backend');
            
            setUser(backendResponse.user);
            setIsAuthenticated(true);
            console.log('DIAGNÓSTICO: Usuario autenticado con éxito');
          } catch (backendError: any) {
            console.error('DIAGNÓSTICO: Error en backend:', backendError);
            // Si hay error en el backend, cerrar sesión en Google
            console.log('DIAGNÓSTICO: Cerrando sesión en Google debido a error');
            await firebaseSignOut();
            
            Alert.alert('Error', backendError.message || 'No se pudo completar el inicio de sesión con Google');
            throw backendError;
          }
        } else {
          throw new Error('No se obtuvo usuario de Google');
        }
      } catch (googleError: any) {
        console.error('DIAGNÓSTICO: Error en autenticación con Google:', googleError);
        
        if (googleError.code === 'auth/network-request-failed') {
          Alert.alert('Error de conexión', 'Verifica tu conexión a internet e intenta nuevamente.');
        } else if (googleError.code === 12501) { // Código de Google Sign-In para cancelación
          console.log('DIAGNÓSTICO: Login con Google cancelado por el usuario');
        } else if (googleError.message && googleError.message.includes('cancelado por el usuario')) {
          console.log('DIAGNÓSTICO: Login con Google cancelado por el usuario');
        } else {
          Alert.alert('Error', googleError.message || 'No se pudo iniciar sesión con Google. Intenta nuevamente.');
        }
        
        throw googleError;
      }
    } catch (error: any) {
      console.error('DIAGNÓSTICO: Error general en login con Google:', error);
      throw error;
    } finally {
      setIsLoading(false);
      console.log('DIAGNÓSTICO: Proceso de login con Google finalizado');
    }
  };
  
  const register = async (userData: any) => {
    console.log('DIAGNÓSTICO: Iniciando registro');
    try {
      const response = await ApiService.register(userData);
      console.log('DIAGNÓSTICO: Registro exitoso');
      setUser(response.user);
      setIsAuthenticated(true);
      return response;
    } catch (error) {
      console.error('DIAGNÓSTICO: Error en registro:', error);
      throw error;
    }
  };

  const logout = async () => {
    console.log('DIAGNÓSTICO: Iniciando logout');
    try {
      await ApiService.logout();
      console.log('DIAGNÓSTICO: Logout de API exitoso');
      
      // Cerrar sesión en Google
      try {
        await firebaseSignOut();
        console.log('DIAGNÓSTICO: Sesión de Google cerrada');
      } catch (signOutError) {
        console.error('DIAGNÓSTICO: Error al cerrar sesión en Google:', signOutError);
      }
      
      setUser(null);
      setIsAuthenticated(false);
      console.log('DIAGNÓSTICO: Logout completado');
    } catch (error) {
      console.error('DIAGNÓSTICO: Error en logout:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        login,
        loginWithGoogle,
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