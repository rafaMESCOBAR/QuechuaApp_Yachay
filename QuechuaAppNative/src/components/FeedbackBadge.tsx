// src/components/FeedbackEffect.tsx

import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, Animated, View, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

interface FeedbackEffectProps {
  isCorrect: boolean;
  points: number;
  message?: string;
  onAnimationComplete?: () => void;
}

export const FeedbackEffect: React.FC<FeedbackEffectProps> = ({ 
  isCorrect, 
  points, 
  message,
  onAnimationComplete 
}) => {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Reproducir sonido según resultado
    playSound(isCorrect);
    
    // Animar aparición
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          tension: 100,
          friction: 5,
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        })
      ]),
      Animated.delay(2000),
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.in(Easing.ease)
        })
      ])
    ]).start(() => {
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    });
  }, []);
  
  const playSound = async (isCorrect: boolean) => {
    try {
      // Cargar sonido según resultado
      const soundFile = isCorrect 
        ? require('../../assets/sounds/success.mp3') 
        : require('../../assets/sounds/error.mp3');
      
      const { sound } = await Audio.Sound.createAsync(soundFile);
      await sound.playAsync();
      
      // Descargar cuando termine
      sound.setOnPlaybackStatusUpdate(status => {
        // Verificar que no es un error y tiene la propiedad didJustFinish
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('Error reproduciendo sonido:', error);
    }
  };
  
  // Determinar mensaje a mostrar
  const feedbackMessage = message || (isCorrect 
    ? `¡Correcto! +${points} puntos` 
    : "¡Incorrecto! Intenta otra vez");
  
  return (
    <Animated.View style={[
      styles.container,
      { 
        opacity,
        transform: [{ scale }]
      },
      isCorrect ? styles.successContainer : styles.errorContainer
    ]}>
      <Ionicons 
        name={isCorrect ? "checkmark-circle" : "close-circle"} 
        size={50} 
        color={isCorrect ? "#4CAF50" : "#F44336"}
      />
      <Text style={styles.feedbackText}>
        {feedbackMessage}
      </Text>
      
      {isCorrect && points > 0 && (
        <Animated.View style={styles.pointsContainer}>
          <Text style={styles.pointsText}>+{points}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 16,
    minWidth: 200,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    top: '40%',
    zIndex: 1000,
  },
  successContainer: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
    borderWidth: 2,
  },
  feedbackText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
    textAlign: 'center',
  },
  pointsContainer: {
    marginTop: 10,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pointsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  }
});