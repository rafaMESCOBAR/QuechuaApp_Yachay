// src/utils/pointsSystem.ts

/**
 * Calcula puntos para ejercicios de manera estandarizada
 * @param basePoints Puntos base del ejercicio
 * @param difficulty Nivel de dificultad (1-5)
 * @param timeLeft Tiempo restante en segundos (null si no hay temporizador)
 * @param maxTime Tiempo máximo inicial del ejercicio
 * @param usedHint Si el usuario usó una pista
 * @param streakCount Número de aciertos consecutivos (0 si no aplica)
 * @returns Puntos finales calculados
 */
export const calculatePoints = (
    basePoints: number,
    difficulty: number,
    timeLeft: number | null,
    maxTime: number,
    usedHint: boolean,
    streakCount: number = 0
  ): number => {
    // Base de puntos según dificultad (1-5)
    let points = basePoints * Math.min(5, Math.max(1, difficulty));
    
    // Bonificación por tiempo (hasta 50% extra si es muy rápido)
    if (timeLeft !== null && maxTime > 0) {
      const timeBonus = Math.floor(points * 0.5 * (timeLeft / maxTime));
      points += timeBonus;
    }
    
    // Penalización por usar pistas (25% menos)
    if (usedHint) {
      points = Math.floor(points * 0.75);
    }
    
    // Bonificación por racha (10% extra por cada acierto consecutivo, máximo 50%)
    if (streakCount > 1) {
      const streakBonus = Math.floor(points * Math.min(0.5, (streakCount - 1) * 0.1));
      points += streakBonus;
    }
    
    return Math.max(1, points); // Mínimo 1 punto
  };
  
  /**
   * Genera mensajes de retroalimentación basados en rendimiento
   * @param isCorrect Si la respuesta fue correcta
   * @param points Puntos obtenidos
   * @param usedHint Si usó pista
   * @param timePercentage Porcentaje de tiempo usado (0-1)
   * @returns Mensaje de retroalimentación personalizado
   */
  export const generateFeedback = (
    isCorrect: boolean,
    points: number,
    usedHint: boolean = false,
    timePercentage: number = 0.5
  ): string => {
    if (!isCorrect) {
      const incorrectMessages = [
        "¡Casi lo tienes! Sigue practicando.",
        "No es correcto. ¡Inténtalo de nuevo!",
        "Esa no es la respuesta correcta. ¡Sigue adelante!"
      ];
      return incorrectMessages[Math.floor(Math.random() * incorrectMessages.length)];
    }
    
    // Para respuestas correctas
    let message = "";
    
    // Evaluar velocidad
    if (timePercentage < 0.3) {
      message = "¡Increíblemente rápido! ";
    } else if (timePercentage < 0.6) {
      message = "¡Buen ritmo! ";
    } else {
      message = "¡Correcto! ";
    }
    
    // Evaluar uso de pista
    if (usedHint) {
      message += `Ganaste ${points} puntos con ayuda de la pista.`;
    } else {
      // Evaluar puntos
      if (points > 30) {
        message += `¡Excelente trabajo! +${points} puntos.`;
      } else {
        message += `+${points} puntos.`;
      }
    }
    
    return message;
  };