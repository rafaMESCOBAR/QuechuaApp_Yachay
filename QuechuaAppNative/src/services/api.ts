// src/services/api.ts
import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DetectionResponse } from '../types/api';
import { API_URL } from '@env';
const AUTH_TOKEN_KEY = '@yachay_auth_token';

export class ApiService {
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
      console.log('Intentando conectar a:', `${API_URL}/detection/detect/`);
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
      const response = await fetch(`${API_URL}/detection/detect/`, {
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
      
      const response = await fetch(`${API_URL}/auth/register/`, {
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
      
      const response = await fetch(`${API_URL}/auth/login/`, {
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
      
      const response = await fetch(`${API_URL}/auth/firebase-login/`, {
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
      console.log('URL para obtener perfil:', `${API_URL}/users/profile/`);
      
      if (!token) {
        throw new Error('No hay sesión activa');
      }
      
      // Usar un AbortController para implementar un timeout manualmente
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos de timeout
      
      const response = await fetch(`${API_URL}/users/profile/`, {
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
      
      const response = await fetch(`${API_URL}/exercises/generate/?object_id=${objectId}`, {
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
      
      const searchResponse = await fetch(`${API_URL}/translations/?english_label=${encodeURIComponent(normalizedLabel)}`);
      
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
          console.log(`No se encontró coincidencia exacta en ninguna página, usando mockup local`);
          // En lugar de usar ID 5 (avión), usaremos un ejercicio local basado en el objeto detectado
          throw new Error("No se encontró coincidencia exacta");
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
      
      const response = await fetch(`${API_URL}/exercises/generate/?object_id=${objectId}`, {
        method: 'GET',
        headers,
      });
  
      if (!response.ok) {
        console.error('Error al generar ejercicios:', response.status);
        throw new Error('Error al generar ejercicios');
      }
  
      return await response.json();
      
    } catch (error) {
      console.error('Error al obtener ejercicios por etiqueta:', error);
      throw error;
    }
  }
  
  static async submitExerciseAnswer(exerciseId: number, answer: string) {
    try {
      await this.checkConnectivity();
      
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('Debe iniciar sesión para enviar respuestas');
      }
      
      const response = await fetch(`${API_URL}/exercises/${exerciseId}/submit_answer/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answer }),
      });

      if (!response.ok) {
        throw new Error('Error al enviar respuesta');
      }

      return await response.json();
    } catch (error) {
      console.error('Error al enviar respuesta:', error);
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
      
      const response = await fetch(`${API_URL}/auth/google-login/`, {
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
      
      const response = await fetch(`${API_URL}/practice/get_exercises_by_category/?category=${category}`, {
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
      
      const response = await fetch(`${API_URL}/progress/user_progress/`, {
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

// Método para registrar puntos de ambos modos (detección y práctica)
static async recordPoints(points: number, mode: 'detection' | 'practice', category?: string) {
  try {
    await this.checkConnectivity();
    
    const token = await this.getAuthToken();
    if (!token) {
      throw new Error('No hay sesión activa');
    }
    
    const response = await fetch(`${API_URL}/progress/record_points/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        points,
        mode,
        category,
        timestamp: new Date().toISOString()
      }),
    });
    
    if (!response.ok) {
      throw new Error('Error al registrar puntos');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error registrando puntos:', error);
    throw error;
  }
}

// Método para obtener categorías de práctica
static async getPracticeCategories() {
  try {
    await this.checkConnectivity();
    
    const response = await fetch(`${API_URL}/practice/categories/`);
    
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
    
    const response = await fetch(`${API_URL}/progress/update/`, {
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
    
    const response = await fetch(`${API_URL}/progress/streaks-rewards/`, {
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
    
    const response = await fetch(`${API_URL}/progress/category-stats/`, {
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
    
    const response = await fetch(`${API_URL}/practice/start-session/`, {
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
    
    const response = await fetch(`${API_URL}/practice/end-session/`, {
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


}