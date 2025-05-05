// src/screens/PracticeScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '../services/api';
import { PracticeExerciseModal } from '../components/PracticeExerciseModal';
import { useAuth } from '../context/AuthContext';
import { OfflineService } from '../services/offlineService';
import { LoadingOverlay } from '../components/LoadingOverlay';
import NetInfo from '@react-native-community/netinfo';

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

  // Comprobar estado de conexión y cargar progreso
  useEffect(() => {
    const initialize = async () => {
      // Verificar conexión
      const netInfo = await NetInfo.fetch();
      setIsOffline(!netInfo.isConnected);
      
      // Intentar cargar progreso
      if (isAuthenticated) {
        try {
          if (netInfo.isConnected) {
            // Si está online, cargar del servidor
            const userProgress = await ApiService.getUserProgress();
            if (userProgress) {
              setProgress(userProgress);
              console.log('Progreso cargado desde el servidor');
            }
          } else {
            // Si está offline, intentar cargar de almacenamiento local
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
      
      // Intentar sincronizar puntos pendientes si está online
      if (netInfo.isConnected && isAuthenticated) {
        try {
          await OfflineService.syncPoints();
          console.log('Puntos pendientes sincronizados al inicio');
        } catch (syncError) {
          console.error('Error al sincronizar puntos:', syncError);
        }
      }
    };
    
    initialize();

    // Suscribirse a cambios de conexión
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOffline = isOffline;
      setIsOffline(!state.isConnected);
      
      // Si recupera conexión, intentar sincronizar
      if (state.isConnected && wasOffline && isAuthenticated) {
        OfflineService.syncPoints().then((success: boolean) => {
          if (success) {
            console.log('Puntos sincronizados después de recuperar conexión');
            // Actualizar progreso
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

  const loadProgress = async () => {
    if (!isAuthenticated) return;
    
    try {
      if (!isOffline) {
        // Si está online, cargar del servidor
        const serverProgress = await ApiService.getUserProgress();
        if (serverProgress) {
          setProgress(serverProgress);
        }
      } else {
        // Si está offline, cargar del almacenamiento local
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
      
      // Verificar si hay ejercicios en caché para uso offline
      const cachedExercises = await OfflineService.getOfflineExercises(category.id);
      
      if (isOffline && cachedExercises.length > 0) {
        console.log('Usando ejercicios en caché para modo offline');
        setExercises(cachedExercises);
        setShowExercises(true);
        
        if (isAuthenticated) {
          Alert.alert('Modo sin conexión', 'Estás usando ejercicios guardados. Tu progreso se sincronizará cuando vuelvas a conectarte.');
        }
        return;
      }
      
      // Intentar obtener ejercicios de la API
      try {
        const exercisesData = await ApiService.getExercisesByCategory(category.id);
        
        // Verificar que los datos sean válidos
        if (exercisesData && Array.isArray(exercisesData) && exercisesData.length > 0) {
          console.log(`Recibidos ${exercisesData.length} ejercicios del servidor`);
          setExercises(exercisesData);
          
          // Guardar en caché para uso offline
          await OfflineService.cacheExercises(category.id, exercisesData);
        } else {
          console.warn('No se recibieron ejercicios válidos del servidor');
          throw new Error('No se recibieron ejercicios válidos');
        }
      } catch (apiError) {
        console.error('Error al obtener ejercicios de API:', apiError);
        
        // Si hay ejercicios en caché, usarlos como respaldo
        if (cachedExercises.length > 0) {
          console.log('Usando ejercicios en caché como respaldo');
          setExercises(cachedExercises);
        } else {
          // Usar ejercicios predeterminados según la categoría
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

  const handleExercisesComplete = async (points: number) => {
    console.log(`Sesión completada con ${points} puntos totales`);
    
    try {
      // Calcular duración de la sesión en minutos
      const sessionDuration = Math.round((Date.now() - sessionStartTime) / 60000);
      
      // 1. Si está autenticado y online, enviar puntos al servidor
      if (isAuthenticated && !isOffline) {
        try {
          await ApiService.recordPoints(
            points, 
            'practice', 
            selectedCategory?.id || 'general'
          );
          console.log('Puntos registrados en servidor');
          
          // Actualizar estado global de progreso inmediatamente
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
          console.error('Error al registrar puntos en servidor:', error);
          // Si falla, guardar para sincronizar después
          await OfflineService.addPendingPoints(
            points, 
            'practice', 
            selectedCategory?.id || 'general'
          );
        }
      } 
      // 2. Si está offline o no autenticado, manejar localmente
      else if (isAuthenticated) {
        // Guardar puntos pendientes
        await OfflineService.addPendingPoints(
          points, 
          'practice', 
          selectedCategory?.id || 'general'
        );
        
        // Actualizar progreso local
        const updatedOfflineProgress = await OfflineService.updateOfflineProgress(
          points, 
          'practice', 
          selectedCategory?.id || 'general'
        );
        
        if (updatedOfflineProgress) {
          // Actualizar UI con datos locales
          setProgress(updatedOfflineProgress);
          console.log('Progreso actualizado localmente');
        }
        
        if (isOffline) {
          Alert.alert(
            'Modo sin conexión',
            'Los puntos se han guardado localmente y se sincronizarán cuando recuperes la conexión.'
          );
        }
      }
    } catch (error) {
      console.error('Error al procesar puntos:', error);
      // Intentar guardar localmente como fallback
      if (isAuthenticated) {
        try {
          await OfflineService.addPendingPoints(
            points, 
            'practice', 
            selectedCategory?.id || 'general'
          );
          console.log('Puntos guardados localmente como fallback');
        } catch (fallbackError) {
          console.error('Error en fallback:', fallbackError);
        }
      }
    }
  };

  const handleCloseExercises = () => {
    setShowExercises(false);
    setSelectedCategory(null);
    setExercises([]);
  };

  // Función para obtener ejercicios predeterminados por categoría
  const getFallbackExercises = (categoryId: string): any[] => {
    // Ejercicios comunes para todas las categorías
    const baseExercises = [
      {
        id: 1001,
        type: 'multiple_choice',
        question: '¿Cómo se dice "agua" en quechua?',
        answer: 'yaku',
        distractors: ['unu', 'mayu', 'para'],
        difficulty: 1,
        points: 10,
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
        points: 10,
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
    
    // Ejercicios específicos por categoría
    const categoryExercises: Record<string, any[]> = {
      'vocabulary': [
        {
          id: 2001,
          type: 'anagram',
          question: 'Ordena las letras para formar la palabra en quechua que significa "casa"',
          answer: 'wasi',
          difficulty: 1,
          points: 15,
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
          points: 10,
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
          points: 20,
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
          points: 20,
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
    
    // Combinar ejercicios base con los específicos de la categoría
    const specificExercises = categoryExercises[categoryId] || [];
    return [...baseExercises, ...specificExercises];
  };

  const renderCategoryWithBadge = (category: PracticeCategory) => {
    const badgeCount = Math.floor(Math.random() * 3) + 1; // Simulación de ejercicios nuevos
    
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
        {/* Banner promocional */}
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

        {/* Categorías de práctica */}
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
    padding: 20,
    paddingTop: 50,
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