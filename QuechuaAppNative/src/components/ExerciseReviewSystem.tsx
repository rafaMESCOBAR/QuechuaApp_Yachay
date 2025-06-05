// src/components/ExerciseReviewSystem.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Hook para manejar el sistema de revisión
export const useExerciseReview = (
  mode: 'detection' | 'practice',
  currentIndex: number,
  totalExercises: number,
  onAdvance: (nextIndex: number) => void,
  onSetFeedback: (message: string) => void
) => {
  const [pendingExercises, setPendingExercises] = React.useState<number[]>([]);
  const [exerciseAttempts, setExerciseAttempts] = React.useState<Record<number, number>>({});
  const [completedExercises, setCompletedExercises] = React.useState<Record<number, boolean>>({});
  const [isReviewMode, setIsReviewMode] = React.useState(false);
  
  // Intentos máximos según el modo
  const MAX_ATTEMPTS = mode === 'detection' ? 3 : 2;
  
  // Función para filtrar mensajes de feedback negativos
  const setFeedbackSafe = (message: string) => {
    if (mode === 'detection') {
      onSetFeedback(message);
    } else {
      // ✅ MOSTRAR TAMBIÉN MENSAJES DE ERROR EN PRÁCTICA
      if (message.includes('¡') || 
          message.includes('Vamos a repasar') ||
          message.includes('Incorrecto') ||
          message.includes('La respuesta correcta')) {
        onSetFeedback(message);
      } else {
        console.log("Mensaje de feedback suprimido en modo práctica:", message);
      }
    }
  };
  
  // Función para manejar una respuesta
  // Función para manejar una respuesta
  const handleExerciseAnswer = (isCorrect: boolean, serverData?: any) => {
    console.log(`Ejercicio ${currentIndex} - Respuesta correcta: ${isCorrect} - Modo: ${mode}`);
    
    // Usar datos del servidor si están disponibles
    const hasServerData = serverData && typeof serverData === 'object';
    const wasLevelDecreased = hasServerData ? serverData.mastery_decreased : false;
    
    if (isCorrect) {
      // Si es correcta, marcar como completada
      setCompletedExercises(prev => ({
        ...prev,
        [currentIndex]: true
      }));
      
      // Eliminar inmediatamente del array de pendientes cuando se responde correctamente
      setPendingExercises(prev => prev.filter(idx => idx !== currentIndex));
      
      // Avanzar al siguiente con un pequeño retraso
      setFeedbackSafe("¡Correcto!");
      setTimeout(() => {
        advanceToNextExercise();
      }, 1500);
      return true;
    }
    
    // Si es incorrecta, manejar los intentos
    let currentAttempts = exerciseAttempts[currentIndex] || 0;
    
    // Si hubo degradación reportada por el servidor, ajustar comportamiento
    if (hasServerData && wasLevelDecreased) {
      // Si hubo degradación, pasar directamente al siguiente ejercicio
      console.log("Nivel degradado detectado desde servidor, avanzando al siguiente ejercicio");
      
      // Agregar a pendientes solo si no está ya incluido
      setPendingExercises(prev => {
        if (!prev.includes(currentIndex)) {
          return [...prev, currentIndex];
        }
        return prev;
      });
      
      // Avanzar automáticamente después de un breve retraso
      setTimeout(() => {
        advanceToNextExercise();
      }, 1500);
      
      return false;
    }
    
    // Si no hubo degradación, comportamiento normal
    const newAttempts = currentAttempts + 1;
    
    console.log(`Intento ${newAttempts} de ${MAX_ATTEMPTS}`);
    
    // Actualizar estado de intentos
    setExerciseAttempts(prev => ({
      ...prev,
      [currentIndex]: newAttempts
    }));
    
    // Comportamiento específico para el modo detección
    if (mode === 'detection') {
      if (newAttempts >= MAX_ATTEMPTS && !isReviewMode) {
        // Si se agotaron los intentos en modo detección
        console.log("Intentos agotados en modo detección, avanzando automáticamente");
        
        // NO mostrar mensaje antes de avanzar
        // Eliminado: setFeedbackSafe(`Intentos agotados. La respuesta correcta es visible en verde.`);
        
        // Agregar a pendientes para revisión final
        setPendingExercises(prev => {
          if (!prev.includes(currentIndex)) {
            return [...prev, currentIndex];
          }
          return prev;
        });
        
        // Avanzar automáticamente después de un tiempo para ver la respuesta
        setTimeout(() => {
          advanceToNextExercise();
        }, 2000);
        
        return false;
      } else if (newAttempts < MAX_ATTEMPTS) {
        // Todavía tiene intentos disponibles en modo detección
        // NO mostrar feedback para intentos fallidos
        // Eliminado: setFeedbackSafe(`Incorrecto. Intento ${newAttempts} de ${MAX_ATTEMPTS}`);
        return false;
      }
    } else {
      // Comportamiento original para modo práctica (sin cambios)
      if (newAttempts >= MAX_ATTEMPTS && !isReviewMode) {
        console.log("Intentos agotados, agregando a pendientes");
        
        // Agregar a pendientes solo si no está ya incluido
        setPendingExercises(prev => {
          if (!prev.includes(currentIndex)) {
            return [...prev, currentIndex];
          }
          return prev;
        });
        
        // Avanzar automáticamente después de un breve retraso
        setTimeout(() => {
          console.log("Avanzando automáticamente después de agotar intentos");
          advanceToNextExercise();
        }, 1000);
        
        return false;
      } else if (isReviewMode && newAttempts >= MAX_ATTEMPTS * 2) {
        // En modo repaso, permitir más intentos pero sin mensajes
        return false;
      } else {
        // No mostrar mensajes negativos en modo práctica (comportamiento original)
        return false;
      }
    }
    
    // Si llegamos aquí en modo revisión
    if (isReviewMode) {
      return false;
    }
    
    return false;
  };
  
  // Función para continuar sin resolver ejercicio actual
  const continueToNext = () => {
    console.log("Función continueToNext llamada");
    
    // Solo hacer algo si no estamos en revisión
    if (!isReviewMode) {
      // Guardar ejercicio actual como pendiente si no estaba ya
      setPendingExercises(prev => {
        if (!prev.includes(currentIndex)) {
          return [...prev, currentIndex];
        }
        return prev;
      });
      
      // Avanzar inmediatamente sin mostrar mensajes
      advanceToNextExercise();
    } else {
      // En modo revisión, simplemente avanzar
      advanceToNextExercise();
    }
  };
  
  // Función para avanzar al siguiente ejercicio o a revisión
  const advanceToNextExercise = () => {
    console.log("Avanzando al siguiente ejercicio - Revisión:", isReviewMode);
    console.log("Índice actual:", currentIndex, "Total:", totalExercises);
    console.log("Ejercicios pendientes:", pendingExercises);
    
    // SOLUCIÓN: Manejar caso de revisión específicamente
    if (isReviewMode) {
      if (pendingExercises.length > 0) {
        // Aún hay ejercicios pendientes, mostrar el siguiente
        const nextIndex = pendingExercises[0];
        setPendingExercises(prev => prev.slice(1)); // Quitar el primero
        onAdvance(nextIndex);
      } else {
        // No quedan ejercicios pendientes, terminar
        console.log("No quedan ejercicios pendientes en revisión, terminando");
        onAdvance(-1); // Terminar ejercicios
      }
      return;
    }
    
    // Si es el último ejercicio regular
    if (currentIndex >= totalExercises - 1) {
      // IMPORTANTE: Usar una copia local de pendingExercises para evitar problemas de actualización
      const currentPendingExercises = [...pendingExercises];
      
      // Si hay ejercicios pendientes y no estamos ya en revisión
      if (currentPendingExercises.length > 0 && !isReviewMode) {
        console.log("Cambiando a modo revisión");
        
        // Filtrar para incluir solo los ejercicios realmente incompletos
        const reallyPendingExercises = currentPendingExercises.filter(index => {
          // Un ejercicio está realmente pendiente si no fue completado correctamente
          return completedExercises[index] !== true;
        });
        
        console.log("Ejercicios realmente pendientes después del filtrado:", reallyPendingExercises);
        
        // Si no hay ejercicios realmente pendientes, terminar
        if (reallyPendingExercises.length === 0) {
          console.log("No hay ejercicios realmente pendientes, terminando");
          onAdvance(-1); // Terminar ejercicios
          return;
        }
        
        // Cambiar a modo revisión
        setIsReviewMode(true);
        
        // Reiniciar intentos para ejercicios pendientes
        const resetAttempts = {...exerciseAttempts};
        reallyPendingExercises.forEach(index => {
          resetAttempts[index] = 0;
        });
        setExerciseAttempts(resetAttempts);
        
        // Ir al primer ejercicio pendiente
        const nextIndex = reallyPendingExercises[0];
        
        // Actualizar lista de pendientes sin el primero
        setPendingExercises(reallyPendingExercises.slice(1));
        
        // Mensaje claro sobre el modo repaso
        setFeedbackSafe("Vamos a repasar las palabras pendientes.");
        
        // Llamar al callback para avanzar
        onAdvance(nextIndex);
      } else {
        console.log("Terminando ejercicios");
        // Terminar ejercicios
        onAdvance(-1); // -1 indica fin de ejercicios
      }
    } else {
      console.log("Avanzando al siguiente índice:", currentIndex + 1);
      // Avanzar al siguiente normalmente
      onAdvance(currentIndex + 1);
    }
  };
  
  // Información sobre intentos del ejercicio actual
  const attemptsInfo = {
    current: exerciseAttempts[currentIndex] || 0,
    max: MAX_ATTEMPTS,
    remaining: Math.max(0, MAX_ATTEMPTS - (exerciseAttempts[currentIndex] || 0))
  };
  
  // NUEVA FUNCIÓN: Información de progreso basada en modo
  const progressInfo = React.useMemo(() => {
    if (isReviewMode) {
      // En modo revisión, mostrar progreso basado en ejercicios pendientes reales
      const totalPending = pendingExercises.length + 1; // +1 para incluir el ejercicio actual
      
      // Calcular qué número de ejercicio pendiente estamos mostrando
      // En revisión, siempre mostramos el primer ejercicio pendiente como 1/N
      return {
        current: 1,
        total: totalPending
      };
    } else {
      // En modo normal, usar el índice y total normales
      return {
        current: currentIndex + 1,
        total: totalExercises
      };
    }
  }, [isReviewMode, currentIndex, totalExercises, pendingExercises.length]);
  
  return {
    isReviewMode,
    pendingExercises,
    attemptsInfo,
    progressInfo, // AÑADIDO: Exportar información de progreso
    handleExerciseAnswer,
    continueToNext,
    advanceToNextExercise,
    resetReviewSystem: () => {
      setPendingExercises([]);
      setExerciseAttempts({});
      setCompletedExercises({});
      setIsReviewMode(false);
    }
  };
};

// Componente para mostrar UI de revisión
export const ExerciseReviewUI = ({ 
  isReviewMode,
  attemptsInfo
}: { 
  isReviewMode: boolean;
  attemptsInfo: { current: number; max: number; remaining: number }
}) => (
  <>
    {/* Banner de modo revisión */}
    {isReviewMode && (
      <View style={styles.reviewBanner}>
        <Text style={styles.reviewText}>REPASO: Palabras pendientes</Text>
      </View>
    )}
    
    {/* Indicador de intentos (solo si no es revisión y hay intentos) */}
    {attemptsInfo.current > 0 && isReviewMode && (
      <View style={styles.attemptsContainer}>
        <Text style={styles.attemptsText}>
          Modo repaso: puedes intentarlo hasta acertar
        </Text>
      </View>
    )}
  </>
);

const styles = StyleSheet.create({
  reviewBanner: {
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  reviewText: {
    color: '#E65100',
    fontWeight: 'bold',
    fontSize: 14,
  },
  attemptsContainer: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  attemptsText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  }
});