// src/components/FillBlanksExercise.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Keyboard,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SpeechService } from '../services/speechService';
import { ConsecutiveFailuresIndicator } from './ConsecutiveFailuresIndicator';
import { Audio } from 'expo-av';

const { width } = Dimensions.get('window');

// Extender la interfaz global para incluir resetConsecutiveFailures
declare global {
  namespace NodeJS {
    interface Global {
      resetConsecutiveFailures?: () => void;
    }
  }
}

interface FillBlanksExerciseProps {
  question: string;
  answer: string;
  hint?: string;
  onComplete: (isCorrect: boolean, userAnswer?: string) => void;
  difficulty: number;
  spanishTranslation?: string;
  onAnswerChange?: (answer: string) => void;
  currentAttempt?: number;
  maxAttempts?: number;
  mode?: 'detection' | 'practice'; // ✅ AGREGAR ESTA LÍNEA
}

export const FillBlanksExercise: React.FC<FillBlanksExerciseProps> = ({
  question,
  answer,
  hint,
  onComplete,
  difficulty,
  spanishTranslation,
  onAnswerChange,
  currentAttempt = 0,
  maxAttempts = 3,
  mode = 'practice' // ✅ AGREGAR ESTA LÍNEA
}) => {
  // IMPORTANTE: Mantener exactamente las mismas variables de estado que tenía el código original
  const [userAnswer, setUserAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false); // Para manejar el mensaje de error

  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Animaciones
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  
  // Efecto para ocultar el mensaje de error después de 1 segundo
  useEffect(() => {
    let errorTimer: NodeJS.Timeout;
    
    if (showErrorMessage) {
      errorTimer = setTimeout(() => {
        setShowErrorMessage(false);
      }, 2000); // Ocultar después de 1 segundo
    }
    
    return () => {
      if (errorTimer) clearTimeout(errorTimer);
    };
  }, [showErrorMessage]);
  
  // Escuchar evento global para resetear fallos consecutivos
  React.useEffect(() => {
    const handleResetConsecutiveFailures = () => {
      console.log('Reseteando contador de fallos consecutivos');
      setConsecutiveFailures(0);
    };
    
    // Agregar la función al objeto global para compatibilidad con código existente
    if (typeof global !== 'undefined') {
      (global as any).resetConsecutiveFailures = handleResetConsecutiveFailures;
    }
    
    return () => {
      // Limpiar cuando el componente se desmonte
      if (typeof global !== 'undefined') {
        delete (global as any).resetConsecutiveFailures;
      }
    };
  }, []);

  // Función para mostrar la pista - igual que en el original
  const handleShowHint = async () => {
    // Reproducir sonido de pista
    if (soundEnabled) {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/sounds/hint.mp3')
        );
        await sound.playAsync();
        // Limpiar después de reproducir
        sound.setOnPlaybackStatusUpdate((status) => {
          if ('isLoaded' in status && status.isLoaded && !status.isPlaying) {
            sound.unloadAsync().catch(e => console.error("Error descargando sonido", e));
          }
        });
      } catch (error) {
        console.error("Error reproduciendo sonido:", error);
      }
    }
    
    setShowHint(true);
  };

  // Función para escuchar la palabra - igual que en el original
  const handleListenWord = async () => {
    try {
      await SpeechService.speakWord(answer);
    } catch (error) {
      console.error('Error reproduciendo pronunciación:', error);
      Alert.alert('Error', 'No se pudo reproducir el audio.');
    }
  };

  // Función para animar sacudida del input
  const triggerShakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { 
        toValue: 10, 
        duration: 100,
        useNativeDriver: true 
      }),
      Animated.timing(shakeAnimation, { 
        toValue: -10, 
        duration: 100,
        useNativeDriver: true 
      }),
      Animated.timing(shakeAnimation, { 
        toValue: 10, 
        duration: 100,
        useNativeDriver: true 
      }),
      Animated.timing(shakeAnimation, { 
        toValue: 0, 
        duration: 100,
        useNativeDriver: true 
      })
    ]).start();
  };

  // Función para verificar la respuesta - MANTENER EXACTAMENTE LA MISMA LÓGICA
  // Función para verificar la respuesta - CORREGIDA PARA SINCRONIZAR AUDIO
  const handleVerifyAnswer = async () => {
    Keyboard.dismiss();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    // Verificar si la respuesta es correcta
    const result = userAnswer.toLowerCase() === answer.toLowerCase();
    
    if (!result) {
      setShowErrorMessage(true);
      triggerShakeAnimation();
      
      // ✅ REPRODUCIR AUDIO INMEDIATAMENTE
      if (soundEnabled) {
        try {
          const { sound } = await Audio.Sound.createAsync(
            require('../assets/sounds/incorrect.mp3')
          );
          await sound.playAsync();
          sound.setOnPlaybackStatusUpdate((status) => {
            if ('isLoaded' in status && status.isLoaded && !status.isPlaying) {
              sound.unloadAsync().catch(e => console.error("Error descargando sonido", e));
            }
          });
        } catch (error) {
          console.error("Error reproduciendo sonido:", error);
        }
      }
      
      // ✅ MANTENER TIMING ORIGINAL
      if (mode === 'detection') {
        onComplete(result, userAnswer);
      } else {
        setTimeout(() => {
          onComplete(result, userAnswer);
        }, 2000);
      }
    } else {
      // ✅ AUDIO PARA RESPUESTAS CORRECTAS
      if (soundEnabled) {
        try {
          const { sound } = await Audio.Sound.createAsync(
            require('../assets/sounds/correct.mp3')
          );
          await sound.playAsync();
          sound.setOnPlaybackStatusUpdate((status) => {
            if ('isLoaded' in status && status.isLoaded && !status.isPlaying) {
              sound.unloadAsync().catch(e => console.error("Error descargando sonido", e));
            }
          });
        } catch (error) {
          console.error("Error reproduciendo sonido:", error);
        }
      }
      
      onComplete(result, userAnswer);
    }
    
    setTimeout(() => {
      setIsSubmitting(false);
    }, 1000);
  };

  // Renderizar componente
  return (
    <View style={styles.container}>
      {/* Tarjeta de pregunta */}
      <View style={styles.questionCard}>
        <Text style={styles.questionText}>{question}</Text>
        
        {spanishTranslation && (
          <View style={styles.translationContainer}>
            <Ionicons name="language-outline" size={18} color="#666" style={styles.translationIcon} />
            <Text style={styles.translationText}>
              {spanishTranslation}
            </Text>
          </View>
        )}
      </View>
      
      {/* Botón de escuchar pronunciación (estilo original) */}
      <TouchableOpacity
        style={styles.listenButton}
        onPress={handleListenWord}
      >
        <Ionicons name="volume-high" size={24} color="white" />
        <Text style={styles.listenButtonText}>Escuchar pronunciación</Text>
      </TouchableOpacity>
      
      {/* Contenedor del input con animación de sacudida */}
      <Animated.View 
        style={[
          styles.inputContainer, 
          { transform: [{ translateX: shakeAnimation }] }
        ]}
      >
           <TextInput
            ref={inputRef}
            style={styles.input}
            value={userAnswer}
            onChangeText={(text) => {
              setUserAnswer(text);
              onAnswerChange?.(text);  // ✅ AGREGAR ESTA LÍNEA
            }}
            placeholder="Escribe tu respuesta aquí"
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor="#aaa"
          />
      </Animated.View>
      
      {/* Pista de primera letra */}
      <Text style={styles.letterHint}>
        Comienza con: <Text style={styles.letterHintHighlight}>{answer.charAt(0).toUpperCase()}</Text>
        {Array(answer.length - 1).fill('_').join(' ')}
      </Text>
      
      {/* Mensaje de error - exactamente como en el original pero con estilo mejorado */}
      {showErrorMessage && (
        <View style={styles.errorContainer}>
          <Ionicons name="close-circle" size={20} color="#D32F2F" style={styles.errorIcon} />
          <Text style={styles.errorText}>
            Incorrecto. La respuesta correcta es: {answer}
          </Text>
        </View>
      )}
      
      {/* Botón de pista - igual que en el original */}
      {!showHint && hint && (
        <TouchableOpacity
          style={styles.hintButton}
          onPress={handleShowHint}
          activeOpacity={0.7}
        >
          <Ionicons name="bulb-outline" size={18} color="#FF9800" />
          <Text style={styles.hintButtonText}>Mostrar pista</Text>
        </TouchableOpacity>
      )}
      
      {/* Pista visible - igual que en el original */}
      {showHint && hint && (
        <View style={styles.hintContainer}>
          <Ionicons name="bulb" size={20} color="#FF9800" style={styles.hintIcon} />
          <Text style={styles.hintText}>{hint}</Text>
        </View>
      )}
      
     {/* Contador de intentos dinámico */}
     {currentAttempt > 0 && (
  <Text style={styles.attemptsCounter}>
    Intento {currentAttempt}/{maxAttempts}
  </Text>
)}
      
      {/* Botón verificar - mejorado visualmente pero mantiene misma funcionalidad */}
      <TouchableOpacity
        style={[
          styles.verifyButton,
          userAnswer.trim() === '' || isSubmitting ? styles.disabledButton : null
        ]}
        onPress={handleVerifyAnswer}
        disabled={userAnswer.trim() === '' || isSubmitting}
        activeOpacity={0.7}
      >
        {isSubmitting ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <>
            <Text style={styles.buttonText}>Verificar</Text>
            <Ionicons name="checkmark-circle-outline" size={20} color="white" style={styles.buttonIcon} />
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    width: '100%',
    minHeight: 500, // Añadir altura mínima para ocupar más espacio vertical
  },
  questionCard: {
    backgroundColor: '#F5F7FA',
    padding: 16,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    marginBottom: 20,
  },
  questionText: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
    lineHeight: 24,
  },
  translationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  translationIcon: {
    marginRight: 8,
  },
  translationText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#555',
    flex: 1,
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    height: 54,
    borderWidth: 1,
    borderColor: '#BBD6E8',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 18,
    backgroundColor: '#F8FAFE',
    color: '#333',
  },
  letterHint: {
    textAlign: 'center',
    fontSize: 14,
    color: '#757575',
    marginBottom: 16,
    letterSpacing: 1,
  },
  letterHintHighlight: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    color: '#D32F2F',
    flex: 1,
  },
  hintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
    marginVertical: 15,
    borderWidth: 1,
    borderColor: '#FFCC80',
  },
  hintButtonText: {
    color: '#F57C00',
    marginLeft: 8,
    fontWeight: '500',
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FFA000',
  },
  hintIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  hintText: {
    flex: 1,
    color: '#795548',
    fontStyle: 'italic',
    fontSize: 15,
  },
  verifyButton: {
    backgroundColor: '#FF0000', // Rojo
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    flexDirection: 'row',
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#BDBDBD',
    shadowOpacity: 0.1,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 17,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  attemptsCounter: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginTop: 10,
    marginBottom: 10,
  },
  // Estilos del botón de escuchar (estilo original)
  listenButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 25,
    marginBottom: 15,
  },
  listenButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: 'bold',
  },
});