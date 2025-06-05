// src/screens/ProgressScreen.tsx - VERSIÓN CON TEXTOS CELEBRATORIOS
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
  RefreshControl,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '../services/api';
import { ProgressBar } from '../components/ProgressBar';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { AnimatedCard } from '../components/AnimatedCard';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../context/AuthContext';
import { progressEvents } from '../events/progressEvents';

interface UserProgress {
  level: number;
  total_words: number;
  words_to_next_level: number;
  streak_days: number;
  exercises_completed: number;
  accuracy_rate: number;
  detection_words: number;
  practice_words: number;
  mastered_words: number;
  weekly_activity: Array<{
    day: string;
    words: number;
  }>;
  achievements: Array<{
    id: number;
    name: string;
    description: string;
    icon: string;
    earned_at: string;
    created_at?: string;
  }>;
  recent_activity: Array<{
    date: string;
    words_learned: number;
    exercises_count: number;
  }>;
  stats_by_category: {
    vocabulary: number;
    pronunciation: number;
    grammar: number;
    detection: number;
    total?: number;
    mastered?: number;
    in_progress?: number;
    needs_practice?: number;
  };
}

// 🆕 COMPONENTE: Guía de Niveles de Maestría
const MasteryLevelGuide = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>💫 Niveles de Maestría Yachay</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.masteryLevels}>
          <View style={styles.masteryLevelItem}>
            <Text style={styles.masteryStars}>⭐</Text>
            <View style={styles.masteryLevelText}>
              <Text style={styles.masteryLevelTitle}>Recién Detectada</Text>
              <Text style={styles.masteryLevelDesc}>Acabas de descubrirla con IA</Text>
            </View>
          </View>
          
          <View style={styles.masteryLevelItem}>
            <Text style={styles.masteryStars}>⭐⭐</Text>
            <View style={styles.masteryLevelText}>
              <Text style={styles.masteryLevelTitle}>Familiar</Text>
              <Text style={styles.masteryLevelDesc}>La reconoces y recuerdas</Text>
            </View>
          </View>
          
          <View style={styles.masteryLevelItem}>
            <Text style={styles.masteryStars}>⭐⭐⭐</Text>
            <View style={styles.masteryLevelText}>
              <Text style={styles.masteryLevelTitle}>Practicando</Text>
              <Text style={styles.masteryLevelDesc}>La usas en ejercicios</Text>
            </View>
          </View>
          
          <View style={styles.masteryLevelItem}>
            <Text style={styles.masteryStars}>⭐⭐⭐⭐</Text>
            <View style={styles.masteryLevelText}>
              <Text style={styles.masteryLevelTitle}>Casi Dominada</Text>
              <Text style={styles.masteryLevelDesc}>Ya la tienes controlada</Text>
            </View>
          </View>
          
          <View style={[styles.masteryLevelItem, styles.masteryLevelFinal]}>
            <Text style={styles.masteryStars}>⭐⭐⭐⭐⭐</Text>
            <View style={styles.masteryLevelText}>
              <Text style={styles.masteryLevelTitle}>¡DOMINADA!</Text>
              <Text style={styles.masteryLevelDesc}>La sabes perfectamente</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.modalFooter}>
          <Text style={styles.modalFooterText}>
            🎯 Completa ejercicios para subir el nivel de cada palabra
          </Text>
        </View>
      </View>
    </View>
  </Modal>
);

// 🆕 FUNCIÓN: Convierte descripciones aburridas en mensajes celebratorios
const getCelebrationText = (achievementName: string, originalDescription: string): string => {
  const celebrations: { [key: string]: string } = {
    // 🎯 LOGROS DE VOCABULARIO
    "Primer Paso": "¡Diste tu primer paso en el mundo Yachay! 🎉📚",
    "Explorador": "¡Detectaste 10 palabras con tu cámara IA! 📸🤖✨",
    "Coleccionista de Palabras": "¡Increíble! Ya tienes 50 palabras en tu vocabulario! 🏆📚",
    "Diccionario Viviente": "¡Eres un verdadero diccionario andante con 100 palabras! 🧠👑",
    
    // ⭐ LOGROS DE DOMINIO
    "Primera Estrella": "¡Alcanzaste 5⭐ en tu primera palabra! ⭐⭐⭐⭐⭐🎉",
    "Maestro Principiante": "¡Dominaste 5 palabras completamente! 🎯💪",
    "Sabio del Quechua": "¡25 palabras dominadas! Eres todo un sabio! 🧙‍♂️👑✨",
    
    // 🔥 LOGROS DE CONSTANCIA
    "Inicio Constante": "¡3 días seguidos practicando! Tu constancia es admirable! 🔥💪",
    "Semana Perfecta": "¡Una semana completa de dedicación! ¡Imparable! 🚀🔥",
    "Mes Dedicado": "¡Un mes entero de constancia! Eres una inspiración! 👑🔥💫",
  };
  
  // Si encontramos una celebración específica, usarla
  if (celebrations[achievementName]) {
    return celebrations[achievementName];
  }
  
  // Si no, transformar descripciones genéricas problemáticas
  if (originalDescription.includes("Descubre tu primera palabra")) {
    return "¡Descubriste tu primera palabra en quechua! 🎉";
  }
  if (originalDescription.includes("Domina tu primera palabra")) {
    return "¡Dominaste tu primera palabra con 5 estrellas! ⭐";
  }
  if (originalDescription.includes("Mantén tu racha")) {
    return "¡Mantuviste tu racha por varios días consecutivos! 🔥";
  }
  if (originalDescription.includes("Alcanza") && originalDescription.includes("palabras")) {
    return "¡Expandiste tu vocabulario significativamente! 📚✨";
  }
  if (originalDescription.includes("Completa") && originalDescription.includes("ejercicios")) {
    return "¡Completaste ejercicios y mejoraste tu dominio! 🎯💪";
  }
  if (originalDescription.includes("Detecta") && originalDescription.includes("objetos")) {
    return "¡Tu cámara IA identificó múltiples objetos! 📸🤖";
  }
  
  // Si no coincide con nada, devolver el original
  return originalDescription;
};

export default function ProgressScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'achievements' | 'stats'>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const [showMasteryGuide, setShowMasteryGuide] = useState(false); // 🆕 Estado para modal
  const { isAuthenticated, user } = useAuth();
  
  useEffect(() => {
    const checkConnection = async () => {
      const netInfo = await NetInfo.fetch();
      setIsOffline(!netInfo.isConnected);
    };
    
    checkConnection();

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
      
      if (isAuthenticated && !isOffline) {
        try {
          progressData = await ApiService.getUserProgress();
          console.log("Datos de progreso recibidos:", progressData);
        } catch (error) {
          console.error('Error al cargar progreso desde API:', error);
        }
      } else if (!isAuthenticated) {
        progressData = getFallbackProgressData();
      }
      
      if (!progressData || 
          (typeof progressData === 'object' && 
           Object.keys(progressData).filter(k => k !== 'message').length === 0)) {
        
        console.warn("Usando datos fallback porque backend devolvió vacío");
        progressData = getFallbackProgressData();
      }
      
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
    const handleProgressUpdate = (data?: any) => {
      console.log('🔄 ProgressScreen: Evento recibido:', data);
      setLastUpdateTime(Date.now());
      loadProgress();
    };
  
    const handleForceRefresh = () => {
      console.log('🔄 ProgressScreen: Refresh forzado');
      setLastUpdateTime(Date.now());
      loadProgress();
    };
  
    console.log('🔔 ProgressScreen: Registrando listeners de progreso');
    progressEvents.on('progress_updated', handleProgressUpdate);
    progressEvents.on('exercise_completed', handleProgressUpdate);
    progressEvents.on('force_refresh_progress', handleForceRefresh);
    progressEvents.on('mastery_updated', handleProgressUpdate);
    progressEvents.on('word_mastered', handleProgressUpdate);
    
    return () => {
      console.log('🔕 ProgressScreen: Removiendo listeners de progreso');
      progressEvents.off('progress_updated', handleProgressUpdate);
      progressEvents.off('exercise_completed', handleProgressUpdate);
      progressEvents.off('force_refresh_progress', handleForceRefresh);
      progressEvents.off('mastery_updated', handleProgressUpdate);
      progressEvents.off('word_mastered', handleProgressUpdate);
    };
  }, [loadProgress]);

  useEffect(() => {
    if (progress) {
      console.log('📊 ProgressScreen: Datos normalizados para UI:', {
        level: progress.level,
        total_words: progress.total_words,
        mastered_words: progress.mastered_words,
        detection_words: progress.detection_words,
        practice_words: progress.practice_words,
        stats_category_total: progress.stats_by_category.total,
        stats_category_mastered: progress.stats_by_category.mastered,
        achievements_count: progress.achievements.length,
        weekly_activity_days: progress.weekly_activity.length
      });
    }
  }, [progress]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProgress();
  }, [loadProgress]);

  const normalizeProgressData = (data: any): UserProgress => {
    console.log("📥 Datos del backend recibidos:", data);
    
    return {
      level: data.level || 1,
      total_words: data.total_words || 0,
      words_to_next_level: data.words_to_next_level || 15,
      streak_days: data.streak_days || 0,
      exercises_completed: data.exercises_completed || 0,
      accuracy_rate: data.accuracy_rate || 0,
      detection_words: data.detection_words || 0,
      practice_words: data.practice_words || 0,
      mastered_words: data.mastered_words || 0,
      weekly_activity: data.weekly_activity || getDefaultWeeklyActivity(),
      achievements: data.achievements || [],
      recent_activity: data.recent_activity || [],
      stats_by_category: {
        vocabulary: 0,
        pronunciation: 0,
        grammar: 0,
        detection: data.detection_words || 0,
        total: data.stats_by_category?.total || data.total_words || 0,
        mastered: data.stats_by_category?.mastered || data.mastered_words || 0,
        in_progress: data.stats_by_category?.in_progress || 0,
        needs_practice: data.stats_by_category?.needs_practice || 0
      }
    };
  };

  const getDefaultProgressData = (): UserProgress => {
    return {
      level: 1,
      total_words: 0,
      words_to_next_level: 10,
      streak_days: 0,
      exercises_completed: 0,
      accuracy_rate: 0,
      detection_words: 0,
      practice_words: 0,
      mastered_words: 0,
      weekly_activity: getDefaultWeeklyActivity(),
      achievements: [],
      recent_activity: [],
      stats_by_category: {
        vocabulary: 0,
        pronunciation: 0,
        grammar: 0,
        detection: 0,
        total: 0,
        mastered: 0,
        in_progress: 0,
        needs_practice: 0
      }
    };
  };

  const getFallbackProgressData = (): UserProgress => {
    return {
      level: 1,
      total_words: 0,
      words_to_next_level: 15,
      streak_days: 0,
      exercises_completed: 0,
      accuracy_rate: 0,
      detection_words: 0,
      practice_words: 0,
      mastered_words: 0,
      weekly_activity: getDefaultWeeklyActivity(),
      achievements: [],
      recent_activity: [],
      stats_by_category: {
        vocabulary: 0,
        pronunciation: 0,
        grammar: 0,
        detection: 0,
        total: 0,
        mastered: 0,
        in_progress: 0,
        needs_practice: 0
      }
    };
  }; 

  const getDefaultWeeklyActivity = () => {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    return days.map(day => ({ day, words: 0 }));
  };
  
  const mapAchievementIcon = (backendIcon: string): keyof typeof Ionicons.glyphMap => {
    const iconMap: { [key: string]: keyof typeof Ionicons.glyphMap } = {
      'fire': 'flame',
      'award': 'ribbon', 
      'crown': 'star-outline',
      'medal': 'trophy',
      'star': 'star',
      'flame': 'flame',
      'trophy': 'trophy',
      'ribbon': 'ribbon',
      'camera': 'camera',
      'book': 'book',
      'flash': 'flash',
      'calendar': 'calendar',
      'compass': 'compass',
      'share': 'share',
      'default': 'trophy'
    };
    
    return iconMap[backendIcon] || iconMap['default'];
  };
  
  const getNextLevelTitle = (currentLevel: number): string => {
    const titles: { [key: number]: string } = {
      1: "Principiante",
      2: "Aprendiz",
      3: "Explorador",
      4: "Aventurero",
      5: "Conocedor",
      6: "Practicante",
      7: "Avanzado",
      8: "Experto",
      9: "Maestro",
      10: "Guardián del Quechua"
    };
    
    if (currentLevel >= 10) {
      return "¡Nivel máximo alcanzado!";
    }
    
    return titles[currentLevel + 1] || "Siguiente nivel";
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

  const wordsProgress = progress.total_words / (progress.total_words + progress.words_to_next_level);

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
      {/* 🎮 CARD PRINCIPAL DE NIVEL - ÚNICA FUENTE DEL TOTAL */}
      <AnimatedCard containerStyle={styles.levelCardEnhanced} animationDelay={100}>
        <View style={styles.levelHeaderEnhanced}>
          <View style={styles.levelBadgeEnhanced}>
            <View style={styles.levelBadgeGlow} />
            <Text style={styles.levelNumber}>{progress.level}</Text>
            <Text style={styles.levelText}>NIVEL</Text>
            <View style={styles.levelBadgeAccent} />
          </View>
          
          {progress.streak_days > 0 && (
            <View style={styles.streakBadgeEnhanced}>
              <View style={styles.streakGlow} />
              <Ionicons name="flame" size={24} color="#FF5722" />
              <Text style={styles.streakText}>{progress.streak_days} días</Text>
            </View>
          )}
        </View>
        
        <View style={styles.levelInfo}>
          <Text style={styles.levelProgressTextEnhanced}>
            {progress.total_words} palabras en tu vocabulario
          </Text>
          <View style={styles.progressBarContainer}>
            <ProgressBar 
              progress={wordsProgress}
              height={12}
              fillColor="#FF0000"
            />
            <View style={styles.progressGlow} />
          </View>
          <Text style={styles.levelNextText}>
            {progress.words_to_next_level} palabras para el siguiente nivel
          </Text>
          <View style={styles.nextLevelContainer}>
            <Ionicons name="flag" size={16} color="#FF0000" />
            <Text style={styles.nextLevelTitle}>
              Próximo: {getNextLevelTitle(progress.level)}
            </Text>
          </View>
        </View>
      </AnimatedCard>

      {/* 🌟 CARD PALABRAS DOMINADAS - MUY VISIBLE */}
      <AnimatedCard containerStyle={styles.masteredWordsCard} animationDelay={150}>
        <View style={styles.masteredHeader}>
          <View style={styles.masteredIconContainer}>
            <Ionicons name="trophy" size={32} color="#FFD700" />
            <View style={styles.masteredIconGlow} />
          </View>
          <View style={styles.masteredInfo}>
            <Text style={styles.masteredCount}>{progress.mastered_words || 0}</Text>
            <Text style={styles.masteredLabel}>
              {progress.mastered_words === 1 ? 'PALABRA DOMINADA' : 'PALABRAS DOMINADAS'}
            </Text>
            <Text style={styles.masteredSubLabel}>⭐⭐⭐⭐⭐ Completamente aprendidas</Text>
          </View>
           
        </View>
        
        {/* Barra de progreso de dominio */}
        <View style={styles.masteryProgressContainer}>
          <View style={styles.masteryProgressBar}>
            <View 
              style={[
                styles.masteryProgressFill, 
                { 
                  width: `${progress.total_words > 0 
                    ? (progress.mastered_words / progress.total_words) * 100 
                    : 0}%` 
                }
              ]} 
            />
          </View>
          <Text style={styles.masteryProgressText}>
            {progress.total_words - progress.mastered_words} palabras por dominar completamente
          </Text>
        </View>
        
        {/* Mensaje motivacional */}
        {progress.mastered_words === 0 && (
          <View style={styles.motivationalContainer}>
            <Ionicons name="bulb-outline" size={20} color="#FF9800" />
            <Text style={styles.motivationalText}>
              ¡Completa ejercicios para dominar tus primeras palabras!
            </Text>
          </View>
        )}
      </AnimatedCard>

      {/* 🎯 Arsenal Yachay - SIN MOSTRAR TOTAL (ELIMINADA REDUNDANCIA) */}
      <AnimatedCard containerStyle={styles.gamingProgressCard} animationDelay={200}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>🎯 TU ARSENAL YACHAY</Text>
          <Text style={styles.progressSubtitle}>Palabras Descubiertas por Modalidad</Text>
        </View>
        
        <View style={styles.progressBody}>
          {/* DETECCIÓN - FUNCIÓN PRINCIPAL */}
          <View style={styles.detectionMasterCard}>
            <View style={styles.detectionHeader}>
              <View style={styles.primaryBadge}>
                <Text style={styles.primaryBadgeText}>⭐ FUNCIÓN PRINCIPAL</Text>
              </View>
              <View style={styles.aiPoweredBadge}>
                <Ionicons name="hardware-chip" size={12} color="#00E676" />
                <Text style={styles.aiText}>AI POWERED</Text>
              </View>
            </View>
            
            <View style={styles.detectionContent}>
              <View style={styles.detectionIconContainer}>
                <View style={styles.cameraGlow} />
                <Ionicons name="camera" size={48} color="#FF0000" />
                <View style={styles.scanLines} />
              </View>
              
              <View style={styles.detectionStats}>
                <View style={styles.detectionCountContainer}>
                  <Text style={styles.detectionCount}>{progress.detection_words || 0}</Text>
                  <View style={styles.countGlow} />
                </View>
                <Text style={styles.detectionLabel}>OBJETOS DETECTADAS</Text>
                <Text style={styles.detectionSubLabel}>Nuevas palabras Descubiertas</Text>
              </View>
              
              <View style={styles.detectionBadges}>
                <View style={styles.realTimeBadge}>
                  <Text style={styles.badgeText}>TIEMPO REAL</Text>
                </View>
                <View style={styles.mlBadge}>
                  <Text style={styles.badgeText}>MACHINE LEARNING</Text>
                </View>
              </View>
            </View>
          </View>
          
          {/* SEPARADOR GAMING */}
          <View style={styles.gamingSeparator}>
            <View style={styles.separatorLineGaming} />
            <View style={styles.separatorCenter}>
              <Text style={styles.separatorTextGaming}>Modo complementario</Text>
            </View>
            <View style={styles.separatorLineGaming} />
          </View>
          
          {/* PRÁCTICA - FUNCIÓN SECUNDARIA */}
          <View style={styles.practiceSecondaryCard}>
            <View style={styles.practiceContent}>
              <View style={styles.practiceIconContainer}>
                <Ionicons name="book" size={32} color="#2196F3" />
              </View>
              <View style={styles.practiceStats}>
                <Text style={styles.practiceCount}>{progress.practice_words || 0}</Text>
                <Text style={styles.practiceLabel}>Palabras de Práctica</Text>
                <Text style={styles.practiceSubLabel}>Agregadas</Text>
              </View>
              <View style={styles.practiceTag}>
                <Text style={styles.practiceTagText}>REFUERZO</Text>
              </View>
            </View>
          </View>
        </View>
      </AnimatedCard>

      {/* 🎮 GRÁFICO - MANTENIENDO ESENCIA */}
      <AnimatedCard
        containerStyle={styles.chartContainerEnhanced}
        animationDelay={300}
      >
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>⚡ ACTIVIDAD NEURAL</Text>
          <Text style={styles.chartSubtitle}>Patrón de Aprendizaje Semanal</Text>
        </View>
        
        <View style={styles.chartWrapper}>
          {progress.weekly_activity && progress.weekly_activity.length > 0 ? (
            <LineChart
              data={{
                labels: progress.weekly_activity.map(a => a.day),
                datasets: [{
                  data: progress.weekly_activity.map(a => Math.max(0, a.words)),
                  color: (opacity = 1) => `rgba(255, 0, 0, ${opacity})`,
                  strokeWidth: 3
                }]
              }}
              width={Dimensions.get('window').width - 40}
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              fromZero={true}
              segments={5}
              chartConfig={{
                backgroundColor: '#1a1a1a',
                backgroundGradientFrom: '#2a2a2a',
                backgroundGradientTo: '#1a1a1a',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: {
                  r: "6",
                  strokeWidth: "3",
                  stroke: "#FF0000",
                  fill: "#FFFFFF"
                },
                propsForLabels: { fontSize: "12" }
              }}
              bezier
              style={styles.chartEnhanced}
            />
          ) : (
            <Text style={styles.noDataText}>Iniciando análisis neural...</Text>
          )}
        </View>
      </AnimatedCard>
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
      {/* HEADER GAMING */}
      <View style={styles.achievementsHeader}>
        <Text style={styles.achievementsTitle}>🏆 SALA DE TROFEOS</Text>
        <Text style={styles.achievementsSubtitle}>Conquistas Desbloqueadas</Text>
      </View>

      {progress.achievements && progress.achievements.length > 0 ? (
        progress.achievements.map((achievement, index) => (
          <AnimatedCard 
            key={achievement.id} 
            containerStyle={styles.achievementCardGaming}
            animationDelay={index * 100}
          >
            <View style={styles.achievementGlow} />
            
            <View style={styles.achievementHeader}>
              <View style={styles.achievementRank}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <View style={styles.unlockedBadge}>
                <Text style={styles.unlockedText}>DESBLOQUEADO</Text>
              </View>
            </View>

            <View style={styles.achievementContentGaming}>
              <View style={styles.achievementIconGaming}>
                <View style={styles.iconGlow} />
                <Ionicons 
                  name={mapAchievementIcon(achievement.icon)} 
                  size={40} 
                  color="#FFD700" 
                />
              </View>
              
              <View style={styles.achievementInfoGaming}>
                <Text style={styles.achievementNameGaming}>{achievement.name}</Text>
                <Text style={styles.achievementDescriptionGaming}>
                  {getCelebrationText(achievement.name, achievement.description)}
                </Text>
                
                <View style={styles.achievementFooter}>
                  <View style={styles.dateContainer}>
                    <Ionicons name="time" size={12} color="#888" />
                    <Text style={styles.achievementDateGaming}>
                      {achievement.earned_at 
                          ? new Date(achievement.earned_at).toLocaleDateString('es-ES')
                          : achievement.created_at 
                            ? new Date(achievement.created_at).toLocaleDateString('es-ES')
                            : 'Obtenido'}
                    </Text>
                  </View>
                  
                  <View style={styles.xpBadge}>
                  <Text style={styles.xpText}>🎁 LOGRADO</Text>
                  </View>
                </View>
              </View>
            </View>
          </AnimatedCard>
        ))
      ) : (
        <View style={styles.noAchievementsContainer}>
          <View style={styles.emptyTrophyCase}>
            <Ionicons name="trophy-outline" size={80} color="#444" />
          </View>
          
          <Text style={styles.noAchievementsTitle}>Vitrina Vacía</Text>
          <Text style={styles.noAchievementsText}>
            Tus conquistas aparecerán aquí cuando completes desafíos
          </Text>
          
          {/* 🎯 REEMPLAZA LA SECCIÓN ANTERIOR CON ESTO: */}
          <AnimatedCard 
            containerStyle={styles.upcomingAchievementsGaming}
            animationDelay={300}
          >
            <View style={styles.upcomingHeader}>
              <Text style={styles.upcomingTitle}>🎯 PRÓXIMOS OBJETIVOS</Text>
              <Text style={styles.upcomingSubtitle}>Logros reales que puedes conseguir</Text>
            </View>

            {/* LOGRO 1: RACHA REALISTA */}
            <View style={styles.upcomingAchievementRowGaming}>
              <View style={styles.upcomingIcon}>
                <Ionicons name="flame-outline" size={24} color="#FF5722" />
              </View>
              <View style={styles.upcomingInfo}>
                <Text style={styles.upcomingAchievementTitleGaming}>Racha de Constancia</Text>
                <Text style={styles.upcomingAchievementDescGaming}>
                  Practica durante 3 días seguidos para formar el hábito
                </Text>
                <View style={styles.benefitContainer}>
                  <Ionicons name="gift" size={12} color="#4CAF50" />
                  <Text style={styles.benefitText}>Protección de racha por 1 día</Text>
                </View>
              </View>
              <View style={styles.progressIndicator}>
                <Text style={styles.progressText}>{progress.streak_days}/3</Text>
              </View>
            </View>
            
            {/* LOGRO 2: VOCABULARIO REALISTA */}
            <View style={styles.upcomingAchievementRowGaming}>
              <View style={styles.upcomingIcon}>
                <Ionicons name="camera-outline" size={24} color="#2196F3" />
              </View>
              <View style={styles.upcomingInfo}>
                <Text style={styles.upcomingAchievementTitleGaming}>Explorador de Palabras</Text>
                <Text style={styles.upcomingAchievementDescGaming}>
                  Detecta 5 objetos diferentes para expandir tu vocabulario
                </Text>
                <View style={styles.benefitContainer}>
                  <Ionicons name="gift" size={12} color="#4CAF50" />
                  <Text style={styles.benefitText}>Desbloquea funciones avanzadas</Text>
                </View>
              </View>
              <View style={styles.progressIndicator}>
                <Text style={styles.progressText}>{progress.detection_words}/5</Text>
              </View>
            </View>
            
            {/* LOGRO 3: DOMINIO REALISTA */}
            <View style={styles.upcomingAchievementRowGaming}>
              <View style={styles.upcomingIcon}>
                <Ionicons name="star-outline" size={24} color="#FFD700" />
              </View>
              <View style={styles.upcomingInfo}>
                <Text style={styles.upcomingAchievementTitleGaming}>Primera Maestría</Text>
                <Text style={styles.upcomingAchievementDescGaming}>
                  Alcanza 5⭐ en tu primera palabra para dominarla completamente
                </Text>
                <View style={styles.benefitContainer}>
                  <Ionicons name="gift" size={12} color="#4CAF50" />
                  <Text style={styles.benefitText}>Certificado de dominio + progreso de nivel</Text>
                </View>
              </View>
              <View style={styles.progressIndicator}>
                <Text style={styles.progressText}>{progress.mastered_words}/1</Text>
              </View>
            </View>
            
            {/* SECCIÓN DE CONSEJOS */}
            <View style={styles.tipsSection}>
              <View style={styles.tipsSeparator} />
              <Text style={styles.tipsTitle}>💡 ¿Cómo conseguir logros?</Text>
              
              <View style={styles.tipRow}>
                <Ionicons name="camera" size={16} color="#FF0000" />
                <Text style={styles.tipText}>
                  <Text style={styles.tipBold}>Usa la cámara</Text> para detectar objetos y ganar palabras
                </Text>
              </View>
              
              <View style={styles.tipRow}>
                <Ionicons name="fitness" size={16} color="#4CAF50" />
                <Text style={styles.tipText}>
                  <Text style={styles.tipBold}>Completa ejercicios</Text> hasta alcanzar 5⭐
                </Text>
              </View>
              
              <View style={styles.tipRow}>
                <Ionicons name="flame" size={16} color="#FF5722" />
                <Text style={styles.tipText}>
                  <Text style={styles.tipBold}>Practica diariamente</Text> para mantener tu racha
                </Text>
              </View>
            </View>
          </AnimatedCard>
        </View>
      )}
    </ScrollView>
  );

  const renderStatisticsTab = () => (
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
      {/* 📊 RESUMEN VISUAL - SIN REDUNDANCIA DEL TOTAL */}
      <AnimatedCard containerStyle={styles.statsOverviewCard} animationDelay={100}>
        <View style={styles.statsOverviewHeader}>
          <Text style={styles.statsOverviewTitle}>📊 DISTRIBUCIÓN DEL VOCABULARIO</Text>
          <TouchableOpacity 
            style={styles.helpButton}
            onPress={() => setShowMasteryGuide(true)}
          >
            <Ionicons name="help-circle-outline" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.statsGrid}>
          <View style={[styles.statItem, styles.totalStat]}>
            <Ionicons name="library" size={24} color="#2196F3" />
            <Text style={styles.statNumber}>{progress.stats_by_category?.total || 0}</Text>
            <Text style={styles.statLabel}>Palabras en tu Vocabulario</Text>
          </View>
          
          <View style={[styles.statItem, styles.progressStat]}>
            <Ionicons name="trending-up" size={24} color="#FF9800" />
            <Text style={styles.statNumber}>{progress.stats_by_category?.in_progress || 0}</Text>
            <Text style={styles.statLabel}>En Progreso (2-4⭐)</Text>
          </View>
          
          <View style={[styles.statItem, styles.needsPracticeStat]}>
            <Ionicons name="fitness" size={24} color="#F44336" />
            <Text style={styles.statNumber}>{progress.stats_by_category?.needs_practice || 0}</Text>
            <Text style={styles.statLabel}>Necesitan Práctica (1⭐)</Text>
          </View>
          
          <View style={[styles.statItem, styles.masteredStat]}>
            <Ionicons name="trophy" size={24} color="#4CAF50" />
            <Text style={styles.statNumber}>{progress.stats_by_category?.mastered || 0}</Text>
            <Text style={styles.statLabel}>Dominadas (5⭐)</Text>
          </View>
        </View>
        
        {/* Explicación clara con botón de ayuda */}
        <View style={styles.explanationContainer}>
          <Ionicons name="information-circle-outline" size={20} color="#666" />
          <Text style={styles.explanationText}>
            Las palabras "dominadas" (5⭐) son aquellas que has practicado hasta el nivel máximo.
            Toca el ícono de ayuda arriba para ver todos los niveles.
          </Text>
        </View>
      </AnimatedCard>

      {/* DESGLOSE DETALLADO - MEJORADO SIN REDUNDANCIAS */}
      <View style={styles.statsCardEnhanced}>
        <View style={styles.statsHeader}>
          <Text style={styles.statsTitle}>📈 DESGLOSE DETALLADO</Text>
          <Text style={styles.statsSubtitle}>Análisis por Nivel de Dominio</Text>
        </View>
        
        {progress.stats_by_category && (
          <View style={styles.categoryStatsContainer}>
            <View style={styles.categoryItemEnhanced}>
              <View style={styles.categoryLabelContainer}>
                <Text style={styles.categoryLabel}>Dominadas (5⭐)</Text>
                <Text style={styles.categoryValue}>{progress.stats_by_category.mastered || 0}</Text>
              </View>
              <View style={styles.categoryBarEnhanced}>
                <View 
                  style={[styles.categoryFillEnhanced, { 
                    width: `${((progress.stats_by_category.mastered || 0) / (progress.stats_by_category.total || 1)) * 100}%`, 
                    backgroundColor: '#4CAF50' 
                  }]} 
                />
              </View>
              <Text style={styles.categoryDescription}>
                Palabras que has aprendido completamente
              </Text>
            </View>
            
            <View style={styles.categoryItemEnhanced}>
              <View style={styles.categoryLabelContainer}>
                <Text style={styles.categoryLabel}>En progreso (2-4⭐)</Text>
                <Text style={styles.categoryValue}>{progress.stats_by_category.in_progress || 0}</Text>
              </View>
              <View style={styles.categoryBarEnhanced}>
                <View 
                  style={[styles.categoryFillEnhanced, { 
                    width: `${((progress.stats_by_category.in_progress || 0) / (progress.stats_by_category.total || 1)) * 100}%`, 
                    backgroundColor: '#FF9800' 
                  }]} 
                />
              </View>
              <Text style={styles.categoryDescription}>
                Palabras que estás aprendiendo activamente
              </Text>
            </View>
            
            <View style={styles.categoryItemEnhanced}>
              <View style={styles.categoryLabelContainer}>
                <Text style={styles.categoryLabel}>Necesitan práctica (1⭐)</Text>
                <Text style={styles.categoryValue}>{progress.stats_by_category.needs_practice || 0}</Text>
              </View>
              <View style={styles.categoryBarEnhanced}>
                <View 
                  style={[styles.categoryFillEnhanced, { 
                    width: `${((progress.stats_by_category.needs_practice || 0) / (progress.stats_by_category.total || 1)) * 100}%`, 
                    backgroundColor: '#F44336' 
                  }]} 
                />
              </View>
              <Text style={styles.categoryDescription}>
                Palabras recién agregadas que necesitan más práctica
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerEnhanced}>
        <Text style={styles.titleEnhanced}>MI PROGRESO</Text>
        <Text style={styles.subtitleEnhanced}>Dashboard Neural Yachay</Text>
        
        {isOffline && (
          <View style={styles.offlineIndicator}>
            <Ionicons name="cloud-offline" size={16} color="white" />
            <Text style={styles.offlineText}>Modo sin conexión</Text>
          </View>
        )}
      </View>

      <View style={styles.tabBarEnhanced}>
        <TouchableOpacity
          style={[styles.tabEnhanced, selectedTab === 'overview' && styles.activeTabEnhanced]}
          onPress={() => setSelectedTab('overview')}
        >
          <Ionicons 
            name="home" 
            size={16} 
            color={selectedTab === 'overview' ? '#FF0000' : '#666'} 
          />
          <Text style={[styles.tabText, selectedTab === 'overview' && styles.activeTabText]}>
            General
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabEnhanced, selectedTab === 'achievements' && styles.activeTabEnhanced]}
          onPress={() => setSelectedTab('achievements')}
        >
          <Ionicons 
            name="trophy" 
            size={16} 
            color={selectedTab === 'achievements' ? '#FF0000' : '#666'} 
          />
          <Text style={[styles.tabText, selectedTab === 'achievements' && styles.activeTabText]}>
            Logros
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabEnhanced, selectedTab === 'stats' && styles.activeTabEnhanced]}
          onPress={() => setSelectedTab('stats')}
        >
          <Ionicons 
            name="analytics" 
            size={16} 
            color={selectedTab === 'stats' ? '#FF0000' : '#666'} 
          />
          <Text style={[styles.tabText, selectedTab === 'stats' && styles.activeTabText]}>
            Estadísticas
          </Text>
        </TouchableOpacity>
      </View>

      {selectedTab === 'overview' && renderOverviewTab()}
      {selectedTab === 'achievements' && renderAchievementsTab()}
      {selectedTab === 'stats' && renderStatisticsTab()}
      
      {/* 🆕 MODAL DE GUÍA DE MAESTRÍA */}
      <MasteryLevelGuide 
        visible={showMasteryGuide} 
        onClose={() => setShowMasteryGuide(false)} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // 🎨 CONTENEDORES PRINCIPALES
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FAFAFA',
  },
  errorText: {
    fontSize: 16,
    color: '#333',
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

  // 🔴 HEADER
  headerEnhanced: {
    backgroundColor: '#FF0000',
    padding: 20,
    paddingTop: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  titleEnhanced: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitleEnhanced: {
    fontSize: 12,
    color: '#FFB3B3',
    marginTop: 4,
    letterSpacing: 1,
  },
  offlineIndicator: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.3)',
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

  // 📱 TAB BAR
  tabBarEnhanced: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tabEnhanced: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  activeTabEnhanced: {
    borderBottomWidth: 3,
    borderBottomColor: '#FF0000',
    backgroundColor: 'rgba(255, 0, 0, 0.05)',
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
    backgroundColor: '#FAFAFA',
  },

  // 🎮 LEVEL CARD
  levelCardEnhanced: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 20,
    padding: 20,
    elevation: 8,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  levelHeaderEnhanced: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  levelBadgeEnhanced: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FF0000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    elevation: 6,
  },
  levelBadgeGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 0, 0, 0.15)',
    top: -10,
    left: -10,
  },
  levelBadgeAccent: {
    position: 'absolute',
    width: 30,
    height: 6,
    backgroundColor: '#FFD700',
    borderRadius: 3,
    bottom: 10,
  },
  levelNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  levelText: {
    fontSize: 12,
    color: 'white',
    letterSpacing: 1,
  },
  streakBadgeEnhanced: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#FF5722',
    position: 'relative',
    elevation: 3,
  },
  streakGlow: {
    position: 'absolute',
    width: '130%',
    height: '130%',
    backgroundColor: 'rgba(255, 87, 34, 0.1)',
    borderRadius: 35,
    top: -6,
    left: -12,
  },
  streakText: {
    color: '#FF5722',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  levelInfo: {
    flex: 1,
  },
  levelProgressTextEnhanced: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#2c3e50',
    textAlign: 'center',
  },
  progressBarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  progressGlow: {
    position: 'absolute',
    width: '100%',
    height: 16,
    backgroundColor: 'rgba(255, 0, 0, 0.05)',
    borderRadius: 8,
    top: -2,
  },
  levelNextText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  nextLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    backgroundColor: '#FFF5F5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 0, 0.1)',
  },
  nextLevelTitle: {
    fontSize: 14,
    color: '#FF0000',
    fontWeight: 'bold',
    marginLeft: 6,
  },

  // 🌟 PALABRAS DOMINADAS CARD
  masteredWordsCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 8,
    borderRadius: 20,
    padding: 20,
    elevation: 8,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  masteredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  masteredIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  masteredIconGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    top: -5,
    left: -5,
  },
  masteredInfo: {
    flex: 1,
  },
  masteredCount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FF8F00',
  },
  masteredLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  masteredSubLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  masteredPercentage: {
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  percentageLabel: {
    fontSize: 12,
    color: '#666',
  },
  masteryProgressContainer: {
    marginTop: 16,
  },
  masteryProgressBar: {
    height: 10,
    backgroundColor: '#F0F0F0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  masteryProgressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 5,
  },
  masteryProgressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  motivationalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  motivationalText: {
    fontSize: 14,
    color: '#E65100',
    marginLeft: 8,
    flex: 1,
  },

  // 🎯 GAMING PROGRESS CARD
  gamingProgressCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    borderRadius: 20,
    padding: 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  progressHeader: {
    backgroundColor: '#2c3e50',
    padding: 20,
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  progressSubtitle: {
    fontSize: 12,
    color: '#FFB3B3',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  progressBody: {
    padding: 16,
    backgroundColor: '#FAFAFA',
  },

  // 📸 DETECCIÓN
  detectionMasterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#FF0000',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 6,
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  detectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    elevation: 2,
  },
  primaryBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  aiPoweredBadge: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  aiText: {
    color: '#2E7D32',
    fontSize: 9,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  detectionContent: {
    alignItems: 'center',
    marginBottom: 16,
  },
  detectionIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
    borderWidth: 3,
    borderColor: '#FF0000',
    elevation: 4,
  },
  cameraGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 0, 0, 0.05)',
  },
  scanLines: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: '#4CAF50',
    top: '30%',
    opacity: 0.7,
  },
  detectionStats: {
    alignItems: 'center',
    marginBottom: 16,
  },
  detectionCountContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  detectionCount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF0000',
    textShadowColor: 'rgba(255, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  countGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 0, 0, 0.05)',
    top: -16,
  },
  detectionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 8,
    letterSpacing: 1,
  },
  detectionSubLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  detectionBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  realTimeBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    elevation: 2,
  },
  mlBadge: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    elevation: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },

  // ➖ SEPARADOR
  gamingSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  separatorLineGaming: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  separatorCenter: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  separatorTextGaming: {
    fontSize: 10,
    color: '#666',
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  // 📚 PRÁCTICA
  practiceSecondaryCard: {
    backgroundColor: '#F8F9FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2196F3',
    elevation: 2,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  practiceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  practiceIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  practiceStats: {
    flex: 1,
    marginLeft: 16,
    alignItems: 'center',
  },
  practiceCount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  practiceLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  practiceSubLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  practiceTag: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    elevation: 2,
  },
  practiceTagText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },

  // 📈 GRÁFICO
  chartContainerEnhanced: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 8,
    borderRadius: 16,
    padding: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  chartHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    letterSpacing: 1,
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  chartWrapper: {
    position: 'relative',
  },
  chartEnhanced: {
    borderRadius: 16,
    elevation: 2,
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },

  // 🏆 ACHIEVEMENTS
  achievementsHeader: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
    elevation: 4,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  achievementsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF8F00',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(255, 143, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  achievementsSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    letterSpacing: 0.5,
  },

  achievementCardGaming: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 8,
    borderRadius: 16,
    padding: 0,
    elevation: 6,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: '#FFD700',
    overflow: 'hidden',
    position: 'relative',
  },
  achievementGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#FFD700',
  },
  achievementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFBF0',
  },
  achievementRank: {
    backgroundColor: '#FFD700',
    width: 30,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  rankText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  unlockedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    elevation: 2,
  },
  unlockedText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  achievementContentGaming: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  achievementIconGaming: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFBF0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#FFD700',
    elevation: 3,
  },
  iconGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  achievementInfoGaming: {
    flex: 1,
    marginLeft: 16,
  },
  achievementNameGaming: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  achievementDescriptionGaming: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  achievementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementDateGaming: {
    fontSize: 10,
    color: '#999',
    marginLeft: 4,
  },
  xpBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    elevation: 2,
  },
  xpText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },

  // 🚫 NO ACHIEVEMENTS
  noAchievementsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTrophyCase: {
    position: 'relative',
    marginBottom: 20,
  },
  noAchievementsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  noAchievementsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  upcomingAchievementsGaming: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    width: '100%',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  upcomingHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  upcomingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF8F00',
    letterSpacing: 1,
  },
  upcomingAchievementRowGaming: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  upcomingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF5722',
  },
  upcomingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  upcomingAchievementTitleGaming: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  upcomingAchievementDescGaming: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  rewardBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    elevation: 2,
  },
  rewardText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // 📊 STATS MEJORADAS - SIN REDUNDANCIAS
  statsOverviewCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  statsOverviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statsOverviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  helpButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
  },
  totalStat: {
    borderColor: '#2196F3',
  },
  masteredStat: {
    borderColor: '#4CAF50',
  },
  progressStat: {
    borderColor: '#FF9800',
  },
  needsPracticeStat: {
    borderColor: '#F44336',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  explanationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F4F8',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  explanationText: {
    fontSize: 12,
    color: '#555',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },

  // 📊 STATS DETALLADAS
  statsCardEnhanced: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 8,
    borderRadius: 16,
    padding: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  statsHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    letterSpacing: 1,
  },
  statsSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  categoryStatsContainer: {
    marginTop: 8,
  },
  categoryItemEnhanced: {
    marginBottom: 20,
  },
  categoryLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  categoryBarEnhanced: {
    height: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 6,
  },
  categoryFillEnhanced: {
    height: '100%',
    borderRadius: 6,
  },
  categoryDescription: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
  },

  // 🆕 MODAL DE MAESTRÍA
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  masteryLevels: {
    marginBottom: 20,
  },
  masteryLevelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF0000',
  },
  masteryLevelFinal: {
    backgroundColor: '#FFF8E1',
    borderLeftColor: '#FFD700',
  },
  masteryStars: {
    fontSize: 16,
    marginRight: 16,
    minWidth: 80,
  },
  masteryLevelText: {
    flex: 1,
  },
  masteryLevelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  masteryLevelDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  modalFooter: {
    backgroundColor: '#F0F4F8',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalFooterText: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // 🆕 AGREGAR ESTOS ESTILOS AL FINAL DEL styles = StyleSheet.create({
upcomingSubtitle: {
  fontSize: 11,
  color: '#666',
  textAlign: 'center',
  marginTop: 4,
},
benefitContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 6,
  backgroundColor: '#F0F8F0',
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 8,
},
benefitText: {
  fontSize: 10,
  color: '#2E7D32',
  fontWeight: 'bold',
  marginLeft: 4,
},
progressIndicator: {
  backgroundColor: '#E3F2FD',
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
},
progressText: {
  fontSize: 11,
  color: '#1976D2',
  fontWeight: 'bold',
},
tipsSection: {
  marginTop: 16,
  paddingTop: 16,
},
tipsSeparator: {
  height: 1,
  backgroundColor: '#E0E0E0',
  marginBottom: 12,
},
tipsTitle: {
  fontSize: 14,
  fontWeight: 'bold',
  color: '#2c3e50',
  marginBottom: 12,
  textAlign: 'center',
},
tipRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 8,
  paddingHorizontal: 8,
},
tipText: {
  fontSize: 11,
  color: '#666',
  marginLeft: 8,
  flex: 1,
},
tipBold: {
  fontWeight: 'bold',
  color: '#2c3e50',
},
// 🆕 FIN DE ESTILOS NUEVOS
});