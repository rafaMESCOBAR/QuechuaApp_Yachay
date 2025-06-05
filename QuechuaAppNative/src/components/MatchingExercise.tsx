// src/components/MatchingExercise.tsx 
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SpeechService } from '../services/speechService';
import { ApiService } from '../services/api';
import { ConsecutiveFailuresIndicator } from './ConsecutiveFailuresIndicator';
import { Audio } from 'expo-av';

// Interfaz para los pares de palabras
interface MatchingPair {
  id: number;
  spanish: string;
  quechua: string;
}

// Interfaz para las propiedades del componente
interface MatchingExerciseProps {
  question: string;
  pairs: MatchingPair[];
  onComplete: (isCorrect: boolean, userAnswer?: string) => void;
  difficulty: number;
  onContinue?: () => void;
}

export const MatchingExercise: React.FC<MatchingExerciseProps> = ({
  question,
  pairs,
  onComplete,
  difficulty = 1,
  onContinue
}) => {
  // Estado para las palabras seleccionadas
  const [selectedSpanish, setSelectedSpanish] = useState<MatchingPair | null>(null);
  const [selectedQuechua, setSelectedQuechua] = useState<MatchingPair | null>(null);
  
  // Estado para controlar el resultado
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [mode, setMode] = useState<'detection' | 'practice'>('practice');
  
  // Nuevos estados para la información de vocabulario
  const [isNewWord, setIsNewWord] = useState(false);
  const [daysProtection, setDaysProtection] = useState(0);
  const [exercisesNeeded, setExercisesNeeded] = useState(0);
  const [masteryLevel, setMasteryLevel] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Animaciones para las selecciones
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  // CORRECCIÓN 1: Usar useMemo para crear pares válidos solo una vez
  const validPairs = useMemo(() => {
    return pairs.map((pair, index) => ({
      ...pair,
      id: pair.id || index + 1
    }));
  }, [pairs]);
  
  // Usar un ref para mantener la lista mezclada constante durante la vida del componente
  const shuffledWordsRef = useRef<MatchingPair[]>([]);

  // En useEffect, inicializar solo una vez
  useEffect(() => {
    // Solo mezclar si el ref está vacío
    if (shuffledWordsRef.current.length === 0 && validPairs.length > 0) {
      shuffledWordsRef.current = [...validPairs].sort(() => Math.random() - 0.5);
    }
  }, [validPairs]);

  // Usar el ref en lugar de useMemo
  const shuffledQuechuaWords = shuffledWordsRef.current.length > 0 ? 
    shuffledWordsRef.current : validPairs;
  
  // Al montar, intentar obtener información de fallos consecutivos
  useEffect(() => {
    const getVocabularyInfo = async () => {
      if (validPairs.length === 0) return;
      
      try {
        // Intentar obtener información de fallos para al menos un par
        const firstPair = validPairs[0];
        const vocab = await ApiService.getUserVocabulary({ sort_by: 'recent' });
        const word = vocab.find((item: any) => 
          item.quechua_word.toLowerCase() === firstPair.quechua.toLowerCase()
        );
        
        if (word) {
          setConsecutiveFailures(word.consecutive_failures || 0);
          
          // NUEVO: Obtener información adicional
          setMasteryLevel(word.mastery_level || 0);
          
          // Determinar si es palabra nueva
          if (word.first_detected) {
            const daysSinceAdded = Math.floor((new Date().getTime() - new Date(word.first_detected).getTime()) / (1000 * 60 * 60 * 24));
            const protectionDays = mode === 'detection' ? 3 : 1;
            
            if (daysSinceAdded <= protectionDays) {
              setIsNewWord(true);
              setDaysProtection(protectionDays - daysSinceAdded);
            }
          }
          
          // Determinar ejercicios necesarios
          if (word.exercises_completed < 5) {
            setExercisesNeeded(5 - word.exercises_completed);
          }
        }
      } catch (error) {
        console.log('Error al obtener información de vocabulario:', error);
      }
    };
    
    // Determinar el modo a partir de la navegación
    const detectMode = () => {
      // En React Native, podemos verificar la ruta actual de navegación
      // o usar una prop para determinar el modo
      setMode('practice'); // Valor por defecto
    };
    
    getVocabularyInfo();
    detectMode();
  }, [validPairs]);
  
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
  
  // Resetear selecciones y resultados
  const resetSelections = () => {
    if (isProcessing) return;
    
    setSelectedSpanish(null);
    setSelectedQuechua(null);
    setIsCorrect(null);
  };
  
  // Manejar selección de palabra en español
  const handleSelectSpanish = async (word: MatchingPair) => {
    if (isCorrect !== null || isProcessing) return;
    
    // Efecto de animación al pulsar
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true
      })
    ]).start();
    
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
    
    setSelectedSpanish(word);
    SpeechService.speakWord(word.spanish);
    
    if (selectedQuechua) {
      verifyMatch(word, selectedQuechua);
    }
  };
  
  // Manejar selección de palabra en quechua
  const handleSelectQuechua = async (word: MatchingPair) => {
    if (isCorrect !== null || isProcessing) return;
    
    // Efecto de animación al pulsar
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true
      })
    ]).start();
    
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
    
    setSelectedQuechua(word);
    SpeechService.speakWord(word.quechua);
    
    if (selectedSpanish) {
      verifyMatch(selectedSpanish, word);
    }
  };
  
 // Verificar si el par seleccionado es correcto
const verifyMatch = async (spanishWord: MatchingPair, quechuaWord: MatchingPair) => {
  if (isProcessing) return;
  
  setIsProcessing(true);
  setAttempts(prev => prev + 1);
  
  const matchResult = spanishWord.id === quechuaWord.id;
  setIsCorrect(matchResult);
  
  // ✅ LOGGING MEJORADO PARA DEPURACIÓN
  console.log(`🔍 MatchingExercise - Verificando coincidencia:`);
  console.log(`   - Español seleccionado: "${spanishWord.spanish}" (ID: ${spanishWord.id})`);
  console.log(`   - Quechua seleccionado: "${quechuaWord.quechua}" (ID: ${quechuaWord.id})`);
  console.log(`   - ¿Coinciden los IDs?: ${matchResult}`);
  
  // Reproducir sonido según el resultado
  if (soundEnabled) {
    try {
      const soundFile = matchResult 
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
  
  // Variable local para prevenir llamadas múltiples
  let hasCompleted = false;
  
  setTimeout(() => {
    if (matchResult) {
      // Evitar llamar a onComplete múltiples veces
      if (!hasCompleted) {
        hasCompleted = true;
        
        // ✅ CREAR RESPUESTA DEL USUARIO PARA MATCHING CON LOGGING DETALLADO
        const userMatchAnswer = `${spanishWord.spanish}→${quechuaWord.quechua}`;
        
        console.log(`✅ Matching completado exitosamente:`);
        console.log(`   - Formato de respuesta: "${userMatchAnswer}"`);
        console.log(`   - Longitud de respuesta: ${userMatchAnswer.length} caracteres`);
        console.log(`   - Contiene flecha (→): ${userMatchAnswer.includes('→')}`);
        console.log(`   - Enviando al componente padre...`);
        
        onComplete(true, userMatchAnswer);
      }
    } else {
      console.log(`❌ Matching incorrecto - reseteando selecciones`);
      setIsProcessing(false);
      resetSelections();
    }
  }, 1500);
}; 
  
  const handleContinue = () => {
    if (onContinue) {
      onContinue();
    } else {
      onComplete(false);  // Comportamiento anterior como fallback
    }
  };
  
  // Determinar límite de fallos según el modo
  const failuresLimit = mode === 'detection' ? 3 : 2;
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.questionText}>{question}</Text>
        
        <Text style={styles.instructionText}>
          Selecciona una palabra en español y su traducción en quechua para verificar si son correctas.
        </Text>
      </View>
      
      {/* Indicador de fallos consecutivos con la nueva información */}
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
      
      <View style={styles.columnsContainer}>
        {/* Columna de palabras en español (ordenadas) */}
        <View style={styles.column}>
          <View style={styles.columnHeader}>
            <Ionicons name="flag-outline" size={18} color="#1976D2" style={styles.columnIcon} />
            <Text style={styles.columnTitle}>Español</Text>
          </View>
          <View style={styles.wordsColumn}>
            {validPairs.map((word, index) => (
              <Animated.View key={`spanish-${word.id}`} style={{
                transform: [{scale: selectedSpanish?.id === word.id ? scaleAnim : 1}]
              }}>
                <TouchableOpacity
                  style={[
                    styles.wordButton,
                    styles.spanishWord,
                    selectedSpanish?.id === word.id && styles.selectedWord,
                    isProcessing && styles.disabledButton
                  ]}
                  onPress={() => handleSelectSpanish(word)}
                  disabled={isCorrect !== null || isProcessing}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.wordText, selectedSpanish?.id === word.id && styles.selectedWordText]}>
                    {word.spanish}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </View>
        
        {/* Columna de palabras en quechua (mezcladas) */}
        <View style={styles.column}>
          <View style={styles.columnHeader}>
            <Ionicons name="language-outline" size={18} color="#FF6D00" style={styles.columnIcon} />
            <Text style={styles.columnTitle}>Quechua</Text>
          </View>
          <View style={styles.wordsColumn}>
            {shuffledQuechuaWords.map((word, index) => (
              <Animated.View key={`quechua-${word.id}`} style={{
                transform: [{scale: selectedQuechua?.id === word.id ? scaleAnim : 1}]
              }}>
                <View style={styles.quechuaContainer}>
                  <TouchableOpacity
                    style={[
                      styles.wordButton,
                      styles.quechuaWord,
                      selectedQuechua?.id === word.id && styles.selectedQuechuaWord,
                      isProcessing && styles.disabledButton
                    ]}
                    onPress={() => handleSelectQuechua(word)}
                    disabled={isCorrect !== null || isProcessing}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.wordText, selectedQuechua?.id === word.id && styles.selectedWordText]}>
                      {word.quechua}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.audioButton}
                    onPress={() => SpeechService.speakWord(word.quechua)}
                    disabled={isProcessing}
                  >
                    <Ionicons name="volume-high" size={18} color="#2196F3" />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ))}
          </View>
        </View>
      </View>
      
      {/* Mostrar resultado de la verificación */}
      {isCorrect !== null && (
        <View style={[
          styles.resultContainer,
          isCorrect ? styles.correctResult : styles.incorrectResult
        ]}>
          <Ionicons 
            name={isCorrect ? "checkmark-circle" : "close-circle"} 
            size={24} 
            color={isCorrect ? "#4CAF50" : "#F44336"} 
            style={styles.resultIcon}
          />
          <Text style={[
            styles.resultText,
            isCorrect ? styles.correctResultText : styles.incorrectResultText
          ]}>
            {isCorrect 
              ? `¡Correcto! "${selectedSpanish?.spanish}" se dice "${selectedQuechua?.quechua}" en quechua.` 
              : `Incorrecto. "${selectedSpanish?.spanish}" no es "${selectedQuechua?.quechua}" en quechua.`}
          </Text>
        </View>
      )}
      
      {/* Botón para verificar o continuar */}
      {(selectedSpanish && selectedQuechua && isCorrect === null) ? (
        <TouchableOpacity
          style={[styles.verifyButton, isProcessing && styles.disabledButton]}
          onPress={() => verifyMatch(selectedSpanish, selectedQuechua)}
          disabled={isProcessing}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>Verificar</Text>
          <Ionicons name="checkmark-circle-outline" size={20} color="white" style={styles.buttonIcon} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          disabled={isProcessing}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>Continuar</Text>
          <Ionicons name="arrow-forward" size={20} color="white" style={styles.buttonIcon} />
        </TouchableOpacity>
      )}
      
      {/* Espacio adicional para asegurar que los botones no queden ocultos */}
      <View style={styles.bottomSpace} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: 'white',
  },
  headerCard: {
    backgroundColor: '#F5F7FA',
    padding: 16,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    marginBottom: 20,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  questionText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  columnsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 10,
    width: '100%',
  },
  column: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingBottom: 8,
  },
  columnIcon: {
    marginRight: 8,
  },
  columnTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  wordsColumn: {
    alignItems: 'stretch',
    width: '100%',
  },
  wordButton: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  spanishWord: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  quechuaWord: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFCCBC',
    flex: 1,
  },
  selectedWord: {
    borderColor: '#2196F3',
    borderWidth: 2,
    backgroundColor: '#E3F2FD',
  },
  selectedQuechuaWord: {
    borderColor: '#FF9800',
    borderWidth: 2,
    backgroundColor: '#FFF8E1',
  },
  selectedWordText: {
    fontWeight: 'bold',
    color: '#333',
  },
  wordText: {
    fontSize: 16,
    color: '#444',
  },
  quechuaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    width: '100%',
  },
  audioButton: {
    padding: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
    marginLeft: 5,
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 1,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultContainer: {
    padding: 15,
    borderRadius: 10,
    marginVertical: 15,
    marginHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  resultIcon: {
    marginRight: 10,
  },
  correctResult: {
    backgroundColor: '#E8F5E9',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  incorrectResult: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  resultText: {
    fontSize: 16,
    flex: 1,
  },
  correctResultText: {
    color: '#2E7D32',
  },
  incorrectResultText: {
    color: '#C62828',
  },
  verifyButton: {
    backgroundColor: '#FF0000',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    marginVertical: 10,
    alignSelf: 'center',
    width: '80%',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    marginVertical: 10,
    alignSelf: 'center',
    width: '80%',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  bottomSpace: {
    height: 80,
  },
});