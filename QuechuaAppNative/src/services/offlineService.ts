// src/services/offlineService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Exercise {
  id: number;
  type: string;
  question: string;
  answer: string;
  distractors?: any;
  difficulty: number;
  points: number;
  object_translation: {
    id: number;
    spanish: string;
    quechua: string;
  };
}

interface ProgressData {
  level: number;
  experience_points: number;
  experience_to_next_level: number;
  streak_days: number;
  total_points: number;
  exercises_completed: number;
  accuracy_rate: number;
  detection_points: number;
  practice_points: number;
  weekly_activity?: Array<{
    day: string;
    points: number;
  }>;
  achievements?: Array<{
    id: number;
    name: string;
    description: string;
    icon: string;
    earned_at: string;
  }>;
  stats_by_category?: {
    vocabulary: number;
    pronunciation: number;
    grammar: number;
    detection: number;
  };
}

interface PendingPoints {
  points: number;
  mode: 'detection' | 'practice';
  category?: string;
  timestamp: number;
}

export class OfflineService {
  private static CACHE_PREFIX = '@offline_exercises_';
  private static PROGRESS_KEY = '@offline_progress';
  private static PENDING_POINTS_KEY = '@offline_pending_points';

  // Guardar ejercicios en caché por categoría
  static async cacheExercises(category: string, exercises: Exercise[]) {
    try {
      await AsyncStorage.setItem(
        `${this.CACHE_PREFIX}${category}`,
        JSON.stringify({
          timestamp: Date.now(),
          data: exercises
        })
      );
      console.log(`Guardados ${exercises.length} ejercicios en caché para ${category}`);
    } catch (error) {
      console.error('Error caching exercises:', error);
    }
  }
  
  // Obtener ejercicios almacenados en caché
  static async getOfflineExercises(category: string): Promise<Exercise[]> {
    try {
      const cached = await AsyncStorage.getItem(`${this.CACHE_PREFIX}${category}`);
      
      if (!cached) return [];
      
      const parsedCache = JSON.parse(cached);
      
      // Verificar si la caché está actualizada (menos de 7 días)
      const isValid = Date.now() - parsedCache.timestamp < 7 * 24 * 60 * 60 * 1000;
      
      if (!isValid) {
        console.log('Caché expirada, limpiando...');
        await AsyncStorage.removeItem(`${this.CACHE_PREFIX}${category}`);
        return [];
      }
      
      return parsedCache.data || [];
    } catch (error) {
      console.error('Error getting offline exercises:', error);
      return [];
    }
  }
  
  // Guardar progreso localmente cuando está sin conexión
  static async saveOfflineProgress(progressData: ProgressData) {
    try {
      await AsyncStorage.setItem(this.PROGRESS_KEY, JSON.stringify({
        timestamp: Date.now(),
        data: progressData
      }));
      console.log('Progreso guardado localmente');
    } catch (error) {
      console.error('Error saving offline progress:', error);
    }
  }
  
  // Obtener progreso guardado localmente
  static async getOfflineProgress(): Promise<ProgressData | null> {
    try {
      const cached = await AsyncStorage.getItem(this.PROGRESS_KEY);
      if (!cached) return null;
      
      return JSON.parse(cached).data;
    } catch (error) {
      console.error('Error getting offline progress:', error);
      return null;
    }
  }
  
  // Añadir puntos a la cola de sincronización
  static async addPendingPoints(points: number, mode: 'detection' | 'practice', category?: string) {
    try {
      // Obtener cola actual
      const pendingQueue = await this.getPendingPoints();
      
      // Añadir nuevo registro
      pendingQueue.push({
        points,
        mode,
        category,
        timestamp: Date.now()
      });
      
      // Guardar cola actualizada
      await AsyncStorage.setItem(this.PENDING_POINTS_KEY, JSON.stringify(pendingQueue));
      console.log(`Agregados ${points} puntos pendientes para ${mode}`);
    } catch (error) {
      console.error('Error adding pending points:', error);
    }
  }
  
  // Obtener puntos pendientes de sincronización
  static async getPendingPoints(): Promise<PendingPoints[]> {
    try {
      const pendingData = await AsyncStorage.getItem(this.PENDING_POINTS_KEY);
      return pendingData ? JSON.parse(pendingData) : [];
    } catch (error) {
      console.error('Error getting pending points:', error);
      return [];
    }
  }
  
  // Limpiar puntos pendientes después de sincronizar
  static async clearPendingPoints() {
    try {
      await AsyncStorage.removeItem(this.PENDING_POINTS_KEY);
      console.log('Cola de puntos pendientes limpiada');
    } catch (error) {
      console.error('Error clearing pending points:', error);
    }
  }
  
  // Limpiar caché de ejercicios
  static async clearCache(category?: string) {
    try {
      if (category) {
        // Limpiar solo la categoría especificada
        await AsyncStorage.removeItem(`${this.CACHE_PREFIX}${category}`);
        console.log(`Caché limpiada para categoría: ${category}`);
      } else {
        // Obtener todas las claves
        const keys = await AsyncStorage.getAllKeys();
        
        // Filtrar claves de caché de ejercicios
        const cacheKeys = keys.filter(key => 
          key.startsWith(this.CACHE_PREFIX)
        );
        
        // Eliminar todas las claves de caché
        if (cacheKeys.length > 0) {
          await AsyncStorage.multiRemove(cacheKeys);
          console.log(`Limpiadas ${cacheKeys.length} entradas de caché`);
        }
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
  
  // Actualizar datos de progreso offline (para cuando se ganan puntos sin conexión)
  static async updateOfflineProgress(points: number, mode: 'detection' | 'practice', category?: string) {
    try {
      // Obtener progreso actual
      let progress = await this.getOfflineProgress();
      
      // Si no hay progreso, crear uno nuevo
      if (!progress) {
        progress = {
          level: 1,
          experience_points: 0,
          experience_to_next_level: 100,
          streak_days: 0,
          total_points: 0,
          exercises_completed: 0,
          accuracy_rate: 0,
          detection_points: 0,
          practice_points: 0,
          stats_by_category: {
            vocabulary: 0,
            pronunciation: 0,
            grammar: 0,
            detection: 0
          }
        };
      }
      
      // Actualizar progreso
      progress.total_points += points;
      progress.experience_points += points;
      progress.exercises_completed += 1;
      
      if (mode === 'detection') {
        progress.detection_points += points;
      } else {
        progress.practice_points += points;
      }
      
      // Actualizar categoría si aplica
      if (category && progress.stats_by_category) {
        const categoryKey = category as keyof typeof progress.stats_by_category;
        if (progress.stats_by_category[categoryKey] !== undefined) {
          progress.stats_by_category[categoryKey] += points;
        }
      }
      
      // Verificar si sube de nivel
      while (progress.experience_points >= progress.experience_to_next_level) {
        progress.experience_points -= progress.experience_to_next_level;
        progress.level += 1;
        progress.experience_to_next_level = Math.floor(progress.experience_to_next_level * 1.2);
      }
      
      // Guardar progreso actualizado
      await this.saveOfflineProgress(progress);
      console.log(`Progreso offline actualizado: +${points} puntos`);
      
      return progress;
    } catch (error) {
      console.error('Error updating offline progress:', error);
      return null;
    }
  }
  
  // Método para sincronizar puntos pendientes con el servidor
  static async syncPoints(): Promise<boolean> {
    try {
      // Obtener puntos pendientes
      const pendingPoints = await this.getPendingPoints();
      
      if (pendingPoints.length === 0) {
        console.log('No hay puntos pendientes para sincronizar');
        return true;
      }
      
      console.log(`Sincronizando ${pendingPoints.length} registros de puntos pendientes`);
      
      // Importa el ApiService
      const { ApiService } = require('./api');
      
      // Sincronizar todos los puntos pendientes
      let allSuccess = true;
      
      for (const item of pendingPoints) {
        try {
          // Intenta enviar cada registro al servidor
          await ApiService.recordPoints(
            item.points,
            item.mode,
            item.category || 'general'
          );
          console.log(`Sincronizado: ${item.points} puntos (${item.mode})`);
        } catch (error) {
          console.error('Error al sincronizar puntos específicos:', error);
          allSuccess = false;
        }
      }
      
      // Si todos los puntos se sincronizaron correctamente, limpia la cola
      if (allSuccess) {
        await this.clearPendingPoints();
        console.log('Todos los puntos pendientes sincronizados con éxito');
      } else {
        console.log('Algunos puntos no pudieron sincronizarse, se intentará más tarde');
      }
      
      return allSuccess;
    } catch (error) {
      console.error('Error general al sincronizar puntos:', error);
      return false;
    }
  }
}