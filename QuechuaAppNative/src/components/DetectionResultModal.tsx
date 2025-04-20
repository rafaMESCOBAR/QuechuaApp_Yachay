// src/components/DetectionResultModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { MatchingExercise } from './MatchingExercise';

import { 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  ScrollView,
  ActivityIndicator,
  TextInput,
  Platform,
  Dimensions,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DetectionResponse } from '../types/api';
import { ApiService } from '../services/api';
import { ExerciseMultipleChoice } from './ExerciseMultipleChoice';
import { AnagramExercise } from './AnagramExercise';
import { PronunciationExercise } from './PronunciationExercise';
import { SpeechService } from '../services/speechService';

// Obtener dimensiones de la pantalla
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Interfaz para pares de palabras en ejercicios de matching
interface MatchingPair {
  spanish: string;
  quechua: string;
}

// Definición de la interfaz para Ejercicios
interface Exercise {
  id: number;
  type: string;
  question: string;
  answer: string;
  distractors?: {
    pairs?: MatchingPair[];
    hint?: string;
    phonetic_guide?: string;
  };
  difficulty: number;
  points: number;
  metadata?: {
    time_limit?: number;
    time_bonus?: number;
    penalty?: number;
    streak_bonus?: number;
    hint_penalty?: number;
    combo_bonus?: number;
    all_correct_bonus?: number;
    feedback_correct?: string[];
    feedback_incorrect?: string[];
    accuracy_bonus?: number;
    feedback_levels?: string[];
    culture_note?: string;
    game_mode?: string;
    spanish_translation?: string;
  };
  object_translation: {
    id: number;
    spanish: string;
    quechua: string;
  };
}

type Props = {
  isVisible: boolean;
  onClose: () => void;
  results: DetectionResponse | null;
  imagePath?: string;
};

export const DetectionResultModal = ({ isVisible, onClose, results, imagePath }: Props) => {
  const [showExercises, setShowExercises] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [showPointsSummary, setShowPointsSummary] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  
  // Variables de estado para gamificación
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [streakCount, setStreakCount] = useState(0);
  const [comboCount, setComboCount] = useState(0);
  const [usedHint, setUsedHint] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [timerActive, setTimerActive] = useState(false);

  // Referencias y estado para scroll
  const scrollViewRef = useRef<ScrollView>(null);
  const [contentHeight, setContentHeight] = useState(0);

  // Efecto para gestionar el temporizador cuando cambia el ejercicio
  useEffect(() => {
    // Solo activa el temporizador si hay un ejercicio con límite de tiempo
    if (
      showExercises && 
      !showPointsSummary && 
      exercises.length > 0 && 
      currentExerciseIndex < exercises.length &&
      exercises[currentExerciseIndex].metadata?.time_limit
    ) {
      // Inicializar el temporizador
      const currentExercise = exercises[currentExerciseIndex];
      setTimeLeft(currentExercise.metadata?.time_limit || 30);
      setTimerActive(true);
      setFeedback(""); // Reiniciar feedback
    } else {
      setTimerActive(false);
    }
  }, [showExercises, currentExerciseIndex, exercises, showPointsSummary]);

  // Efecto para la cuenta regresiva
  useEffect(() => {
    if (!timerActive || timeLeft === null) return;

    const timer = setTimeout(() => {
      if (timeLeft > 0) {
        setTimeLeft(timeLeft - 1);
      } else {
        // Tiempo agotado
        handleTimeUp();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, timerActive]);

  // Manejar cierre del modal asegurando reinicio completo
  const handleClose = () => {
    setShowExercises(false);
    setCurrentExerciseIndex(0);
    setExercises([]);
    setIsLoading(false);
    setShowPointsSummary(false);
    setUserAnswer('');
    setStreakCount(0);
    setComboCount(0);
    setUsedHint(false);
    setShowHint(false);
    setTimerActive(false);
    setTimeLeft(null);
    setFeedback("");
    onClose();
  };

  // Función para manejar tiempo agotado
  const handleTimeUp = () => {
    setTimerActive(false);
    
    // Mostrar retroalimentación de tiempo agotado
    setFeedback("¡Se acabó el tiempo! Intenta responder más rápido la próxima vez.");
    
    // Pasar al siguiente ejercicio sin puntos
    setTimeout(() => {
      setStreakCount(0); // Reiniciar racha
      setComboCount(0); // Reiniciar combo
      
      // Si es el último ejercicio, mostrar resumen
      if (currentExerciseIndex >= exercises.length - 1) {
        setShowPointsSummary(true);
      } else {
        // Pasar al siguiente ejercicio
        setCurrentExerciseIndex(prev => prev + 1);
        setUserAnswer("");
        setUsedHint(false);
        setShowHint(false);
      }
    }, 2000);
  };

  // Función para mostrar pista con penalización
  const handleShowHint = () => {
    setShowHint(true);
    setUsedHint(true);
    // Penalización por usar pista (si está definida)
    const hintPenalty = exercises[currentExerciseIndex]?.metadata?.hint_penalty || 0;
    if (hintPenalty < 0) {
      setTotalPoints(prev => Math.max(0, prev + hintPenalty));
    }
  };

  // Función para obtener opciones de selección múltiple
  const getMultipleChoiceOptions = (exercise: Exercise) => {
    // Opciones a devolver
    let options: {text: string, isCorrect: boolean}[] = [];
    
    // Si distractors es un array, usarlo directamente
    if (Array.isArray(exercise.distractors)) {
      options = [
        { text: exercise.answer, isCorrect: true },
        ...exercise.distractors.map(d => ({ text: d, isCorrect: false }))
      ];
    } 
    // Si distractors no es un array pero contiene pares
    else if (Array.isArray(exercise.distractors?.pairs)) {
      const otherOptions = exercise.distractors.pairs
        .filter(pair => pair.quechua !== exercise.answer)
        .map(pair => ({ text: pair.quechua, isCorrect: false }));
      options = [
        { text: exercise.answer, isCorrect: true },
        ...otherOptions.slice(0, 3) // Limitar a 3 distractores
      ];
    } else {
      // Opción por defecto
      options = [
        { text: exercise.answer, isCorrect: true },
        { text: "opción1", isCorrect: false },
        { text: "opción2", isCorrect: false },
        { text: "opción3", isCorrect: false }
      ];
    }
    
    // Barajar opciones
    return [...options].sort(() => Math.random() - 0.5);
  };

  const handleLearnMore = async () => {
    if (!results || !results.objects || results.objects.length === 0) return;
    
    setIsLoading(true);
    try {
      // Obtener el primer objeto detectado
      const firstObject = results.objects[0];
      
      try {
        // Usar el label para buscar ejercicios
        const exercisesData = await ApiService.getExercisesByLabel(firstObject.label);
        if (exercisesData && exercisesData.length > 0) {
          setExercises(exercisesData);
        } else {
          throw new Error("No se generaron ejercicios desde el backend");
        }
      } catch (error) {
        console.log("Error al obtener ejercicios del backend:", error);
        
        // Crear ejercicios localmente como fallback mejorado
        const mockExercises = [
          // Ejercicio de selección múltiple
          {
            id: Math.floor(Math.random() * 1000), // ID aleatorio
            type: 'multiple_choice',
            question: `¿Cómo se dice "${firstObject.spanish}" en quechua?`,
            answer: firstObject.quechua,
            distractors: {
              hint: `Selecciona la traducción correcta`,
              pairs: undefined
            },
            difficulty: 1,
            points: 10, 
            metadata: {
              time_limit: 30,
              time_bonus: 5,
              penalty: -3,
              feedback_correct: [
                "¡Increíble! Dominas el quechua como un verdadero inca.",
                "¡Excelente! Los antiguos incas estarían orgullosos.",
                "¡Sumaq! (¡Excelente en quechua!) Has acertado."
              ],
              feedback_incorrect: [
                `No es correcto. La palabra correcta es '${firstObject.quechua}'.`,
                "Casi lo tienes. Sigue practicando el quechua.",
                "Recuerda que el idioma quechua requiere práctica. ¡Inténtalo de nuevo!"
              ]
            },
            object_translation: {
              id: 1,
              spanish: firstObject.spanish,
              quechua: firstObject.quechua
            }
          },
          
          // Ejercicio de completar espacios
          {
            id: Math.floor(Math.random() * 1000) + 1, // ID aleatorio diferente
            type: 'fill_blanks',
            question: `Completa la palabra en quechua: ${firstObject.quechua.substring(0, 1)}${'_'.repeat(firstObject.quechua.length - 1)}`,
            answer: firstObject.quechua,
            distractors: { 
              hint: `Es como se dice "${firstObject.spanish}" en quechua`,
              pairs: undefined 
            },
            difficulty: 1,
            points: 15,
            metadata: {
              time_limit: 45,
              time_bonus: 8,
              streak_bonus: 5,
              hint_penalty: -3,
              feedback_correct: [
                "¡Perfecto! Escribes quechua como un experto.",
                "¡Qué habilidad! Estás dominando la escritura quechua.",
                "¡Asombroso! Has completado la palabra correctamente."
              ],
              feedback_incorrect: [
                `Casi lo tienes. La palabra correcta es '${firstObject.quechua}'.`,
                "Es un poco diferente. Presta atención a cada letra en quechua.",
                "Sigue practicando. El quechua tiene un patrón único de escritura."
              ]
            },
            object_translation: {
              id: 1,
              spanish: firstObject.spanish,
              quechua: firstObject.quechua
            }
          },
  
          // Ejercicio de pronunciación
          {
            id: Math.floor(Math.random() * 1000) + 2,
            type: 'pronunciation',
            // Aquí está el cambio clave: hacer la question más concisa
            question: `Practica la pronunciación de la palabra '${firstObject.quechua}'.
          Para pronunciar la palabra '${firstObject.quechua}' en Quechua, primero...`,
            answer: firstObject.quechua,
            distractors: {
              phonetic_guide: `Pronuncia cada sílaba claramente y con confianza`
            },
            difficulty: 1,
            points: 25,
            metadata: {
              culture_note: `Esta palabra es importante en la cultura quechua...`
            },
            object_translation: {
              id: 1,
              spanish: firstObject.spanish,
              quechua: firstObject.quechua
            }
          },
  
          // Ejercicio de anagrama
          {
            id: Math.floor(Math.random() * 1000) + 4,
            type: 'anagram',
            question: `Ordena las letras para formar la palabra en quechua que significa "${firstObject.spanish}"`,
            answer: firstObject.quechua,
            difficulty: 1,
            points: 20,
            metadata: {
              time_limit: 60,
              spanish_translation: firstObject.spanish
            },
            object_translation: {
              id: 1,
              spanish: firstObject.spanish,
              quechua: firstObject.quechua
            }
          }
        ];
        
        setExercises(mockExercises);
      }
      
      setShowExercises(true);
      setCurrentExerciseIndex(0);
      setTotalPoints(0);
      setShowPointsSummary(false);
      setStreakCount(0);
      setComboCount(0);
      setFeedback("");
    } catch (error) {
      console.error('Error al obtener ejercicios:', error);
      alert('No se pudieron cargar los ejercicios. Intenta de nuevo más tarde.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función handleExerciseComplete
const handleExerciseComplete = (isCorrect: boolean, points: number) => {
  setTimerActive(false); // Detener temporizador
  const currentExercise = exercises[currentExerciseIndex];
  const metadata = currentExercise.metadata || {};
  
  let earnedPoints = 0;
  
  if (isCorrect) {
    // Puntos base
    earnedPoints = points;
    
    // Bonus por tiempo (si queda tiempo y hay bonus definido)
    if (timeLeft !== null && timeLeft > 0 && metadata.time_bonus) {
      const timeBonus = metadata.time_bonus;
      earnedPoints += timeBonus;
    }
    
    // Bonus por racha (si hay bonus definido)
    setStreakCount(prev => prev + 1);
    if (streakCount >= 2 && metadata.streak_bonus) {
      earnedPoints += metadata.streak_bonus;
    }
    
    // Bonus por combo (para ejercicios matching)
    setComboCount(prev => prev + 1);
    if (comboCount > 0 && metadata.combo_bonus) {
      earnedPoints += metadata.combo_bonus * comboCount;
    }
    
    // Penalización por usar pista
    if (usedHint && metadata.hint_penalty) {
      earnedPoints = Math.max(0, earnedPoints + metadata.hint_penalty);
    }
    
    // Seleccionar feedback aleatorio
    if (metadata.feedback_correct && metadata.feedback_correct.length > 0) {
      const randomIndex = Math.floor(Math.random() * metadata.feedback_correct.length);
      setFeedback(metadata.feedback_correct[randomIndex]);
    } else {
      setFeedback(`¡Correcto! +${earnedPoints} puntos`);
    }
  } else {
    // Penalización por respuesta incorrecta
    const penalty = metadata.penalty || 0;
    if (penalty < 0) {
      earnedPoints = penalty;
    }
    
    // Reiniciar racha y combo
    setStreakCount(0);
    setComboCount(0);
    
    // Seleccionar feedback aleatorio
    if (metadata.feedback_incorrect && metadata.feedback_incorrect.length > 0) {
      const randomIndex = Math.floor(Math.random() * metadata.feedback_incorrect.length);
      setFeedback(metadata.feedback_incorrect[randomIndex]);
    } else {
      setFeedback(`Incorrecto. La respuesta es: ${currentExercise.answer}`);
    }
  }
  
  // Actualizar puntos totales
  setTotalPoints(prev => Math.max(0, prev + earnedPoints));
  
  // Mostrar breve retroalimentación antes de continuar
  setTimeout(() => {
    // Resetear la respuesta del usuario para el siguiente ejercicio
    setUserAnswer('');
    setUsedHint(false);
    setShowHint(false);
    setFeedback("");
    
    // CORRECCIÓN: Comprobar explícitamente con el índice actual
    // y el tamaño del array en el momento de la decisión
    const isLastExercise = currentExerciseIndex >= exercises.length - 1;
    
    if (isLastExercise) {
      // Es el último ejercicio, mostrar resumen
      setShowPointsSummary(true);
    } else {
      // Avanzar al siguiente ejercicio de forma segura
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    }
  }, 2000);
};
   
  const handleFinishExercises = () => {
    setShowExercises(false);
    setShowPointsSummary(false);
    setCurrentExerciseIndex(0);
    setExercises([]);
    setStreakCount(0);
    setComboCount(0);
    setFeedback("");
  };

  // Función renderExercise
const renderExercise = () => {
  // Verificación más estricta del índice
  if (exercises.length === 0 || currentExerciseIndex < 0 || currentExerciseIndex >= exercises.length) {
    console.error(`Índice inválido: ${currentExerciseIndex}, Total: ${exercises.length}`);
    return (
      <View style={styles.noExerciseContainer}>
        <Text style={styles.noExerciseText}>No se pudo cargar el ejercicio</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            if (exercises.length > 0) {
              setCurrentExerciseIndex(0); // Reiniciar al primer ejercicio
            } else {
              handleClose(); // Cerrar modal si no hay ejercicios
            }
          }}
        >
          <Text style={styles.retryButtonText}>
            {exercises.length > 0 ? "Reiniciar" : "Cerrar"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Obtener el ejercicio actual y garantizar que existe
  const exercise = exercises[currentExerciseIndex];
  if (!exercise) {
    console.error("Ejercicio indefinido en índice:", currentExerciseIndex);
    return null;
  }

  // Obtener metadata de forma segura
  const metadata = exercise.metadata || {};
  
  // Añadir un log detallado para depuración
  console.log(`Renderizando ejercicio tipo: ${exercise.type}, índice: ${currentExerciseIndex}, props:`, {
    question: !!exercise.question,
    answer: !!exercise.answer,
    distractors: !!exercise.distractors,
    object_translation: !!exercise.object_translation,
    feedback: feedback
  });
  
  return (
    <View style={styles.exerciseContainer}>
      {/* Timer y Contador de puntos */}
      {timeLeft !== null && (
        <View style={styles.gameHeader}>
          <View style={styles.timerContainer}>
            <Ionicons name="timer-outline" size={18} color="#FF0000" />
            <Text style={[
              styles.timerText,
              timeLeft < 10 && styles.timerWarning
            ]}>
              {timeLeft}s
            </Text>
          </View>
          
          <View style={styles.pointsContainer}>
            <Ionicons name="star" size={18} color="#FFD700" />
            <Text style={styles.pointsText}>{totalPoints}</Text>
          </View>
          
          {streakCount > 1 && (
            <View style={styles.streakContainer}>
              <Ionicons name="flame" size={18} color="#FF4500" />
              <Text style={styles.streakText}>x{streakCount}</Text>
            </View>
          )}
        </View>
      )}
      
      {/* Pregunta del ejercicio - Siempre mostrar */}
      {exercise.question && (
        <Text style={styles.questionText}>{exercise.question}</Text>
      )}
      
      {/* Feedback si está disponible */}
      {feedback !== "" && (
        <View style={[
          styles.feedbackContainer,
          feedback.includes("¡") || feedback.includes("Correcto") 
            ? styles.correctFeedback 
            : styles.incorrectFeedback
        ]}>
          <Text style={styles.feedbackText}>{feedback}</Text>
        </View>
      )}
      
      {/* Renderizar contenido según el tipo de ejercicio SOLO si no hay feedback */}
      {feedback === "" && (
        <>
          {exercise.type === 'multiple_choice' && exercise.answer && (
            <ExerciseMultipleChoice
              question={exercise.question}
              options={getMultipleChoiceOptions(exercise)}
              onComplete={(isCorrect) => handleExerciseComplete(isCorrect, exercise.points || 10)}
              difficulty={exercise.difficulty}
            />
          )}
          
          {exercise.type === 'fill_blanks' && exercise.answer && (
            <View style={styles.fillBlanksContainer}>
              <TouchableOpacity
                style={styles.listenButton}
                onPress={() => SpeechService.speakWord(exercise.answer)}
              >
                <Ionicons name="volume-high" size={24} color="white" />
                <Text style={styles.listenButtonText}>Escuchar pronunciación</Text>
              </TouchableOpacity>
              
              <TextInput
                style={styles.fillBlanksInput}
                placeholder="Escribe tu respuesta"
                onChangeText={setUserAnswer}
                value={userAnswer}
              />
              
              {!showHint && exercise.distractors?.hint && (
                <TouchableOpacity
                  style={styles.hintButton}
                  onPress={handleShowHint}
                >
                  <Text style={styles.hintButtonText}>
                    Ver pista {metadata.hint_penalty ? `(${metadata.hint_penalty} pts)` : ''}
                  </Text>
                </TouchableOpacity>
              )}
              
              {showHint && exercise.distractors?.hint && (
                <Text style={styles.hintText}>Pista: {exercise.distractors.hint}</Text>
              )}
              
              <TouchableOpacity
                style={styles.submitButton}
                onPress={() => handleExerciseComplete(
                  userAnswer.toLowerCase() === exercise.answer.toLowerCase(), 
                  exercise.points || 15
                )}
              >
                <Text style={styles.buttonText}>Verificar</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {exercise.type === 'pronunciation' && exercise.answer && exercise.object_translation && (
            <PronunciationExercise
              question={exercise.question}
              wordToProunounce={exercise.answer}
              spanishTranslation={exercise.object_translation.spanish}
              phoneticGuide={exercise.distractors?.phonetic_guide}
              onComplete={(isCorrect, earnedPoints) => handleExerciseComplete(isCorrect, earnedPoints)}
              difficulty={exercise.difficulty}
            />
          )}
          
          {exercise.type === 'matching' && exercise.distractors?.pairs && 
            Array.isArray(exercise.distractors.pairs) && exercise.distractors.pairs.length > 0 && (
            <MatchingExercise
              question={exercise.question}
              pairs={exercise.distractors.pairs.map((pair, index) => ({
                id: index + 1,
                spanish: pair.spanish || "",
                quechua: pair.quechua || ""
              }))}
              onComplete={(isCorrect) => handleExerciseComplete(isCorrect, exercise.points || 15)}
              difficulty={exercise.difficulty}
            />
          )}

          {exercise.type === 'anagram' && exercise.answer && (
            <AnagramExercise
              question={exercise.question}
              correctWord={exercise.answer}
              spanishTranslation={
                typeof metadata === 'object' && 
                metadata !== null && 
                'spanish_translation' in metadata ? 
                metadata.spanish_translation as string : 
                (exercise.object_translation?.spanish || "")
              }
              onComplete={(isCorrect) => handleExerciseComplete(isCorrect, exercise.points || 20)}
              difficulty={exercise.difficulty}
            />
          )}
          
          {/* Fallback para tipos de ejercicio no implementados o datos incompletos */}
          {(!['multiple_choice', 'fill_blanks', 'pronunciation', 'matching', 'anagram'].includes(exercise.type) ||
            !exercise.answer || !exercise.question) && (
            <View style={styles.fallbackContainer}>
              <Text style={styles.fallbackText}>
                {!exercise.type || !['multiple_choice', 'fill_blanks', 'pronunciation', 'matching', 'anagram'].includes(exercise.type) 
                  ? `Tipo de ejercicio no soportado: ${exercise.type || "desconocido"}`
                  : "Faltan datos necesarios para mostrar este ejercicio"}
              </Text>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={() => {
                  if (currentExerciseIndex >= exercises.length - 1) {
                    setShowPointsSummary(true);
                  } else {
                    setCurrentExerciseIndex(prev => prev + 1);
                  }
                }}
              >
                <Text style={styles.skipButtonText}>Continuar</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
};
  // Función principal de renderizado para el contenido del modal
  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF0000" />
          <Text style={styles.loadingText}>Cargando ejercicios...</Text>
        </View>
      );
    }

    if (showExercises) {
      if (showPointsSummary) {
        return (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>¡Ejercicios completados!</Text>
            
            <View style={styles.scoreContainer}>
              <Ionicons name="trophy" size={60} color="#FFD700" />
              <Text style={styles.summaryPoints}>Has ganado</Text>
              <Text style={styles.totalPointsText}>{totalPoints} puntos</Text>
            </View>
            
            {streakCount > 1 && (
              <View style={styles.achievementContainer}>
                <Text style={styles.achievementTitle}>
                  <Ionicons name="flame" size={20} color="#FF4500" /> 
                  ¡Racha de {streakCount} correctas!
                </Text>
              </View>
            )}
            
            <View style={styles.summaryButtons}>
              <TouchableOpacity 
                style={styles.restartButton}
                onPress={() => {
                  setCurrentExerciseIndex(0);
                  setShowPointsSummary(false);
                  setTotalPoints(0);
                  setStreakCount(0);
                  setComboCount(0);
                  setUserAnswer('');
                  setUsedHint(false);
                  setShowHint(false);
                  setFeedback('');
                }}
              >
                <Ionicons name="refresh" size={20} color="white" />
                <Text style={styles.buttonText}>REINTENTAR</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.finishButton}
                onPress={handleFinishExercises}
              >
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.buttonText}>TERMINAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }
      
      return (
        <View style={styles.exercisesContainer}>
          <Text style={styles.exerciseProgress}>
            Ejercicio {currentExerciseIndex + 1} de {exercises.length}
          </Text>
          {renderExercise()}
        </View>
      );
    }

    return (
      <View style={styles.defaultContent}>
        <Text style={styles.logoText}>YACHAY</Text>
        
        {imagePath && (
          <View style={styles.imageContainer}>
            <Image 
              source={{uri: imagePath}} 
              style={styles.detectedImage}
            />
          </View>
        )}

        <ScrollView style={styles.translationsContainer}>
          {results?.objects.map((object, index) => (
            <View key={index} style={styles.translationRow}>
              <View style={styles.translationTextContainer}>
                <Text style={styles.spanishText}>{object.spanish}</Text>
                <Text style={styles.quechuaText}>{object.quechua}</Text>
              </View>
              <View style={styles.translationButtonsContainer}>
                <TouchableOpacity 
                  style={styles.audioButton}
                  onPress={() => SpeechService.speakWord(object.spanish)}
                >
                  <Ionicons name="volume-medium" size={18} color="#2196F3" />
                  <Text style={styles.audioButtonLabel}>ES</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.audioButton}
                  onPress={() => SpeechService.speakWord(object.quechua)}
                >
                  <Ionicons name="volume-high" size={18} color="#FF5722" />
                  <Text style={styles.audioButtonLabel}>QU</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity 
          style={styles.learnButton}
          onPress={handleLearnMore}
        >
          <Text style={styles.buttonText}>APRENDER MÁS</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Componente principal
  return (
    <Modal
      animationType="fade"
      transparent={false}
      visible={isVisible}
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <View style={styles.fullScreenContainer}>
        <View style={styles.modalContent}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={{
              flexGrow: 1,
              paddingBottom: 40
            }}
            onContentSizeChange={(_, height) => setContentHeight(height)}
            showsVerticalScrollIndicator={true}
          >
            {renderContent()}
          </ScrollView>
          
          {!showExercises && (
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={handleClose}
            >
              <Ionicons name="close" size={32} color="black" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

// Estilos para el componente
const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalContent: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
  },
  defaultContent: {
    alignItems: 'center',
    width: '100%',
    paddingTop: 40,
    paddingBottom: 20,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF0000',
    marginBottom: 20,
  },
  imageContainer: {
    width: '90%',
    aspectRatio: 1,
    marginBottom: 20,
  },
  detectedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 10,
  },
  translationsContainer: {
    width: '90%',
    marginBottom: 30,
    maxHeight: 200,
  },
  translationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  spanishText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  quechuaText: {
    fontSize: 18,
    color: '#666',
  },
  learnButton: {
    backgroundColor: '#FF0000',
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 25,
    marginBottom: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
    padding: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    flex: 1,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  exercisesContainer: {
    width: '100%',
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 40,
  },
  exerciseProgress: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 16,
    color: '#666',
  },
  exerciseContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  timerText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5,
    color: '#FF0000',
  },
  timerWarning: {
    color: '#FF0000',
    fontWeight: 'bold',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9C4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  pointsText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5,
    color: '#FF8F00',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  streakText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5,
    color: '#FF4500',
  },
  questionText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  feedbackContainer: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 16,
    alignItems: 'center',
  },
  correctFeedback: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  incorrectFeedback: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
    borderWidth: 1,
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  summaryContainer: {
    alignItems: 'center',
    padding: 30,
    flex: 1,
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  scoreContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  summaryPoints: {
    fontSize: 18,
    marginBottom: 5,
    color: '#4CAF50',
  },
  totalPointsText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FF0000',
    marginTop: 5,
  },
  achievementContainer: {
    backgroundColor: '#FFF3E0',
    padding: 15,
    borderRadius: 12,
    marginVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  achievementTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E65100',
  },
  summaryButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    width: '100%',
  },
  restartButton: {
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    flex: 1,
    marginRight: 10,
    gap: 8,
  },
  finishButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 25,
    flex: 1,
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  // Estilos para cada tipo de ejercicio
  fillBlanksContainer: {
    marginTop: 10,
    alignItems: 'stretch',
    paddingBottom: 20,
  },
  fillBlanksInput: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 10,
    marginVertical: 15,
    fontSize: 16,
  },
  hintButton: {
    backgroundColor: '#E1F5FE',
    padding: 10,
    borderRadius: 20,
    alignItems: 'center',
    marginVertical: 10,
  },
  hintButtonText: {
    color: '#0288D1',
    fontWeight: 'bold',
  },
  hintText: {
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  matchingContainer: {
    marginTop: 10,
    paddingBottom: 30,
  },
  matchingText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 10,
    color: '#666',
  },
  matchingPairsContainer: {
    marginVertical: 15,
    alignItems: 'center',
  },
  matchingPairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    width: '100%',
    justifyContent: 'space-between',
  },
  matchingPairText: {
    fontSize: 16,
    maxWidth: '85%',
  },
  matchingInstructions: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 10,
    color: '#757575',
  },
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
  smallListenButton: {
    padding: 6,
    marginLeft: 10,
  },
  submitButton: {
    backgroundColor: '#FF0000',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 15,
  },
  translationTextContainer: {
    flex: 1,
  },
  translationButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  audioButton: {
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  audioButtonLabel: {
    fontSize: 10,
    marginLeft: 2,
    fontWeight: 'bold',
  },
  // Añadir a los estilos existentes
noExerciseContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  padding: 20,
  backgroundColor: '#f9f9f9',
  borderRadius: 12,
  margin: 16,
},
noExerciseText: {
  fontSize: 16,
  color: '#666',
  textAlign: 'center',
  marginBottom: 20,
},
retryButton: {
  backgroundColor: '#4CAF50',
  paddingVertical: 10,
  paddingHorizontal: 20,
  borderRadius: 20,
},
retryButtonText: {
  color: 'white',
  fontWeight: 'bold',
},
fallbackContainer: {
  padding: 20,
  alignItems: 'center',
  backgroundColor: '#f5f5f5',
  borderRadius: 8,
  margin: 10,
},
fallbackText: {
  fontSize: 16,
  color: '#666',
  textAlign: 'center',
  marginBottom: 20,
},
skipButton: {
  backgroundColor: '#FF9800',
  paddingVertical: 10,
  paddingHorizontal: 20,
  borderRadius: 20,
},
skipButtonText: {
  color: 'white',
  fontWeight: 'bold',
},
});