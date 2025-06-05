// src/services/api.ts
import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DetectionResponse } from '../types/api';
import { API_URL } from '@env';
const AUTH_TOKEN_KEY = '@yachay_auth_token';

// Log inicial para verificar la URL cargada
console.log('API_URL cargada desde .env:', API_URL);

export class ApiService {
 // Variable estática para almacenar la URL base
 static API_BASE_URL = API_URL;

 // Método para cambiar la URL base en tiempo de ejecución
 static setApiBaseUrl(newUrl: string) {
   ApiService.API_BASE_URL = newUrl;
   console.log(`API Base URL actualizada a: ${ApiService.API_BASE_URL}`);
 }
 
 // Método para imprimir la URL actual (diagnóstico)
 static logCurrentApiUrl() {
   console.log(`URL actual de la API: ${ApiService.API_BASE_URL}`);
   return ApiService.API_BASE_URL;
 }

 // Funciones existentes
 static async checkConnectivity() {
   const netInfo = await NetInfo.fetch();
   if (!netInfo.isConnected) {
     throw new Error('No hay conexión a internet');
   }
 }

 static async detectObjects(imageUri: string): Promise<DetectionResponse> {
   try {
     await this.checkConnectivity();
     console.log('Intentando conectar a:', `${ApiService.API_BASE_URL}/detection/detect/`);
     console.log('URI de la imagen:', imageUri);

     // Obtener el token de autenticación
     const token = await this.getAuthToken();
     
     const formData = new FormData();
     formData.append('image', {
       uri: imageUri,
       type: 'image/jpeg',
       name: 'photo.jpg',
     } as any);

     const headers: HeadersInit = {
       'Content-Type': 'multipart/form-data',
     };
     
     // Añadir el token si existe
     if (token) {
       headers['Authorization'] = `Token ${token}`;
     }

     console.log('Enviando request con token:', token ? 'Sí' : 'No');
     const response = await fetch(`${ApiService.API_BASE_URL}/detection/detect/`, {
       method: 'POST',
       body: formData,
       headers,
     });

     console.log('Respuesta del servidor:', response.status);
     if (!response.ok) {
       throw new Error(`Error en la detección del objeto: ${response.status}`);
     }

     const data = await response.json();
     console.log('Datos recibidos:', data);
     return data;
   } catch (error) {
     console.error('Error detallado:', error);
     throw error;
   }
 }

 // Funciones de autenticación
 static async register(userData: {
   username: string;
   email: string;
   password: string;
   native_speaker?: boolean;
   preferred_dialect?: string;
 }) {
   try {
     await this.checkConnectivity();
     
     console.log('Enviando solicitud de registro:', userData);
     
     const response = await fetch(`${ApiService.API_BASE_URL}/auth/register/`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
       },
       body: JSON.stringify(userData),
     });

     const data = await response.json();
     
     if (!response.ok) {
       console.error('Error en respuesta:', data);
       throw new Error(data.error || 'Error al registrar el usuario');
     }

     // Guardar token para mantener sesión
     await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token);
     
     return data;
   } catch (error) {
     console.error('Error en registro:', error);
     throw error;
   }
 }

 static async login(credentials: { username: string; password: string }) {
   try {
     await this.checkConnectivity();
     
     const response = await fetch(`${ApiService.API_BASE_URL}/auth/login/`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
       },
       body: JSON.stringify(credentials),
     });

     const data = await response.json();
     
     if (!response.ok) {
       throw new Error(data.error || 'Credenciales inválidas');
     }

     // Guardar token para mantener sesión
     await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token);
     
     return data;
   } catch (error) {
     console.error('Error en login:', error);
     throw error;
   }
 }

 // Nueva función para login con Firebase
 static async loginWithFirebase(firebaseToken: string, userData: {
   email: string;
   name: string;
   photoURL?: string;
 }) {
   try {
     await this.checkConnectivity();
     
     const response = await fetch(`${ApiService.API_BASE_URL}/auth/firebase-login/`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         firebase_token: firebaseToken,
         email: userData.email,
         name: userData.name,
         photo_url: userData.photoURL || ''
       }),
     });

     const data = await response.json();
     
     if (!response.ok) {
       throw new Error(data.error || 'Error al iniciar sesión con Google');
     }

     // Guardar token para mantener sesión
     await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token);
     
     return data;
   } catch (error) {
     console.error('Error en login con Firebase:', error);
     throw error;
   }
 }

 static async logout() {
   await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
 }

 static async getAuthToken() {
   return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
 }

 static async isAuthenticated() {
   const token = await this.getAuthToken();
   return !!token;
 }

 static async getUserProfile() {
   try {
     await this.checkConnectivity();
     
     const token = await this.getAuthToken();
     console.log('Token para perfil:', token);
     console.log('URL para obtener perfil:', `${ApiService.API_BASE_URL}/users/profile/`);
     
     if (!token) {
       throw new Error('No hay sesión activa');
     }
     
     // Usar un AbortController para implementar un timeout manualmente
     const controller = new AbortController();
     const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos de timeout
     
     const response = await fetch(`${ApiService.API_BASE_URL}/users/profile/`, {
       method: 'GET',
       headers: {
         'Authorization': `Token ${token}`,
         'Content-Type': 'application/json',
       },
       signal: controller.signal
     });
     
     // Limpiar el timeout
     clearTimeout(timeoutId);
 
     console.log('Respuesta del servidor:', response.status, response.statusText);
     
     if (!response.ok) {
       console.error('Error en respuesta:', response.status, response.statusText);
       throw new Error(`Error al obtener perfil: ${response.status}`);
     }
 
     const data = await response.json();
     console.log('Datos de perfil recibidos:', data);
     return data;
   } catch (error) {
     console.error('Error detallado al obtener perfil:', error);
     
     // Comprobar el tipo de error correctamente
     if (error instanceof Error) {
       if (error.name === 'AbortError') {
         throw new Error('La solicitud tomó demasiado tiempo. Verifica tu conexión a internet.');
       }
     }
     
     throw error;
   }
 }
 
 // Funciones para ejercicios
 static async getExercisesForObject(objectId: number) {
   try {
     await this.checkConnectivity();
     
     const token = await this.getAuthToken();
     const headers: HeadersInit = {
       'Content-Type': 'application/json',
     };
     
     if (token) {
       headers['Authorization'] = `Token ${token}`;
     }
     
     const response = await fetch(`${ApiService.API_BASE_URL}/exercises/generate/?object_id=${objectId}`, {
       method: 'GET',
       headers,
     });

     if (!response.ok) {
       throw new Error('Error al obtener ejercicios');
     }

     return await response.json();
   } catch (error) {
     console.error('Error al obtener ejercicios:', error);
     throw error;
   }
 }
 
 static async getExercisesByLabel(label: string) {
  try {
    await this.checkConnectivity();
    
    // Buscar la traducción por etiqueta
    console.log(`Buscando traducción para: ${label}`);
    
    // Normalizar la etiqueta para buscarla
    const normalizedLabel = label.toLowerCase().trim();
    
    const searchResponse = await fetch(`${ApiService.API_BASE_URL}/translations/?english_label=${encodeURIComponent(normalizedLabel)}`);
    
    if (!searchResponse.ok) {
      console.error('Error en la búsqueda:', searchResponse.status);
      throw new Error('Error al buscar traducción');
    }
    
    const searchData = await searchResponse.json();
    console.log('Resultado de búsqueda:', searchData);
    
    // Verificar que encontramos al menos una traducción
    if (!searchData.results || searchData.results.length === 0) {
      console.error('No se encontraron traducciones');
      throw new Error(`No se encontró traducción para: ${label}`);
    }
    
    // Buscar específicamente la traducción que coincide exactamente con el label
    const exactMatch = searchData.results.find(
      (item: any) => item.english_label.toLowerCase().trim() === normalizedLabel
    );
    
    let objectId;
    
    if (exactMatch) {
      console.log(`Encontrada coincidencia exacta para: ${label}, ID: ${exactMatch.id}`);
      objectId = exactMatch.id;
    } else {
      console.log(`No se encontró coincidencia exacta para: ${label}, buscando objeto exacto en todas las páginas`);
      
      // Intentar buscar en todas las páginas
      let nextPage = searchData.next;
      let found = false;
      
      while (nextPage && !found) {
        const nextPageResponse = await fetch(nextPage);
        if (!nextPageResponse.ok) break;
        
        const nextPageData = await nextPageResponse.json();
        
        const match = nextPageData.results.find(
          (item: any) => item.english_label.toLowerCase().trim() === normalizedLabel
        );
        
        if (match) {
          objectId = match.id;
          found = true;
          console.log(`Encontrada coincidencia exacta en página adicional, ID: ${objectId}`);
        }
        
        nextPage = nextPageData.next;
      }
      
      // Si no se encuentra en ninguna página, usar el primer resultado como fallback
      if (!found) {
        console.log(`No se encontró coincidencia exacta en ninguna página, usando primer resultado`);
        if (searchData.results && searchData.results.length > 0) {
          objectId = searchData.results[0].id;
        } else {
          throw new Error("No se encontró coincidencia exacta");
        }
      }
    }
    
    // Usar la URL correcta para generar ejercicios
    const token = await this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Token ${token}`;
    }
    
    const response = await fetch(`${ApiService.API_BASE_URL}/exercises/generate/?object_id=${objectId}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.error('Error al generar ejercicios:', response.status);
      throw new Error('Error al generar ejercicios');
    }

    const data = await response.json();
    
    // CAMBIO CRUCIAL: Validar estructura de datos antes de devolver
    // Si tiene propiedad 'exercises', devolver el objeto completo
    if (data && typeof data === 'object' && data.exercises) {
      console.log("Encontrada estructura {session_id, exercises}");
      return data;
    }
    // Si es un array, devolver el array
    else if (Array.isArray(data)) {
      console.log("Encontrada estructura de array de ejercicios");
      return data;
    }
    // Si no coincide con los formatos esperados
    else {
      console.error("Estructura no reconocida en respuesta:", data);
      throw new Error("Formato de respuesta no esperado");
    }
    
  } catch (error) {
    console.error('Error al obtener ejercicios por etiqueta:', error);
    throw error;
  }
}
 
static async submitExerciseAnswer(exerciseId: number, answer: string, mode?: string) {
  try {
    await this.checkConnectivity();
    
    const token = await this.getAuthToken();
    if (!token) {
      throw new Error('Debe iniciar sesión para enviar respuestas');
    }
    
    // ✅ VALIDACIÓN MEJORADA DE PARÁMETROS
    if (!exerciseId || exerciseId <= 0) {
      throw new Error(`ID de ejercicio inválido: ${exerciseId}`);
    }
    
    if (!answer || answer.trim() === '') {
      throw new Error('La respuesta no puede estar vacía');
    }
    
    // ✅ LOGGING DETALLADO PARA DEPURACIÓN
    console.log(`📡 ApiService.submitExerciseAnswer - Enviando datos:`);
    console.log(`   - Exercise ID: ${exerciseId}`);
    console.log(`   - Answer: "${answer}"`);
    console.log(`   - Answer length: ${answer.length} caracteres`);
    console.log(`   - Mode: ${mode || 'undefined'}`);
    console.log(`   - Contains arrow (→): ${answer.includes('→')}`);
    console.log(`   - URL: ${ApiService.API_BASE_URL}/exercises/${exerciseId}/submit_answer/`);
    
    const requestBody: any = { answer };
    if (mode) {
      requestBody.mode = mode;
    }
    
    // ✅ VALIDACIÓN ESPECÍFICA PARA MATCHING
    if (answer.includes('→')) {
      console.log(`🔍 Detectado formato de matching en ApiService`);
      const parts = answer.split('→');
      if (parts.length !== 2) {
        console.warn(`⚠️ Formato de matching inválido: esperado 2 partes, recibido ${parts.length}`);
        console.warn(`⚠️ Partes encontradas:`, parts);
      } else {
        console.log(`🔍 Matching válido - Español: "${parts[0]}", Quechua: "${parts[1]}"`);
      }
    }
    
    console.log(`📡 Request body final:`, JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${ApiService.API_BASE_URL}/exercises/${exerciseId}/submit_answer/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // ✅ MANEJO MEJORADO DE ERRORES HTTP
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Error HTTP ${response.status}`;
      let errorDetails = null;
      
      try {
        errorDetails = JSON.parse(errorText);
        errorMessage = errorDetails.error || errorDetails.message || errorMessage;
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }
      
      console.error(`❌ Error HTTP ${response.status} en submitExerciseAnswer:`);
      console.error(`   - URL: ${ApiService.API_BASE_URL}/exercises/${exerciseId}/submit_answer/`);
      console.error(`   - Request Body:`, JSON.stringify(requestBody, null, 2));
      console.error(`   - Response Status: ${response.status}`);
      console.error(`   - Response Text:`, errorText);
      
      // ✅ ERRORES ESPECÍFICOS PARA DEBUGGING
      if (response.status === 400) {
        console.error(`❌ Bad Request 400 - Detalles completos:`);
        console.error(`   - Exercise ID: ${exerciseId}`);
        console.error(`   - Answer: "${answer}"`);
        console.error(`   - Mode: ${mode}`);
        console.error(`   - Error del servidor:`, errorDetails);
        
        // ✅ MANEJO ESPECÍFICO PARA ERRORES DE MATCHING
        if (answer.includes('→')) {
          console.error(`❌ Error 400 en ejercicio de matching:`);
          console.error(`   - Respuesta con formato: "${answer}"`);
          console.error(`   - ¿Problema de formato en backend?`);
        }
      }
      
      throw new Error(`${errorMessage} (Status: ${response.status})`);
    }

    const result = await response.json();
    
    // ✅ LOGGING DE RESPUESTA EXITOSA
    console.log(`✅ ApiService - Respuesta exitosa del backend:`);
    console.log(`   - Correct: ${result.correct}`);
    console.log(`   - Mastery Level: ${result.mastery_level}`);
    console.log(`   - Previous Level: ${result.previous_mastery_level}`);
    console.log(`   - Mastery Updated: ${result.mastery_updated}`);
    console.log(`   - Mastery Decreased: ${result.mastery_decreased}`);
    console.log(`   - Exercise Type: ${result.exercise_type}`);
    console.log(`   - Mode: ${result.mode}`);
    
    // 🔧 CORRECCIÓN CRÍTICA: Invalidar AMBOS caches
    this.invalidateVocabCache();
    this.invalidateProgressCache();  // ✅ LÍNEA AGREGADA
    
    // ✅ EMITIR EVENTOS INMEDIATAMENTE
    if (typeof global !== 'undefined' && (global as any).progressEvents) {
      const eventData = {
        type: result.mastery_updated ? 'mastery_increase' : 
              result.mastery_decreased ? 'mastery_decrease' : 'exercise_completed',
        word: result.word || 'unknown',
        newLevel: result.mastery_level,
        previousLevel: result.previous_mastery_level,
        mode: mode || 'practice',
        exerciseId,
        isCorrect: result.correct,
        immediate: true // ✅ Flag para update inmediato
      };
      
      console.log(`📡 Emitiendo evento de progreso:`, eventData);
      (global as any).progressEvents.emit('progress_updated', eventData);
      (global as any).progressEvents.emit('exercise_completed', eventData);
      (global as any).progressEvents.emit('force_refresh_progress');  // ✅ LÍNEA AGREGADA
    }

    return result;
  } catch (error) {
    console.error('❌ Error detallado en ApiService.submitExerciseAnswer:', error);
    
    // ✅ LOGGING ADICIONAL PARA ERRORES
    if (error instanceof Error) {
      console.error(`❌ Error details:`);
      console.error(`   - Message: ${error.message}`);
      console.error(`   - Exercise ID: ${exerciseId}`);
      console.error(`   - Answer: "${answer}"`);
      console.error(`   - Mode: ${mode}`);
    }
    
    throw error;
  }
}
 static async loginWithGoogle(googleToken: string, userData: {
   email: string;
   name: string;
   photoURL?: string;
 }) {
   try {
     await this.checkConnectivity();
     
     console.log('Enviando token de Google al backend...');
     
     const response = await fetch(`${ApiService.API_BASE_URL}/auth/google-login/`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         id_token: googleToken,
         email: userData.email,
         name: userData.name,
         photo_url: userData.photoURL || ''
       }),
     });
 
     if (!response.ok) {
       const errorData = await response.json();
       console.error('Error en respuesta de login con Google:', errorData);
       throw new Error(errorData.error || 'Error al iniciar sesión con Google');
     }
     
     const data = await response.json();
     
     // Guardar token para mantener sesión
     await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token);
     
     return data;
   } catch (error) {
     console.error('Error en login con Google:', error);
     throw error;
   }
 }

 static async getExercisesByCategory(category: string) {
   try {
     await this.checkConnectivity();
     
     const token = await this.getAuthToken();
     const headers: HeadersInit = {
       'Content-Type': 'application/json',
     };
     
     if (token) {
       headers['Authorization'] = `Token ${token}`;
     }
     
     const response = await fetch(`${ApiService.API_BASE_URL}/practice/get_exercises_by_category/?category=${category}`, {
       headers,
     });
     
     if (!response.ok) {
       throw new Error('Error al obtener ejercicios');
     }
     
     return await response.json();
   } catch (error) {
     console.error('Error obteniendo ejercicios por categoría:', error);
     throw error;
   }
 }

 static async getUserProgress() {
   try {
     await this.checkConnectivity();
     
     const token = await this.getAuthToken();
     if (!token) {
       throw new Error('No hay sesión activa');
     }
     
     const response = await fetch(`${ApiService.API_BASE_URL}/progress/user_progress/`, {
       headers: {
         'Authorization': `Token ${token}`,
         'Content-Type': 'application/json',
       },
     });
     
     if (!response.ok) {
       throw new Error('Error al obtener progreso');
     }
     
     return await response.json();
   } catch (error) {
     console.error('Error obteniendo progreso:', error);
     throw error;
   }
 }

 // Método para registrar progreso de ambos modos (detección y práctica)
 static async recordProgress(mode: 'detection' | 'practice', category?: string) {
   try {
     await this.checkConnectivity();
     
     const token = await this.getAuthToken();
     if (!token) {
       throw new Error('No hay sesión activa');
     }
     
     const response = await fetch(`${ApiService.API_BASE_URL}/progress/record_progress/`, {
       method: 'POST',
       headers: {
         'Authorization': `Token ${token}`,
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         mode,
         category,
         timestamp: new Date().toISOString()
     }),
     });
     
     if (!response.ok) {
       throw new Error('Error al registrar progreso');
     }
     
     return await response.json();
   } catch (error) {
     console.error('Error registrando progreso:', error);
     throw error;
   }
 }

 // Método para obtener categorías de práctica
 static async getPracticeCategories() {
   try {
     await this.checkConnectivity();
     
     const response = await fetch(`${ApiService.API_BASE_URL}/practice/categories/`);
     
     if (!response.ok) {
       throw new Error('Error al obtener categorías');
     }
     
     return await response.json();
   } catch (error) {
     console.error('Error obteniendo categorías:', error);
     throw error;
   }
 }

 // Método para actualizar el progreso del usuario después de completar ejercicios
 static async updateUserProgress(exerciseId: number, completed: boolean, score: number, mode: string) {
   try {
     await this.checkConnectivity();
     
     const token = await this.getAuthToken();
     if (!token) {
       throw new Error('No hay sesión activa');
     }
     
     const response = await fetch(`${ApiService.API_BASE_URL}/progress/update/`, {
       method: 'POST',
       headers: {
         'Authorization': `Token ${token}`,
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         exercise_id: exerciseId,
         completed,
         score,
         mode,
         timestamp: new Date().toISOString()
       }),
     });
     
     if (!response.ok) {
       throw new Error('Error al actualizar progreso');
     }
     
     return await response.json();
   } catch (error) {
     console.error('Error actualizando progreso:', error);
     throw error;
   }
 }

 // Método para obtener rachas y recompensas del usuario
 static async getUserStreaksAndRewards() {
   try {
     await this.checkConnectivity();
     
     const token = await this.getAuthToken();
     if (!token) {
       throw new Error('No hay sesión activa');
     }
     
     const response = await fetch(`${ApiService.API_BASE_URL}/progress/streaks-rewards/`, {
       headers: {
         'Authorization': `Token ${token}`,
         'Content-Type': 'application/json',
       },
     });
     
     if (!response.ok) {
       throw new Error('Error al obtener rachas y recompensas');
     }
     
     return await response.json();
   } catch (error) {
     console.error('Error obteniendo rachas y recompensas:', error);
     throw error;
   }
 }

 // Método para obtener estadísticas detalladas por categoría
 static async getCategoryStats() {
   try {
     await this.checkConnectivity();
     
     const token = await this.getAuthToken();
     if (!token) {
       throw new Error('No hay sesión activa');
     }
     
     const response = await fetch(`${ApiService.API_BASE_URL}/progress/category-stats/`, {
       headers: {
         'Authorization': `Token ${token}`,
         'Content-Type': 'application/json',
       },
     });
     
     if (!response.ok) {
       throw new Error('Error al obtener estadísticas por categoría');
     }
     
     return await response.json();
   } catch (error) {
     console.error('Error obteniendo estadísticas por categoría:', error);
     throw error;
   }
 }

 // Método para iniciar una sesión de práctica
 static async startPracticeSession(category: string) {
   try {
     await this.checkConnectivity();
     
     const token = await this.getAuthToken();
     if (!token) {
       throw new Error('No hay sesión activa');
     }
     
     const response = await fetch(`${ApiService.API_BASE_URL}/practice/start-session/`, {
       method: 'POST',
       headers: {
         'Authorization': `Token ${token}`,
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         category,
         start_time: new Date().toISOString()
       }),
     });
     
     if (!response.ok) {
       throw new Error('Error al iniciar sesión de práctica');
     }
     
     return await response.json();
   } catch (error) {
     console.error('Error iniciando sesión de práctica:', error);
     throw error;
   }
 }

 // Método para finalizar una sesión de práctica
 static async endPracticeSession(sessionId: number, stats: any) {
   try {
     await this.checkConnectivity();
     
     const token = await this.getAuthToken();
     if (!token) {
       throw new Error('No hay sesión activa');
     }
     
     const response = await fetch(`${ApiService.API_BASE_URL}/practice/end-session/`, {
       method: 'POST',
       headers: {
         'Authorization': `Token ${token}`,
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         session_id: sessionId,
         end_time: new Date().toISOString(),
         ...stats
       }),
     });
     
     if (!response.ok) {
       throw new Error('Error al finalizar sesión de práctica');
     }
     
     return await response.json();
   } catch (error) {
     console.error('Error finalizando sesión de práctica:', error);
     throw error;
   }
 }

 // Método para obtener el vocabulario personal del usuario
 // src/services/api.ts
// Variables estáticas para el caché
// Variables estáticas para el caché
static vocabCache = new Map();
static vocabCacheTimestamp = 0;
static VOCAB_CACHE_DURATION = 10000; // 10 segundos de caché
static PROGRESS_CACHE_DURATION = 5000; // 5 segundos para progreso
// Método para invalidar caché de vocabulario
static invalidateVocabCache() {
  this.vocabCache.clear();
  this.vocabCacheTimestamp = 0;
  console.log("Caché de vocabulario invalidado");
}
// ✅ NUEVA: Cache específico para progreso
static progressCache = new Map();
static progressCacheTimestamp = 0;

static invalidateProgressCache() {
  this.progressCache.clear();
  this.progressCacheTimestamp = 0;
  console.log("Caché de progreso invalidado");
}

static invalidateAllCache() {
  this.invalidateVocabCache();
  this.invalidateProgressCache();
  console.log("Todos los caches invalidados");
}
// 3 segundos de caché
static vocabRequestInProgress = false;
static lastVocabRequest: string | null = null;  // Corregido para aceptar string o null

static async getUserVocabulary(params: {
  sort_by?: 'recent' | 'mastery' | 'needs_practice';
  mastery_min?: number;
  mastery_max?: number;
  mode?: 'detection' | 'practice';
}) {
  try {
    // Crear clave de caché basada en los parámetros
    const cacheKey = JSON.stringify(params);
    
    // Si hay una solicitud en progreso con los mismos parámetros, devolver el último resultado
    if (this.vocabRequestInProgress && this.lastVocabRequest === cacheKey) {
      console.log("Solicitud de vocabulario en progreso, devolviendo caché");
      return this.vocabCache.get(cacheKey) || [];
    }
    
    // Verificar si hay caché válida
    const now = Date.now();
    if (this.vocabCache.has(cacheKey) && 
        now - this.vocabCacheTimestamp < this.VOCAB_CACHE_DURATION) {
      console.log("Usando caché para vocabulario");
      return this.vocabCache.get(cacheKey);
    }
    
    // Marcar solicitud en progreso
    this.vocabRequestInProgress = true;
    this.lastVocabRequest = cacheKey;
    
    try {
      await this.checkConnectivity();
      
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No hay sesión activa');
      }
      
      const queryParams = new URLSearchParams();
      if (params.sort_by) queryParams.append('sort_by', params.sort_by);
      if (params.mastery_min !== undefined) queryParams.append('mastery_min', params.mastery_min.toString());
      if (params.mastery_max !== undefined) queryParams.append('mastery_max', params.mastery_max.toString());
      if (params.mode) queryParams.append('mode', params.mode);
      
      const response = await fetch(`${ApiService.API_BASE_URL}/practice/user_vocabulary/?${queryParams}`, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Error al obtener vocabulario');
      }
      
      const data = await response.json();
      
      // Guardar en caché
      this.vocabCache.set(cacheKey, data);
      this.vocabCacheTimestamp = now;
      
      return data;
    } finally {
      // Siempre marcar como completado, incluso si hay errores
      this.vocabRequestInProgress = false;
    }
  } catch (error) {
    console.error('Error obteniendo vocabulario:', error);
    // En caso de error, devolver caché si existe (aunque haya expirado)
    const cacheKey = JSON.stringify(params);
    if (this.vocabCache.has(cacheKey)) {
      console.log("Error en solicitud, usando caché expirada");
      return this.vocabCache.get(cacheKey);
    }
    throw error;
  }
} 
// Método para verificar penalizaciones por abandono antes de salir
static async checkAbandonmentPenalty(sessionId: number, mode: 'detection' | 'practice' = 'practice') {
  try {
    await this.checkConnectivity();
    
    const token = await this.getAuthToken();
    if (!token) {
      throw new Error('No hay sesión activa');
    }
    
    const response = await fetch(`${ApiService.API_BASE_URL}/exercises/check_abandonment_penalty/?session_id=${sessionId}&mode=${mode}`, {
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Error al verificar penalizaciones');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error verificando penalizaciones de abandono:', error);
    throw error;
  }
}

// Método para registrar el abandono de una sesión
static async abandonSession(sessionId: number, mode: 'detection' | 'practice' = 'practice') {
  try {
    await this.checkConnectivity();
    
    const token = await this.getAuthToken();
    if (!token) {
      throw new Error('No hay sesión activa');
    }
    
    // Asegurar que sessionId sea un número
    const numericSessionId = Number(sessionId);
    
    if (isNaN(numericSessionId) || numericSessionId <= 0) {
      throw new Error('ID de sesión inválido');
    }
    
    console.log(`Enviando solicitud para abandonar sesión ${numericSessionId} en modo ${mode}`);
    
    const response = await fetch(`${ApiService.API_BASE_URL}/exercises/abandon_session/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: numericSessionId,
        mode: mode
      }),
    });
    
    // 🆕 BLOQUE MEJORADO:
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error del servidor al abandonar sesión:', errorData);
      
      // 🆕 Si el error es porque ya está completada, tratar como éxito
      if (response.status === 400 && 
          (errorData.error?.includes('completada') || errorData.error?.includes('completed'))) {
        console.log('Sesión ya completada, tratando como abandono exitoso');
        return { 
          success: true, 
          message: 'Sesión ya finalizada',
          was_completed: true 
        };
      }
      
      throw new Error(errorData.error || 'Error al abandonar sesión');
    }
    
    const responseData = await response.json();
    console.log('Respuesta al abandonar sesión:', responseData);
    return responseData;
  } catch (error) {
    console.error('Error detallado al abandonar sesión:', error);
    throw error;
  }
} 
// Método para notificar cambios de progreso
static notifyProgressUpdate(data?: any) {
  this.invalidateVocabCache();
  
  if (typeof global !== 'undefined' && (global as any).progressEvents) {
    (global as any).progressEvents.emit('progress_updated', data);
  }
}
}