// src\hooks\useSessionTracking.tsx
import { useState, useEffect, useCallback } from 'react';
import { BackHandler, Alert } from 'react-native';
import { ApiService } from '../services/api';

interface SessionTrackingOptions {
  onSessionAbandon?: (sessionId?: number) => void;
  onSessionComplete?: () => void;
  mode?: 'detection' | 'practice';
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

interface AbandonmentPenaltyInfo {
  warning_message: string;
  affected_words: AffectedWord[];
  abandonment_consequence: AbandonmentConsequence;
}

export function useSessionTracking(options: SessionTrackingOptions = {}) {
  const { onSessionAbandon, onSessionComplete, mode = 'practice' } = options;

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isAbandoned, setIsAbandoned] = useState(false);
  const [isSessionCompleted, setIsSessionCompleted] = useState(false);
  const [penaltyInfo, setPenaltyInfo] = useState<AbandonmentPenaltyInfo | null>(null);
  const [abandonmentModalVisible, setAbandonmentModalVisible] = useState(false);

  // Función para reiniciar completamente el estado de la sesión
  const resetSessionState = useCallback(() => {
    setSessionId(null);
    setIsActive(false);
    setIsExiting(false);
    setIsAbandoned(false);
    setIsSessionCompleted(false);
    setPenaltyInfo(null);
    setAbandonmentModalVisible(false);
    
    console.log("Estado de sesión reiniciado");
  }, []);

  // NUEVO: Verificar si una sesión ya está en la lista global de sesiones completadas
  const checkIfSessionIsCompleted = useCallback((id: number) => {
    if (typeof global !== 'undefined' && (global as any).completedSessions) {
      const completedSessions = (global as any).completedSessions as number[];
      return completedSessions.includes(id);
    }
    return false;
  }, []);

  // Iniciar seguimiento de sesión
  const startSession = useCallback((id: number) => {
    // Validación adicional para asegurar que el ID es válido
    if (!id || isNaN(id) || id <= 0) {
      console.warn("Intentando iniciar sesión con ID inválido:", id);
      return;
    }
    
    // No iniciar si ya hay una sesión activa con ese ID
    if (isActive && sessionId === id) {
      console.log(`Sesión ${id} ya está siendo rastreada`);
      return;
    }
    
    // NUEVO: Verificar si la sesión ya está marcada como completada globalmente
    if (checkIfSessionIsCompleted(id)) {
      console.log(`Sesión ${id} ya está completada globalmente, no se iniciará seguimiento`);
      setIsSessionCompleted(true);
      return;
    }
    
    console.log(`Iniciando seguimiento de sesión ${id} en modo ${mode}`);
    setSessionId(id);
    setIsActive(true);
    setIsAbandoned(false);
    setIsSessionCompleted(false);
  }, [mode, isActive, sessionId, checkIfSessionIsCompleted]);

  // Completar la sesión
  const completeSession = useCallback(() => {
    // Verificar que tenemos un ID de sesión válido
    if (!sessionId) {
      console.warn("Intentando completar sesión sin ID válido");
      setIsActive(false);
      return;
    }
    
    // No completar si ya fue abandonada
    if (isAbandoned) {
      console.log(`La sesión ${sessionId} ya fue abandonada, no se puede completar`);
      return;
    }
    
    console.log(`Completando sesión ${sessionId}`);
    
    // Guardar ID para el callback
    const completedId = sessionId;
    
    // NUEVO: Guardar globalmente que esta sesión está completada
    if (typeof global !== 'undefined') {
      if (!(global as any).completedSessions) {
        (global as any).completedSessions = [];
      }
      
      if (!((global as any).completedSessions as number[]).includes(completedId)) {
        ((global as any).completedSessions as number[]).push(completedId);
      }
    }
    
    // Actualizar estado local
    setIsSessionCompleted(true);
    
    // Limpiar estado primero
    resetSessionState();
    
    // Llamar callback después de limpiar estado
    if (onSessionComplete) {
      onSessionComplete();
    }
    
    return completedId;
  }, [sessionId, onSessionComplete, resetSessionState, isAbandoned]);

  // NUEVO: Verificar si la sesión está completada
  const isSessionComplete = useCallback(() => {
    // Si el estado local lo indica
    if (isSessionCompleted) return true;
    
    // Verificar en el registro global
    if (sessionId && checkIfSessionIsCompleted(sessionId)) {
      // Actualizar también el estado local para mantener consistencia
      setIsSessionCompleted(true);
      return true;
    }
    
    return false;
  }, [isSessionCompleted, sessionId, checkIfSessionIsCompleted]);

  // Verificar penalizaciones por abandonar
  const checkAbandonmentPenalties = useCallback(async () => {
    if (!sessionId) {
      console.warn("Intentando verificar penalizaciones sin ID de sesión");
      return null;
    }
    
    // NUEVO: Si la sesión ya está completada, no verificar penalizaciones
    if (isSessionComplete()) {
      console.log("La sesión ya está completada, no se verificarán penalizaciones");
      return null;
    }
    
    if (isExiting) {
      console.log("Ya se está procesando una salida, evitando verificación duplicada");
      return penaltyInfo;
    }
    
    try {
      setIsExiting(true);
      console.log(`Verificando penalizaciones para sesión ${sessionId}`);
      const result = await ApiService.checkAbandonmentPenalty(sessionId);
      console.log("Penalizaciones obtenidas:", result);
      setPenaltyInfo(result);
      return result;
    } catch (error) {
      console.error('Error al verificar penalizaciones:', error);
      return null;
    } finally {
      setIsExiting(false);
    }
  }, [sessionId, isExiting, penaltyInfo, isSessionComplete]);

  // Abandonar la sesión - versión mejorada
  const abandonSession = useCallback(async () => {
    if (!sessionId) {
      console.warn("Intentando abandonar sesión sin ID válido");
      resetSessionState();
      return false;
    }
    
    // NUEVO: Si la sesión ya está completada, no abandonar
    if (isSessionComplete()) {
      console.log("La sesión ya está completada, no se puede abandonar");
      resetSessionState();
      return true;
    }
    
    // Prevenir abandono múltiple
    if (isAbandoned) {
      console.log(`La sesión ${sessionId} ya fue abandonada`);
      return true;
    }
    
    try {
      setIsExiting(true);
      console.log(`Abandonando sesión ${sessionId}`);
      
      // Guardar ID para callback
      const abandonedId = sessionId;
      
      // Intentar abandonar
      await ApiService.abandonSession(sessionId);
      
      console.log("Sesión abandonada exitosamente");
      
      // Marcar como abandonada antes de limpiar
      setIsAbandoned(true);
      
      // Actualizar estado solo si no hay error
      resetSessionState();
      
      if (onSessionAbandon) {
        onSessionAbandon(abandonedId);
      }
      
      // Notificar a otros componentes del abandono en React Native
      if (typeof global !== 'undefined') {
        // Llamar a cualquier manejador de abandono registrado
        if ((global as any).handleSessionAbandonedGlobal) {
          (global as any).handleSessionAbandonedGlobal(abandonedId);
        }
        
        // Llamar a cualquier otro manejador registrado
        if ((global as any).sessionAbandonHandler) {
          (global as any).sessionAbandonHandler(abandonedId);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error crítico al abandonar sesión:', error);
      
      // No resetear todo el estado aquí - permitir reintentar
      setIsExiting(false);
      
      // Devolver false para indicar error
      return false;
    }
  }, [sessionId, onSessionAbandon, resetSessionState, isAbandoned, isSessionComplete]);

  // Mostrar diálogo de confirmación para abandonar
  const showAbandonmentAlert = useCallback(async () => {
    // Verificación inmediata - no hacer nada si no hay sessionId
    if (!sessionId) {
      console.warn("No hay ID de sesión, no se mostrará alerta");
      return;
    }
    
    // VERIFICACIÓN CRUCIAL MEJORADA: Verificar globalmente primero
    if (typeof global !== 'undefined' && (global as any).completedSessions) {
      const completedSessions = (global as any).completedSessions as number[];
      if (completedSessions.includes(sessionId)) {
        console.log(`showAbandonmentAlert: Sesión ${sessionId} ya está completada según registro global`);
        // Actualizar estado y salir inmediatamente SIN MOSTRAR NINGUNA ALERTA
        setIsSessionCompleted(true);
        resetSessionState();
        return;
      }
    }
    
    // Verificación de estado local
    if (isSessionCompleted) {
      console.log("showAbandonmentAlert: Sesión completada en estado local");
      resetSessionState();
      return;
    }
    
    // Control de salidas múltiples
    if (isExiting) {
      console.log("Ya se está procesando una salida, evitando múltiples alertas");
      return;
    }
    
    // No mostrar alerta si ya fue abandonada
    if (isAbandoned) {
      console.log("La sesión ya fue abandonada, no se mostrará alerta");
      return;
    }
    
    setIsExiting(true); // Marcar que estamos procesando
    
    console.log("Obteniendo información de penalizaciones");
    const info = await checkAbandonmentPenalties();
    
    if (info) {
      setPenaltyInfo(info);
      setAbandonmentModalVisible(true);
    } else {
      // Si no se pudo obtener la información, mostrar alerta genérica
      Alert.alert(
        "¿En serio vas a abandonar?",
        "¿Seguro que quieres salir? Esta vez tus estrellas están a salvo, pero piénsalo bien. 🤔",
        [
          { 
            text: "Continuar ejercicios", 
            style: "cancel",
            onPress: () => setIsExiting(false)
          },
          {
            text: "Abandonar",
            style: "destructive",
            onPress: async () => {
              await abandonSession();
            }
          }
        ]
      );
    }
  }, [sessionId, isExiting, isAbandoned, isSessionCompleted, checkAbandonmentPenalties, abandonSession, resetSessionState]);

  // Confirmar abandono desde el modal
  const confirmAbandon = useCallback(async () => {
    setAbandonmentModalVisible(false);
    
    const success = await abandonSession();
    
    // Si falló el abandono, mostrar opciones al usuario
    if (!success) {
      Alert.alert(
        "Error al abandonar",
        "No se pudo abandonar la sesión. ¿Qué deseas hacer?",
        [
          {
            text: "Reintentar",
            onPress: confirmAbandon
          },
          {
            text: "Cancelar",
            style: "cancel",
            onPress: () => setIsExiting(false)
          },
          {
            text: "Forzar salida",
            style: "destructive",
            onPress: resetSessionState
          }
        ]
      );
    }
  }, [abandonSession, resetSessionState]);

  // Cancelar abandono
  const cancelAbandon = useCallback(() => {
    setAbandonmentModalVisible(false);
    setIsExiting(false);
  }, []);

  // Manejar el botón de retroceso
  useEffect(() => {
    const handleBackPress = () => {
      console.log("Evento de retroceso detectado. Estado:", {
        isActive,
        sessionId,
        isExiting,
        isAbandoned,
        isSessionCompleted
      });
      
      // PRIMERA verificación: si no hay sesión o está abandonada, permitir navegación
      if (!sessionId || isAbandoned) {
        return false;
      }
      
      // SEGUNDA verificación: Verificar directamente en el registro global antes de cualquier otra acción
      if (typeof global !== 'undefined' && (global as any).completedSessions) {
        const completedSessions = (global as any).completedSessions as number[];
        if (completedSessions.includes(sessionId)) {
          console.log(`Sesión ${sessionId} encontrada en registro global de completadas, permitiendo navegación`);
          // Actualizar estado local sin mostrar ninguna alerta
          setIsSessionCompleted(true);
          resetSessionState();
          return false; // Permitir navegación 
        }
      }
      
      // TERCERA verificación: Estado local
      if (isSessionCompleted) {
        console.log("La sesión ya está completada (estado local), permitiendo navegación");
        return false;
      }
      
      // Solo si pasó todas las verificaciones anteriores y es una sesión activa, mostrar alerta
      if (isActive && !isExiting) {
        console.log("Sesión activa y no completada, mostrando alerta de abandono");
        showAbandonmentAlert();
        return true; // Prevenir navegación
      }
      
      return false; // Permitir navegación por defecto
    };

    BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
    };
  }, [isActive, sessionId, isExiting, isAbandoned, isSessionCompleted, showAbandonmentAlert, resetSessionState]);

  // Registrar un manejador global para eventos de abandono
  useEffect(() => {
    // Para React Native, definimos un manejador en el objeto global
    if (typeof global !== 'undefined') {
      // Función para manejar el evento de abandono de sesión
      (global as any).handleSessionAbandonedGlobal = (abandonedId: number) => {
        if (sessionId === abandonedId) {
          console.log(`Recibido evento global de abandono para sesión ${sessionId}`);
          resetSessionState();
        }
      };
      
      // NUEVO: Función para manejar el evento de sesión completada
      (global as any).handleSessionCompletedGlobal = (completedId: number) => {
        if (sessionId === completedId) {
          console.log(`Recibido evento global de completado para sesión ${sessionId}`);
          setIsSessionCompleted(true);
          
          // Actualizar registro global de sesiones completadas
          if (!(global as any).completedSessions) {
            (global as any).completedSessions = [];
          }
          
          if (!((global as any).completedSessions as number[]).includes(completedId)) {
            ((global as any).completedSessions as number[]).push(completedId);
          }
        }
      };
    }
    
    return () => {
      // Limpiar los manejadores al desmontar
      if (typeof global !== 'undefined') {
        delete (global as any).handleSessionAbandonedGlobal;
        delete (global as any).handleSessionCompletedGlobal;
      }
    };
  }, [sessionId, resetSessionState]);

  // NUEVO: Verificar el registro global de sesiones completadas al montar
  useEffect(() => {
    if (sessionId && typeof global !== 'undefined' && (global as any).completedSessions) {
      const completedSessions = (global as any).completedSessions as number[];
      
      if (completedSessions.includes(sessionId)) {
        console.log(`useSessionTracking: Detectada sesión ${sessionId} ya completada en el registro global`);
        setIsSessionCompleted(true);
      }
    }
  }, [sessionId]);

  // Limpiar estado cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (isActive && sessionId && !isAbandoned && !isSessionCompleted) {
        console.log(`Limpiando sesión ${sessionId} al desmontar componente`);
        // No abandonar automáticamente, solo registrar
      }
    };
  }, [isActive, sessionId, isAbandoned, isSessionCompleted]);

  return {
    sessionId,
    isActive,
    isExiting,
    isAbandoned,
    isSessionCompleted,
    penaltyInfo,
    abandonmentModalVisible,
    startSession,
    completeSession,
    checkAbandonmentPenalties,
    abandonSession,
    showAbandonmentAlert,
    confirmAbandon,
    cancelAbandon,
    resetSessionState,
    isSessionComplete
  };
}