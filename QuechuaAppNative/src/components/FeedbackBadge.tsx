//src\components\FeedbackBadge.tsx

import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, Animated, View, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

interface FeedbackEffectProps {
  isCorrect: boolean;
  mastery?: number;
  message?: string;
  onAnimationComplete?: () => void;
}

export const FeedbackEffect: React.FC<FeedbackEffectProps> = ({ 
  isCorrect, 
  mastery,
  message,
  onAnimationComplete 
}) => {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    playSound(isCorrect);
    
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
      const soundFile = isCorrect 
        ? require('../../assets/sounds/success.mp3') 
        : require('../../assets/sounds/error.mp3');
      
      const { sound } = await Audio.Sound.createAsync(soundFile);
      await sound.playAsync();
      
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('Error reproduciendo sonido:', error);
    }
  };
  
  const feedbackMessage = message || (isCorrect 
    ? '¡Correcto!' 
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
      
      {isCorrect && mastery && (
        <View style={styles.masteryContainer}>
          <Text style={styles.masteryText}>Dominio: {mastery}/5 ⭐</Text>
        </View>
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
  masteryContainer: {
    marginTop: 10,
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  masteryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  }
});