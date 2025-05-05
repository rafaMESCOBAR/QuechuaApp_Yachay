// src/components/PracticeExerciseModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExerciseMultipleChoice } from './ExerciseMultipleChoice';
import { AnagramExercise } from './AnagramExercise';
import { PronunciationExercise } from './PronunciationExercise';
import { MatchingExercise } from './MatchingExercise';
import { FillBlanksExercise } from './FillBlanksExercise';

interface Exercise {
  id: number;
  type: string;
  question: string;
  answer: string;
  distractors?: any;
  difficulty: number;
  points: number;
  object_translation?: {
    id: number;
    spanish: string;
    quechua: string;
  };
  metadata?: any;
  spanish_translation?: string;
}

interface Props {
  isVisible: boolean;
  onClose: () => void;
  exercises: Exercise[];
  categoryTitle: string;
  onComplete?: (points: number) => void;
}

export const PracticeExerciseModal: React.FC<Props> = ({
  isVisible,
  onClose,
  exercises,
  categoryTitle,
  onComplete
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Resetear estado cuando se abre el modal
  useEffect(() => {
    if (isVisible) {
      setCurrentIndex(0);
      setTotalPoints(0);
      setShowSummary(false);
      setIsLoading(false);
    }
    
    // Limpiar temporizadores pendientes al desmontar
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isVisible]);

  // Función para normalizar los datos de ejercicios
  const normalizeExerciseData = (exercise: Exercise): Exercise => {
    if (!exercise) return {} as Exercise;
    
    console.log(`Normalizando ejercicio tipo: ${exercise.type}`);
    
    // Crear copia para no modificar el original
    const normalizedExercise = { ...exercise };
    
    // Normalizar tipo de ejercicio
    if (normalizedExercise.type === 'frases_comunes') {
      normalizedExercise.type = 'multiple_choice';
    }
    
    // Normalizar distractors
    if (normalizedExercise.distractors) {
      if (typeof normalizedExercise.distractors === 'object' && !Array.isArray(normalizedExercise.distractors)) {
        // Si es un objeto con opciones, extraer como array
        if (normalizedExercise.distractors.options && Array.isArray(normalizedExercise.distractors.options)) {
          normalizedExercise.distractors = normalizedExercise.distractors.options;
        }
      }
    } else {
      // Si no hay distractors, inicializar como array vacío para evitar errores
      normalizedExercise.distractors = [];
    }
    
    // Garantizar object_translation
    if (!normalizedExercise.object_translation) {
      normalizedExercise.object_translation = {
        id: normalizedExercise.id || 0,
        spanish: normalizedExercise.spanish_translation || "",
        quechua: normalizedExercise.answer || ""
      };
    }
    
    return normalizedExercise;
  };

  const handleExerciseComplete = (isCorrect: boolean, points: number) => {
    console.log(`Ejercicio completado - Correcto: ${isCorrect}, Puntos: ${points}`);
    
    if (isCorrect) {
      setTotalPoints(prev => prev + points);
    }

    // Marcar como cargando durante la transición
    setIsLoading(true);
    
    // Limpiar cualquier temporizador pendiente
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Pequeña pausa antes de continuar
    timerRef.current = setTimeout(() => {
      if (currentIndex >= exercises.length - 1) {
        setShowSummary(true);
      } else {
        setCurrentIndex(prev => prev + 1);
      }
      setIsLoading(false);
    }, 1500);
  };

  const resetExercises = () => {
    setCurrentIndex(0);
    setTotalPoints(0);
    setShowSummary(false);
    setIsLoading(false);
  };

  const handleFinishExercises = () => {
    // Notificar puntos obtenidos al componente padre antes de cerrar
    if (onComplete) {
      onComplete(totalPoints);
    }
    onClose();
  };

  const renderExercise = () => {
    if (exercises.length === 0 || currentIndex >= exercises.length) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No se pudieron cargar los ejercicios</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onClose}>
            <Text style={styles.buttonText}>Volver al menú</Text>
          </TouchableOpacity>
        </View>
      );
    }
  
    // Normalizar el ejercicio actual
    const rawExercise = exercises[currentIndex];
    console.log(`Ejercicio original tipo: ${rawExercise.type}`);
    
    const exercise = normalizeExerciseData(rawExercise);
    
    // Añadir una clave única para forzar la recreación del componente
    const exerciseKey = `exercise-${currentIndex}-${Date.now()}`;
  
    if (!exercise || !exercise.type || !exercise.question || !exercise.answer) {
      console.error("Ejercicio inválido:", exercise);
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Formato de ejercicio no válido</Text>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => {
              if (currentIndex >= exercises.length - 1) {
                setShowSummary(true);
              } else {
                setCurrentIndex(prev => prev + 1);
              }
            }}
          >
            <Text style={styles.buttonText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      );
    }
  
    switch (exercise.type) {
      case 'multiple_choice':
        return (
          <ExerciseMultipleChoice
            key={exerciseKey}
            question={exercise.question}
            options={[
              { text: exercise.answer, isCorrect: true },
              ...(Array.isArray(exercise.distractors) ? 
                exercise.distractors.map(d => ({ text: d, isCorrect: false })) : 
                [])
            ]}
            onComplete={handleExerciseComplete}
            difficulty={exercise.difficulty}
          />
        );
      
      case 'anagram':
        return (
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
        );
      
      case 'pronunciation':
        return (
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
        );
      
      case 'matching':
        // Verificar que distractors.pairs existe y es un array
        if (
          typeof exercise.distractors === 'object' && 
          !Array.isArray(exercise.distractors) && 
          Array.isArray(exercise.distractors.pairs)
        ) {
          return (
            <MatchingExercise
              key={exerciseKey}
              question={exercise.question}
              pairs={exercise.distractors.pairs.map((pair: {spanish?: string, quechua?: string}, index: number) => ({
                id: index + 1,
                spanish: pair.spanish || "",
                quechua: pair.quechua || ""
              }))}
              onComplete={handleExerciseComplete}
              difficulty={exercise.difficulty}
            />
          );
        } else {
          console.error("Ejercicio matching sin pares válidos:", exercise.distractors);
          return (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Datos de emparejamiento incorrectos</Text>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={() => {
                  if (currentIndex >= exercises.length - 1) {
                    setShowSummary(true);
                  } else {
                    setCurrentIndex(prev => prev + 1);
                  }
                }}
              >
                <Text style={styles.buttonText}>Continuar</Text>
              </TouchableOpacity>
            </View>
          );
        }
      
      case 'fill_blanks':
        return (
          <FillBlanksExercise
            key={exerciseKey}
            question={exercise.question}
            answer={exercise.answer}
            difficulty={exercise.difficulty}
            onComplete={handleExerciseComplete}
          />
        );
      
      default:
        console.warn(`Tipo de ejercicio no soportado: ${exercise.type}`);
        return (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {`Tipo de ejercicio no soportado: ${exercise.type}`}
            </Text>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => {
                if (currentIndex >= exercises.length - 1) {
                  setShowSummary(true);
                } else {
                  setCurrentIndex(prev => prev + 1);
                }
              }}
            >
              <Text style={styles.buttonText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  const renderSummary = () => (
    <View style={styles.summaryContainer}>
      <Text style={styles.summaryTitle}>¡Práctica Completada!</Text>
      <Text style={styles.summaryText}>Has ganado {totalPoints} puntos</Text>
      <TouchableOpacity style={styles.button} onPress={resetExercises}>
        <Text style={styles.buttonText}>Practicar de Nuevo</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.closeButton} onPress={handleFinishExercises}>
        <Text style={styles.closeButtonText}>Volver al Menú</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{categoryTitle}</Text>
          <TouchableOpacity style={styles.closeIcon} onPress={onClose}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {showSummary ? renderSummary() : (
            <>
              <Text style={styles.progressText}>
                Ejercicio {currentIndex + 1} de {exercises.length}
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