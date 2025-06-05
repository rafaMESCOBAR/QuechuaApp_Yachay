// src/screens/VocabularyScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '../services/api';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { progressEvents } from '../events/progressEvents';
import { LinearGradient } from 'expo-linear-gradient';

interface VocabularyItem {
  id: number;
  object_label: string;
  spanish_word: string;
  quechua_word: string;
  times_detected: number;
  times_practiced: number;
  mastery_level: number;
  last_detected: string;
  last_practiced: string | null;
  days_since_practice: number | null;
}

export default function VocabularyScreen() {
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  useEffect(() => {
    loadVocabulary();
  }, []);

  const loadVocabulary = async () => {
    try {
      // ✅ CORRECTO: Solo mostrar objetos detectados (modo detección)
      const params = {
        sort_by: 'recent' as const,
        mode: 'detection' as 'detection'  // Solo objetos detectados
      };
      
      const data = await ApiService.getUserVocabulary(params);
      setVocabulary(data);
    } catch (error) {
      console.error('Error loading vocabulary:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // ✅ NUEVO: Actualizar vocabulario cuando cambia el progreso
  useEffect(() => {
    const handleVocabularyUpdate = (data?: any) => {
      console.log('🔄 VocabularyScreen: Evento recibido, recargando vocabulario:', data);
      loadVocabulary();
    };

    console.log('🔔 VocabularyScreen: Registrando listeners de vocabulario');
    progressEvents.on('progress_updated', handleVocabularyUpdate);
    progressEvents.on('exercise_completed', handleVocabularyUpdate);
    
    return () => {
      console.log('🔕 VocabularyScreen: Removiendo listeners de vocabulario');
      progressEvents.off('progress_updated', handleVocabularyUpdate);
      progressEvents.off('exercise_completed', handleVocabularyUpdate);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadVocabulary();
  };

  const getMasteryGradient = (level: number): [string, string] => {
    if (level <= 1) return ['#F5F7FA', '#EBF0F7'];
    if (level <= 2) return ['#FFF6F3', '#FFE9E3'];
    if (level <= 3) return ['#FFF9E6', '#FFF3CC'];
    if (level <= 4) return ['#F0F9F0', '#E1F4E1'];
    return ['#E8F5E9', '#D4EED4'];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / 36e5;
    
    if (diffInHours < 1) return 'Hace unos minutos';
    if (diffInHours < 24) return `Hace ${Math.floor(diffInHours)} horas`;
    if (diffInHours < 48) return 'Ayer';
    if (diffInHours < 168) return `Hace ${Math.floor(diffInHours / 24)} días`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const formatDetectionCount = (count: number): string => {
    if (count >= 1000) {
      return `${Math.floor(count / 1000)}k+`;
    }
    if (count >= 100) {
      return '99+';
    }
    return count.toString();
  };

  const renderVocabularyItem = (item: VocabularyItem) => (
    <LinearGradient
      key={item.id}
      colors={getMasteryGradient(item.mastery_level)}
      style={styles.vocabularyCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.cardContent}>
        <View style={styles.mainContent}>
          <View style={styles.wordInfo}>
            <Text style={styles.quechuaWord}>{item.quechua_word}</Text>
            <Text style={styles.spanishWord}>{item.spanish_word}</Text>
            {/* NUEVO: Indicador de palabra nueva */}
            {item.mastery_level === 1 && item.times_detected === 1 && (
              <Text style={styles.newBadge}>🆕 NUEVA</Text>
            )}
          </View>
          
          <View style={styles.statsColumn}>
            <View style={styles.statItem}>
              <Ionicons name="camera" size={16} color="#FF7B7B" />
              <Text style={styles.statNumber}>
                {formatDetectionCount(item.times_detected)}
              </Text>
            </View>
            <Text style={styles.statLabel}>
              {item.times_detected === 1 ? 'vez detectado' : 'veces detectado'}
            </Text>
          </View>
        </View>
        
        <View style={styles.bottomInfo}>
          <Text style={styles.lastSeen}>
            {formatDate(item.last_detected)}
          </Text>
          <View style={styles.progressContainer}>
            {[...Array(5)].map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  index < item.mastery_level && styles.progressDotFilled
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    </LinearGradient>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF0000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FF0000', '#E50000'] as [string, string]}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Vocabulario</Text>
        <View style={styles.placeholderButton} />
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF0000']}
          />
        }
      >
        {vocabulary.length > 0 ? (
          <>
            <View style={styles.headerInfo}>
              <Text style={styles.headerInfoText}>
                Palabras detectadas
              </Text>
            </View>
            {vocabulary.map(renderVocabularyItem)}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="book-outline" size={64} color="#E0E0E0" />
            </View>
            <Text style={styles.emptyText}>
              Tu vocabulario está vacío
            </Text>
            <Text style={styles.emptySubtext}>
              Comienza a detectar objetos para construir tu vocabulario personal
            </Text>
            <TouchableOpacity
              style={styles.detectButton}
              onPress={() => navigation.navigate('Camera')}
            >
              <LinearGradient
                colors={['#FF4545', '#FF0000'] as [string, string]}
                style={styles.detectButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="camera" size={18} color="white" />
                <Text style={styles.detectButtonText}>Detectar objetos</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  placeholderButton: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  headerInfo: {
    padding: 20,
    paddingBottom: 10,
  },
  headerInfoText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  vocabularyCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 14,
  },
  mainContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  wordInfo: {
    flex: 1,
  },
  quechuaWord: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 3,
  },
  spanishWord: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  statsColumn: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 10,
    borderRadius: 12,
    minWidth: 85,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 3,
    textAlign: 'center',
  },
  bottomInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  lastSeen: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 3,
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  progressDotFilled: {
    backgroundColor: '#4CAF50',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 80,
  },
  emptyIconContainer: {
    marginBottom: 20,
    backgroundColor: '#F5F5F5',
    padding: 20,
    borderRadius: 50,
  },
  emptyText: {
    fontSize: 20,
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 22,
  },
  detectButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  detectButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 28,
    gap: 8,
  },
  detectButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  newBadge: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 4,
  },
});