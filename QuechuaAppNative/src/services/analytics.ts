// src/services/analytics.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { ApiService } from './api';

interface AnalyticsEvent {
  category: string;
  duration: number;
  score: number;
  timestamp: string;
  type: 'practice_session' | 'detection_session';
}

export class AnalyticsService {
  private static ANALYTICS_QUEUE_KEY = '@analytics_queue';
  
  static async trackPracticeSession(category: string, duration: number, score: number) {
    const stats: AnalyticsEvent = {
      category,
      duration,
      score,
      timestamp: new Date().toISOString(),
      type: 'practice_session'
    };
    
    // Intentar enviar inmediatamente
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected) {
      try {
        await this.syncWithBackend([stats]);
      } catch (error) {
        // Si falla, agregarlo a la cola
        await this.queueEvent(stats);
      }
    } else {
      // Si no hay conexión, agregarlo a la cola
      await this.queueEvent(stats);
    }
  }
  
  private static async queueEvent(event: AnalyticsEvent) {
    try {
      const queue = await this.getQueue();
      queue.push(event);
      await AsyncStorage.setItem(this.ANALYTICS_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Error queuing analytics event:', error);
    }
  }
  
  private static async getQueue(): Promise<AnalyticsEvent[]> {
    try {
      const queueJson = await AsyncStorage.getItem(this.ANALYTICS_QUEUE_KEY);
      return queueJson ? JSON.parse(queueJson) : [];
    } catch (error) {
      console.error('Error getting analytics queue:', error);
      return [];
    }
  }
  
  static async syncWithBackend(events: AnalyticsEvent[]) {
    try {
      // Implementar llamada al backend para sincronizar eventos
      // Puedes crear un nuevo endpoint en el backend para esto
      // await ApiService.syncAnalytics(events);
      
      // Si tiene éxito, limpiar la cola
      await AsyncStorage.removeItem(this.ANALYTICS_QUEUE_KEY);
    } catch (error) {
      console.error('Error syncing analytics:', error);
      throw error;
    }
  }
  
  static async processQueue() {
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected) {
      const queue = await this.getQueue();
      if (queue.length > 0) {
        try {
          await this.syncWithBackend(queue);
        } catch (error) {
          console.error('Error processing analytics queue:', error);
        }
      }
    }
  }
}