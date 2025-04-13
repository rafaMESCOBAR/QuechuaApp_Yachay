// src/services/cacheService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DetectionResponse, DetectedObject } from '../types/api';

// Prefijos para las claves de caché
const DETECTION_CACHE_PREFIX = '@yachay_detection_';
const TRANSLATION_CACHE_PREFIX = '@yachay_translation_';
const EXERCISE_CACHE_PREFIX = '@yachay_exercise_';

// Tiempo de expiración para la caché (1 día en milisegundos)
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000;

interface CachedItem<T> {
  data: T;
  timestamp: number;
}

export class CacheService {
  /**
   * Guarda un objeto en la caché con un timestamp
   */
  static async setItem<T>(key: string, data: T): Promise<void> {
    try {
      const cacheItem: CachedItem<T> = {
        data,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(key, JSON.stringify(cacheItem));
    } catch (error) {
      console.error('Error guardando en caché:', error);
    }
  }

  /**
   * Obtiene un objeto de la caché si no ha expirado
   */
  static async getItem<T>(key: string): Promise<T | null> {
    try {
      const cachedJson = await AsyncStorage.getItem(key);
      
      if (!cachedJson) return null;
      
      const cached: CachedItem<T> = JSON.parse(cachedJson);
      const now = Date.now();
      
      // Verificar si la caché ha expirado
      if (now - cached.timestamp > CACHE_EXPIRATION) {
        await AsyncStorage.removeItem(key);
        return null;
      }
      
      return cached.data;
    } catch (error) {
      console.error('Error leyendo de caché:', error);
      return null;
    }
  }

  /**
   * Elimina un objeto de la caché
   */
  static async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error eliminando de caché:', error);
    }
  }

  /**
   * Limpia toda la caché de la aplicación
   */
  static async clearCache(): Promise<void> {
    try {
      // Obtener todas las claves
      const keys = await AsyncStorage.getAllKeys();
      
      // Filtrar solo las claves de nuestra caché
      const cacheKeys = keys.filter(key => 
        key.startsWith(DETECTION_CACHE_PREFIX) || 
        key.startsWith(TRANSLATION_CACHE_PREFIX) ||
        key.startsWith(EXERCISE_CACHE_PREFIX)
      );
      
      // Eliminar las claves encontradas
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.error('Error limpiando caché:', error);
    }
  }

  // Métodos específicos para tipo de datos

  /**
   * Guarda el resultado de una detección en caché
   */
  static async cacheDetection(objectLabel: string, result: DetectionResponse): Promise<void> {
    const key = `${DETECTION_CACHE_PREFIX}${objectLabel.toLowerCase()}`;
    await this.setItem(key, result);
  }

  /**
   * Obtiene una detección cacheada por etiqueta
   */
  static async getDetectionFromCache(objectLabel: string): Promise<DetectionResponse | null> {
    const key = `${DETECTION_CACHE_PREFIX}${objectLabel.toLowerCase()}`;
    return await this.getItem<DetectionResponse>(key);
  }

  /**
   * Guarda una traducción en caché
   */
  static async cacheTranslation(englishLabel: string, spanish: string, quechua: string): Promise<void> {
    const key = `${TRANSLATION_CACHE_PREFIX}${englishLabel.toLowerCase()}`;
    await this.setItem(key, { english_label: englishLabel, spanish, quechua });
  }

  /**
   * Obtiene una traducción cacheada por etiqueta inglesa
   */
  static async getTranslationFromCache(englishLabel: string): Promise<{english_label: string, spanish: string, quechua: string} | null> {
    const key = `${TRANSLATION_CACHE_PREFIX}${englishLabel.toLowerCase()}`;
    return await this.getItem(key);
  }

  /**
   * Guarda ejercicios en caché
   */
  static async cacheExercises(objectId: number, exercises: any[]): Promise<void> {
    const key = `${EXERCISE_CACHE_PREFIX}${objectId}`;
    await this.setItem(key, exercises);
  }

  /**
   * Obtiene ejercicios cacheados por ID de objeto
   */
  static async getExercisesFromCache(objectId: number): Promise<any[] | null> {
    const key = `${EXERCISE_CACHE_PREFIX}${objectId}`;
    return await this.getItem<any[]>(key);
  }
}