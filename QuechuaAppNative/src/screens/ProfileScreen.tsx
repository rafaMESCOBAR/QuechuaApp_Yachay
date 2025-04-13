// src/screens/ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Define el tipo para el perfil de usuario
interface UserProfile {
  id: number;
  level: number;
  experience_points: number;
  streak_days: number;
  last_activity?: string;
  native_speaker: boolean;
  preferred_dialect?: string;
  profile_image?: string;
  user?: {
    id: number;
    username: string;
    email: string;
  };
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { logout } = useAuth();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const profileData = await ApiService.getUserProfile();
      setProfile(profileData);
    } catch (error: any) {
      console.error('Error al cargar perfil:', error);
      Alert.alert('Error', 'No se pudo cargar la información del perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      // No necesitamos hacer nada más, el contexto se encargará de cambiar la vista
    } catch (error: any) {
      console.error('Error al cerrar sesión:', error);
      Alert.alert('Error', 'No se pudo cerrar la sesión');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF0000" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          No se pudo cargar la información del perfil
        </Text>
        <TouchableOpacity style={styles.button} onPress={loadProfile}>
          <Text style={styles.buttonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mi Perfil</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.profileImageContainer}>
          {profile.profile_image ? (
            <Image 
              source={{ uri: profile.profile_image }} 
              style={styles.profileImage} 
            />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Ionicons name="person" size={60} color="#ccc" />
            </View>
          )}
        </View>

        <Text style={styles.username}>{profile.user?.username}</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.level}</Text>
            <Text style={styles.statLabel}>Nivel</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.experience_points}</Text>
            <Text style={styles.statLabel}>Puntos</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.streak_days}</Text>
            <Text style={styles.statLabel}>Racha</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Información Personal</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Correo:</Text>
          <Text style={styles.infoValue}>{profile.user?.email}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Hablante nativo:</Text>
          <Text style={styles.infoValue}>
            {profile.native_speaker ? 'Sí' : 'No'}
          </Text>
        </View>
        
        {profile.native_speaker && profile.preferred_dialect && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dialecto:</Text>
            <Text style={styles.infoValue}>{profile.preferred_dialect}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutButtonText}>CERRAR SESIÓN</Text>
      </TouchableOpacity>
    </ScrollView>
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
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  profileImageContainer: {
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  username: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF0000',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  sectionContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    width: 120,
  },
  infoValue: {
    fontSize: 16,
    flex: 1,
  },
  logoutButton: {
    backgroundColor: '#FF5252',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 40,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
    color: '#d32f2f',
  },
  button: {
    backgroundColor: '#FF0000',
    padding: 12,
    borderRadius: 8,
    alignSelf: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});