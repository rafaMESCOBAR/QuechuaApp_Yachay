// src/screens/ProfileScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { progressEvents } from '../events/progressEvents';

const { width } = Dimensions.get('window');

interface UserProfile {
  id: number;
  current_level: number;
  level?: number;
  total_words: number;
  streak_days: number;
  last_activity?: string;
  native_speaker: boolean;
  preferred_dialect?: string;
  profile_image?: string;
  user?: {
    id: number;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vocabularyCount, setVocabularyCount] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const { logout } = useAuth();
  const navigation = useNavigation<any>();

  useEffect(() => {
    loadProfile();
    loadVocabularyCount();
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      if (refreshing) return;
      
      setIsLoading(true);
      
      const [progressData, userProfileData] = await Promise.all([
        ApiService.getUserProgress(),
        ApiService.getUserProfile()
      ]);
      
      console.log('Datos de perfil recibidos:', progressData);
      
      const combinedProfile = {
        ...progressData,
        user: userProfileData.user,
        profile_image: userProfileData.profile_image,
        native_speaker: userProfileData.native_speaker,
        preferred_dialect: userProfileData.preferred_dialect,
        last_activity: userProfileData.last_activity
      };
      
      setProfile(combinedProfile);
    } catch (error: any) {
      console.error('Error al cargar perfil:', error);
      Alert.alert('Error', 'No se pudo cargar la información del perfil');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  const loadVocabularyCount = useCallback(async () => {
    try {
      const vocabData = await ApiService.getUserVocabulary({ sort_by: 'recent' });
      setVocabularyCount(vocabData.length);
    } catch (error) {
      console.error('Error loading vocabulary count:', error);
    }
  }, []);

  useEffect(() => {
    const handleProgressUpdate = (data?: any) => {
      console.log('🔄 ProfileScreen: Evento recibido, recargando datos:', data);
      setLastUpdateTime(Date.now());
      loadProfile();
      loadVocabularyCount();
    };

    console.log('🔔 ProfileScreen: Registrando listeners de progreso');
    progressEvents.on('progress_updated', handleProgressUpdate);
    progressEvents.on('exercise_completed', handleProgressUpdate);
    
    return () => {
      console.log('🔕 ProfileScreen: Removiendo listeners de progreso');
      progressEvents.off('progress_updated', handleProgressUpdate);
      progressEvents.off('exercise_completed', handleProgressUpdate);
    };
  }, [loadProfile, loadVocabularyCount]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfile();
    loadVocabularyCount();
  }, [loadProfile, loadVocabularyCount]);

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error: any) {
              console.error('Error al cerrar sesión:', error);
              Alert.alert('Error', 'No se pudo cerrar la sesión');
            }
          },
        },
      ]
    );
  };

  const getLevelTitle = (level: number): string => {
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
    return titles[level] || "Principiante";
  };

  const getLevelColor = (level: number): string => {
    const colors = {
      1: '#4CAF50', 2: '#66BB6A', 3: '#8BC34A', 4: '#CDDC39', 5: '#FFC107',
      6: '#FF9800', 7: '#FF5722', 8: '#E91E63', 9: '#9C27B0', 10: '#673AB7'
    };
    return colors[level as keyof typeof colors] || '#4CAF50';
  };

  // Función para obtener las iniciales del usuario
  const getUserInitials = (user: any): string => {
    if (!user) return 'YU';
    
    // Intentar usar first_name y last_name primero
    if (user.first_name && user.last_name) {
      return (user.first_name[0] + user.last_name[0]).toUpperCase();
    }
    
    // Si no, usar username
    if (user.username) {
      const username = user.username;
      
      // Si es solo números, usar las primeras dos cifras
      if (/^\d+$/.test(username)) {
        return username.slice(0, 2);
      }
      
      const names = username.trim().split(' ');
      if (names.length >= 2) {
        return (names[0][0] + names[1][0]).toUpperCase();
      }
      return username.slice(0, 2).toUpperCase();
    }
    
    return 'YU';
  };

 // Función para obtener color de avatar basado en usuario
const getAvatarColors = (user: any, level: number) => {
  const baseColor = getLevelColor(level);
  const username = user?.username || user?.first_name || 'user';
  const hash = username.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
  const opacity = 0.15 + (hash % 25) / 100; // Entre 0.15 y 0.4
  
  return {
    backgroundColor: baseColor,
    backgroundColorLight: `${baseColor}20`,
  };
};

  // Función para verificar si la imagen es válida
  const isValidImageUrl = (url: string): boolean => {
    if (!url) return false;
    // Si la URL contiene caracteres codificados mal o rutas locales problemáticas
    if (url.includes('%3A') || url.startsWith('/media/https%3A')) return false;
    return url.startsWith('http://') || url.startsWith('https://');
  };

  // Función para obtener nombre para mostrar
  const getDisplayName = (user: any): string => {
    if (!user) return 'Usuario';
    
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    
    if (user.first_name) {
      return user.first_name;
    }
    
    return user.username || 'Usuario';
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF0000" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF5252" />
          <Text style={styles.errorText}>
            No se pudo cargar la información del perfil
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Usar current_level si existe, sino level
  const userLevel = profile.current_level || profile.level || 1;
  const displayName = getDisplayName(profile.user);
  const userInitials = getUserInitials(profile.user);
  const avatarColors = getAvatarColors(profile.user, userLevel);
  const hasValidImage = profile.profile_image && isValidImageUrl(profile.profile_image);

  console.log('Avatar info:', {
    hasValidImage,
    profile_image: profile.profile_image,
    userInitials,
    userLevel,
    displayName
  });

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#FF0000']}
          tintColor="#FF0000"
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header mejorado */}
      <View style={styles.header}>
        <View style={styles.headerOverlay} />
        <View style={styles.headerContent}>
          <Text style={styles.title}>Mi Perfil</Text>
        </View>
      </View>

      {/* Card principal del perfil - Avatar mejorado */}
      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          {/* Avatar personalizado */}
          <View style={styles.profileImageContainer}>
            <View style={styles.profileImageShadow}>
              {hasValidImage ? (
                <Image 
                  source={{ uri: profile.profile_image }} 
                  style={styles.profileImage}
                  onError={() => console.log('Error loading image')}
                />
              ) : (
                <View style={[styles.avatarContainer, { backgroundColor: avatarColors.backgroundColor }]}>
                  {/* Patrón decorativo de fondo */}
                  <View style={styles.avatarPattern}>
                    <View style={[styles.patternCircle, styles.patternCircle1, { backgroundColor: avatarColors.backgroundColorLight }]} />
                    <View style={[styles.patternCircle, styles.patternCircle2, { backgroundColor: avatarColors.backgroundColorLight }]} />
                    <View style={[styles.patternCircle, styles.patternCircle3, { backgroundColor: avatarColors.backgroundColorLight }]} />
                  </View>
                  
                  {/* Iniciales del usuario */}
                  <View style={styles.avatarInitials}>
                    <Text style={styles.initialsText}>{userInitials}</Text>
                  </View>
                  
                  {/* Icono decorativo opcional */}
                  <View style={styles.avatarIcon}>
                    <Ionicons name="leaf" size={16} color="rgba(255,255,255,0.3)" />
                  </View>
                </View>
              )}
            </View>
            {/* Badge de nivel mejorado */}
            <View style={[styles.levelBadge, { backgroundColor: getLevelColor(userLevel) }]}>
              <Text style={styles.levelBadgeText}>{userLevel}</Text>
            </View>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.username}>{displayName}</Text>
            <Text style={[styles.levelTitle, { color: getLevelColor(userLevel) }]}>
              {getLevelTitle(userLevel)}
            </Text>
            
            {/* Estadísticas principales */}
            <View style={styles.mainStats}>
              <View style={styles.mainStatItem}>
                <View style={[styles.statCircle, { backgroundColor: `${getLevelColor(userLevel)}20` }]}>
                  <Ionicons name="trophy" size={22} color={getLevelColor(userLevel)} />
                </View>
                <Text style={styles.statValue}>{userLevel}</Text>
                <Text style={styles.statLabel}>NIVEL</Text>
              </View>
              
              <View style={styles.statSeparator} />
              
              <View style={styles.mainStatItem}>
                <View style={[styles.statCircle, { backgroundColor: '#FF450020' }]}>
                  <Ionicons name="flame" size={22} color="#FF4500" />
                </View>
                <Text style={styles.statValue}>{profile.streak_days}</Text>
                <Text style={styles.statLabel}>RACHA</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Accesos rápidos */}
      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Accesos Rápidos</Text>
        
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate('Vocabulary')}
        >
          <View style={styles.actionIconWrapper}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="book" size={24} color="#4CAF50" />
            </View>
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Mis Detecciones</Text>
          </View>
          <View style={styles.actionArrow}>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Información personal */}
      <View style={styles.personalInfoContainer}>
        <Text style={styles.sectionTitle}>Información Personal</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="mail" size={20} color="#666" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Correo electrónico</Text>
              <Text style={styles.infoValue}>
                {profile.user?.email || 'No disponible'}
              </Text>
            </View>
          </View>
          
          <View style={styles.infoDivider} />
          
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="globe" size={20} color="#666" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Hablante nativo</Text>
              <Text style={[styles.infoValue, profile.native_speaker && styles.nativeText]}>
                {profile.native_speaker ? 'Sí' : 'No'}
              </Text>
            </View>
          </View>
          
          {profile.native_speaker && profile.preferred_dialect && (
            <>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="language" size={20} color="#666" />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Dialecto preferido</Text>
                  <Text style={styles.infoValue}>{profile.preferred_dialect}</Text>
                </View>
              </View>
            </>
          )}

          {profile.last_activity && (
            <>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="time" size={20} color="#666" />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Última actividad</Text>
                  <Text style={styles.infoValue}>
                    {new Date(profile.last_activity).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Botón de cerrar sesión */}
      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <View style={styles.logoutIconContainer}>
          <Ionicons name="log-out-outline" size={20} color="white" />
        </View>
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginVertical: 24,
    color: '#d32f2f',
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#FF0000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Header
  header: {
    backgroundColor: '#FF0000',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 25,
    paddingHorizontal: 20,
    position: 'relative',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  headerContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
  },

  // Profile Card
  profileCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: -12,
    borderRadius: 24,
    padding: 30,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
  },
  profileHeader: {
    alignItems: 'center',
  },
  
  // Avatar personalizado
  profileImageContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  profileImageShadow: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'white',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPattern: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  patternCircle: {
    position: 'absolute',
    borderRadius: 50,
  },
  patternCircle1: {
    width: 30,
    height: 30,
    top: 15,
    right: 20,
  },
  patternCircle2: {
    width: 20,
    height: 20,
    bottom: 25,
    left: 15,
  },
  patternCircle3: {
    width: 25,
    height: 25,
    top: 60,
    right: 5,
  },
  avatarInitials: {
    zIndex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  avatarIcon: {
    position: 'absolute',
    bottom: 10,
    right: 15,
    zIndex: 1,
  },
  levelBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  levelBadgeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  profileInfo: {
    alignItems: 'center',
    width: '100%',
  },
  username: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 6,
    textAlign: 'center',
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 25,
    textAlign: 'center',
  },

  // Stats
  mainStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    padding: 25,
    width: '100%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  mainStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  statCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    letterSpacing: 1,
  },
  statSeparator: {
    width: 1,
    height: 50,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 25,
  },

  // Quick Actions
  quickActionsContainer: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
    marginLeft: 4,
  },
  actionCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  actionIconWrapper: {
    marginRight: 16,
  },
  actionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  actionArrow: {
    padding: 8,
  },

  // Personal Info
  personalInfoContainer: {
    margin: 16,
    marginTop: 8,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 22,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  infoIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  nativeText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 58,
  },

  // Logout Button
  logoutButton: {
    backgroundColor: '#FF5252',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    margin: 16,
    borderRadius: 16,
    elevation: 6,
    shadowColor: '#FF5252',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  logoutIconContainer: {
    marginRight: 8,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  bottomSpacing: {
    height: 24,
  },
});