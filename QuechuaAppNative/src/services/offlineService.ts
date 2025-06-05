// src/services/offlineService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { ApiService } from './api';

export const CACHE_KEYS = {
  USER_PROGRESS: 'user_progress',
  VOCABULARY: 'user_vocabulary',
  EXERCISES: 'cached_exercises',
  PENDING_PROGRESS: 'pending_progress',
  LAST_SYNC: 'last_sync',
};

interface PendingProgress {
  mode: 'detection' | 'practice';
  category?: string;
  timestamp: number;
}

export class OfflineService {
  static async isOffline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return !state.isConnected;
  }
  
  static async cacheData(key: string, data: any): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }
  
  static async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  }
  
  static async clearCache(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
  
  static async clearAllCache(): Promise<void> {
    try {
      const keys = Object.values(CACHE_KEYS);
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }
  
  static async cacheUserProgress(progress: any): Promise<void> {
    await this.cacheData(CACHE_KEYS.USER_PROGRESS, progress);
  }
  
  static async getCachedUserProgress(): Promise<any | null> {
    return this.getCachedData(CACHE_KEYS.USER_PROGRESS);
  }
  
  static async cacheUserVocabulary(vocabulary: any[]): Promise<void> {
    await this.cacheData(CACHE_KEYS.VOCABULARY, vocabulary);
  }
  
  static async getCachedUserVocabulary(): Promise<any[] | null> {
    return this.getCachedData(CACHE_KEYS.VOCABULARY);
  }
  
  static async cacheExercises(category: string, exercises: any[]): Promise<void> {
    const cacheKey = `${CACHE_KEYS.EXERCISES}_${category}`;
    await this.cacheData(cacheKey, {
      exercises,
      timestamp: Date.now()
    });
  }
  
  static async getCachedExercises(category: string): Promise<any[] | null> {
    const cacheKey = `${CACHE_KEYS.EXERCISES}_${category}`;
    const data = await this.getCachedData<{ exercises: any[], timestamp: number }>(cacheKey);
    
    if (!data) return null;
    
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    if (data.timestamp < oneDayAgo) {
      await this.clearCache(cacheKey);
      return null;
    }
    
    return data.exercises;
  }
  
  static async addPendingProgress(mode: 'detection' | 'practice', category?: string): Promise<void> {
    try {
      const pendingQueue = await this.getPendingProgress() || [];
      
      const newEntry: PendingProgress = {
        mode,
        category,
        timestamp: Date.now()
      };
      
      pendingQueue.push(newEntry);
      
      await AsyncStorage.setItem(CACHE_KEYS.PENDING_PROGRESS, JSON.stringify(pendingQueue));
      
      console.log(`Agregada práctica pendiente para ${mode}`);
    } catch (error) {
      console.error('Error adding pending progress:', error);
    }
  }
  
  static async getPendingProgress(): Promise<PendingProgress[]> {
    try {
      const data = await AsyncStorage.getItem(CACHE_KEYS.PENDING_PROGRESS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting pending progress:', error);
      return [];
    }
  }
  
  static async clearPendingProgress(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEYS.PENDING_PROGRESS);
    } catch (error) {
      console.error('Error clearing pending progress:', error);
    }
  }
  
  static async syncProgress(): Promise<boolean> {
    try {
      if (await this.isOffline()) {
        console.log('Still offline, cannot sync');
        return false;
      }
      
      const pendingQueue = await this.getPendingProgress();
      
      if (pendingQueue.length === 0) {
        console.log('No pending progress to sync');
        return true;
      }
      
      console.log(`Syncing ${pendingQueue.length} pending progress entries`);
      
      for (const entry of pendingQueue) {
        try {
          await ApiService.recordProgress(entry.mode, entry.category);
          console.log(`Synced progress: ${entry.mode}`);
        } catch (error) {
          console.error('Error syncing progress entry:', error);
          throw error;
        }
      }
      
      await this.clearPendingProgress();
      await AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC, Date.now().toString());
      
      console.log('Progress sync completed successfully');
      return true;
      
    } catch (error) {
      console.error('Error syncing progress:', error);
      return false;
    }
  }
  
  static async getLastSyncTime(): Promise<number | null> {
    try {
      const time = await AsyncStorage.getItem(CACHE_KEYS.LAST_SYNC);
      return time ? parseInt(time) : null;
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return null;
    }
  }
  
  static async updateOfflineProgress(mode: 'detection' | 'practice', category?: string): Promise<any> {
    try {
      let progress = await this.getCachedUserProgress();
      
      if (!progress) {
        progress = {
          level: 1,
          total_words: 0,
          words_to_next_level: 10,
          streak_days: 0,
          exercises_completed: 0,
          accuracy_rate: 0,
          detection_words: 0,
          practice_words: 0,
          weekly_activity: [],
          achievements: [],
          recent_activity: [],
          stats_by_category: {
            vocabulary: 0,
            pronunciation: 0,
            grammar: 0,
            detection: 0
          }
        };
      }
      
      progress.total_words += 1;
      progress.exercises_completed += 1;
      
      if (mode === 'detection') {
        progress.detection_words += 1;
        progress.stats_by_category.detection += 1;
      } else if (mode === 'practice') {
        progress.practice_words += 1;
        
        switch (category) {
          case 'vocabulary':
            progress.stats_by_category.vocabulary += 1;
            break;
          case 'pronunciation':
            progress.stats_by_category.pronunciation += 1;
            break;
          case 'phrases':
          case 'memory':
            progress.stats_by_category.grammar += 1;
            break;
        }
      }
      
      const today = new Date().toISOString().split('T')[0];
      const todayActivity = progress.recent_activity.find((a: any) => 
        a.date.startsWith(today)
      );
      
      if (todayActivity) {
        todayActivity.words_learned += 1;
        todayActivity.exercises_count += 1;
      } else {
        progress.recent_activity.unshift({
          date: new Date().toISOString(),
          words_learned: 1,
          exercises_count: 1
        });
        
        progress.recent_activity = progress.recent_activity.slice(0, 7);
      }
      
      if (progress.total_words >= (progress.level * 10)) {
        progress.level += 1;
        progress.words_to_next_level = progress.level * 10;
      }
      
      await this.cacheUserProgress(progress);
      
      return progress;
    } catch (error) {
      console.error('Error updating offline progress:', error);
      return null;
    }
  }
  
  static async getOfflineProgress(): Promise<any> {
    return this.getCachedUserProgress();
  }
  
  static async getOfflineExercises(category: string): Promise<any[]> {
    const cached = await this.getCachedExercises(category);
    return cached || [];
  }
}