// src/screens/HomeScreen.tsx - GAMIFICADO SIN REDUNDANCIAS

import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TutorialOverlay } from '../components/TutorialOverlay';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

type RootStackParamList = {
  Home: undefined;
  Camera: undefined;
  Practice: undefined;
  Progress: undefined;
  Vocabulary: undefined;
};

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

// ✅ MANTENER LOGO ORIGINAL
const YachayLogo = () => (
  <View style={styles.logoContainer}>
    <Text style={styles.logoY}>y</Text>
    <Text style={styles.logoA1}>a</Text>
    <Text style={styles.logoC}>c</Text>
    <Text style={styles.logoH}>h</Text>
    <Text style={styles.logoA2}>a</Text>
    <Text style={styles.logoY2}>y</Text>
  </View>
);

export default function HomeScreen({ navigation }: Props) {
  const [showTutorial, setShowTutorial] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const checkFirstTime = async () => {
      try {
        const hasSeenTutorial = await AsyncStorage.getItem('hasSeenTutorial');
        if (!hasSeenTutorial) {
          setShowTutorial(true);
        }
      } catch (error) {
        console.error('Error verificando tutorial:', error);
      }
    };
    checkFirstTime();
  }, []);

  const handleTutorialComplete = async () => {
    try {
      setShowTutorial(false);
      await AsyncStorage.setItem('hasSeenTutorial', 'true');
    } catch (error) {
      console.error('Error guardando estado de tutorial:', error);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Gamificado Simple */}
      <LinearGradient
        colors={['#FF0000', '#FF4444']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <YachayLogo />
          
        </View>
        
        {/* Elementos decorativos animados */}
         
      </LinearGradient>

      <View style={styles.mainContent}>
        
        {/* Hero Card Principal - ACCIÓN PRINCIPAL */}
        <LinearGradient
          colors={['#FFFFFF', '#F8F9FA']}
          style={styles.heroCard}
        >
           
          
          <View style={styles.heroContent}>
            <View style={styles.heroLeft}>
              <Image
                source={require('../../assets/chullo1.png')}
                style={styles.heroImage}
                resizeMode="contain"
              />
              <View style={styles.magicGlow} />
            </View>
            
            <View style={styles.heroRight}>
              <Text style={styles.heroTitle}>🎯 Detecta y Aprende</Text>
              <Text style={styles.heroSubtitle}>
                Apunta tu cámara a cualquier objeto y descubre su nombre en quechua
              </Text>
               
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.mainActionButton}
            onPress={() => navigation.navigate('Camera')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#FF0000', '#FF3333']}
              style={styles.actionGradient}
            >
              <Ionicons name="scan" size={28} color="white" />
              <Text style={styles.actionButtonText}>¡DETECTAR AHORA!</Text>
              <Ionicons name="arrow-forward" size={24} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>

        {/* Proceso Visual Gamificado */}
        <View style={styles.processCard}>
          <Text style={styles.processTitle}>🎮 Cómo funciona la magia</Text>
          <View style={styles.processSteps}>
            <View style={styles.processStep}>
              <LinearGradient
                colors={['#FF6B6B', '#FF8E53']}
                style={styles.stepCircle}
              >
                <Ionicons name="camera" size={24} color="white" />
              </LinearGradient>
              <Text style={styles.stepTitle}>Apunta</Text>
              <Text style={styles.stepDesc}>Tu cámara</Text>
            </View>
            
            <View style={styles.magicArrow}>
              <Ionicons name="flash" size={20} color="#FFD700" />
            </View>
            
            <View style={styles.processStep}>
              <LinearGradient
                colors={['#4ECDC4', '#44A08D']}
                style={styles.stepCircle}
              >
                <Ionicons name="scan" size={24} color="white" />
              </LinearGradient>
              <Text style={styles.stepTitle}>Detecta</Text>
              <Text style={styles.stepDesc}>Automágico</Text>
            </View>
            
            <View style={styles.magicArrow}>
              <Ionicons name="flash" size={20} color="#FFD700" />
            </View>
            
            <View style={styles.processStep}>
              <LinearGradient
                colors={['#A8E6CF', '#7FCDCD']}
                style={styles.stepCircle}
              >
                <Ionicons name="school" size={24} color="white" />
              </LinearGradient>
              <Text style={styles.stepTitle}>Traduce</Text>
              <Text style={styles.stepDesc}>¡Y aprende!</Text>
            </View>
          </View>
        </View>

        {/* Mensaje Inspiracional Gamificado */}
        <LinearGradient
          colors={['#ffecd2', '#fcb69f']}
          style={styles.inspirationCard}
        >
          <View style={styles.inspirationHeader}>
            <Text style={styles.llamaEmoji}>🦙</Text>
            <Text style={styles.mountainEmoji}>🏔️</Text>
            <Text style={styles.starEmoji}>⭐</Text>
          </View>
          <Text style={styles.inspirationTitle}>¡Conviértete en Guardián del Quechua!</Text>
          <Text style={styles.inspirationText}>
            Cada objeto que detectas ayuda a preservar una lengua milenaria
          </Text>
          <View style={styles.culturePattern}>
            <Text style={styles.patternText}>◆ ◇ ◆ ◇ ◆</Text>
          </View>
        </LinearGradient>
      </View>

      {/* Tutorial Enfocado en ACCIÓN */}
      {showTutorial && (
        <TutorialOverlay 
          steps={[
            {
              title: "¡Bienvenido a Yachay! 🎉",
              description: "Tu aventura para aprender quechua comienza aquí.",
              icon: "rocket-outline",
              position: "top"
            },
            {
              title: "Tu Súper Poder 📸",
              description: "Tu cámara + nuestra IA = aprendizaje mágico de quechua.",
              icon: "camera-outline",
              position: "center"
            },
            {
              title: "¡Solo Apunta y Aprende! 🎯",
              description: "Toca el botón rojo y comienza tu aventura ahora mismo.",
              icon: "play-outline",
              position: "bottom"
            }
          ]}
          onComplete={handleTutorialComplete}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  
  // Header Gamificado SIN stats
  header: {
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 10,
    backgroundColor: '#F5F7FA',
    alignItems: 'flex-start',
  },
  headerContent: {
    zIndex: 2,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoY: { fontSize: 22, color: '#0066CC', fontWeight: 'bold' },
  logoA1: { fontSize: 22, color: '#FF6600', fontWeight: 'bold' },
  logoC: { fontSize: 22, color: '#0066CC', fontWeight: 'bold' },
  logoH: { fontSize: 22, color: '#333333', fontWeight: 'bold' },
  logoA2: { fontSize: 22, color: '#FF6600', fontWeight: 'bold' },
  logoY2: { fontSize: 22, color: '#00CCFF', fontWeight: 'bold' },
  subtitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Elementos flotantes decorativos
  floatingElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingIcon: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  float1: { top: 20, right: 30 },
  float2: { top: 60, right: 80 },
  float3: { bottom: 10, left: 40 },
  floatingEmoji: { fontSize: 16 },
  
  // Contenido principal
  mainContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 30,
  },
  
  // Hero Card Principal
  heroCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    elevation: 10,
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  heroHeader: {
    marginBottom: 16,
  },
  missionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  missionText: {
    color: '#FF0000',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 6,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroLeft: {
    position: 'relative',
    marginRight: 20,
  },
  heroImage: {
    width: 80,
    height: 80,
  },
  magicGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    backgroundColor: 'rgba(255,0,0,0.1)',
    borderRadius: 50,
    zIndex: -1,
  },
  heroRight: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  benefitsList: {
    marginTop: 8,
  },
  benefit: {
    fontSize: 12,
    color: '#4CAF50',
    marginBottom: 4,
    fontWeight: '500',
  },
  
  // Botón Principal
  mainActionButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 12,
  },
  
  // Proceso Visual
  processCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  processTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  processSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  processStep: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 4,
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 10,
    color: '#666',
  },
  magicArrow: {
    marginHorizontal: 8,
  },

  // Mensaje Inspiracional
  inspirationCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  inspirationHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  llamaEmoji: { fontSize: 24, marginHorizontal: 4 },
  mountainEmoji: { fontSize: 20, marginHorizontal: 4 },
  starEmoji: { fontSize: 16, marginHorizontal: 4 },
  inspirationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  inspirationText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  culturePattern: {
    marginTop: 8,
  },
  patternText: {
    fontSize: 16,
    color: '#999',
    opacity: 0.7,
  },
});