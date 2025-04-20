// src/services/firebase.ts
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GOOGLE_WEB_CLIENT_ID } from '@env';

// Variable para seguir el estado de inicialización
let isInitialized = false;

// Configurar Google Sign-In inmediatamente
try {
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: true,
  });
  console.log('GoogleSignin configurado correctamente');
} catch (error) {
  console.error('Error al configurar GoogleSignin:', error);
}

/**
 * Inicializa el servicio de autenticación
 */
export const initializeFirebase = async () => {
  try {
    console.log('Configurando servicio de autenticación para Google Sign-In');
    
    // Verificar que GoogleSignin esté disponible
    if (typeof GoogleSignin.hasPlayServices !== 'function') {
      throw new Error('GoogleSignin no está correctamente configurado');
    }
    
    // Verificar Google Play Services (sin mostrar diálogo aún)
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false });
    
    isInitialized = true;
    console.log('Servicio de autenticación configurado correctamente');
    return true;
  } catch (error) {
    console.error('Error al configurar servicio de autenticación:', error);
    return false;
  }
};

/**
 * Inicia sesión con Google directamente
 */
export const signInWithGoogle = async () => {
  try {
    // Verificar servicios de Google Play
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    
    // Iniciar sesión con Google
    const { idToken, user } = await GoogleSignin.signIn();
    
    if (!idToken) {
      throw new Error('No se pudo obtener el token de Google');
    }
    
    console.log('Login con Google exitoso');
    
    // Retornamos un objeto compatible
    return {
      user: {
        email: user.email,
        displayName: user.name,
        photoURL: user.photo,
        getIdToken: async () => idToken
      }
    };
  } catch (error: any) {
    // Mejorar el manejo de errores con códigos específicos de GoogleSignin
    if (error.code === 12501) {
      console.log('Usuario canceló el inicio de sesión con Google');
      throw new Error('Inicio de sesión cancelado por el usuario');
    }
    console.error('Error en inicio de sesión con Google:', error);
    throw error;
  }
};

/**
 * Cierra sesión en Google
 */
export const firebaseSignOut = async () => {
  try {
    await GoogleSignin.signOut();
    console.log('Sesión de Google cerrada');
    return true;
  } catch (error) {
    console.error('Error al cerrar sesión en Google:', error);
    throw error;
  }
};