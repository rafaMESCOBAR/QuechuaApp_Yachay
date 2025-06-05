// src/screens/PracticeScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  BackHandler
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '../services/api';
import { PracticeExerciseModal } from '../components/PracticeExerciseModal';
import { useAuth } from '../context/AuthContext';
import { OfflineService } from '../services/offlineService';
import { LoadingOverlay } from '../components/LoadingOverlay';
import NetInfo from '@react-native-community/netinfo';
import { useSessionTracking } from '../hooks/useSessionTracking';
import { AbandonSessionAlert } from '../components/AbandonSessionAlert';

interface PracticeCategory {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  exerciseTypes: string[];
}

const categories: PracticeCategory[] = [
  {
    id: 'vocabulary',
    title: 'Vocabulario',
    description: 'Aprende nuevas palabras en quechua',
    icon: 'book',
    color: '#4CAF50',
    exerciseTypes: ['multiple_choice', 'fill_blanks', 'anagram']
  },
  {
    id: 'phrases',
    title: 'Frases Comunes',
    description: 'Domina frases cotidianas',
    icon: 'chatbubbles',
    color: '#2196F3',
    exerciseTypes: ['multiple_choice', 'fill_blanks']
  },
  {
    id: 'memory',
    title: 'Memoria',
    description: 'Desafía tu memoria con palabras',
    icon: 'bulb',
    color: '#FF9800',
    exerciseTypes: ['matching']
  },
  {
    id: 'pronunciation',
    title: 'Pronunciación',
    description: 'Mejora tu pronunciación',
    icon: 'mic',
    color: '#9C27B0',
    exerciseTypes: ['pronunciation']
  }
];

export default function PracticeScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [showExercises, setShowExercises] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<PracticeCategory | null>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const { isAuthenticated } = useAuth();
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [progress, setProgress] = useState<any>(null);
  const [lastSyncTime, setLastSyncTime] = useState(0);
  
  // Agregar referencias para controlar estados
  const isSessionCompleted = useRef(false);
  const isSessionAbandoned = useRef(false);
  
  // Usar el hook de seguimiento de sesiones
  const { 
    sessionId, 
    isActive, 
    isExiting, 
    penaltyInfo, 
    abandonmentModalVisible,
    startSession, 
    completeSession, 
    abandonSession,
    checkAbandonmentPenalties,
    showAbandonmentAlert,
    confirmAbandon,
    cancelAbandon
  } = useSessionTracking({ 
    mode: 'practice',
    onSessionComplete: () => {
      console.log("Sesión completada exitosamente");
      // AGREGAR un flag para evitar múltiples llamadas
      if (!isSessionCompleted.current) {
        isSessionCompleted.current = true;
        handleExercisesComplete();
      }
    },
    onSessionAbandon: (abandonedId) => {
      console.log(`Sesión ${abandonedId} abandonada`);
      // IMPORTANTE: No llamar a handleExercisesComplete aquí
      // Solo actualizar estado local si es necesario
      isSessionAbandoned.current = true;
    }
  });

  useEffect(() => {
    const initialize = async () => {
      const netInfo = await NetInfo.fetch();
      setIsOffline(!netInfo.isConnected);
      
      if (isAuthenticated) {
        try {
          if (netInfo.isConnected) {
            const userProgress = await ApiService.getUserProgress();
            if (userProgress) {
              setProgress(userProgress);
              console.log('Progreso cargado desde el servidor');
            }
          } else {
            const offlineProgress = await OfflineService.getOfflineProgress();
            if (offlineProgress) {
              setProgress(offlineProgress);
              console.log('Progreso cargado desde almacenamiento local');
            }
          }
        } catch (error) {
          console.error('Error al cargar progreso:', error);
        }
      }
      
      if (netInfo.isConnected && isAuthenticated) {
        try {
          await OfflineService.syncProgress();
          console.log('Progreso pendiente sincronizado al inicio');
        } catch (syncError) {
          console.error('Error al sincronizar progreso:', syncError);
        }
      }
    };
    
    initialize();

    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOffline = isOffline;
      setIsOffline(!state.isConnected);
      
      if (state.isConnected && wasOffline && isAuthenticated) {
        OfflineService.syncProgress().then((success: boolean) => {
          if (success) {
            console.log('Progreso sincronizado después de recuperar conexión');
            ApiService.getUserProgress().then(updatedProgress => {
              if (updatedProgress) {
                setProgress(updatedProgress);
              }
            });
          }
        }).catch((err: Error) => {
          console.error('Error al sincronizar después de recuperar conexión:', err);
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated]);
  
  // En el useEffect que maneja el desmontaje, añadir:
  useEffect(() => {
    return () => {
      // Reiniciar los flags al desmontar
      isSessionCompleted.current = false;
      isSessionAbandoned.current = false;
    };
  }, []);

  // Registrar un manejador de eventos para abandonos de sesión
  useEffect(() => {
    // Para React Native, usamos referencia global en lugar de window.addEventListener
    if (typeof global !== 'undefined') {
      // Definimos el manejador de sesiones abandonadas para comunicación entre componentes
      (global as any).sessionAbandonHandler = () => {
        console.log('Sesión abandonada detectada en PracticeScreen');
        isSessionAbandoned.current = true;
      };
    }
    
    return () => {
      // Limpiar el manejador al desmontar
      if (typeof global !== 'undefined') {
        delete (global as any).sessionAbandonHandler;
      }
    };
  }, []);

  const loadProgress = async () => {
    if (!isAuthenticated) return;
    
    try {
      if (!isOffline) {
        const serverProgress = await ApiService.getUserProgress();
        if (serverProgress) {
          setProgress(serverProgress);
        }
      } else {
        const localProgress = await OfflineService.getOfflineProgress();
        if (localProgress) {
          setProgress(localProgress);
        }
      }
    } catch (error) {
      console.error('Error al cargar progreso:', error);
    }
  };

  const handleCategorySelect = async (category: PracticeCategory) => {
    try {
      setIsLoading(true);
      setSelectedCategory(category);
      setSessionStartTime(Date.now());
      
      // Reiniciar los flags de estado al empezar una nueva sesión
      isSessionCompleted.current = false;
      isSessionAbandoned.current = false;
      
      const cachedExercises = await OfflineService.getOfflineExercises(category.id);
      
      if (isOffline && cachedExercises.length > 0) {
        console.log('Usando ejercicios en caché para modo offline');
        // LIMITAR A 5 EJERCICIOS
        setExercises(cachedExercises.slice(0, 5));
        setShowExercises(true);
        
        if (isAuthenticated) {
          Alert.alert('Modo sin conexión', 'Estás usando ejercicios guardados. Tu progreso se sincronizará cuando vuelvas a conectarte.');
        }
        return;
      }
      
      try {
        console.log(`Solicitando ejercicios para categoría: ${category.id}`);
        const exercisesData = await ApiService.getExercisesByCategory(category.id);
        
        // Verificar estructura de la respuesta
        console.log(`Tipo de datos recibidos: ${typeof exercisesData}`);
        if (Array.isArray(exercisesData)) {
          console.log('Datos recibidos como array');
        } else if (typeof exercisesData === 'object') {
          console.log('Datos recibidos como objeto:', Object.keys(exercisesData));
        }
        
        let validExercises: any[] = [];
        let validSessionId: number | null = null;
        
        // Extraer ejercicios y sessionId según el formato de respuesta
        if (exercisesData && typeof exercisesData === 'object' && 'session_id' in exercisesData && 'exercises' in exercisesData) {
          // Formato: { session_id: number, exercises: Array }
          validSessionId = exercisesData.session_id;
          validExercises = exercisesData.exercises;
          console.log(`Formato A: ID de sesión encontrado: ${validSessionId}`);
        } else if (Array.isArray(exercisesData) && exercisesData.length > 0) {
          // Formato: Array de ejercicios
          validExercises = exercisesData;
          
          // Intentar obtener sessionId de metadata
          if (validExercises[0]?.metadata?.session_id) {
            validSessionId = validExercises[0].metadata.session_id;
            console.log(`Formato B: ID de sesión encontrado en metadata: ${validSessionId}`);
          } else {
            console.warn("No se encontró ID de sesión en los ejercicios");
          }
        } else {
          console.warn('Formato de respuesta no reconocido:', exercisesData);
          throw new Error('Formato de respuesta no válido');
        }
        
        if (validExercises.length > 0) {
          // LIMITAR A 5 EJERCICIOS
          const limitedExercises = validExercises.slice(0, 5);
          console.log(`Recibidos ${validExercises.length} ejercicios del servidor, limitando a ${limitedExercises.length}`);
          
          // Iniciar seguimiento solo si hay ID de sesión válido
          if (validSessionId && !isNaN(validSessionId)) {
            console.log(`Iniciando seguimiento de sesión: ${validSessionId}`);
            startSession(validSessionId);
          } else {
            console.warn("No se recibió un ID de sesión válido, el seguimiento de abandono no estará disponible");
          }
          
          setExercises(limitedExercises);
          await OfflineService.cacheExercises(category.id, limitedExercises);
        } else {
          console.warn('No se recibieron ejercicios válidos del servidor');
          throw new Error('No se recibieron ejercicios válidos');
        }
      } catch (apiError) {
        console.error('Error al obtener ejercicios de API:', apiError);
        
        if (cachedExercises.length > 0) {
          console.log('Usando ejercicios en caché como respaldo');
          // LIMITAR A 5 EJERCICIOS
          setExercises(cachedExercises.slice(0, 5));
        } else {
          console.log('Usando ejercicios predeterminados');
          setExercises(getFallbackExercises(category.id));
        }
        
        if (!isOffline) {
          Alert.alert(
            'Aviso', 
            'No se pudieron cargar nuevos ejercicios. Usando ejercicios guardados.'
          );
        }
      }
      
      setShowExercises(true);
    } catch (error) {
      console.error('Error general:', error);
      Alert.alert('Error', 'No se pudieron cargar los ejercicios. Inténtalo de nuevo más tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExercisesComplete = async () => {
    // Prevenir ejecuciones múltiples
    if (isSessionCompleted.current || isSessionAbandoned.current) {
      console.log('Sesión ya completada o abandonada, evitando procesamiento repetido');
      return;
    }
    
    console.log('Sesión de práctica completada');
    
    try {
      const sessionDuration = Math.round((Date.now() - sessionStartTime) / 60000);
      
      if (isAuthenticated && !isOffline) {
        try {
          await ApiService.recordProgress(
            'practice', 
            selectedCategory?.id || 'general'
          );
          console.log('Progreso registrado en servidor');
          
          try {
            const updatedProgress = await ApiService.getUserProgress();
            if (updatedProgress) {
              setProgress(updatedProgress);
              console.log('Progreso actualizado desde el servidor');
            }
          } catch (progressError) {
            console.error('Error al actualizar progreso:', progressError);
          }
        } catch (error) {
          console.error('Error al registrar progreso en servidor:', error);
          await OfflineService.addPendingProgress(
            'practice', 
            selectedCategory?.id || 'general'
          );
        }
      } 
      else if (isAuthenticated) {
        await OfflineService.addPendingProgress(
          'practice', 
          selectedCategory?.id || 'general'
        );
        
        const updatedOfflineProgress = await OfflineService.updateOfflineProgress(
          'practice', 
          selectedCategory?.id || 'general'
        );
        
        if (updatedOfflineProgress) {
          setProgress(updatedOfflineProgress);
          console.log('Progreso actualizado localmente');
        }
        
        if (isOffline) {
          Alert.alert(
            'Modo sin conexión',
            'Tu progreso se ha guardado localmente y se sincronizará cuando recuperes la conexión.'
          );
        }
      }
      
      // Completar la sesión en el hook de seguimiento
      if (isActive && sessionId && !isSessionAbandoned.current) {
        completeSession();
      }
      
    } catch (error) {
      console.error('Error al procesar progreso:', error);
      if (isAuthenticated) {
        try {
          await OfflineService.addPendingProgress(
            'practice', 
            selectedCategory?.id || 'general'
          );
          console.log('Progreso guardado localmente como fallback');
        } catch (fallbackError) {
          console.error('Error en fallback:', fallbackError);
        }
      }
    }
  };

  const handleCloseExercises = () => {
    console.log("PracticeScreen: handleCloseExercises llamado - CIERRE FORZADO");
    
    // Limpiar estado forzadamente, sin ninguna verificación
    setShowExercises(false);
    setSelectedCategory(null);
    setExercises([]);
    
    // Marcar la sesión como completada para evitar procesamiento adicional
    isSessionCompleted.current = true;
  };

  const getFallbackExercises = (categoryId: string): any[] => {
    const baseExercises = [
      {
        id: 1001,
        type: 'multiple_choice',
        question: '¿Cómo se dice "agua" en quechua?',
        answer: 'yaku',
        distractors: ['unu', 'mayu', 'para'],
        difficulty: 1,
        object_translation: {
          id: 1001,
          spanish: 'agua',
          quechua: 'yaku'
        },
        metadata: {
          spanish_translation: 'agua'
        }
      },
      {
        id: 1002,
        type: 'multiple_choice',
        question: '¿Cómo se dice "sol" en quechua?',
        answer: 'inti',
        distractors: ['killa', 'ch\'aska', 'hanan'],
        difficulty: 1,
        object_translation: {
          id: 1002,
          spanish: 'sol',
          quechua: 'inti'
        },
        metadata: {
          spanish_translation: 'sol'
        }
      }
    ];
    
    const categoryExercises: Record<string, any[]> = {
      'vocabulary': [
        {
          id: 2001,
          type: 'anagram',
          question: 'Ordena las letras para formar la palabra en quechua que significa "casa"',
          answer: 'wasi',
          difficulty: 1,
          object_translation: {
            id: 2001,
            spanish: 'casa',
            quechua: 'wasi'
          },
          metadata: {
            spanish_translation: 'casa'
          }
        }
      ],
      'phrases': [
        {
          id: 3001,
          type: 'fill_blanks',
          question: 'Completa: A_____ p\'unchay (Buenos días)',
          answer: 'Allin',
          difficulty: 1,
          object_translation: {
            id: 3001,
            spanish: 'Buenos días',
            quechua: 'Allin p\'unchay'
          },
          metadata: {
            spanish_translation: 'Buenos días'
          }
        }
      ],
      'memory': [
        {
          id: 4001,
          type: 'matching',
          question: 'Une las palabras con su traducción',
          answer: '',
          difficulty: 1,
          distractors: {
            pairs: [
              { spanish: 'perro', quechua: 'allqu' },
              { spanish: 'gato', quechua: 'michi' },
              { spanish: 'casa', quechua: 'wasi' },
              { spanish: 'agua', quechua: 'yaku' }
            ]
          },
          object_translation: {
            id: 4001,
            spanish: 'palabras',
            quechua: 'simikuna'
          }
        }
      ],
      'pronunciation': [
        {
          id: 5001,
          type: 'pronunciation',
          question: 'Pronuncia la palabra "yaku" (agua)',
          answer: 'yaku',
          difficulty: 1,
          object_translation: {
            id: 5001,
            spanish: 'agua',
            quechua: 'yaku'
          },
          metadata: {
            spanish_translation: 'agua'
          }
        }
      ]
    };
    
    const specificExercises = categoryExercises[categoryId] || [];
    const allExercises = [...baseExercises, ...specificExercises];
    
    // LIMITAR A 5 EJERCICIOS
    return allExercises.slice(0, 5);
  };

  const renderCategoryWithBadge = (category: PracticeCategory) => {
    const badgeCount = Math.floor(Math.random() * 3) + 1;
    
    return (
      <TouchableOpacity
        key={category.id}
        style={[styles.categoryCard, { borderLeftColor: category.color }]}
        onPress={() => handleCategorySelect(category)}
      >
        <View style={styles.categoryContent}>
          <View style={[styles.iconContainer, { backgroundColor: category.color }]}>
            <Ionicons name={category.icon} size={24} color="white" />
          </View>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryTitle}>{category.title}</Text>
            <Text style={styles.categoryDescription}>{category.description}</Text>
          </View>
          <View style={styles.badgeContainer}>
            {isAuthenticated && (
              <View style={styles.newBadge}>
                <Text style={styles.badgeText}>{badgeCount} nuevos</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Modo Práctica</Text>
        {isOffline && (
          <View style={styles.offlineIndicator}>
            <Ionicons name="cloud-offline" size={16} color="white" />
            <Text style={styles.offlineText}>Modo sin conexión</Text>
          </View>
        )}
        <Text style={styles.subtitle}>Elige una categoría para practicar</Text>
      </View>

      <ScrollView style={styles.categoriesContainer}>
        <View style={styles.promotionBanner}>
          <Image 
            source={require('../../assets/chullo1.png')} 
            style={styles.promotionImage}
            resizeMode="contain"
          />
          <View style={styles.promotionContent}>
            <Text style={styles.promotionTitle}>¡Aprende diariamente!</Text>
            <Text style={styles.promotionText}>
              Practica 5 minutos al día para mantener tu racha
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Categorías de ejercicios</Text>
        {categories.map(renderCategoryWithBadge)}
      </ScrollView>

      {isLoading && (
        <LoadingOverlay
          visible={isLoading}
          message="Generando ejercicios..."
        />
      )}

      {showExercises && selectedCategory && (
        <PracticeExerciseModal
          isVisible={showExercises}
          onClose={handleCloseExercises}
          exercises={exercises}
          categoryTitle={selectedCategory.title}
          onComplete={handleExercisesComplete}
        />
      )}
      
      {/* Modal de abandono de sesión */}
      {penaltyInfo && (
        <AbandonSessionAlert
          visible={abandonmentModalVisible}
          onCancel={cancelAbandon}
          onConfirm={confirmAbandon}
          warningMessage={penaltyInfo.warning_message}
          affectedWords={penaltyInfo.affected_words}
          abandonmentConsequence={penaltyInfo.abandonment_consequence}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#FF0000',
    padding: 10,
    paddingTop: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  offlineIndicator: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  offlineText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 5,
  },
  categoriesContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 12,
    color: '#333',
  },
  categoryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
    marginLeft: 16,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  categoryDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  promotionBanner: {
    backgroundColor: '#E3F2FD',
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  promotionImage: {
    width: 60,
    height: 60,
  },
  promotionContent: {
    flex: 1,
    marginLeft: 12,
  },
  promotionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  promotionText: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
  },
});