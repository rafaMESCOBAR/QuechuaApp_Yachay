// src/screens/HomeScreen.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TutorialOverlay } from '../components/TutorialOverlay';
import { Ionicons } from '@expo/vector-icons';

type RootStackParamList = {
  Home: undefined;
  Camera: undefined;
  Practice: undefined;
  Progress: undefined;
};

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

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

  useEffect(() => {
    // Verificar si es la primera vez que el usuario abre la app
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

  // Manejo del tutorial
  const handleTutorialComplete = async () => {
    try {
      setShowTutorial(false);
      await AsyncStorage.setItem('hasSeenTutorial', 'true');
    } catch (error) {
      console.error('Error guardando estado de tutorial:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <YachayLogo />
        </View>
      </View>

      <View style={styles.heroSection}>
        <View style={styles.leftContent}>
          <Image
            source={require('../../assets/chullo1.png')}
            style={styles.mapImage}
            resizeMode="contain"
          />
        </View>
        
        <View style={styles.rightContent}>
          <Text style={styles.heroText}>
            ¡La forma divertida, efectiva{'\n'}para aprender el idioma{'\n'}Quechua!
          </Text>
          <TouchableOpacity 
            style={styles.startButton}
            onPress={() => navigation.navigate('Camera')}
          >
            <Text style={styles.buttonText}>EMPIEZA AHORA</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sección de acceso rápido a funcionalidades */}
      <View style={styles.quickAccessSection}>
        <Text style={styles.quickAccessTitle}>ACCESO RÁPIDO</Text>
        <View style={styles.quickAccessGrid}>
          <TouchableOpacity 
            style={styles.quickAccessButton}
            onPress={() => navigation.navigate('Camera')}
          >
            <Ionicons name="camera" size={32} color="#FF0000" />
            <Text style={styles.quickAccessText}>Detectar y Aprender</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickAccessButton}
            onPress={() => navigation.navigate('Practice')}
          >
            <Ionicons name="book" size={32} color="#2196F3" />
            <Text style={styles.quickAccessText}>Practicar y Jugar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickAccessButton}
            onPress={() => navigation.navigate('Progress')}
          >
            <Ionicons name="stats-chart" size={32} color="#4CAF50" />
            <Text style={styles.quickAccessText}>Ver Progreso</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.scienceSection}>
        <View style={styles.leftScience}>
          <Image source={require('../../assets/chullo2.png')} style={styles.scienceIcon} />
          <Text style={styles.scienceSubtitle}>KAMAQ YACHACHIOKUNA</Text>
        </View>
        <View style={styles.rightScience}>
          <Text style={styles.sectionTitleRed}>Respaldado por la ciencia</Text>
          <Text style={styles.sectionText}>
            Gracias a la combinación de métodos de enseñanza basados en la evidencia y un
            contenido entretenido, nuestra aplicación enseña de manera eficiente a leer, escribir,
            entender y hablar quechua, revitalizando el idioma.
          </Text>
        </View>
      </View>

      <View style={styles.gamificationSection}>
        <View style={styles.leftText}>
          <Text style={styles.sectionTitleRed}>Divertido, efectivo</Text>
          <Text style={styles.sectionText}>
            La aplicación combinará gamificación e interactividad para hacer el aprendizaje del
            quechua divertido y efectivo, promoviendo la cultura y facilitando la enseñanza
            personalizada y accesible.
          </Text>
        </View>
        <View style={styles.rightPuzzle}>
          <Text style={styles.quechuaTitle}>PUKLLAYKUNSUNCHIK{'\n'}WAKAKUNA</Text>
          <Image source={require('../../assets/puzzle.png')} style={styles.puzzleImage} />
        </View>
      </View>

      <View style={styles.scienceSection}>
        <View style={styles.leftScience}>
          <Image source={require('../../assets/science.png')} style={styles.scienceIcon} />
          <Text style={styles.scienceSubtitle}>KAMAQ YACHACHIOKUNA</Text>
        </View>
        <View style={styles.rightScience}>
          <Text style={styles.sectionTitleRed}>Respaldado por la ciencia</Text>
          <Text style={styles.sectionText}>
            Gracias a la combinación de métodos de enseñanza basados en la evidencia y un
            contenido entretenido, nuestra aplicación enseña de manera eficiente a leer, escribir,
            entender y hablar quechua, revitalizando el idioma.
          </Text>
        </View>
      </View>
      
      <View style={styles.gamificationSection}>
        <View style={styles.leftText}>
          <Text style={styles.sectionTitleRed}>motivación</Text>
          <Text style={styles.sectionText}>
            Al integrar lo mejor de la inteligencia artificial y la lingüística, nuestras
            lecciones se ajustan a tu desempeño, permitiéndote aprender quechua al
            nivel adecuado y a tu propio ritmo.
          </Text>
        </View>
        <View style={styles.rightPuzzle}>
          <Text style={styles.quechuaTitle}>Yachasun{'\n'}</Text>
          <Image source={require('../../assets/llama.png')} style={styles.puzzleImage} />
        </View>
      </View>

      <View style={styles.finalCtaSection}>
        <Text style={styles.learnQuechuaText}>Aprende el idioma Quechua</Text>
        <TouchableOpacity 
          style={styles.startButtonGreen}
          onPress={() => navigation.navigate('Camera')}
        >
          <Text style={styles.buttonText}>EMPIEZA AHORA</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navText}>INICIO</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('Camera')}
        >
          <Text style={styles.navIcon}>📸</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>☰</Text>
          <Text style={styles.navText}>MENÚ</Text>
        </TouchableOpacity>
      </View>
      
      {/* Tutorial de primera vez */}
      {showTutorial && (
        <TutorialOverlay 
          steps={[
            {
              title: "¡Bienvenido a Yachay!",
              description: "Aprende quechua de forma divertida detectando objetos a tu alrededor.",
              icon: "bulb-outline",
              position: "top"
            },
            {
              title: "Detecta Objetos",
              description: "Usa la cámara para identificar objetos y descubrir su nombre en quechua.",
              icon: "camera-outline",
              position: "center"
            },
            {
              title: "Juega y Aprende",
              description: "Completa divertidos ejercicios, gana puntos y aprende mientras juegas.",
              icon: "game-controller-outline",
              position: "center"
            },
            {
              title: "Practica tu Pronunciación",
              description: "Escucha la correcta pronunciación y practica hablando.",
              icon: "mic-outline",
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
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#FF0000',
    padding: 12,
    paddingLeft: 15,
  },
  headerLeft: {
    alignItems: 'flex-start',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoY: {
    fontSize: 24,
    color: '#0066CC',
    fontWeight: 'bold',
  },
  logoA1: {
    fontSize: 24,
    color: '#FF6600',
    fontWeight: 'bold',
  },
  logoC: {
    fontSize: 24,
    color: '#0066CC',
    fontWeight: 'bold',
  },
  logoH: {
    fontSize: 24,
    color: '#333333',
    fontWeight: 'bold',
  },
  logoA2: {
    fontSize: 24,
    color: '#FF6600',
    fontWeight: 'bold',
  },
  logoY2: {
    fontSize: 24,
    color: '#00CCFF',
    fontWeight: 'bold',
  },
  heroSection: {
    flexDirection: 'row',
    paddingVertical: 25,
    paddingHorizontal: 15,
  },
  leftContent: {
    flex: 1,
  },
  rightContent: {
    flex: 1,
    justifyContent: 'center',
  },
  mapImage: {
    width: '95%',
    height: 150,
    resizeMode: 'cover',
  },
  heroText: {
    fontSize: 20,
    marginBottom: 15,
  },
  quickAccessSection: {
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  quickAccessTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  quickAccessGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  quickAccessButton: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    width: '30%',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickAccessText: {
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
  },
  gamificationSection: {
    flexDirection: 'row',
    padding: 15,
    marginVertical: 15,
  },
  leftText: {
    flex: 1,
    paddingRight: 15,
  },
  rightPuzzle: {
    flex: 1,
    alignItems: 'center',
  },
  puzzleImage: {
    width: '95%',
    height: 120,
    resizeMode: 'cover',
  },
  quechuaTitle: {
    fontSize: 18,
    color: '#FF6B00',
    textAlign: 'center',
    marginBottom: 12,
  },
  scienceSection: {
    flexDirection: 'row',
    padding: 15,
    marginVertical: 15,
  },
  leftScience: {
    flex: 1,
    alignItems: 'center',
  },
  rightScience: {
    flex: 2,
    paddingLeft: 15,
  },
  scienceIcon: {
    width: '80%',
    height: 80,
    resizeMode: 'contain',
  },
  scienceSubtitle: {
    fontSize: 14,
    color: '#333333',
    textAlign: 'center',
    marginBottom: 8,
  },
  finalCtaSection: {
    alignItems: 'center',
    paddingVertical: 25,
    marginBottom: 15,
  },
  startButton: {
    backgroundColor: '#FF0000',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 15,
  },
  startButtonGreen: {
    backgroundColor: '#00FF00',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 15,
  },
  learnQuechuaText: {
    fontSize: 18,
    color: '#00CCFF',
    marginBottom: 15,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  sectionTitleRed: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF0000',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 13,
    lineHeight: 16,
    textAlign: 'left',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  navItem: {
    alignItems: 'center',
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  navText: {
    fontSize: 11,
  },
});