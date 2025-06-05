//src/components/ExerciseMultipleChoice.tsx

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SpeechService } from '../services/speechService';
import { Alert } from 'react-native';
import { ApiService } from '../services/api';
import { ConsecutiveFailuresIndicator } from './ConsecutiveFailuresIndicator';
import { Audio } from 'expo-av';

const { width } = Dimensions.get('window');

interface Option {
  text: string;
  isCorrect: boolean;
}

interface MultipleChoiceProps {
  question: string;
  options: Option[];
  onComplete: (isCorrect: boolean, userAnswer?: string) => void;
  difficulty: number;
  currentAttempt?: number;
  maxAttempts?: number;
}

export const ExerciseMultipleChoice: React.FC<MultipleChoiceProps> = ({ 
  question, 
  options, 
  onComplete,
  difficulty = 1,
  currentAttempt = 0,
  maxAttempts = 3
}: MultipleChoiceProps) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [animationValue] = useState(new Animated.Value(0));
  const [isProcessing, setIsProcessing] = useState(false);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [mode, setMode] = useState<'detection' | 'practice'>('practice');

  // Nuevos estados para la información de vocabulario
  const [isNewWord, setIsNewWord] = useState(false);
  const [daysProtection, setDaysProtection] = useState(0);
  const [exercisesNeeded, setExercisesNeeded] = useState(0);
  const [masteryLevel, setMasteryLevel] = useState(0);
  // Estado para control de sonido
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Animaciones para las opciones
  const optionAnimations = useRef(options.map(() => new Animated.Value(0))).current;
  const buttonAnimation = useRef(new Animated.Value(0)).current;

  // Al montar, intentar obtener información de fallos consecutivos
  // Al inicio del componente, añadir esta referencia para controlar solicitudes
  const requestSentRef = useRef(false);

  // Al montar, intentar obtener información de fallos consecutivos
  useEffect(() => {
    // Crear una bandera para el componente montado
    let isMounted = true;
    
    const getVocabularyInfo = async () => {
      // Evitar múltiples solicitudes del mismo componente
      if (requestSentRef.current) {
        return;
      }
      
      requestSentRef.current = true;
      
      try {
        // Capturar la opción correcta solo una vez al inicio
        const correctOption = options.find(opt => opt.isCorrect);
        
        if (correctOption) {
          console.log(`Obteniendo información para: ${correctOption.text}`);
          
          const vocab = await ApiService.getUserVocabulary({ sort_by: 'recent' });
          
          // Verificar si el componente sigue montado antes de actualizar estados
          if (!isMounted) {
            return;
          }
          
          const word = vocab.find((item: any) => 
            item.quechua_word.toLowerCase() === correctOption.text.toLowerCase()
          );
          
          if (word) {
            // Actualizar todos los estados de una vez para minimizar renderizados
            const updates = {
              failures: word.consecutive_failures || 0,
              level: word.mastery_level || 0,
              isNew: false,
              protection: 0,
              exercises: 0
            };
            
            // Determinar si es palabra nueva
            if (word.first_detected) {
              const daysSinceAdded = Math.floor(
                (new Date().getTime() - new Date(word.first_detected).getTime()) / 
                (1000 * 60 * 60 * 24)
              );
              const protectionDays = mode === 'detection' ? 3 : 1;
              
              if (daysSinceAdded <= protectionDays) {
                updates.isNew = true;
                updates.protection = protectionDays - daysSinceAdded;
              }
            }
            
            // Determinar ejercicios necesarios
            if (word.exercises_completed < 5) {
              updates.exercises = 5 - word.exercises_completed;
            }
            
            // Aplicar todas las actualizaciones juntas
            setConsecutiveFailures(updates.failures);
            setMasteryLevel(updates.level);
            setIsNewWord(updates.isNew);
            setDaysProtection(updates.protection);
            setExercisesNeeded(updates.exercises);
          }
        }
      } catch (error) {
        console.log('Error al obtener información de vocabulario:', error);
      }
    };
    
    // Determinar el modo una sola vez al montar
    const detectMode = () => {
      setMode('practice'); // Valor por defecto
    };
    
    // Ejecutar una sola vez al montar
    getVocabularyInfo();
    detectMode();
    
    // Animación inicial de las opciones
    animateOptionsIn();
    
    // Limpiar al desmontar
    return () => {
      isMounted = false;
      requestSentRef.current = false;
    };
  }, []); // Sin dependencia de options - CLAVE para evitar bucles 

  // Animar las opciones al entrar
  const animateOptionsIn = () => {
    optionAnimations.forEach((anim, index) => {
      Animated.sequence([
        Animated.delay(index * 100),
        Animated.spring(anim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true
        })
      ]).start();
    });
    
    Animated.timing(buttonAnimation, {
      toValue: 1,
      duration: 500,
      delay: options.length * 100 + 200,
      useNativeDriver: true
    }).start();
  };

  // Animation for feedback
  useEffect(() => {
    if (showFeedback) {
      Animated.timing(animationValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }).start();
    } else {
      animationValue.setValue(0);
    }
  }, [showFeedback, animationValue]);

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

  const handleOptionPress = async (index: number) => {
    if (showFeedback || isProcessing) return;
    
    // Reproducir sonido de selección
    if (soundEnabled) {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/sounds/option-select.mp3')
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
    
    // Animación de selección
    Animated.spring(optionAnimations[index], {
      toValue: 1.05,
      friction: 3,
      tension: 40,
      useNativeDriver: true
    }).start(() => {
      Animated.spring(optionAnimations[index], {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true
      }).start();
    });
    
    setSelectedOption(index);
  };

  const handleSubmit = async () => {
    if (isProcessing) return;
    
    if (selectedOption === null) {
      Alert.alert("Selecciona una opción", "Debes seleccionar una respuesta antes de continuar.");
      return;
    }
    
    setIsProcessing(true);
    const isCorrect = options[selectedOption].isCorrect;
    setShowFeedback(true);
    
    // Reproducir sonido según el resultado
    if (soundEnabled) {
      try {
        const soundFile = isCorrect 
          ? require('../assets/sounds/correct.mp3')
          : require('../assets/sounds/incorrect.mp3');
        
        const { sound } = await Audio.Sound.createAsync(soundFile);
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
    
    // Añadir variable local para prevenir llamadas múltiples
    let hasCompleted = false;
    
    // Dar tiempo para ver el feedback antes de llamar a onComplete
    // Dar tiempo para ver el feedback antes de llamar a onComplete
    setTimeout(() => {
      setIsProcessing(false);
      
      // Evitar llamar a onComplete múltiples veces
      if (!hasCompleted) {
        hasCompleted = true;
        
        // 🆕 CAPTURAR LA RESPUESTA SELECCIONADA POR EL USUARIO
        const selectedOptionText = selectedOption !== null ? options[selectedOption].text : "";
        
        // Importante: primero informar al padre sobre el resultado
        onComplete(isCorrect, selectedOptionText);
        
        // Solo para respuestas incorrectas: resetear automáticamente después de un tiempo adicional
        if (!isCorrect) {
          setTimeout(() => {
            console.log("Reseteando componente para nuevo intento");
            setShowFeedback(false);
            setSelectedOption(null);
          }, 500); // Tiempo breve adicional
        }
      }
    }, 1500);
  };

  const speakCorrectWord = async () => {
    // Reproducir sonido de botón primero
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
    
    // Animación del botón de escucha
    Animated.sequence([
      Animated.timing(buttonAnimation, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.spring(buttonAnimation, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true
      })
    ]).start();
    
    // Luego llamar al servicio de pronunciación
    const correctOption = options.find(option => option.isCorrect);
    if (correctOption) {
      SpeechService.speakWord(correctOption.text);
    }
  };

  const getOptionStyle = (index: number) => {
    if (!showFeedback) {
      return index === selectedOption ? styles.optionSelected : styles.option;
    }
    
    if (options[index].isCorrect) {
      return styles.optionCorrect;
    }
    
    return index === selectedOption && !options[index].isCorrect 
      ? styles.optionIncorrect 
      : styles.option;
  };

  const getOptionTextStyle = (index: number) => {
    if (!showFeedback) {
      return index === selectedOption ? styles.optionTextSelected : styles.optionText;
    }
    
    if (options[index].isCorrect) {
      return styles.optionTextCorrect;
    }
    
    return index === selectedOption && !options[index].isCorrect 
      ? styles.optionTextIncorrect 
      : styles.optionText;
  };

  const feedbackScale = animationValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1.2, 1]
  });

  const isAnswerCorrect = selectedOption !== null && options[selectedOption].isCorrect;

  // Determinar límite de fallos según el modo
  const failuresLimit = mode === 'detection' ? 3 : 2;

  return (
    <View style={styles.container}>
      {/* Título con efecto de tarjeta */}
      <View style={styles.titleCard}>
        <Text style={styles.questionText}>{question}</Text>
      </View>
      
      {/* Botón de escucha mejorado */}
      <Animated.View style={{ 
        transform: [{ scale: buttonAnimation }],
        width: '100%',
      }}>
        <TouchableOpacity
          style={styles.listenButton}
          onPress={speakCorrectWord}
          activeOpacity={0.7}
        >
          <View style={styles.listenButtonContent}>
            <Ionicons name="volume-high" size={24} color="white" />
            <Text style={styles.listenButtonText}>Escuchar pronunciación</Text>
          </View>
          <View style={styles.listenButtonWave} />
        </TouchableOpacity>
      </Animated.View>
      
      {/* Indicador de fallos consecutivos */}
      {consecutiveFailures > 0 && (
        <ConsecutiveFailuresIndicator
          failures={consecutiveFailures}
          limit={failuresLimit}
          mode={mode}
          isNewWord={isNewWord}
          daysProtected={daysProtection}
          exercisesNeeded={exercisesNeeded}
          hasStars={masteryLevel > 0}
        />
      )}
      
      {/* Contenedor de opciones con animación */}
      <View style={styles.optionsContainer}>
        {options.map((option, index) => (
          <Animated.View 
            key={index}
            style={{
              transform: [
                { scale: optionAnimations[index] },
                { translateX: optionAnimations[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [-50, 0]
                })},
              ],
              opacity: optionAnimations[index],
              width: '100%',
            }}
          >
            <TouchableOpacity
              style={[
                getOptionStyle(index),
                showFeedback && options[index].isCorrect && styles.optionCorrectHighlight
              ]}
              onPress={() => !showFeedback && handleOptionPress(index)}
              disabled={showFeedback || isProcessing}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={
                  showFeedback 
                    ? (options[index].isCorrect ? "checkmark-circle" : "close-circle")
                    : (selectedOption === index ? "radio-button-on" : "radio-button-off")
                } 
                size={26} 
                color={
                  showFeedback
                    ? (options[index].isCorrect ? "#4CAF50" : "#F44336")
                    : (selectedOption === index ? "#2196F3" : "#757575")
                }
                style={styles.optionIcon}
              />
              <Text style={getOptionTextStyle(index)}>{option.text}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      {/* Botón de verificación y contador de intentos */}
      {!showFeedback && (
        <>
          <Animated.View style={{
            transform: [{ scale: buttonAnimation }],
            width: '100%',
          }}>
            <TouchableOpacity 
              style={[
                styles.submitButton, 
                (selectedOption === null || isProcessing) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={selectedOption === null || isProcessing}
              activeOpacity={0.7}
            >
              <Text style={styles.submitButtonText}>Verificar respuesta</Text>
              <Ionicons 
                name="chevron-forward-circle" 
                size={22} 
                color="white" 
                style={styles.submitButtonIcon} 
              />
            </TouchableOpacity>
          </Animated.View>
          
          {/* Contador de intentos mejorado */}
          {currentAttempt > 0 && (
            <View style={styles.attemptCounterContainer}>
              <Text style={styles.attemptCounterText}>
                Intento {currentAttempt}/{maxAttempts}
              </Text>
              <View style={styles.attemptDots}>
                {Array.from({ length: maxAttempts }).map((_, i) => (
                  <View 
                    key={i} 
                    style={[
                      styles.attemptDot,
                      i < currentAttempt && styles.attemptDotFilled,
                      i === currentAttempt-1 && styles.attemptDotCurrent
                    ]} 
                  />
                ))}
              </View>
            </View>
          )}
        </>
      )}

      {/* Feedback mejorado */}
      {showFeedback && (
        <Animated.View 
          style={[
            styles.feedbackContainer, 
            isAnswerCorrect ? styles.feedbackContainerCorrect : styles.feedbackContainerIncorrect,
            { transform: [{ scale: feedbackScale }] }
          ]}
        >
          <Ionicons 
            name={isAnswerCorrect ? "trophy" : "information-circle"} 
            size={30} 
            color={isAnswerCorrect ? "#4CAF50" : "#FF9800"} 
            style={styles.feedbackIcon}
          />
          <Text style={[
            styles.feedbackText,
            isAnswerCorrect ? styles.feedbackTextCorrect : styles.feedbackTextIncorrect
          ]}>
            {isAnswerCorrect
              ? '¡Correcto! Has elegido la respuesta correcta.'
              : 'Incorrecto. La respuesta correcta está destacada en verde.'}
          </Text>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginVertical: 8,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    alignItems: 'center',
  },
  titleCard: {
    backgroundColor: '#F7F9FC',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#3F51B5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    lineHeight: 24,
  },
  listenButton: {
    backgroundColor: '#2196F3',
    borderRadius: 30,
    marginBottom: 24,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  listenButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    zIndex: 2,
  },
  listenButtonWave: {
    position: 'absolute',
    height: 6,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  listenButtonText: {
    color: 'white',
    marginLeft: 10,
    fontWeight: '600',
    fontSize: 16,
  },
  optionsContainer: {
    marginBottom: 20,
    width: '100%',
  },
  option: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  optionSelected: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2196F3',
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  optionCorrect: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  optionCorrectHighlight: {
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  optionIncorrect: {
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F44336',
    shadowColor: '#C62828',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  optionText: {
    fontSize: 17,
    flex: 1,
    color: '#424242',
  },
  optionTextSelected: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1565C0',
    flex: 1,
  },
  optionTextCorrect: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2E7D32',
    flex: 1,
  },
  optionTextIncorrect: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#C62828',
    flex: 1,
  },
  optionIcon: {
    marginRight: 14,
  },
  submitButton: {
    backgroundColor: '#FF0000',
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#BDBDBD',
    shadowOpacity: 0.1,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
  },
  submitButtonIcon: {
    marginLeft: 10,
  },
  attemptCounterContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  attemptCounterText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
    marginBottom: 8,
  },
  attemptDots: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  attemptDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#9E9E9E',
  },
  attemptDotFilled: {
    backgroundColor: '#FF9800',
    borderColor: '#F57C00',
  },
  attemptDotCurrent: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FF5722',
    borderColor: '#E64A19',
    marginTop: -2,
  },
  feedbackContainer: {
    alignItems: 'center',
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    width: '100%',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  feedbackContainerCorrect: {
    backgroundColor: '#E8F5E9',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  feedbackContainerIncorrect: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  feedbackIcon: {
    marginRight: 16,
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    lineHeight: 22,
  },
  feedbackTextCorrect: {
    color: '#2E7D32',
  },
  feedbackTextIncorrect: {
    color: '#E65100',
  },
});