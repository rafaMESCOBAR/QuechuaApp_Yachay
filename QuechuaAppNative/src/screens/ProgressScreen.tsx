// src/screens/ProgressScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Alert,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '../services/api';
import { ProgressBar } from '../components/ProgressBar';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { AnimatedCard } from '../components/AnimatedCard';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../context/AuthContext';

interface UserProgress {
  level: number;
  experience_points: number;
  experience_to_next_level: number;
  streak_days: number;
  total_points: number;
  exercises_completed: number;
  accuracy_rate: number;
  detection_points: number;
  practice_points: number;
  weekly_activity: Array<{
    day: string;
    points: number;
  }>;
  achievements: Array<{
    id: number;
    name: string;
    description: string;
    icon: string;
    earned_at: string;
  }>;
  recent_activity: Array<{
    date: string;
    points_earned: number;
    exercises_count: number;
  }>;
  stats_by_category: {
    vocabulary: number;
    pronunciation: number;
    grammar: number;
    detection: number;
  };
}

export default function ProgressScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'achievements' | 'stats'>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const { isAuthenticated, user } = useAuth();
  
  // Verificar conectividad
  useEffect(() => {
    const checkConnection = async () => {
      const netInfo = await NetInfo.fetch();
      setIsOffline(!netInfo.isConnected);
    };
    
    checkConnection();

    // Suscribirse a cambios de conexión
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadProgress = useCallback(async () => {
    try {
      if (refreshing) return;
      
      setIsLoading(true);
      
      let progressData: UserProgress | null = null;
      
      // Si está autenticado y en línea, intentar cargar desde API
      if (isAuthenticated && !isOffline) {
        try {
          progressData = await ApiService.getUserProgress();
          console.log("Datos de progreso recibidos:", progressData);
        } catch (error) {
          console.error('Error al cargar progreso desde API:', error);
          // Continuar con valores por defecto o datos en caché
        }
      } else if (!isAuthenticated) {
        // Si no está autenticado, mostrar datos de demostración
        progressData = getDemoProgressData();
      }
      
      // Si no hay datos o están vacíos, usar datos por defecto
      if (!progressData || 
          (typeof progressData === 'object' && 
           Object.keys(progressData).filter(k => k !== 'message').length === 0)) {
        
        console.warn("Usando datos fallback porque backend devolvió vacío");
        progressData = getDefaultProgressData();
      }
      
      // Normalizar los datos para asegurar que todos los campos existan
      const normalizedProgress: UserProgress = normalizeProgressData(progressData);
      
      setProgress(normalizedProgress);
    } catch (error) {
      console.error('Error general al cargar progreso:', error);
      Alert.alert('Error', 'No se pudo cargar el progreso. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, isOffline, refreshing]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProgress();
  }, [loadProgress]);

  // Función para normalizar datos de progreso
  const normalizeProgressData = (data: any): UserProgress => {
    return {
      level: data.level || 1,
      experience_points: data.experience_points || 0,
      experience_to_next_level: data.experience_to_next_level || 100,
      streak_days: data.streak_days || 0,
      total_points: data.total_points || 0,
      exercises_completed: data.exercises_completed || 0,
      accuracy_rate: data.accuracy_rate || 0,
      detection_points: data.detection_points || 0,
      practice_points: data.practice_points || 0,
      weekly_activity: data.weekly_activity || getDefaultWeeklyActivity(),
      achievements: data.achievements || [],
      recent_activity: data.recent_activity || [],
      stats_by_category: data.stats_by_category || {
        vocabulary: 0,
        pronunciation: 0,
        grammar: 0,
        detection: 0
      }
    };
  };

  // Datos de progreso predeterminados
  const getDefaultProgressData = (): UserProgress => {
    return {
      level: 1,
      experience_points: 25,
      experience_to_next_level: 100,
      streak_days: 0,
      total_points: 25,
      exercises_completed: 3,
      accuracy_rate: 70,
      detection_points: 15,
      practice_points: 10,
      weekly_activity: getDefaultWeeklyActivity(),
      achievements: [],
      recent_activity: [
        {
          date: new Date().toISOString(),
          points_earned: 25,
          exercises_count: 3
        }
      ],
      stats_by_category: {
        vocabulary: 15,
        pronunciation: 0,
        grammar: 0,
        detection: 10
      }
    };
  };

  // Datos de progreso para demostración (cuando no hay usuario autenticado)
  const getDemoProgressData = (): UserProgress => {
    return {
      level: 3,
      experience_points: 175,
      experience_to_next_level: 300,
      streak_days: 5,
      total_points: 750,
      exercises_completed: 45,
      accuracy_rate: 85,
      detection_points: 450,
      practice_points: 300,
      weekly_activity: [
        { day: 'Lun', points: 120 },
        { day: 'Mar', points: 90 },
        { day: 'Mié', points: 60 },
        { day: 'Jue', points: 150 },
        { day: 'Vie', points: 180 },
        { day: 'Sáb', points: 75 },
        { day: 'Dom', points: 75 }
      ],
      achievements: [
        {
          id: 1,
          name: 'Primer Día',
          description: 'Completaste tu primer día de aprendizaje',
          icon: 'star',
          earned_at: new Date().toISOString()
        },
        {
          id: 2,
          name: 'Racha de 3 días',
          description: 'Mantuviste tu racha por 3 días consecutivos',
          icon: 'flame',
          earned_at: new Date().toISOString()
        },
        {
          id: 3,
          name: 'Maestro del Vocabulario',
          description: 'Completaste 10 ejercicios de vocabulario',
          icon: 'book',
          earned_at: new Date().toISOString()
        }
      ],
      recent_activity: [
        {
          date: new Date().toISOString(),
          points_earned: 180,
          exercises_count: 12
        },
        {
          date: new Date(Date.now() - 86400000).toISOString(), // Ayer
          points_earned: 150,
          exercises_count: 10
        },
        {
          date: new Date(Date.now() - 86400000 * 2).toISOString(), // Hace 2 días
          points_earned: 90,
          exercises_count: 6
        }
      ],
      stats_by_category: {
        vocabulary: 250,
        pronunciation: 150,
        grammar: 100,
        detection: 250
      }
    };
  };

  const getDefaultWeeklyActivity = () => {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    return days.map(day => ({ day, points: 0 }));
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF0000" />
      </View>
    );
  }

  if (!progress) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error al cargar el progreso</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadProgress}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const experienceProgress = progress.experience_points / progress.experience_to_next_level;

  // Función para generar gráficos de progreso semanal
  const renderActivityChart = () => {
    if (!progress.weekly_activity || progress.weekly_activity.length === 0) {
      return (
        <AnimatedCard
          title="Actividad Semanal"
          containerStyle={styles.chartContainer}
          animationDelay={300}
        >
          <Text style={styles.noDataText}>No hay datos de actividad semanal disponibles</Text>
        </AnimatedCard>
      );
    }
    
    return (
      <AnimatedCard
        title="Actividad Semanal"
        containerStyle={styles.chartContainer}
        animationDelay={300}
      >
        <LineChart
          data={{
            labels: progress.weekly_activity.map(a => a.day),
            datasets: [{
              data: progress.weekly_activity.map(a => Math.max(0, a.points))
            }]
          }}
          width={Dimensions.get('window').width - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(255, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16
            }
          }}
          bezier
          style={{
            marginVertical: 8,
            borderRadius: 16
          }}
        />
        <Text style={styles.chartHint}>
          Has ganado un total de {progress.weekly_activity.reduce((sum, day) => sum + day.points, 0)} puntos esta semana
        </Text>
      </AnimatedCard>
    );
  };

  // Gráfico comparativo entre los dos modos
  const renderModeComparisonChart = () => {
    if (!progress.detection_points && !progress.practice_points) {
      return (
        <AnimatedCard
          title="Comparativa de Modos"
          containerStyle={styles.chartContainer}
          animationDelay={400}
        >
          <Text style={styles.noDataText}>No hay datos suficientes para mostrar la comparativa</Text>
        </AnimatedCard>
      );
    }
    
    const data = {
      labels: ['Detección', 'Práctica'],
      datasets: [{
        data: [
          Math.max(1, progress.detection_points), 
          Math.max(1, progress.practice_points)
        ]
      }]
    };
    
    const totalPoints = progress.detection_points + progress.practice_points;
    const detectionPercentage = totalPoints > 0 ? Math.round((progress.detection_points / totalPoints) * 100) : 0;
    const practicePercentage = totalPoints > 0 ? Math.round((progress.practice_points / totalPoints) * 100) : 0;
    
    return (
      <AnimatedCard
        title="Puntos por Modo de Aprendizaje"
        containerStyle={styles.chartContainer}
        animationDelay={400}
      >
   <BarChart
  data={data}
  width={Dimensions.get('window').width - 40}
  height={220}
  yAxisLabel=""       // Añadiendo propiedad obligatoria
  yAxisSuffix=" pts"  // Añadiendo propiedad obligatoria
  chartConfig={{
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 0, 0, ${opacity})`,
    barPercentage: 0.6,
    style: {
      borderRadius: 16
    }
  }}
  style={{
    marginVertical: 8,
    borderRadius: 16
  }}
/>

          <View style={styles.modeSummary}>
            <View style={styles.modeItem}>
              <Text style={styles.modeLabel}>Detección</Text>
              <View style={styles.modeValueContainer}>
                <Text style={styles.modeValue}>{progress.detection_points}</Text>
                <Text style={styles.modePercentage}>({detectionPercentage}%)</Text>
              </View>
            </View>
            <View style={styles.modeItem}>
              <Text style={styles.modeLabel}>Práctica</Text>
              <View style={styles.modeValueContainer}>
                <Text style={styles.modeValue}>{progress.practice_points}</Text>
                <Text style={styles.modePercentage}>({practicePercentage}%)</Text>
              </View>
            </View>
          </View>
          <Text style={styles.chartHint}>
            {progress.detection_points > progress.practice_points 
              ? "¡Has aprendido más usando la cámara!" 
              : "¡Has avanzado más con los ejercicios de práctica!"}
          </Text>
        </AnimatedCard>
      );
    };
  
    // Distribución por categorías
    const renderCategoryDistribution = () => {
      if (!progress.stats_by_category) {
        return null;
      }
      
      const categoryData = [
        {
          name: 'Vocabulario',
          value: progress.stats_by_category.vocabulary,
          color: '#4CAF50',
          legendFontColor: '#4CAF50',
          legendFontSize: 12
        },
        {
          name: 'Pronunciación',
          value: progress.stats_by_category.pronunciation,
          color: '#9C27B0',
          legendFontColor: '#9C27B0',
          legendFontSize: 12
        },
        {
          name: 'Gramática',
          value: progress.stats_by_category.grammar,
          color: '#2196F3',
          legendFontColor: '#2196F3',
          legendFontSize: 12
        },
        {
          name: 'Detección',
          value: progress.stats_by_category.detection,
          color: '#FF9800',
          legendFontColor: '#FF9800',
          legendFontSize: 12
        }
      ];
      
      // Asegurarse de que hay datos válidos para mostrar
      const hasData = categoryData.some(item => item.value > 0);
      
      if (!hasData) {
        return (
          <AnimatedCard
            title="Distribución por Categorías"
            containerStyle={styles.chartContainer}
            animationDelay={500}
          >
            <Text style={styles.noDataText}>
              No hay suficientes datos para mostrar la distribución por categorías
            </Text>
          </AnimatedCard>
        );
      }
      
      return (
        <AnimatedCard
          title="Distribución por Categorías"
          containerStyle={styles.chartContainer}
          animationDelay={500}
        >
          <PieChart
            data={categoryData.filter(item => item.value > 0)}
            width={Dimensions.get('window').width - 40}
            height={220}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="value"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
          <Text style={styles.chartHint}>
            {getCategoryInsight(categoryData)}
          </Text>
        </AnimatedCard>
      );
    };
  
    const getCategoryInsight = (categoryData: any[]) => {
      // Encontrar la categoría con mayor valor
      const maxCategory = categoryData.reduce((prev, current) => 
        (prev.value > current.value) ? prev : current
      );
      
      if (maxCategory.value === 0) {
        return "Comienza a practicar para ver tus estadísticas";
      }
      
      const insights: Record<string, string> = {
        'Vocabulario': "¡Estás expandiendo tu vocabulario a buen ritmo!",
        'Pronunciación': "Tu práctica de pronunciación está dando frutos",
        'Gramática': "Estás dominando bien las estructuras gramaticales",
        'Detección': "¡Aprendes mucho identificando objetos en tu entorno!"
      };
      
      return insights[maxCategory.name] || "¡Sigue practicando en todas las categorías!";
    };
  
    const renderOverviewTab = () => (
      <ScrollView 
        style={styles.tabContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF0000']}
          />
        }
      >
        {/* Nivel y Experiencia */}
        <AnimatedCard containerStyle={styles.levelCard} animationDelay={100}>
          <View style={styles.levelHeader}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelNumber}>{progress.level}</Text>
              <Text style={styles.levelText}>NIVEL</Text>
            </View>
            {progress.streak_days > 0 && (
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={24} color="#FF5722" />
                <Text style={styles.streakText}>{progress.streak_days} días</Text>
              </View>
            )}
          </View>
          <View style={styles.levelInfo}>
            <Text style={styles.levelProgressText}>
              {progress.experience_points} / {progress.experience_to_next_level} XP
            </Text>
            <ProgressBar 
              progress={experienceProgress}
              height={10}
              fillColor="#FF0000"
            />
            <Text style={styles.levelNextText}>
              {progress.experience_to_next_level - progress.experience_points} XP para el siguiente nivel
            </Text>
          </View>
        </AnimatedCard>
  
        {/* Puntos por Modo */}
        <AnimatedCard title="Puntos por Modo" containerStyle={styles.pointsByModeCard} animationDelay={200}>
          <View style={styles.modePointsRow}>
            <View style={styles.modePoint}>
              <Ionicons name="camera" size={24} color="#FF0000" />
              <Text style={styles.modePointValue}>{progress.detection_points || 0}</Text>
              <Text style={styles.modePointLabel}>Detección</Text>
            </View>
            <View style={styles.modePoint}>
              <Ionicons name="book" size={24} color="#2196F3" />
              <Text style={styles.modePointValue}>{progress.practice_points || 0}</Text>
              <Text style={styles.modePointLabel}>Práctica</Text>
            </View>
          </View>
        </AnimatedCard>
  
        {/* Rachas y Estadísticas Rápidas */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
            <Ionicons name="flame" size={32} color="#FF9800" />
            <Text style={styles.statValue}>{progress.streak_days}</Text>
            <Text style={styles.statLabel}>Días de racha</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="star" size={32} color="#4CAF50" />
            <Text style={styles.statValue}>{progress.total_points}</Text>
            <Text style={styles.statLabel}>Puntos totales</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
            <Ionicons name="checkmark-circle" size={32} color="#2196F3" />
            <Text style={styles.statValue}>{progress.exercises_completed}</Text>
            <Text style={styles.statLabel}>Ejercicios</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#F3E5F5' }]}>
            <Ionicons name="trending-up" size={32} color="#9C27B0" />
            <Text style={styles.statValue}>{progress.accuracy_rate}%</Text>
            <Text style={styles.statLabel}>Precisión</Text>
          </View>
        </View>
  
        {/* Gráficos */}
        {renderActivityChart()}
        {renderModeComparisonChart()}
        {renderCategoryDistribution()}
  
        {/* Actividad Reciente */}
        <AnimatedCard 
          title="Actividad Reciente" 
          containerStyle={styles.recentActivityCard}
          animationDelay={600}
        >
          {progress.recent_activity && progress.recent_activity.length > 0 ? (
            progress.recent_activity.map((activity, index) => (
              <View key={index} style={styles.activityRow}>
                <Text style={styles.activityDate}>
                  {new Date(activity.date).toLocaleDateString('es')}
                </Text>
                <Text style={styles.activityPoints}>
                  {activity.points_earned} pts
                </Text>
                <Text style={styles.activityExercises}>
                  {activity.exercises_count} ejercicios
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No hay actividad reciente</Text>
          )}
        </AnimatedCard>
        
        {!isAuthenticated && (
          <View style={styles.loginPrompt}>
            <Text style={styles.loginPromptText}>
              Inicia sesión para guardar tu progreso y acceder a más funciones
            </Text>
          </View>
        )}
      </ScrollView>
    );
  
    const renderAchievementsTab = () => (
      <ScrollView 
        style={styles.tabContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF0000']}
          />
        }
      >
        {progress.achievements && progress.achievements.length > 0 ? (
          progress.achievements.map((achievement, index) => (
            <AnimatedCard 
              key={achievement.id} 
              containerStyle={styles.achievementCard}
              animationDelay={index * 100}
            >
              <View style={styles.achievementContent}>
                <View style={styles.achievementIcon}>
                  <Ionicons 
                    name={(achievement.icon as keyof typeof Ionicons.glyphMap) || 'trophy'} 
                    size={32} 
                    color="#FFD700" 
                  />
                </View>
                <View style={styles.achievementInfo}>
                  <Text style={styles.achievementName}>{achievement.name}</Text>
                  <Text style={styles.achievementDescription}>{achievement.description}</Text>
                  <Text style={styles.achievementDate}>
                    Obtenido el {new Date(achievement.earned_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </AnimatedCard>
          ))
        ) : (
          <View style={styles.noDataContainer}>
            <Ionicons name="trophy-outline" size={60} color="#CCC" />
            <Text style={styles.noDataText}>Aún no has desbloqueado logros</Text>
            <Text style={styles.noDataSubtext}>Completa ejercicios para ganar logros</Text>
            
            <AnimatedCard 
              title="Próximos logros" 
              containerStyle={styles.upcomingAchievements}
              animationDelay={300}
            >
              <View style={styles.upcomingAchievementRow}>
                <Ionicons name="flame-outline" size={24} color="#FF5722" />
                <View style={styles.upcomingAchievementInfo}>
                  <Text style={styles.upcomingAchievementTitle}>Racha de 3 días</Text>
                  <Text style={styles.upcomingAchievementDesc}>
                    Mantén tu racha por 3 días consecutivos
                  </Text>
                </View>
              </View>
              
              <View style={styles.upcomingAchievementRow}>
                <Ionicons name="star-outline" size={24} color="#FFC107" />
                <View style={styles.upcomingAchievementInfo}>
                  <Text style={styles.upcomingAchievementTitle}>Coleccionista de palabras</Text>
                  <Text style={styles.upcomingAchievementDesc}>
                    Aprende 50 palabras diferentes en quechua
                  </Text>
                </View>
              </View>
            </AnimatedCard>
          </View>
        )}
      </ScrollView>
    );
  
    const renderStatsTab = () => (
      <ScrollView 
        style={styles.tabContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF0000']}
          />
        }
      >
        <View style={styles.statsContainer}>
          <AnimatedCard 
            title="Rendimiento por categoría" 
            containerStyle={styles.statSection}
            animationDelay={100}
          >
            {Object.entries(progress.stats_by_category).map(([category, points]) => (
              <View key={category} style={styles.statRow}>
                <Text style={styles.statRowLabel}>{category}</Text>
                <View style={styles.statBarContainer}>
                  <View 
                    style={[
                      styles.statBar, 
                      { width: `${Math.min(100, (points / Math.max(1, getMaxCategoryPoints())) * 100)}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.statRowValue}>{points}</Text>
              </View>
            ))}
          </AnimatedCard>
          
          <AnimatedCard 
            title="Precisión por tipo de ejercicio" 
            containerStyle={styles.statSection}
            animationDelay={200}
          >
            <View style={styles.precisionContainer}>
              <View style={styles.precisionItem}>
                <Text style={styles.precisionTitle}>Selección múltiple</Text>
                <View style={styles.precisionCircle}>
                  <Text style={styles.precisionValue}>92%</Text>
                </View>
              </View>
              
              <View style={styles.precisionItem}>
                <Text style={styles.precisionTitle}>Pronunciación</Text>
                <View style={styles.precisionCircle}>
                  <Text style={styles.precisionValue}>78%</Text>
                </View>
              </View>
              
              <View style={styles.precisionItem}>
                <Text style={styles.precisionTitle}>Anagramas</Text>
                <View style={styles.precisionCircle}>
                  <Text style={styles.precisionValue}>84%</Text>
                </View>
              </View>
            </View>
          </AnimatedCard>
          
          <AnimatedCard 
            title="Palabras aprendidas" 
            containerStyle={styles.statSection}
            animationDelay={300}
          >
            <View style={styles.wordsContainer}>
              <View style={styles.wordsRow}>
                <Text style={styles.wordsStat}>
                  <Text style={styles.wordsCount}>32</Text> palabras
                </Text>
                <Text style={styles.wordsStat}>
                  <Text style={styles.wordsCount}>12</Text> frases
                </Text>
              </View>
              
              <ProgressBar
                progress={0.32}
                height={10}
                fillColor="#4CAF50"
                containerStyle={styles.wordsProgressBar}
                label="Vocabulario básico"
                showPercentage
              />
              
              <Text style={styles.wordsHint}>
                ¡Has aprendido un 32% del vocabulario básico en quechua!
              </Text>
            </View>
          </AnimatedCard>
        </View>
      </ScrollView>
    );
  
    // Función auxiliar para obtener el máximo valor de puntos por categoría
    const getMaxCategoryPoints = () => {
      if (!progress || !progress.stats_by_category) return 1;
      
      return Math.max(
        1,
        progress.stats_by_category.vocabulary || 0,
        progress.stats_by_category.pronunciation || 0,
        progress.stats_by_category.grammar || 0,
        progress.stats_by_category.detection || 0
      );
    };
  
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Mi Progreso</Text>
          
          {isOffline && (
            <View style={styles.offlineIndicator}>
              <Ionicons name="cloud-offline" size={16} color="white" />
              <Text style={styles.offlineText}>Modo sin conexión</Text>
            </View>
          )}
        </View>
  
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'overview' && styles.activeTab]}
            onPress={() => setSelectedTab('overview')}
          >
            <Text style={[styles.tabText, selectedTab === 'overview' && styles.activeTabText]}>
              General
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'achievements' && styles.activeTab]}
            onPress={() => setSelectedTab('achievements')}
          >
            <Text style={[styles.tabText, selectedTab === 'achievements' && styles.activeTabText]}>
              Logros
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'stats' && styles.activeTab]}
            onPress={() => setSelectedTab('stats')}
          >
            <Text style={[styles.tabText, selectedTab === 'stats' && styles.activeTabText]}>
              Estadísticas
            </Text>
          </TouchableOpacity>
        </View>
  
        {selectedTab === 'overview' && renderOverviewTab()}
        {selectedTab === 'achievements' && renderAchievementsTab()}
        {selectedTab === 'stats' && renderStatsTab()}
      </View>
    );
  }
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    errorText: {
      fontSize: 16,
      color: '#666',
      marginBottom: 20,
    },
    retryButton: {
      backgroundColor: '#FF0000',
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 20,
    },
    retryButtonText: {
      color: 'white',
      fontWeight: 'bold',
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
    tabBar: {
      flexDirection: 'row',
      backgroundColor: 'white',
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },
    tab: {
      flex: 1,
      paddingVertical: 15,
      alignItems: 'center',
    },
    activeTab: {
      borderBottomWidth: 2,
      borderBottomColor: '#FF0000',
    },
    tabText: {
      fontSize: 14,
      color: '#666',
    },
    activeTabText: {
      color: '#FF0000',
      fontWeight: 'bold',
    },
    tabContent: {
      flex: 1,
    },
    levelCard: {
      backgroundColor: 'white',
      margin: 16,
      borderRadius: 12,
      padding: 16,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    levelHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    levelBadge: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#FF0000',
      justifyContent: 'center',
      alignItems: 'center',
    },
    levelNumber: {
      fontSize: 32,
      fontWeight: 'bold',
      color: 'white',
    },
    levelText: {
      fontSize: 12,
      color: 'white',
    },
    streakBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFF3E0',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
    },
    streakText: {
      color: '#FF5722',
      fontWeight: 'bold',
      marginLeft: 4,
    },
    levelInfo: {
      flex: 1,
    },
    levelProgressText: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    levelNextText: {
      fontSize: 12,
      color: '#666',
      marginTop: 4,
    },
    pointsByModeCard: {
      backgroundColor: 'white',
      margin: 16,
      marginTop: 0,
      borderRadius: 12,
      padding: 16,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    modePointsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: 16,
    },
    modePoint: {
      alignItems: 'center',
    },
    modePointValue: {
      fontSize: 24,
      fontWeight: 'bold',
      marginTop: 8,
    },
    modePointLabel: {
      fontSize: 14,
      color: '#666',
      marginTop: 4,
    },
    chartContainer: {
      backgroundColor: 'white',
      margin: 16,
      marginTop: 8,
      borderRadius: 12,
      padding: 16,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    chartTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 16,
    },
    noDataText: {
      fontSize: 14,
      color: '#666',
      textAlign: 'center',
      padding: 20,
    },
    noDataSubtext: {
      fontSize: 12,
      color: '#999',
      textAlign: 'center',
    },
    noDataContainer: {
      padding: 40,
      alignItems: 'center',
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: 8,
    },
    statCard: {
      width: '48%',
      margin: '1%',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    statValue: {
      fontSize: 24,
      fontWeight: 'bold',
      marginTop: 8,
    },
    statLabel: {
      fontSize: 12,
      color: '#666',
      marginTop: 4,
    },
    recentActivityCard: {
      backgroundColor: 'white',
      margin: 16,
      padding: 16,
      borderRadius: 12,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 16,
    },
    activityRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },
    activityDate: {
      flex: 1,
      fontSize: 14,
    },
    activityPoints: {
      flex: 1,
      fontSize: 14,
      textAlign: 'center',
      color: '#FF0000',
      fontWeight: 'bold',
    },
    activityExercises: {
      flex: 1,
      fontSize: 14,
      textAlign: 'right',
      color: '#666',
    },
    achievementCard: {
      backgroundColor: 'white',
      margin: 8,
      marginHorizontal: 16,
      borderRadius: 12,
      padding: 16,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    achievementContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    achievementIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#FFF8E1',
      justifyContent: 'center',
      alignItems: 'center',
    },
    achievementInfo: {
      flex: 1,
      marginLeft: 16,
    },
    achievementName: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    achievementDescription: {
      fontSize: 14,
      color: '#666',
      marginTop: 4,
    },
    achievementDate: {
      fontSize: 12,
      color: '#999',
      marginTop: 4,
    },
    statsContainer: {
      padding: 16,
    },
    statSection: {
      backgroundColor: 'white',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    statSectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 16,
    },
    statRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    statRowLabel: {
      flex: 1,
      fontSize: 14,
      color: '#666',
    },
    statRowValue: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#333',
      width: 40,
      textAlign: 'right',
    },
    statBarContainer: {
      flex: 1,
      height: 8,
      backgroundColor: '#f0f0f0',
      borderRadius: 4,
      marginHorizontal: 10,
    },
    statBar: {
      height: '100%',
      backgroundColor: '#FF0000',
      borderRadius: 4,
    },
    chartHint: {
      fontSize: 14,
      fontStyle: 'italic',
      textAlign: 'center',
      color: '#666',
      marginTop: 8,
    },
    modeSummary: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
      paddingHorizontal: 20,
    },
    modeItem: {
      alignItems: 'center',
    },
    modeLabel: {
      fontSize: 14,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    modeValueContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    modeValue: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    modePercentage: {
      fontSize: 12,
      color: '#666',
      marginLeft: 4,
    },
    precisionContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
    },
    precisionItem: {
      alignItems: 'center',
      width: '30%',
      marginBottom: 16,
    },
    precisionTitle: {
      fontSize: 12,
      textAlign: 'center',
      marginBottom: 8,
    },
    precisionCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      borderWidth: 3,
      borderColor: '#4CAF50',
      justifyContent: 'center',
      alignItems: 'center',
    },
    precisionValue: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    wordsContainer: {
      padding: 8,
    },
    wordsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 16,
    },
    wordsStat: {
      fontSize: 14,
      color: '#666',
    },
    wordsCount: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#4CAF50',
    },
    wordsProgressBar: {
      marginBottom: 16,
    },
    wordsHint: {
      fontSize: 14,
      color: '#666',
      fontStyle: 'italic',
      textAlign: 'center',
    },
    loginPrompt: {
      backgroundColor: '#E3F2FD',
      margin: 16,
      padding: 16,
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: '#2196F3',
      marginBottom: 32,
    },
    loginPromptText: {
      fontSize: 14,
      color: '#0D47A1',
    },
    upcomingAchievements: {
      width: '80%',
      marginTop: 20,
    marginBottom: 20,
  },
  upcomingAchievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  upcomingAchievementInfo: {
    marginLeft: 12,
    flex: 1,
  },
  upcomingAchievementTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  upcomingAchievementDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});