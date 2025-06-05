// src/components/ConsecutiveFailuresIndicator.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ConsecutiveFailuresIndicatorProps {
  failures: number;
  limit: number;
  mode: 'detection' | 'practice';
  showWarning?: boolean;
  isNewWord?: boolean;
  daysProtected?: number;
  exercisesNeeded?: number;
  hasStars?: boolean;
}

export const ConsecutiveFailuresIndicator: React.FC<ConsecutiveFailuresIndicatorProps> = ({
  failures, 
  limit,
  mode,
  showWarning = true,
  isNewWord = false,
  daysProtected = 0,
  exercisesNeeded = 0,
  hasStars = true
}) => {
  // Limitar failures visualizados para no mostrar cosas como 3/2
  const displayFailures = Math.min(failures, limit);
  
  // Calcular porcentaje de progreso hacia el límite
  const progress = Math.min(1, displayFailures / limit);
  
  // Determinar color según el progreso
  const getStatusColor = () => {
    if (progress < 0.5) return '#4CAF50';  // Verde
    if (progress < 0.8) return '#FFC107';  // Amarillo
    return '#F44336';  // Rojo
  };
  
  // Determinar nivel de advertencia
  const getWarningLevel = () => {
    if (progress < 0.5) return 'safe';
    if (progress < 0.8) return 'warning';
    return 'danger';
  };
  
  // Obtener mensaje de advertencia
  const getWarningMessage = () => {
    // Si alcanzó el límite
    if (displayFailures >= limit) {
      if (isNewWord) {
        return `¡Palabra nueva! Protegida por ${daysProtected} días 🛡️`;
      }
      
      if (exercisesNeeded > 0) {
        return `¡${exercisesNeeded} ejercicios más y entras en juego! 🚀`;
      }
      
      if (!hasStars) {
        return `¡No hay estrellas que perder! Gana algunas primero ⭐`;
      }
      
      return `¡Salvado por ser principiante! Por ahora... 🍀`;
    }
    
    // Si no ha alcanzado el límite pero tiene protecciones
    if (isNewWord && progress > 0) {
      return `¡Palabra nueva! Protegida por ${daysProtected} días 🛡️`;
    }
    
    if (exercisesNeeded > 0 && progress > 0) {
      return `¡${exercisesNeeded} ejercicios más y entras en juego! 🚀`;
    }
    
    // Mensajes estándar de advertencia
    const warningLevel = getWarningLevel();
    
    switch (warningLevel) {
      case 'danger':
        return `¡Cuidado! ${displayFailures} ${displayFailures === 1 ? 'fallo' : 'fallos'} ` +
               `consecutivos de ${limit}. En riesgo de perder una estrella.`;
      case 'warning':
        return `Atención: ${displayFailures} ${displayFailures === 1 ? 'fallo' : 'fallos'} ` +
               `consecutivos de ${limit}.`;
      default:
        return `${displayFailures} ${displayFailures === 1 ? 'fallo' : 'fallos'} ` +
               `consecutivos de ${limit} permitidos.`;
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerText}>
          Fallos consecutivos ({mode === 'detection' ? 'Detección' : 'Práctica'})
        </Text>
        
        <View style={styles.countContainer}>
          <Text style={[styles.countText, { color: getStatusColor() }]}>
            {displayFailures}/{limit}
          </Text>
        </View>
      </View>
      
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View 
            style={[
              styles.progressBarFill, 
              { 
                width: `${progress * 100}%`,
                backgroundColor: getStatusColor() 
              }
            ]} 
          />
        </View>
      </View>
      
      {showWarning && displayFailures > 0 && (
        <View style={[
          styles.warningContainer, 
          { 
            backgroundColor: isNewWord || exercisesNeeded > 0 || !hasStars
              ? '#E8F5E9'  // Verde claro para mensajes de protección
              : getWarningLevel() === 'danger' 
                ? '#FFEBEE'  // Rojo claro para peligro
                : '#FFF8E1'  // Amarillo claro para advertencia
          }
        ]}>
          <Ionicons 
            name={
              isNewWord || exercisesNeeded > 0 || !hasStars
                ? 'shield-checkmark'
                : getWarningLevel() === 'danger' 
                  ? 'warning' 
                  : 'information-circle'
            } 
            size={16} 
            color={
              isNewWord || exercisesNeeded > 0 || !hasStars
                ? '#4CAF50'
                : getWarningLevel() === 'danger' 
                  ? '#F44336' 
                  : '#FF9800'
            } 
          />
          <Text style={[
            styles.warningText,
            { 
              color: isNewWord || exercisesNeeded > 0 || !hasStars
                ? '#4CAF50'
                : getWarningLevel() === 'danger' 
                  ? '#D32F2F' 
                  : '#F57C00' 
            }
          ]}>
            {getWarningMessage()}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#757575',
  },
  countContainer: {
    backgroundColor: '#EEEEEE',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    marginBottom: 8,
  },
  progressBarBackground: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  warningText: {
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
  },
});