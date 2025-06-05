// src/components/DetectionResultModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { MatchingExercise } from './MatchingExercise';
import { BackHandler } from 'react-native';
import { useExerciseReview, ExerciseReviewUI } from './ExerciseReviewSystem';
import { useNavigation } from '@react-navigation/native';
// Extender la interfaz Window para incluir resetConsecutiveFailures
declare global {
  interface Window {
    resetConsecutiveFailures?: () => void;
  }
}

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
StatusBar,
Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { progressEvents } from '../events/progressEvents';
import { DetectionResponse } from '../types/api';
import { ApiService } from '../services/api';
import { ExerciseMultipleChoice } from './ExerciseMultipleChoice';
import { AnagramExercise } from './AnagramExercise';
import { PronunciationExercise } from './PronunciationExercise';
import { SpeechService } from '../services/speechService';
import { AbandonSessionAlert } from './AbandonSessionAlert';
import { MasteryLevelChangeAlert } from './MasteryLevelChangeAlert';  // ✅ AGREGAR AQUÍ
import { CelebrationScreen } from './CelebrationScreen';
import { FillBlanksExercise } from './FillBlanksExercise';

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
  session_id?: number;
};
object_translation: {
  id: number;
  spanish: string;
  quechua: string;
};
}

interface AffectedWord {
 word: string;
 spanish: string;
 current_level: number;
 would_degrade: boolean;
 potential_new_level: number;
}

interface AbandonmentConsequence {
 mode: 'detection' | 'practice';
 failure_penalty: number;
 total_words_affected: number;
}

type Props = {
isVisible: boolean;
onClose: () => void;
results: DetectionResponse | null;
imagePath?: string;
};

const lastSoundTimes: Record<string, number> = {
  correct: 0,
  incorrect: 0,
  hint: 0
};

// Función para verificar si podemos reproducir un sonido
const canPlaySound = (type: string): boolean => {
  const now = Date.now();
  const lastPlayTime = lastSoundTimes[type] || 0;
  const cooldownPeriod = 2000; // 2 segundos de cooldown
  
  if (now - lastPlayTime >= cooldownPeriod) {
    lastSoundTimes[type] = now;
    return true;
  }
  
  console.log(`Sonido "${type}" en cooldown, evitando duplicación`);
  return false;
};


export const DetectionResultModal = ({ isVisible, onClose, results, imagePath }: Props) => {
const navigation = useNavigation<any>(); // Añadir esta línea aquí
const [showExercises, setShowExercises] = useState(false);
const [exercises, setExercises] = useState<Exercise[]>([]);
const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
const [isLoading, setIsLoading] = useState(false);
const [userAnswer, setUserAnswer] = useState('');
const [attemptsCount, setAttemptsCount] = useState(0);
// Variables de estado para gamificación
const [timeLeft, setTimeLeft] = useState<number | null>(null);
const [feedback, setFeedback] = useState("");
const [showHint, setShowHint] = useState(false);
const [timerActive, setTimerActive] = useState(false);
// Al inicio del componente, añade este nuevo estado:
const [showErrorMessage, setShowErrorMessage] = useState(false);
// Estado para controlar el sonido
const [soundEnabled, setSoundEnabled] = useState(true);

// Estados para manejo de sesiones de abandono
const [sessionId, setSessionId] = useState<number | null>(null);
const [isExiting, setIsExiting] = useState(false);
const [abandonModalVisible, setAbandonModalVisible] = useState(false);
const [affectedWords, setAffectedWords] = useState<AffectedWord[]>([]);
const [abandonmentWarning, setAbandonmentWarning] = useState('');
const [abandonmentConsequence, setAbandonmentConsequence] = useState<AbandonmentConsequence | null>(null);

// Referencias y estado para scroll
const scrollViewRef = useRef<ScrollView>(null);
const [contentHeight, setContentHeight] = useState(0);
const [showCelebration, setShowCelebration] = useState(false);
const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
const [showMasteryChangeAlert, setShowMasteryChangeAlert] = useState(false);
const [masteryChangeData, setMasteryChangeData] = useState<{
  word: string;
  wordTranslation: string;
  previousLevel: number;
  newLevel: number;
  changeType: 'increase' | 'decrease';
  message?: string;
} | null>(null);

// Sistema de revisión de ejercicios
const { 
  isReviewMode,
  attemptsInfo,
  handleExerciseAnswer, 
  continueToNext,
  resetReviewSystem 
} = useExerciseReview(
  'detection', 
  currentExerciseIndex,
  exercises.length,
  (nextIndex) => {
    if (nextIndex === -1) {
      // En lugar de cerrar, mostrar pantalla de celebración
      setShowCelebration(true);
    } else {
      // Avanzar al ejercicio indicado
      setCurrentExerciseIndex(nextIndex);
      // Reiniciar estados para nuevo ejercicio
      setFeedback("");
      setShowHint(false);
      setUserAnswer("");
    }
  },
  (message) => setFeedback(message)
);

// Añadir evento de manejo para botón atrás
useEffect(() => {
  const handleBackPress = () => {
    if (showExercises && !isExiting) {
      console.log("DetectionResultModal: Botón atrás detectado. Estado:", {
        currentExerciseIndex,
        totalExercises: exercises.length,
        feedback
      });
      
      // Prioridad 1: Si hay feedback visible, solo limpiarlo
      if (feedback !== "") {
        setFeedback("");
        return true;
      }
      
      // Prioridad 2: Si hemos completado todos los ejercicios, cerrar directamente 
      if (currentExerciseIndex >= exercises.length - 1) {
        console.log("DetectionResultModal: Todos los ejercicios completados, cerrando directamente");
        handleClose();
        return true;
      }
      
      // Prioridad 3: Si hay sesión activa, mostrar alerta de abandono
      if (sessionId) {
        console.log("DetectionResultModal: Sesión activa, verificando abandono");
        // Mostrar alerta de abandono
        checkAndShowAbandonmentAlert();
        return true; // Evitar que el evento de retroceso se propague
      }
    }
    return false; // Permitir navegación por defecto
  };

  BackHandler.addEventListener('hardwareBackPress', handleBackPress);
  return () => {
    BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
  };
}, [showExercises, sessionId, isExiting, feedback, currentExerciseIndex]);

// Efecto para gestionar el temporizador cuando cambia el ejercicio
useEffect(() => {
  // Solo activa el temporizador si hay un ejercicio con límite de tiempo
  if (
    showExercises && 
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
}, [showExercises, currentExerciseIndex, exercises]);

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

// Reiniciar el sistema de revisión cuando se cierran los ejercicios
useEffect(() => {
  if (!showExercises) {
    resetReviewSystem();
  }
}, [showExercises]);

useEffect(() => {
  setAttemptsCount(0);
}, [currentExerciseIndex]);

// Función para verificar penalizaciones y mostrar alerta de abandono
const checkAndShowAbandonmentAlert = async () => {
  if (!sessionId) return;

  setIsExiting(true); // Evitar múltiples alertas

  try {
    // Intentar obtener información de penalizaciones
    const penaltyInfo = await ApiService.checkAbandonmentPenalty(sessionId, 'detection');
    setAffectedWords(penaltyInfo.affected_words || []);
    setAbandonmentWarning(penaltyInfo.warning_message || "Abandonar esta sesión puede resultar en penalizaciones.");
    setAbandonmentConsequence(penaltyInfo.abandonment_consequence || {
       mode: 'detection',
       failure_penalty: 1,
       total_words_affected: 0
    });
    setAbandonModalVisible(true);
  } catch (error) {
    console.error("Error al verificar penalizaciones:", error);
    // Si falla la verificación, mostrar alerta genérica
    Alert.alert(
      "¿Abandonar ejercicios?",
      "¿Seguro que quieres salir? Tu progreso no se guardará.",
      [
        { 
          text: "Continuar ejercicios", 
          style: "cancel",
          onPress: () => setIsExiting(false)
        },
        {
          text: "Abandonar",
          style: "destructive",
          onPress: () => {
            setIsExiting(false);
            handleClose();
          }
        }
      ]
    );
  }
};

const handleConfirmAbandon = async () => {
  try {
    if (sessionId) {
      await ApiService.abandonSession(sessionId, 'detection');
    }
  } catch (error) {
    console.error("Error al abandonar sesión:", error);
  } finally {
    setAbandonModalVisible(false);
    setIsExiting(false);
    handleClose();
  }
};

const handleCancelAbandon = () => {
  setAbandonModalVisible(false);
  setIsExiting(false);
};

// Manejar cierre del modal asegurando reinicio completo
// Manejar cierre del modal asegurando reinicio completo
const handleClose = () => {
  // Si estamos mostrando la celebración, cerrar directamente
  if (showCelebration) {
    setShowCelebration(false);
    setShowExercises(false);
    setCurrentExerciseIndex(0);
    setExercises([]);
    setIsLoading(false);
    setUserAnswer('');
    setShowHint(false);
    setTimerActive(false);
    setTimeLeft(null);
    setFeedback("");
    setSessionId(null);
    setCorrectAnswersCount(0); // Resetear también el contador de respuestas correctas
    resetReviewSystem();
    onClose();
    return;
  }

  console.log("DetectionResultModal: Verificando condiciones para cierre");
  
  // Limpiar cualquier mensaje de feedback pendiente
  setFeedback("");
  
  // Verificar si todos los ejercicios están completados
  const allExercisesCompleted = 
    !showExercises || // No estamos mostrando ejercicios
    currentExerciseIndex >= exercises.length - 1 || // Último ejercicio
    exercises.length === 0; // No hay ejercicios
  
  // Verificación prioritaria: Si ya se completó la sesión
  if (allExercisesCompleted || !sessionId) {
    console.log("DetectionResultModal: Sesión completada o sin ejercicios, cerrando directamente");
    
    // Limpiar estado
    setShowExercises(false);
    setCurrentExerciseIndex(0);
    setExercises([]);
    setIsLoading(false);
    setUserAnswer('');
    setShowHint(false);
    setTimerActive(false);
    setTimeLeft(null);
    setFeedback("");
    setSessionId(null);
    resetReviewSystem();
    
    // Cerrar modal
    onClose();
    return;
  }

  // Si hay una sesión activa y hay ejercicios pendientes, verificar abandono
  if (sessionId && showExercises && !isExiting && !allExercisesCompleted) {
    console.log(`DetectionResultModal: Mostrando alerta de abandono para sesión ${sessionId}`);
    checkAndShowAbandonmentAlert();
    return;
  }

  // En cualquier otro caso, limpiar y cerrar
  console.log("DetectionResultModal: Limpiando estado y cerrando");
  
  // Limpiar estado
  setShowExercises(false);
  setCurrentExerciseIndex(0);
  setExercises([]);
  setIsLoading(false);
  setUserAnswer('');
  setShowHint(false);
  setTimerActive(false);
  setTimeLeft(null);
  setFeedback("");
  setSessionId(null);
  resetReviewSystem();
  
  // Cerrar modal
  onClose();
};

// Función para manejar tiempo agotado
const handleTimeUp = () => {
  setTimerActive(false);
  
  // Mostrar retroalimentación de tiempo agotado
  setFeedback("¡Se acabó el tiempo! Intenta responder más rápido la próxima vez.");
  
  // Usar el sistema de revisión - consideramos esto como un intento fallido
  handleExerciseAnswer(false);
};

// Función para mostrar pista con penalización
const handleShowHint = () => {
  setShowHint(true);
};

const getMultipleChoiceOptions = (exercise: Exercise) => {
  // Opciones a devolver
  let options: {text: string, isCorrect: boolean}[] = [];
  
  // CASO 1: Si exercise.distractors es un array, usarlo directamente
  if (Array.isArray(exercise.distractors)) {
    options = [
      { text: exercise.answer, isCorrect: true },
      ...exercise.distractors.map(d => ({ text: d, isCorrect: false }))
    ];
  } 
  // CASO 2: Si distractors es un objeto con formato de la API de ChatGPT
  else if (exercise.distractors && typeof exercise.distractors === 'object') {
    // Verificar si tiene el campo options
    if ('options' in exercise.distractors && Array.isArray(exercise.distractors.options)) {
      options = [
        { text: exercise.answer, isCorrect: true },
        ...exercise.distractors.options.map(d => ({ text: d, isCorrect: false }))
      ];
    }
    // Verificar si tiene la propiedad 'distractors'
    else if ('distractors' in exercise.distractors && Array.isArray(exercise.distractors['distractors'])) {
      options = [
        { text: exercise.answer, isCorrect: true },
        ...exercise.distractors['distractors'].map(d => ({ text: d, isCorrect: false }))
      ];
    }
    // Verificar si tiene la estructura con correct_answer
    else if ('correct_answer' in exercise.distractors && 
             'distractors' in exercise.distractors && 
             Array.isArray(exercise.distractors['distractors'])) {
      options = [
        { text: exercise.distractors['correct_answer'], isCorrect: true },
        ...exercise.distractors['distractors'].map(d => ({ text: d, isCorrect: false }))
      ];
    }
    // Si tiene pares para matching
    else if (Array.isArray(exercise.distractors.pairs)) {
      const otherOptions = exercise.distractors.pairs
        .filter(pair => pair.quechua !== exercise.answer)
        .map(pair => ({ text: pair.quechua, isCorrect: false }));
      options = [
        { text: exercise.answer, isCorrect: true },
        ...otherOptions.slice(0, 3)
      ];
    }
  }
  
  // Si no se pudo determinar opciones, usar opciones por defecto razonables
  if (options.length < 2) {
    console.warn("No se encontraron distractors válidos, usando valores por defecto");
    options = [
      { text: exercise.answer, isCorrect: true },
      { text: "samarina", isCorrect: false },
      { text: "unku", isCorrect: false },
      { text: "maki", isCorrect: false }
    ];
  }
  
  // Usar un barajado determinista basado en ID en lugar de aleatorio
  const exerciseId = exercise.id || 0;
  const shuffledOptions = [...options].slice(0, 4);
  
  if (exerciseId > 0) {
    // Este sort siempre dará el mismo resultado para el mismo ID
    shuffledOptions.sort((a, b) => {
      const hashA = a.text.charCodeAt(0) + exerciseId;
      const hashB = b.text.charCodeAt(0) + exerciseId;
      return hashA - hashB;
    });
  }
  
  return shuffledOptions;
}; 

const handleLearnMore = async () => {
  if (!results || !results.objects || results.objects.length === 0) return;
  
  // Reproducir sonido al iniciar aprendizaje
  if (soundEnabled) {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/start-learning.mp3')
      );
      await sound.playAsync();
      // Limpiar después de reproducir con verificación de tipo correcta
      sound.setOnPlaybackStatusUpdate((status) => {
        if ('isLoaded' in status && status.isLoaded && !status.isPlaying) {
          sound.unloadAsync().catch(e => console.error("Error descargando sonido", e));
        }
      });
    } catch (error) {
      console.error("Error reproduciendo sonido:", error);
    }
  }
  
  setIsLoading(true);
  try {
    // Obtener el primer objeto detectado
    const firstObject = results.objects[0];
    
    try {
      // Usar el label para buscar ejercicios
      const exercisesData = await ApiService.getExercisesByLabel(firstObject.label);
      
      // Recuperar información de vocabulario para usar en ejercicios y mensajes
      const vocabData = await ApiService.getUserVocabulary({ sort_by: 'recent' });
      
      // Mostrar mensaje cuando se detecta una nueva palabra
      const existingWord = vocabData.find((item: any) => 
        item.quechua_word.toLowerCase() === firstObject.quechua.toLowerCase()
      );
      
      // Procesar ejercicios recibidos
      if (exercisesData) {
        let exercises;
        
        // Determinar si es formato de objeto o array y extraer ejercicios
        if ('session_id' in exercisesData && Array.isArray(exercisesData.exercises)) {
          // Formato { session_id, exercises }
          setSessionId(exercisesData.session_id);
          exercises = exercisesData.exercises;
        } 
        else if (Array.isArray(exercisesData)) {
          // Formato array directo de ejercicios
          exercises = exercisesData;
          
          // Buscar ID de sesión en metadata del primer ejercicio
          if (exercisesData[0]?.metadata?.session_id) {
            setSessionId(exercisesData[0].metadata.session_id);
          }
        }
        else {
          throw new Error("Formato de ejercicios inesperado");
        }
        
        // Preparar ejercicio de matching si tenemos suficiente vocabulario
        if (vocabData && vocabData.length >= 3) {
          // Filtrar palabras diferentes a la actual y tomar 3 aleatorias
          const otherWords = vocabData
            .filter((word: any) => 
              word.quechua_word.toLowerCase() !== firstObject.quechua.toLowerCase()
            )
            .sort(() => 0.5 - Math.random())
            .slice(0, 3);
          
          if (otherWords.length >= 3) {
            // Crear pares para el ejercicio de matching
            const pairs = [
              { spanish: firstObject.spanish, quechua: firstObject.quechua },
              { 
                spanish: otherWords[0].spanish_word, 
                quechua: otherWords[0].quechua_word 
              },
              { 
                spanish: otherWords[1].spanish_word, 
                quechua: otherWords[1].quechua_word 
              },
              { 
                spanish: otherWords[2].spanish_word, 
                quechua: otherWords[2].quechua_word 
              }
            ];
            
            // Crear ejercicio de matching con casting de tipo explícito a Exercise
            const matchingExercise = {
              id: Math.floor(Math.random() * 1000) + 900, // ID en otro rango
              type: 'matching',
              question: `Relaciona las palabras en español con su traducción en quechua. Incluye '${firstObject.spanish}'.`,
              answer: firstObject.quechua,
              distractors: { pairs },
              difficulty: 1,
              metadata: {
                mode: 'detection',
                session_id: exercisesData.session_id || exercises[0]?.metadata?.session_id
              },
              object_translation: {
                id: 1,
                spanish: firstObject.spanish,
                quechua: firstObject.quechua
              }
            } as Exercise; // Casting explicito
            
            // IMPORTANTE: Organizar los ejercicios en un orden específico
            // Primero identificamos y separamos los diferentes tipos
            const multipleChoice = exercises.find((ex: Exercise) => ex.type === 'multiple_choice');
            const fillBlanks = exercises.find((ex: Exercise) => ex.type === 'fill_blanks');
            const pronunciation = exercises.find((ex: Exercise) => ex.type === 'pronunciation');
            const anagram = exercises.find((ex: Exercise) => ex.type === 'anagram');
            
            // Reorganizar en el orden deseado, con matching en posición 3 (índice 2)
            const reorderedExercises: Exercise[] = [];
            
            // Añadir multiple_choice si existe
            if (multipleChoice) reorderedExercises.push(multipleChoice);
            
            // Añadir fill_blanks si existe
            if (fillBlanks) reorderedExercises.push(fillBlanks);
            
            // Añadir nuestro ejercicio de matching en la posición 3
            reorderedExercises.push(matchingExercise);
            
            // Añadir pronunciation si existe
            if (pronunciation) reorderedExercises.push(pronunciation);
            
            // Añadir anagram si existe
            if (anagram) reorderedExercises.push(anagram);
            
            // Añadir cualquier otro ejercicio que pueda existir
            exercises.forEach((ex: Exercise) => {
              if (ex.type !== 'multiple_choice' && 
                  ex.type !== 'fill_blanks' && 
                  ex.type !== 'pronunciation' &&
                  ex.type !== 'anagram' &&
                  ex.type !== 'matching') {
                reorderedExercises.push(ex);
              }
            });
            
            // Establecer ejercicios reordenados
            setExercises(reorderedExercises);
            console.log("Ejercicios reorganizados con matching en posición 3");
          } else {
            // Si no pudimos crear un ejercicio de matching, usar los ejercicios originales
            setExercises(exercises);
          }
        } else {
          // Si no hay suficiente vocabulario, usar los ejercicios originales
          setExercises(exercises);
        }
        
        // Mostrar alerta si es una palabra nueva
        if (!existingWord || existingWord.times_detected === 1) {
          setTimeout(() => {
            Alert.alert(
              "¡Nueva Palabra Detectada! 🎉",
              `Has añadido "${firstObject.quechua}" (${firstObject.spanish}) a tu vocabulario\n\n⭐ Nivel de dominio: 1/5`,
              [{ text: "¡Genial!", style: "default" }],
              { cancelable: true }
            );
          }, 500);
        }
      } else {
        throw new Error("No se generaron ejercicios desde el backend");
      }
    } catch (error) {
      console.log("Error al obtener ejercicios del backend:", error);
      
      // Crear ejercicios localmente como fallback mejorado
      const mockExercises: Exercise[] = []; // Tipado explícito

      // ✅ Generar IDs únicos basados en timestamp para evitar conflictos
      const baseId = Date.now();
      
      // Ejercicio 1: selección múltiple
      mockExercises.push({
        id: baseId + 1, // ✅ CAMBIO: ID único basado en timestamp
        type: 'multiple_choice',
        question: `¿Cómo se dice "${firstObject.spanish}" en quechua?`,
        answer: firstObject.quechua,
        distractors: { 
          options: ["samarina", "unku", "maki"]
        },
        difficulty: 1,
        metadata: {
          time_limit: 30,
          time_bonus: 5,
          penalty: -3,
          mode: 'detection', // ✅ AGREGAR: modo detection
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
      } as Exercise);
      
      // Ejercicio 2: completar espacios
      mockExercises.push({
        id: baseId + 2, // ✅ CAMBIO: ID secuencial
        type: 'fill_blanks',
        question: `Completa la palabra en quechua: ${firstObject.quechua.substring(0, 1)}${'_'.repeat(firstObject.quechua.length - 1)}`,
        answer: firstObject.quechua,
        distractors: { 
          hint: `Es como se dice "${firstObject.spanish}" en quechua`,
          pairs: undefined 
        },
        difficulty: 1,
        metadata: {
          time_limit: 45,
          time_bonus: 8,
          streak_bonus: 5,
          hint_penalty: -3,
          mode: 'detection', // ✅ AGREGAR: modo detection
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
      } as Exercise);
      
      // Ejercicio 3: Intentar agregar ejercicio de matching si hay vocabulario
      try {
        const vocabData = await ApiService.getUserVocabulary({ sort_by: 'recent' });
        
        if (vocabData && vocabData.length >= 3) {
          // Filtrar palabras diferentes a la detectada
          const otherWords = vocabData
            .filter((word: any) => 
              word.quechua_word.toLowerCase() !== firstObject.quechua.toLowerCase()
            )
            .sort(() => 0.5 - Math.random())
            .slice(0, 3);
          
          if (otherWords.length >= 3) {
            // Agregar ejercicio de matching en posición 3
            mockExercises.push({
              id: baseId + 3, // ✅ CAMBIO: ID secuencial (no +900)
              type: 'matching',
              question: `Relaciona las palabras en español con su traducción en quechua. Incluye '${firstObject.spanish}'.`,
              answer: firstObject.quechua,
              distractors: {
                pairs: [
                  { spanish: firstObject.spanish, quechua: firstObject.quechua },
                  { 
                    spanish: otherWords[0].spanish_word, 
                    quechua: otherWords[0].quechua_word 
                  },
                  { 
                    spanish: otherWords[1].spanish_word, 
                    quechua: otherWords[1].quechua_word 
                  },
                  { 
                    spanish: otherWords[2].spanish_word, 
                    quechua: otherWords[2].quechua_word 
                  }
                ]
              },
              difficulty: 1,
              metadata: {
                time_limit: 90,
                mode: 'detection'
              },
              object_translation: {
                id: 1,
                spanish: firstObject.spanish,
                quechua: firstObject.quechua
              }
            } as Exercise);
            
            console.log("Ejercicio de matching agregado en posición 3");
          }
        }
      } catch (vocabError) {
        console.log("Error al obtener vocabulario para matching:", vocabError);
      }
      
      // Ejercicio 4: pronunciación
      mockExercises.push({
        id: baseId + 4, // ✅ CAMBIO: ID secuencial (no +2)
        type: 'pronunciation',
        question: `Practica la pronunciación de la palabra '${firstObject.quechua}'.
      Para pronunciar la palabra '${firstObject.quechua}' en Quechua, primero...`,
        answer: firstObject.quechua,
        distractors: {
          phonetic_guide: `Pronuncia cada sílaba claramente y con confianza`
        },
        difficulty: 1,
        metadata: {
          mode: 'detection', // ✅ AGREGAR: modo detection
          culture_note: `Esta palabra es importante en la cultura quechua...`
        },
        object_translation: {
          id: 1,
          spanish: firstObject.spanish,
          quechua: firstObject.quechua
        }
      } as Exercise);
      
      // Ejercicio 5: anagrama
      mockExercises.push({
        id: baseId + 5, // ✅ CAMBIO: ID secuencial (no +4)
        type: 'anagram',
        question: `Ordena las letras para formar la palabra en quechua que significa "${firstObject.spanish}"`,
        answer: firstObject.quechua,
        difficulty: 1,
        metadata: {
          time_limit: 60,
          mode: 'detection', // ✅ AGREGAR: modo detection
          spanish_translation: firstObject.spanish
        },
        object_translation: {
          id: 1,
          spanish: firstObject.spanish,
          quechua: firstObject.quechua
        }
      } as Exercise);
      
      setExercises(mockExercises);
    }
    
    setShowExercises(true);
    setCurrentExerciseIndex(0);
    setFeedback("");
    resetReviewSystem();
  } catch (error) {
    console.error('Error al obtener ejercicios:', error);
    alert('No se pudieron cargar los ejercicios. Intenta de nuevo más tarde.');
  } finally {
    setIsLoading(false);
  }
}; 

const handleExerciseComplete = async (isCorrect: boolean, userAnswer?: string) => {
  setTimerActive(false);
  
  const exercise = exercises[currentExerciseIndex];
  if (!exercise || !exercise.id) {
    console.error("❌ Error: No hay ejercicio válido");
    return;
  }
  
  // ✅ LOGGING MEJORADO PARA DEPURACIÓN DETALLADA
  console.log(`🎯 DetectionResultModal - Completando ejercicio ${exercise.id}:`);
  console.log(`   - Tipo de ejercicio: ${exercise.type}`);
  console.log(`   - Respuesta del usuario: "${userAnswer}"`);
  console.log(`   - Respuesta esperada: "${exercise.answer}"`);
  console.log(`   - Es correcto: ${isCorrect}`);
  console.log(`   - Modo: detection`);
  console.log(`   - Índice actual: ${currentExerciseIndex}/${exercises.length}`);
  
  if (!isCorrect) {
    // Reproducir sonido de respuesta incorrecta
    if (soundEnabled && exercise.type !== 'fill_blanks') {
      try {
        const soundType = 'incorrect';
        
        // Solo reproducir si no está en cooldown
        if (canPlaySound(soundType)) {
          const soundFile = require('../assets/sounds/incorrect.mp3');
          
          const { sound } = await Audio.Sound.createAsync(soundFile);
          await sound.playAsync();
          
          // Limpiar después de reproducir
          sound.setOnPlaybackStatusUpdate((status) => {
            if ('isLoaded' in status && status.isLoaded && !status.isPlaying) {
              sound.unloadAsync().catch(e => console.error("Error descargando sonido", e));
            }
          });
        }
      } catch (error) {
        console.error("Error reproduciendo sonido:", error);
      }
    }
    
    // Incrementar contador de intentos solo para respuestas incorrectas
    const newAttempts = attemptsCount + 1;
    setAttemptsCount(newAttempts);
    console.log(`🔄 Intento ${newAttempts}/3 para ejercicio ${exercise.type}`);
    
    // Mostrar mensaje de error
    setShowErrorMessage(true);
    
    // Configurar temporizador para ocultar SOLO el mensaje de error después de 1 segundo
    setTimeout(() => {
      setShowErrorMessage(false);
    }, 1000);
    
    // Si alcanzó el límite de 3 intentos, avanzar automáticamente después de un breve retraso
    if (newAttempts >= 3) {
      console.log(`❌ Máximo de intentos alcanzado para ejercicio ${exercise.id}`);
      setTimeout(() => {
        setAttemptsCount(0);
        continueToNext();
      }, 1500);
    }
    
    setFeedback("");
  } else {
    // Reproducir sonido de respuesta correcta
    if (soundEnabled && exercise.type !== 'fill_blanks') {
      try {
        const soundType = 'correct';
        
        // Solo reproducir si no está en cooldown
        if (canPlaySound(soundType)) {
          const soundFile = require('../assets/sounds/correct.mp3');
          
          const { sound } = await Audio.Sound.createAsync(soundFile);
          await sound.playAsync();
          
          // Limpiar después de reproducir
          sound.setOnPlaybackStatusUpdate((status) => {
            if ('isLoaded' in status && status.isLoaded && !status.isPlaying) {
              sound.unloadAsync().catch(e => console.error("Error descargando sonido", e));
            }
          });
        }
      } catch (error) {
        console.error("Error reproduciendo sonido:", error);
      }
    }
    
    // Resetear contador si es correcta
    setAttemptsCount(0);
    // Incrementar contador de respuestas correctas
    setCorrectAnswersCount(prev => prev + 1);
    // Para respuestas correctas, mostrar feedback positivo
    setFeedback("¡Correcto!");
    console.log(`✅ Respuesta correcta para ejercicio ${exercise.id}`);
  }
  
  try {
    // ✅ VALIDACIÓN Y LOGGING MEJORADOS ANTES DE ENVIAR
    const actualUserAnswer = userAnswer || exercise.answer;
    
    // Validación específica para ejercicios de matching
    if (exercise.type === 'matching') {
      if (actualUserAnswer.includes('→')) {
        const parts = actualUserAnswer.split('→');
        console.log(`🔍 Matching detectado en DetectionResultModal:`);
        console.log(`   - Parte española: "${parts[0]}"`);
        console.log(`   - Parte quechua: "${parts[1]}"`);
        console.log(`   - Formato válido: ${parts.length === 2}`);
      } else {
        console.log(`🔍 Matching con formato simple: "${actualUserAnswer}"`);
      }
    }
    
    console.log(`📡 Enviando al backend desde DetectionResultModal:`);
    console.log(`   - Exercise ID: ${exercise.id}`);
    console.log(`   - User Answer: "${actualUserAnswer}"`);
    console.log(`   - Expected Answer: "${exercise.answer}"`);
    console.log(`   - Mode: detection`);
    
    const result = await ApiService.submitExerciseAnswer(exercise.id, actualUserAnswer, 'detection');
    
    console.log('✅ Respuesta del backend recibida exitosamente:', {
      correct: result.correct,
      mastery_level: result.mastery_level,
      exercise_type: result.exercise_type || exercise.type
    });
    
    // ✅ NUEVO: Notificar cambios de progreso
    if (result.mastery_updated || result.mastery_decreased) {
      progressEvents.emit('progress_updated', {
        type: result.mastery_updated ? 'mastery_increase' : 'mastery_decrease',
        word: exercise.answer,
        mode: 'detection'
      });
    }

    // ✅ NUEVO: Usar respuesta completa del backend
    if (result && (result.mastery_updated || result.mastery_decreased)) {
      console.log('📊 Cambio de maestría detectado en detection:', {
        word: exercise.answer,
        previousLevel: result.previous_mastery_level,
        newLevel: result.mastery_level,
        wasUpdated: result.mastery_updated,
        wasDecreased: result.mastery_decreased
      });
      
      // Forzar refresh inmediato del progreso
      progressEvents.emit('force_refresh_progress');
    }
    
    // ✅ MANEJO COMPLETO DE CAMBIOS DE MAESTRÍA
    if (result.mastery_updated) {
      // Manejar cualquier incremento de nivel (no solo nivel 5)
      if (result.mastery_level > (result.previous_mastery_level || 0)) {
        setMasteryChangeData({
          word: exercise.answer,
          wordTranslation: exercise.object_translation?.spanish || "",
          previousLevel: result.previous_mastery_level || (result.mastery_level - 1),
          newLevel: result.mastery_level,
          changeType: 'increase',
          message: result.mastery_level === 5 
            ? "¡Has dominado completamente esta palabra!" 
            : `¡Subiste de nivel! Ahora tienes ${result.mastery_level} ${result.mastery_level === 1 ? 'estrella' : 'estrellas'}`
        });
        setShowMasteryChangeAlert(true);
      }
    } 
    else if (result.mastery_decreased) {
      console.log("🔻 Degradación detectada en modo detección:", {
        previo: result.previous_mastery_level,
        nuevo: result.mastery_level,
        fallosActuales: result.consecutive_failures
      });
      
      setMasteryChangeData({
        word: exercise.answer,
        wordTranslation: exercise.object_translation?.spanish || "",
        previousLevel: result.previous_mastery_level || (result.mastery_level + 1),
        newLevel: result.mastery_level,
        changeType: 'decrease',
        message: result.degradation_message || "Esta palabra necesita más práctica. ¡Sigue intentándolo!"
      });
      setShowMasteryChangeAlert(true);
    }
    
  } catch (error) {
    console.error("❌ Error detallado al enviar respuesta desde DetectionResultModal:", error);
    
    // ✅ MANEJO ESPECÍFICO DE ERRORES DE MATCHING
    if (error instanceof Error) {
      if (error.message.includes('400') && exercise.type === 'matching') {
        console.error("❌ Error 400 en ejercicio de matching - posible problema de formato");
        console.error("❌ Respuesta que causó el error:", userAnswer);
        console.error("❌ Ejercicio que falló:", {
          id: exercise.id,
          type: exercise.type,
          answer: exercise.answer
        });
        
        Alert.alert(
          "Error en Ejercicio de Emparejamiento",
          `Hubo un problema técnico con este ejercicio (ID: ${exercise.id}). Se continuará con el siguiente.`,
          [{ 
            text: "Continuar", 
            onPress: () => {
              console.log("🔄 Continuando después de error 400 en matching");
              handleExerciseAnswer(true); // Continuar como si fuera correcto
            }
          }]
        );
        return;
      }
      
      // Para otros errores HTTP
      if (error.message.includes('400')) {
        console.error("❌ Error 400 genérico:", {
          exercise_id: exercise.id,
          exercise_type: exercise.type,
          user_answer: userAnswer,
          expected_answer: exercise.answer
        });
      }
    }
    
    // Para otros errores, mantener comportamiento original
    console.log("🔄 Usando sistema de revisión después de error");
    handleExerciseAnswer(isCorrect);
  }
  
  // Usar el sistema de revisión para manejar la respuesta
  handleExerciseAnswer(isCorrect);
}; 
 
const handleFinishExercises = () => {
  setShowExercises(false);
  setCurrentExerciseIndex(0);
  setExercises([]);
  setFeedback("");
  setCorrectAnswersCount(0); // Añade esta línea
  resetReviewSystem();
};

// Función renderExercise
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
  console.log(`Renderizando ejercicio tipo: ${exercise.type}, índice: ${currentExerciseIndex}, ID: ${exercise.id}`); 
  
  return (
    <View style={styles.exerciseContainer}>
      {/* Añadir el componente del sistema de revisión */}
      <ExerciseReviewUI isReviewMode={isReviewMode} attemptsInfo={attemptsInfo} />
      
       {/* Pregunta del ejercicio - Mostrar solo para ciertos tipos de ejercicios */}
{exercise.question && (
  // Mostrar la pregunta solo si NO es uno de estos tipos (que ya muestran su propia pregunta)
  (exercise.type !== 'multiple_choice' && 
   exercise.type !== 'matching' && 
   exercise.type !== 'anagram' &&
   exercise.type !== 'fill_blanks') && (
    <Text style={styles.questionText}>{exercise.question}</Text>
  )
)}
      
      {/* Feedback si está disponible */}
      {/* Mostrar feedback solo para respuestas correctas */}
      {feedback !== "" && feedback.includes("Correcto") && (
        <View style={[
          styles.feedbackContainer,
          styles.correctFeedback
        ]}>
          <Text style={styles.feedbackText}>{feedback}</Text>
          <TouchableOpacity
            style={[styles.submitButton, {marginTop: 12}]}
            onPress={continueToNext}
          >
            <Text style={styles.buttonText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Renderizar contenido según el tipo de ejercicio SOLO si no hay feedback */}
      {feedback === "" && (
        <>
       {exercise.type === 'multiple_choice' && exercise.answer && (
        <ExerciseMultipleChoice
          question={exercise.question}
          options={getMultipleChoiceOptions(exercise)}
          onComplete={(isCorrect: boolean, userAnswer?: string) => handleExerciseComplete(isCorrect, userAnswer)}
          difficulty={exercise.difficulty}
          currentAttempt={attemptsCount}
          maxAttempts={3}
        />
      )}
          
          {exercise.type === 'fill_blanks' && exercise.answer && (
            <FillBlanksExercise
              question={exercise.question}
              answer={exercise.answer}
              hint={exercise.distractors?.hint}
              onComplete={(isCorrect: boolean, userAnswer?: string) => handleExerciseComplete(isCorrect, userAnswer)}
              difficulty={exercise.difficulty}
              spanishTranslation={exercise.metadata?.spanish_translation as string}
              mode="detection"
            />
          )}
          
          {exercise.type === 'pronunciation' && exercise.answer && exercise.object_translation && (
            <PronunciationExercise
              question={exercise.question}
              wordToProunounce={exercise.answer}
              spanishTranslation={exercise.object_translation.spanish}
              phoneticGuide={exercise.distractors?.phonetic_guide}
              onComplete={(isCorrect: boolean, userAnswer?: string) => handleExerciseComplete(isCorrect, userAnswer)}
              difficulty={exercise.difficulty}
            />
          )} 
          
          {exercise.type === 'matching' && exercise.distractors?.pairs && 
            Array.isArray(exercise.distractors.pairs) && exercise.distractors.pairs.length > 0 && (
            <MatchingExercise
              question={exercise.question}
              pairs={exercise.distractors.pairs.map((pair, index: number) => ({
                id: index + 1,
                spanish: pair.spanish || "",
                quechua: pair.quechua || ""
              }))}
              onComplete={(isCorrect: boolean, userAnswer?: string) => handleExerciseComplete(isCorrect, userAnswer)}
              difficulty={exercise.difficulty}
              onContinue={continueToNext}
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
              onComplete={(isCorrect: boolean, userAnswer?: string) => handleExerciseComplete(isCorrect, userAnswer)}
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
                onPress={continueToNext}
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
  if (showCelebration) {
    return (
      <CelebrationScreen
        objectName={results?.objects[0]?.quechua || "objeto"}
        exercisesCompleted={exercises.length}
        correctAnswers={correctAnswersCount}
        onContinue={() => {
          setShowCelebration(false);
          setShowExercises(false);
          onClose();
        }}
        onPracticeMore={() => {
          setShowCelebration(false);
          setShowExercises(false);
          onClose();
          setTimeout(() => {
            navigation.navigate('Practice');
          }, 300);
        }}
      />
    );
  }

  if (showExercises) {
    return (
      <View style={styles.exercisesContainer}>
      <Text style={styles.exerciseProgress}>
        Ejercicio {currentExerciseIndex + 1} de {exercises.length}
        {/* Comenta o elimina esta parte */}
        {/* {attemptsCount > 0 && (
          <Text> • Intento {attemptsCount}/3</Text>
        )} */}
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
  <>
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

  {/* Modal de alerta de abandono */}
  <AbandonSessionAlert
    visible={abandonModalVisible}
    onCancel={handleCancelAbandon}
    onConfirm={handleConfirmAbandon}
    warningMessage={abandonmentWarning}
    affectedWords={affectedWords}
    abandonmentConsequence={abandonmentConsequence || {
      mode: 'detection',
      failure_penalty: 1,
      total_words_affected: 0
    }}
  />
  
  {/* ✅ AGREGAR ESTE COMPONENTE AQUÍ */}
  {masteryChangeData && (
    <MasteryLevelChangeAlert
      visible={showMasteryChangeAlert}
      onDismiss={() => setShowMasteryChangeAlert(false)}
      word={masteryChangeData.word}
      wordTranslation={masteryChangeData.wordTranslation}
      previousLevel={masteryChangeData.previousLevel}
      newLevel={masteryChangeData.newLevel}
      changeType={masteryChangeData.changeType}
      message={masteryChangeData.message}
    />
  )}
</>
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
errorMessageContainer: {
  borderWidth: 1,
  borderColor: '#FF0000',
  backgroundColor: '#FFEBEE',
  padding: 10,
  marginVertical: 10,
  borderRadius: 5,
},
errorMessageText: {
  color: '#000000',
  textAlign: 'center',
  fontSize: 16,
},
attemptCounter: {
  textAlign: 'center',
  color: '#666',
  marginVertical: 15,
  fontSize: 16,
},
});