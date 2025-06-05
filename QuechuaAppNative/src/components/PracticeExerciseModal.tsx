//src/components/PracticeExerciseModal.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
 View,
 Text,
 Modal,
 TouchableOpacity,
 StyleSheet,
 ScrollView,
 ActivityIndicator,
 Alert,
 BackHandler
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExerciseMultipleChoice } from './ExerciseMultipleChoice';
import { AnagramExercise } from './AnagramExercise';
import { PronunciationExercise } from './PronunciationExercise';
import { MatchingExercise } from './MatchingExercise';
import { FillBlanksExercise } from './FillBlanksExercise';
import { ApiService } from '../services/api';
import { AbandonSessionAlert } from './AbandonSessionAlert';
import { MasteryLevelChangeAlert } from './MasteryLevelChangeAlert';
import { useExerciseReview, ExerciseReviewUI } from './ExerciseReviewSystem';
import { Audio } from 'expo-av';
import { progressEvents } from '../events/progressEvents';

interface Exercise {
 id: number;
 type: string;
 question: string;
 answer: string;
 distractors?: any;
 difficulty: number;
 object_translation?: {
   id: number;
   spanish: string;
   quechua: string;
 };
 metadata?: any;
 spanish_translation?: string;
}

// ✅ AGREGAR ESTAS LÍNEAS AQUÍ
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

interface Props {
 isVisible: boolean;
 onClose: () => void;
 exercises: Exercise[];
 categoryTitle: string;
 onComplete?: () => void;
}

export const PracticeExerciseModal: React.FC<Props> = ({
 isVisible,
 onClose,
 exercises,
 categoryTitle,
 onComplete
}) => {
 const [currentIndex, setCurrentIndex] = useState(0);
 const [showSummary, setShowSummary] = useState(false);
 const [isLoading, setIsLoading] = useState(false);
 const [sessionId, setSessionId] = useState<number | null>(null);
 const [isExiting, setIsExiting] = useState(false);
 const [isAbandoned, setIsAbandoned] = useState(false);
 const [feedback, setFeedback] = useState("");
 const [fillBlanksAttempts, setFillBlanksAttempts] = useState(0);
 
 // Estados para manejar el modal de abandono
 const [abandonModalVisible, setAbandonModalVisible] = useState(false);
 const [affectedWords, setAffectedWords] = useState<AffectedWord[]>([]);
 const [abandonmentWarning, setAbandonmentWarning] = useState('');
 const [abandonmentConsequence, setAbandonmentConsequence] = useState<AbandonmentConsequence | null>(null);
 
 // Estados para el modal de cambio de nivel de maestría
 const [showMasteryChangeAlert, setShowMasteryChangeAlert] = useState(false);
 const [masteryChangeData, setMasteryChangeData] = useState<{
   word: string;
   wordTranslation: string;
   previousLevel: number;
   newLevel: number;
   changeType: 'increase' | 'decrease';
   message?: string;
 } | null>(null);
 // ✅ AGREGAR ESTA LÍNEA NUEVA:
const [currentUserAnswer, setCurrentUserAnswer] = useState<string>('');
const [soundEnabled, setSoundEnabled] = useState(true);
 const timerRef = useRef<NodeJS.Timeout | null>(null);
 // Guardar un flag de completado para evitar procesamiento múltiple
 const hasCompletedRef = useRef(false);
 // Referencias adicionales para controlar estado
 const isSessionCompletedRef = useRef(false);
 const isSessionAbandonedRef = useRef(false);
 
 // Sistema de revisión de ejercicios
 const { 
  isReviewMode,
  attemptsInfo,
  progressInfo,
  handleExerciseAnswer,
  continueToNext, 
  resetReviewSystem 
} = useExerciseReview(
  'practice', 
  currentIndex,
  exercises.length,
  (nextIndex) => {
    if (nextIndex === -1) {
      // Finalizar ejercicios
      setShowSummary(true);
      // Marcar sesión como completada cuando se muestran todos los ejercicios
      isSessionCompletedRef.current = true;
      
      // Notificar a nivel global que la sesión está completada
      if (sessionId && typeof global !== 'undefined') {
        // Guardar en el registro global de sesiones completadas
        if (!(global as any).completedSessions) {
          (global as any).completedSessions = [];
        }
        
        if (!((global as any).completedSessions as number[]).includes(sessionId)) {
          ((global as any).completedSessions as number[]).push(sessionId);
          console.log(`Registrando globalmente sesión completada: ${sessionId}`);
        }
        
        // Llamar al manejador global si existe
        if ((global as any).handleSessionCompletedGlobal) {
          (global as any).handleSessionCompletedGlobal(sessionId);
        }
      }
    } else {
      // Avanzar al ejercicio indicado
      setCurrentIndex(nextIndex);
      // Reiniciar feedback para nuevo ejercicio
      setFeedback("");
    }
  },
  (message) => setFeedback(message)
 );

 // Función para verificar si la sesión está completa
 const isSessionComplete = () => {
   // Si ya mostramos el resumen, definitivamente está completada
   if (showSummary) return true;
   
   // Si la referencia explícita dice que está completada
   if (isSessionCompletedRef.current) return true;
   
   // Si estamos en el último ejercicio
   if (!isReviewMode && currentIndex >= exercises.length - 1) return true;
   
   // Si estamos en modo revisión y no quedan ejercicios pendientes
   if (isReviewMode && progressInfo.total <= 1) return true;
   
   // Verificar si está en la lista global de sesiones completadas
   if (sessionId && typeof global !== 'undefined' && 
       (global as any).completedSessions && 
       ((global as any).completedSessions as number[]).includes(sessionId)) {
     return true;
   }
   
   return false;
 };

 // Efecto para notificar a otros componentes cuando la sesión se completa
// Añadir manejo de botón atrás
// Añadir manejo de botón atrás
// Añadir manejo de botón atrás
useEffect(() => {
  const handleBackPress = () => {
    if (isVisible && !isExiting) {
      console.log("PracticeExerciseModal: Botón atrás detectado. Verificando estado:", {
        showSummary,
        isSessionCompleted: isSessionCompletedRef.current,
        sessionId,
        feedback
      });
      
      // Prioridad 1: Si hay feedback visible, solo limpiarlo
      if (feedback !== "") {
        setFeedback("");
        return true;
      }
      
      // Prioridad 2: Verificación mejorada para sesión completada
      if (showSummary || 
          isSessionCompletedRef.current || 
          (sessionId && typeof global !== 'undefined' && 
           (global as any).completedSessions && 
           ((global as any).completedSessions as number[]).includes(sessionId))) {
        // Si la sesión está completada, cerrar normalmente
        console.log("PracticeExerciseModal: Sesión completada, permitiendo cierre normal");
        // LLAMAR DIRECTAMENTE A ONCLOSE PARA GARANTIZAR REGRESO A PANTALLA DE CATEGORÍAS
        handleClose();
        return true;
      } 
      // Prioridad 3: Si hay sesión activa no completada, mostrar alerta
      else if (sessionId && !isAbandoned && !isSessionAbandonedRef.current) {
        // Mostrar alerta de abandono
        console.log("PracticeExerciseModal: Sesión no completada, mostrando alerta de abandono");
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
}, [isVisible, sessionId, isExiting, isAbandoned, feedback, showSummary]);

 useEffect(() => {
   if (isVisible) {
     // Reiniciar estados al mostrar el modal
     setCurrentIndex(0);
     setShowSummary(false);
     setIsLoading(false);
     setIsExiting(false);
     setIsAbandoned(false);
     hasCompletedRef.current = false;
     isSessionCompletedRef.current = false;
     isSessionAbandonedRef.current = false;
     setFeedback("");
     resetReviewSystem();
     
     // Extraer ID de sesión de los ejercicios
     if (exercises.length > 0) {
       // Intentar obtener ID de sesión desde diferentes ubicaciones
       let foundSessionId = null;
       
       // Verificar si hay un objeto session_id explícito
       const firstExercise = exercises[0];
       
       if (firstExercise.metadata?.session_id) {
         foundSessionId = firstExercise.metadata.session_id;
         console.log(`PracticeExerciseModal: ID de sesión encontrado en metadata: ${foundSessionId}`);
       }
       
       // Si se encontró un ID válido, establecerlo
       if (foundSessionId && !isNaN(foundSessionId) && foundSessionId > 0) {
         setSessionId(foundSessionId);
         console.log(`PracticeExerciseModal: Usando ID de sesión: ${foundSessionId}`);
         
         // Verificar si ya está completada globalmente
         if (typeof global !== 'undefined' && 
             (global as any).completedSessions && 
             ((global as any).completedSessions as number[]).includes(foundSessionId)) {
           console.log(`PracticeExerciseModal: Sesión ${foundSessionId} ya está registrada como completada globalmente`);
           isSessionCompletedRef.current = true;
         }
       } else {
         console.warn("PracticeExerciseModal: No se encontró un ID de sesión válido en los ejercicios");
       }
     } else {
       console.warn("PracticeExerciseModal: No hay ejercicios disponibles");
     }
   }
   
   return () => {
     // Limpiar temporizadores al desmontar
     if (timerRef.current) {
       clearTimeout(timerRef.current);
       timerRef.current = null;
     }
     
     // Si hay una sesión activa al desmontar, notificar su limpieza
     if (sessionId) {
       console.log(`Limpiando sesión ${sessionId} al desmontar componente`);
     }
   };
 }, [isVisible, exercises]);

 // Verificar si la sesión actual ha sido completada por otro componente
 useEffect(() => {
   if (sessionId && typeof global !== 'undefined' && (global as any).completedSessions) {
     const completedSessions = (global as any).completedSessions as number[];
     
     if (completedSessions.includes(sessionId)) {
       console.log(`PracticeExerciseModal: Detectado que la sesión ${sessionId} ya fue completada globalmente`);
       isSessionCompletedRef.current = true;
     }
   }
 }, [sessionId]);

 // Verificar si la sesión actual ha sido completada por otro componente
useEffect(() => {
  if (sessionId && typeof global !== 'undefined' && (global as any).completedSessions) {
    const completedSessions = (global as any).completedSessions as number[];
    
    if (completedSessions.includes(sessionId)) {
      console.log(`PracticeExerciseModal: Detectado que la sesión ${sessionId} ya fue completada globalmente`);
      isSessionCompletedRef.current = true;
    }
  }
}, [sessionId]);

// Reset contador de FillBlanks cuando cambia ejercicio
useEffect(() => {
  setFillBlanksAttempts(0);
}, [currentIndex]);

 // Escuchar evento global de abandono de sesión 
 useEffect(() => {
   // Creamos un manejador de eventos personalizado para React Native
   const sessionAbandonedHandler = () => {
     if (sessionId) {
       console.log(`PracticeExerciseModal: Manejando abandono de sesión ${sessionId}`);
       
       // Limpiar estados
       setIsAbandoned(true);
       isSessionAbandonedRef.current = true;
       setSessionId(null);
       setIsExiting(false);
       setAbandonModalVisible(false);
       
       // Cerrar modal sin verificaciones adicionales
       handleClose(true);
     }
   };
   
   // Registrar el manejador globalmente para RN
   if (typeof global !== 'undefined') {
     (global as any).sessionAbandonedHandler = sessionAbandonedHandler;
   }
   
   return () => {
     // Limpiar cuando el componente se desmonte
     if (typeof global !== 'undefined') {
       delete (global as any).sessionAbandonedHandler;
     }
   };
 }, [sessionId]);

 // Escuchar evento global de sesión completada
 useEffect(() => {
  // Creamos un manejador de eventos personalizado para React Native
  const sessionCompletedHandler = (completedSessionId: number) => {
    if (sessionId === completedSessionId) {
      console.log(`PracticeExerciseModal: Manejando completado de sesión ${sessionId}`);
      
      // Marcar sesión como completada
      isSessionCompletedRef.current = true;
      
      // Guardar globalmente que esta sesión fue completada
      if (typeof global !== 'undefined') {
        if (!(global as any).completedSessions) {
          (global as any).completedSessions = [];
        }
        
        if (!((global as any).completedSessions as number[]).includes(completedSessionId)) {
          ((global as any).completedSessions as number[]).push(completedSessionId);
        }
      }
    }
  };
  
  // Registrar el manejador globalmente para RN
  if (typeof global !== 'undefined') {
    (global as any).sessionCompletedHandler = sessionCompletedHandler;
  }
  
  return () => {
    // Limpiar cuando el componente se desmonte
    if (typeof global !== 'undefined') {
      delete (global as any).sessionCompletedHandler;
    }
  };
 }, [sessionId]);

 // Añadir manejo de botón atrás
 useEffect(() => {
   const handleBackPress = () => {
     if (isVisible && !isExiting && sessionId && !isAbandoned) {
       // Solo mostrar alerta si la sesión no está completada
       if (!isSessionComplete()) {
         // Mostrar alerta de abandono
         checkAndShowAbandonmentAlert();
         return true; // Evitar que el evento de retroceso se propague
       } else {
         // Si la sesión está completada, cerrar normalmente
         handleClose();
         return true;
       }
     }
     return false; // Permitir navegación por defecto
   };

   BackHandler.addEventListener('hardwareBackPress', handleBackPress);
   return () => {
     BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
   };
 }, [isVisible, sessionId, isExiting, isAbandoned]);

 // Función para verificar penalizaciones y mostrar alerta de abandono
 // Función para verificar penalizaciones y mostrar alerta de abandono
const checkAndShowAbandonmentAlert = async () => {
  if (!sessionId || isAbandoned) {
    console.warn("PracticeExerciseModal: Intentando mostrar alerta sin ID de sesión o ya abandonada");
    return;
  }

  // VERIFICACIÓN CRUCIAL MEJORADA
  if (isSessionComplete()) {
    console.log("PracticeExerciseModal: La sesión ya está completada, no se mostrará alerta de abandono");
    
    // Limpiar estado y cerrar
    const completedSessionId = sessionId;
    setSessionId(null);
    
    // Asegurar que se registre el progreso antes de cerrar
    ApiService.recordProgress('practice', categoryTitle.toLowerCase())
      .then(() => console.log("Progreso registrado al cerrar sesión completada"))
      .catch(err => console.error("Error registrando progreso:", err));
    
    if (onComplete) {
      onComplete();
    }
    onClose();
    
    // Notificar a otros componentes si es necesario
    if (typeof global !== 'undefined' && (global as any).handleSessionCompletedGlobal) {
      (global as any).handleSessionCompletedGlobal(completedSessionId);
    }
    
    return;
  }

  // Evitar múltiples verificaciones simultáneas
  if (isExiting) {
    console.log("PracticeExerciseModal: Ya se está procesando una salida");
    return;
  }

  setIsExiting(true); // Evitar múltiples alertas

  try {
    // Intentar obtener información de penalizaciones
    console.log(`PracticeExerciseModal: Verificando penalizaciones para sesión ${sessionId}`);
    const penaltyInfo = await ApiService.checkAbandonmentPenalty(sessionId, 'practice');
    console.log("PracticeExerciseModal: Información de penalización recibida:", penaltyInfo);
    
    setAffectedWords(penaltyInfo.affected_words || []);
    setAbandonmentWarning(penaltyInfo.warning_message || "Abandonar esta sesión puede resultar en penalizaciones.");
    setAbandonmentConsequence(penaltyInfo.abandonment_consequence || {
       mode: 'practice',
       failure_penalty: 2,
       total_words_affected: 0
    });
    setAbandonModalVisible(true);
  } catch (error) {
    console.error("PracticeExerciseModal: Error al verificar penalizaciones:", error);
    
    // 🆕 NUEVO: Si el error indica que la sesión ya está completada, manejar como completada
    if (error instanceof Error && 
        (error.message.includes("completada") || 
         error.message.includes("completed") || 
         error.message.includes("ya está completada"))) {
      console.log("PracticeExerciseModal: Error indica sesión completada, cerrando directamente");
      
      // Marcar como completada
      isSessionCompletedRef.current = true;
      
      // Actualizar registro global
      if (typeof global !== 'undefined') {
        if (!(global as any).completedSessions) {
          (global as any).completedSessions = [];
        }
        
        if (!((global as any).completedSessions as number[]).includes(sessionId)) {
          ((global as any).completedSessions as number[]).push(sessionId);
        }
        
        // Notificar globalmente
        if ((global as any).handleSessionCompletedGlobal) {
          (global as any).handleSessionCompletedGlobal(sessionId);
        }
      }
      
      // Limpiar estado
      const completedSessionId = sessionId;
      setSessionId(null);
      setIsExiting(false);
      
      // Registrar progreso si es necesario
      ApiService.recordProgress('practice', categoryTitle.toLowerCase())
        .then(() => console.log("Progreso registrado al manejar sesión completada"))
        .catch(err => console.error("Error registrando progreso:", err));
      
      // Cerrar directamente sin mostrar alerta
      if (onComplete) {
        onComplete();
      }
      onClose();
      return;
    }
    
    setIsExiting(false);
    
    // Para otros errores, mostrar alerta genérica
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
            handleConfirmAbandon();
          }
        }
      ]
    );
  }
}; 

 const handleConfirmAbandon = async () => {
  if (!sessionId || isAbandoned) {
    if (!sessionId) {
      Alert.alert("Error", "No se puede identificar la sesión actual");
    }
    setAbandonModalVisible(false);
    setIsExiting(false);
    return;
  }
  
  // Si la sesión ya está completada, no hacer nada
  if (isSessionComplete()) {
    console.log(`PracticeExerciseModal: La sesión ${sessionId} ya está completada, no se procesará el abandono`);
    setAbandonModalVisible(false);
    setIsExiting(false);
    handleClose();
    return;
  }
  
  try {
    setIsLoading(true);
    
    // Marcar como abandonada para evitar procesamiento múltiple
    setIsAbandoned(true);
    isSessionAbandonedRef.current = true;
    
    console.log(`PracticeExerciseModal: Abandonando sesión ${sessionId}`);
    console.log(`Enviando solicitud para abandonar sesión ${sessionId}`);
    
    try {
      await ApiService.abandonSession(sessionId, 'practice');
      console.log("PracticeExerciseModal: Sesión abandonada correctamente");
    } catch (apiError: any) {
      // Verificar si el error es porque la sesión ya está completada
      if (apiError.message && (
          apiError.message.includes("ya está completada") || 
          apiError.message.includes("already completed"))) {
        console.log("La sesión ya estaba completada, tratando como éxito");
        // Tratar como éxito si la sesión ya está completada
        isSessionCompletedRef.current = true;
        
        // Actualizar registro global
        if (typeof global !== 'undefined') {
          if (!(global as any).completedSessions) {
            (global as any).completedSessions = [];
          }
          
          if (!((global as any).completedSessions as number[]).includes(sessionId)) {
            ((global as any).completedSessions as number[]).push(sessionId);
          }
        }
      } else {
        // Propagar el error para otros casos
        throw apiError;
      }
    }
    
    setAbandonModalVisible(false);
    
    // IMPORTANTE: Limpiar estados ANTES de llamar a handleClose
    const abandonedId = sessionId;
    setSessionId(null);
    setIsExiting(false);
    setIsLoading(false);
    
    // Notificar a otros componentes del abandono en React Native
    if (typeof global !== 'undefined') {
      if ((global as any).sessionAbandonHandler) {
        (global as any).sessionAbandonHandler(abandonedId);
      }
      
      // También llamar a handleSessionAbandonedGlobal si existe
      if ((global as any).handleSessionAbandonedGlobal) {
        (global as any).handleSessionAbandonedGlobal(abandonedId);
      }
    }
    
    // MODIFICACIÓN: Cerrar directamente en lugar de usar setTimeout
    if (onComplete) {
      onComplete();
    }
    onClose();
    
  } catch (error) {
    console.error("PracticeExerciseModal: Error al abandonar sesión:", error);
    setIsLoading(false);
    setIsAbandoned(false); // Revertir el flag si falla
    isSessionAbandonedRef.current = false;
    
    // Mostrar error al usuario y dar opciones
    Alert.alert(
      "Error al abandonar",
      "No se pudo abandonar la sesión. ¿Qué deseas hacer?",
      [
        {
          text: "Reintentar",
          onPress: () => handleConfirmAbandon()
        },
        {
          text: "Cancelar",
          style: "cancel",
          onPress: () => {
            setAbandonModalVisible(false);
            setIsExiting(false);
          }
        },
        {
          text: "Forzar salida",
          style: "destructive",
          onPress: () => {
            // Salida de emergencia
            setAbandonModalVisible(false);
            setIsExiting(false);
            setSessionId(null);
            setIsAbandoned(true);
            isSessionAbandonedRef.current = true;
            handleClose(true);
          }
        }
      ]
    );
  }
}; 

 const handleCancelAbandon = () => {
   setAbandonModalVisible(false);
   setIsExiting(false);
 };

 // Modificado para aceptar flag de abandono
// Modificado para aceptar flag de abandono
const handleClose = (wasAbandoned = false) => {
  console.log("PracticeExerciseModal: Intentando cerrar. Estado:", {
    currentIndex,
    showSummary,
    sessionId,
    isExiting,
    isAbandoned,
    isSessionCompletedRef: isSessionCompletedRef.current,
    totalExercises: exercises.length
  });

  // Limpiar cualquier mensaje de feedback pendiente
  setFeedback("");

  // Si estamos mostrando el resumen o la sesión está completada, SIEMPRE cerrar
  if (showSummary || isSessionCompletedRef.current) {
    console.log("PracticeExerciseModal: Cerrando desde resumen o sesión completada");
    
    // Notificar completado una última vez si es necesario
    if (sessionId && !isAbandoned && !isSessionAbandonedRef.current) {
      try {
        // Registrar progreso si es necesario (esto no debe bloquear el cierre)
        ApiService.recordProgress('practice', categoryTitle.toLowerCase())
          .then(() => console.log("Progreso registrado al cerrar"))
          .catch(err => console.error("Error registrando progreso:", err));
      } catch (error) {
        console.error("Error al registrar progreso final:", error);
      }
    }
    
    // Garantizar que se llame a onComplete antes de onClose
    if (onComplete) {
      console.log("PracticeExerciseModal: Llamando a onComplete");
      onComplete();
    }
    
    // Llamada directa a onClose con setTimeout para asegurar que
    // la UI tenga tiempo de procesar los cambios de estado antes de cerrar
    setTimeout(() => {
      console.log("PracticeExerciseModal: Llamando a onClose definitivo");
      onClose();
    }, 100);
    
    return;
  }
  
  // Si hay una sesión activa y no completada, mostrar alerta de abandono
  if (sessionId && !isExiting && !isAbandoned && !isSessionAbandonedRef.current) {
    console.log(`PracticeExerciseModal: Mostrando alerta de abandono para sesión ${sessionId}`);
    checkAndShowAbandonmentAlert();
    return;
  }
  
  // En cualquier otro caso, cerrar normalmente
  console.log("PracticeExerciseModal: Cierre directo en caso no manejado");
  if (onComplete) {
    onComplete();
  }
  onClose();
};

 const normalizeExerciseData = (exercise: Exercise): Exercise => {
   if (!exercise) return {} as Exercise;
   
   console.log(`Normalizando ejercicio tipo: ${exercise.type}`);
   
   const normalizedExercise = { ...exercise };
   
   if (normalizedExercise.type === 'frases_comunes') {
     normalizedExercise.type = 'multiple_choice';
   }
   
   if (normalizedExercise.distractors) {
     if (typeof normalizedExercise.distractors === 'object' && !Array.isArray(normalizedExercise.distractors)) {
       if (normalizedExercise.distractors.options && Array.isArray(normalizedExercise.distractors.options)) {
         normalizedExercise.distractors = normalizedExercise.distractors.options;
       }
     }
   } else {
     normalizedExercise.distractors = [];
   }
   
   if (!normalizedExercise.object_translation) {
     normalizedExercise.object_translation = {
       id: normalizedExercise.id || 0,
       spanish: normalizedExercise.spanish_translation || "",
       quechua: normalizedExercise.answer || ""
     };
   }
   
   return normalizedExercise;
 };

 // Agregar después de handleExerciseComplete
 const triggerResetConsecutiveFailures = () => {
   if (typeof global !== 'undefined') {
     // Intentar método directo primero
     if ('resetConsecutiveFailures' in global) {
       (global as any).resetConsecutiveFailures();
     }
   }
 };

 const handleExerciseComplete = async (isCorrect: boolean, userAnswer?: string) => {
  console.log(`Ejercicio completado - Correcto: ${isCorrect}`);
   
// Obtener el ejercicio actual antes de cambiar el índice
const currentExercise = exercises[currentIndex];

// ✅ AGREGAR SONIDO AQUÍ - PRIMERA LÍNEA DESPUÉS DE OBTENER currentExercise
// Reproducir sonido de resultado
if (soundEnabled && currentExercise.type !== 'fill_blanks') {  // ← SOLO ESTA LÍNEA CAMBIÓ
  try {
    const soundType = isCorrect ? 'correct' : 'incorrect';
    
    // Solo reproducir si no está en cooldown
    if (canPlaySound(soundType)) {
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
    }
  } catch (error) {
    console.error("Error reproduciendo sonido:", error);
  }
}

// Trackear intentos para FillBlanks
if (!isCorrect && currentExercise.type === 'fill_blanks') {
  setFillBlanksAttempts(prev => prev + 1);
} else if (isCorrect && currentExercise.type === 'fill_blanks') {
  setFillBlanksAttempts(0);
}
  
  // Verificar si este es el último ejercicio
  const isLastExercise = currentIndex === exercises.length - 1;
  const isLastReviewAttempt = isReviewMode && progressInfo.total <= 1;
  
  // Si es el último y la respuesta es correcta, marcar la sesión como completada
  if ((isLastExercise || isLastReviewAttempt) && isCorrect && !isSessionCompletedRef.current) {
    console.log("Último ejercicio completado correctamente, preparando finalización");
    isSessionCompletedRef.current = true;
    
    // Registrar completado globalmente
    if (sessionId && typeof global !== 'undefined') {
      if (!(global as any).completedSessions) {
        (global as any).completedSessions = [];
      }
      
      if (!((global as any).completedSessions as number[]).includes(sessionId)) {
        ((global as any).completedSessions as number[]).push(sessionId);
        console.log(`Registrando última sesión completada: ${sessionId}`);
      }
    }
  }
  
  handleExerciseAnswer(isCorrect);
  
  // Enviar respuesta al backend usando ApiService
  if (currentExercise) {
    try {
      // Usar ApiService para enviar respuesta, especificando el modo
      // ✅ USAR respuesta real del usuario
      const actualUserAnswer = userAnswer || currentUserAnswer || currentExercise.answer;
      console.log(`🎯 Enviando respuesta real: "${actualUserAnswer}" vs correcta: "${currentExercise.answer}"`);

      console.log(`🎯 Enviando respuesta al backend: ejercicio ${currentExercise.id}, respuesta "${actualUserAnswer}", modo: practice`);
        const result = await ApiService.submitExerciseAnswer(
          currentExercise.id, 
          actualUserAnswer,
          'practice'
        );
        console.log('✅ Respuesta del backend procesada:', result);
      // ✅ NUEVO: Usar respuesta completa del backend
    if (result && (result.mastery_updated || result.mastery_decreased)) {
      console.log('📊 Cambio de maestría en práctica:', {
        word: currentExercise.answer,
        previousLevel: result.previous_mastery_level,
        newLevel: result.mastery_level,
        wasUpdated: result.mastery_updated,
        wasDecreased: result.mastery_decreased
      });
  
  // Forzar refresh inmediato del progreso
  progressEvents.emit('force_refresh_progress');
}
      console.log('Respuesta completa del servidor:', result);
      
            // ✅ NUEVO: Notificar cambios de progreso
      if (result.mastery_updated || result.mastery_decreased) {
        progressEvents.emit('progress_updated', {
          type: result.mastery_updated ? 'mastery_increase' : 'mastery_decrease',
          word: currentExercise.answer,
          mode: 'practice'
        });
      }

      // Mostrar alerta si se actualizó el dominio de la palabra
      if (result.mastery_updated && result.mastery_level === 5) {
        // Mostrar alert de aumento de nivel de maestría usando información detallada
        setMasteryChangeData({
          word: currentExercise.answer,
          wordTranslation: currentExercise.object_translation?.spanish || "",
          previousLevel: result.previous_mastery_level || (result.mastery_level - 1),
          newLevel: result.mastery_level,
          changeType: 'increase',
          message: "¡Has dominado completamente esta palabra!"
        });
        setShowMasteryChangeAlert(true);
      } else if (result.mastery_decreased) {
        // Ya no necesitamos resetear contadores manualmente
        // El backend ya ha actualizado el contador correctamente
        console.log("Degradación detectada, datos:", {
          previo: result.previous_mastery_level,
          nuevo: result.mastery_level,
          fallosActuales: result.consecutive_failures,
          límite: result.consecutive_failures_limit
        });
        
        // Mostrar alert de degradación de nivel de maestría con datos precisos
        setMasteryChangeData({
          word: currentExercise.answer,
          wordTranslation: currentExercise.object_translation?.spanish || "",
          previousLevel: result.previous_mastery_level || (result.mastery_level + 1),
          newLevel: result.mastery_level,
          changeType: 'decrease',
          message: result.degradation_message || "Esta palabra necesita más práctica. ¡Sigue intentándolo!"
        });
        setShowMasteryChangeAlert(true);
      }
      
      // Registrar información detallada para depuración
      if (result.is_recent_word || !result.is_minimally_practiced) {
        console.log("Información de protección:", {
          isPalabraNueva: result.is_recent_word,
          diasProtección: result.is_recent_word ? (result.mode === 'detection' ? 3 : 1) : 0,
          ejerciciosCompletados: result.exercises_completed || 0,
          ejerciciosNecesarios: result.exercises_needed || 0,
          tieneEstrellas: (result.mastery_level || 1) > 1
        });
      }
      
    } catch (error) {
      console.error('Error al enviar respuesta:', error);
      // No bloquear el flujo si hay error en el envío
    }
  }
};

 const resetExercises = () => {
   setCurrentIndex(0);
   setShowSummary(false);
   setIsLoading(false);
   resetReviewSystem();
 };

 const renderSummary = () => (
  <View style={styles.summaryContainer}>
    <Text style={styles.summaryTitle}>¡Práctica Completada!</Text>
    <Text style={styles.summaryText}>¡Has completado los ejercicios!</Text>
    
    <TouchableOpacity style={styles.button} onPress={resetExercises}>
      <Text style={styles.buttonText}>Practicar de Nuevo</Text>
    </TouchableOpacity>
    
    <TouchableOpacity
      style={[styles.button, {backgroundColor: '#4CAF50', marginTop: 10}]}
      onPress={() => {
        console.log("Botón Volver al Menú - NAVEGACIÓN FORZADA");
        
        // 1. Forzar registro de flags primero
        isSessionCompletedRef.current = true;
        hasCompletedRef.current = true;
        
        // 2. Registrar en estado global
        if (sessionId && typeof global !== 'undefined') {
          if (!(global as any).completedSessions) {
            (global as any).completedSessions = [];
          }
          
          if (!((global as any).completedSessions as number[]).includes(sessionId)) {
            ((global as any).completedSessions as number[]).push(sessionId);
          }
          
          // 3. Notificar globalmente
          if ((global as any).handleSessionCompletedGlobal) {
            (global as any).handleSessionCompletedGlobal(sessionId);
          }
        }
        
        // 4. Registrar progreso
        if (sessionId) {
          ApiService.recordProgress('practice', categoryTitle.toLowerCase())
            .then(() => console.log("Progreso registrado en navegación forzada"))
            .catch(err => console.error("Error registrando progreso:", err));
        }
        
        // 5. Llamar a los callbacks directamente, sin usar handleClose
        // Crucial: ejecutar onComplete antes de onClose
        if (onComplete) {
          onComplete();
        }
        
        // 6. Cerrar el modal - CLAVE: llamar a onClose en último lugar
        onClose();
      }}
    >
      <Text style={styles.buttonText}>Volver al Menú</Text>
    </TouchableOpacity>
  </View>
);

 const renderExercise = () => {
  if (exercises.length === 0 || currentIndex >= exercises.length) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No se pudieron cargar los ejercicios</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => handleClose()}>
          <Text style={styles.buttonText}>Volver al menú</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const rawExercise = exercises[currentIndex];
  console.log(`Ejercicio original tipo: ${rawExercise.type}`);
  
  const exercise = normalizeExerciseData(rawExercise);
  
  const exerciseKey = `exercise-${currentIndex}-${Date.now()}`;

  if (!exercise || !exercise.type || !exercise.question || !exercise.answer) {
    console.error("Ejercicio inválido:", exercise);
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Formato de ejercicio no válido</Text>
        <TouchableOpacity
         style={styles.skipButton}
         onPress={continueToNext}
       >
         <Text style={styles.buttonText}>Continuar</Text>
       </TouchableOpacity>
     </View>
   );
 }
 
 return (
   <View style={styles.exerciseContainer}>
     {/* Añadir el componente del sistema de revisión */}
     <ExerciseReviewUI isReviewMode={isReviewMode} attemptsInfo={attemptsInfo} />
     
     {/* Feedback si está disponible */}
{feedback !== "" && (
  <View style={[
    styles.feedbackContainer,
    feedback.includes("¡") || feedback.includes("Correcto") 
      ? styles.correctFeedback 
      : styles.incorrectFeedback
  ]}>
    <Text style={styles.feedbackText}>{feedback}</Text>
    {/* Botón para continuar cuando hay feedback */}
    <TouchableOpacity
      style={[styles.button, {marginTop: 12, width: 'auto', paddingHorizontal: 30}]}
      onPress={() => {
        // Verificar si este es el último ejercicio antes de continuar
        const isLastExercise = currentIndex === exercises.length - 1;
        const isLastReviewAttempt = isReviewMode && progressInfo.total <= 1;
        
        if (isLastExercise || isLastReviewAttempt) {
          console.log("Último ejercicio completado, finalizando sesión");
          
          // Marcar como completado
          isSessionCompletedRef.current = true;
          
          // Notificar a nivel global
          if (sessionId && typeof global !== 'undefined') {
            // Guardar en el registro global
            if (!(global as any).completedSessions) {
              (global as any).completedSessions = [];
            }
            
            if (!((global as any).completedSessions as number[]).includes(sessionId)) {
              ((global as any).completedSessions as number[]).push(sessionId);
              console.log(`Registrando globalmente sesión completada final: ${sessionId}`);
            }
            
            // Llamar al manejador global
            if ((global as any).handleSessionCompletedGlobal) {
              (global as any).handleSessionCompletedGlobal(sessionId);
            }
          }
          
          // Mostrar resumen
          setShowSummary(true);
        } else {
          // Si no es el último, continuar normalmente
          continueToNext();
        }
      }}
    >
      <Text style={styles.buttonText}>Continuar</Text>
    </TouchableOpacity>
  </View>
)}
     
     {/* Renderizar ejercicios - FillBlanks siempre visible para su mensaje */}
     {feedback === "" && (
       <>
         {exercise.type === 'multiple_choice' && (
           <ExerciseMultipleChoice
             key={exerciseKey}
             question={exercise.question}
             options={[
               { text: exercise.answer, isCorrect: true },
               ...(Array.isArray(exercise.distractors) ? 
                 exercise.distractors.map((d: any) => ({ text: d, isCorrect: false })) : 
                 [])
             ]}
             onComplete={handleExerciseComplete}
             difficulty={exercise.difficulty}
           />
         )}
     
         {exercise.type === 'anagram' && (
           <AnagramExercise
             key={exerciseKey}
             question={exercise.question}
             correctWord={exercise.answer}
             spanishTranslation={
               exercise.object_translation?.spanish || 
               exercise.spanish_translation || 
               ""
             }
             onComplete={handleExerciseComplete}
             difficulty={exercise.difficulty}
           />
         )}
     
         {exercise.type === 'pronunciation' && (
           <PronunciationExercise
             key={exerciseKey}
             question={exercise.question}
             wordToProunounce={exercise.answer}
             spanishTranslation={exercise.object_translation?.spanish || ""}
             phoneticGuide={
               typeof exercise.distractors === 'object' && 
               !Array.isArray(exercise.distractors) ? 
               exercise.distractors.phonetic_guide : undefined
             }
             onComplete={handleExerciseComplete}
             difficulty={exercise.difficulty}
           />
         )}
     
         {exercise.type === 'matching' && 
           typeof exercise.distractors === 'object' && 
           !Array.isArray(exercise.distractors) && 
           Array.isArray(exercise.distractors.pairs) && (
           <MatchingExercise
             key={exerciseKey}
             question={exercise.question}
             pairs={exercise.distractors.pairs.map((pair: any, index: number) => ({
               id: index + 1,
               spanish: pair.spanish || "",
               quechua: pair.quechua || ""
             }))}
             onComplete={handleExerciseComplete}
             difficulty={exercise.difficulty}
             onContinue={continueToNext}
           />
         )}
     
        {exercise.type === 'fill_blanks' && (
          <FillBlanksExercise
            key={exerciseKey}
            question={exercise.question}
            answer={exercise.answer}
            difficulty={exercise.difficulty}
            currentAttempt={fillBlanksAttempts}
            maxAttempts={2}
            mode="practice"
            onComplete={(isCorrect: boolean, userAnswer?: string) => {
              setCurrentUserAnswer(userAnswer || '');
              handleExerciseComplete(isCorrect, userAnswer);
            }}
          />
        )}
       </>
     )}
   </View>
 );
};

return (
 <>
   <Modal
     visible={isVisible}
     animationType="slide"
     onRequestClose={() => handleClose()}
   >
     <View style={styles.container}>
       <View style={styles.header}>
         <Text style={styles.headerTitle}>{categoryTitle}</Text>
         <TouchableOpacity style={styles.closeIcon} onPress={() => handleClose()}>
           <Ionicons name="close" size={24} color="white" />
         </TouchableOpacity>
       </View>

       <ScrollView contentContainerStyle={styles.content}>
         {showSummary ? renderSummary() : (
           <>
             <Text style={styles.progressText}>
                Ejercicio {progressInfo.current} de {progressInfo.total}
             </Text>
             {renderExercise()}
           </>
         )}
       </ScrollView>
       
       {isLoading && (
         <View style={styles.overlayLoading}>
           <ActivityIndicator size="large" color="#FF0000" />
           <Text style={styles.loadingText}>Cargando siguiente ejercicio...</Text>
         </View>
       )}
     </View>
   </Modal>

   {/* Modal de abandono de sesión */}
   <AbandonSessionAlert
     visible={abandonModalVisible}
     onCancel={handleCancelAbandon}
     onConfirm={handleConfirmAbandon}
     warningMessage={abandonmentWarning}
     affectedWords={affectedWords}
     abandonmentConsequence={abandonmentConsequence || {
       mode: 'practice',
       failure_penalty: 2,
       total_words_affected: 0
     }}
   />

   {/* Modal de cambio de nivel de maestría */}
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

const styles = StyleSheet.create({
 container: {
   flex: 1,
   backgroundColor: '#f5f5f5',
 },
 header: {
   backgroundColor: '#FF0000',
   padding: 16,
   paddingTop: 40,
   flexDirection: 'row',
   justifyContent: 'space-between',
   alignItems: 'center',
 },
 headerTitle: {
   color: 'white',
   fontSize: 20,
   fontWeight: 'bold',
 },
 closeIcon: {
   padding: 8,
 },
 content: {
   padding: 16,
 },
 progressText: {
   textAlign: 'center',
   fontSize: 16,
   marginBottom: 16,
   color: '#666',
 },
 exerciseContainer: {
   backgroundColor: 'white',
   borderRadius: 16,
   padding: 16,
   marginVertical: 8,
   elevation: 2,
   shadowColor: '#000',
   shadowOffset: { width: 0, height: 1 },
   shadowOpacity: 0.1,
   shadowRadius: 2,
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
   padding: 20,
 },
 summaryTitle: {
   fontSize: 24,
   fontWeight: 'bold',
   marginBottom: 16,
 },
 summaryText: {
   fontSize: 18,
   marginBottom: 24,
 },
 button: {
   backgroundColor: '#FF0000',
   padding: 16,
   borderRadius: 8,
   width: '100%',
   marginBottom: 12,
 },
 buttonText: {
   color: 'white',
   textAlign: 'center',
   fontWeight: 'bold',
 },
 closeButton: {
   padding: 16,
 },
 closeButtonText: {
   color: '#666',
   textAlign: 'center',
 },
 errorContainer: {
   padding: 20,
   alignItems: 'center',
   backgroundColor: '#ffebee',
   borderRadius: 8,
   margin: 10,
 },
 errorText: {
   fontSize: 16,
   color: '#d32f2f',
   textAlign: 'center',
   marginBottom: 20,
 },
 retryButton: {
   backgroundColor: '#4CAF50',
   paddingVertical: 10,
   paddingHorizontal: 20,
   borderRadius: 20,
 },
 skipButton: {
   backgroundColor: '#FF9800',
   paddingVertical: 10,
   paddingHorizontal: 20,
   borderRadius: 20,
 },
 overlayLoading: {
   position: 'absolute',
   top: 0,
   left: 0,
   right: 0,
   bottom: 0,
   backgroundColor: 'rgba(255,255,255,0.7)',
   justifyContent: 'center',
   alignItems: 'center',
   zIndex: 1000,
 },
 loadingText: {
   marginTop: 12,
   fontSize: 16,
   color: '#666',
 }
});