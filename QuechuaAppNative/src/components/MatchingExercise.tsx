// src/components/MatchingExercise.tsx - CORREGIDO
import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SpeechService } from '../services/speechService';

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
  onComplete: (isCorrect: boolean, points: number) => void;
  difficulty: number;
}

export const MatchingExercise: React.FC<MatchingExerciseProps> = ({
  question,
  pairs,
  onComplete,
  difficulty = 1
}) => {
  // Estado para las palabras seleccionadas
  const [selectedSpanish, setSelectedSpanish] = useState<MatchingPair | null>(null);
  const [selectedQuechua, setSelectedQuechua] = useState<MatchingPair | null>(null);
  
  // Estado para controlar el resultado
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [points, setPoints] = useState(15 * difficulty);
  const [attempts, setAttempts] = useState(0);
  
  // CORRECCIÓN 1: Usar useMemo para crear pares válidos solo una vez
  const validPairs = useMemo(() => {
    return pairs.map((pair, index) => ({
      ...pair,
      id: pair.id || index + 1
    }));
  }, [pairs]);
  
  // CORRECCIÓN 2: Crear la lista mezclada una sola vez cuando el componente se monta
  const shuffledQuechuaWords = useMemo(() => {
    return [...validPairs].sort(() => Math.random() - 0.5);
  }, [validPairs]);
  
  // Resetear selecciones y resultados
  const resetSelections = () => {
    setSelectedSpanish(null);
    setSelectedQuechua(null);
    setIsCorrect(null);
  };
  
  // Manejar selección de palabra en español
  const handleSelectSpanish = (word: MatchingPair) => {
    if (isCorrect !== null) return;
    
    setSelectedSpanish(word);
    SpeechService.speakWord(word.spanish);
    
    if (selectedQuechua) {
      verifyMatch(word, selectedQuechua);
    }
  };
  
  // Manejar selección de palabra en quechua
  const handleSelectQuechua = (word: MatchingPair) => {
    if (isCorrect !== null) return;
    
    setSelectedQuechua(word);
    SpeechService.speakWord(word.quechua);
    
    if (selectedSpanish) {
      verifyMatch(selectedSpanish, word);
    }
  };
  
  // Verificar si el par seleccionado es correcto
  const verifyMatch = (spanishWord: MatchingPair, quechuaWord: MatchingPair) => {
    setAttempts(prev => prev + 1);
    
    const matchResult = spanishWord.id === quechuaWord.id;
    setIsCorrect(matchResult);
    
    if (!matchResult && points > 5) {
      setPoints(prev => Math.max(5, prev - 5));
    }
    
    setTimeout(() => {
      if (matchResult) {
        onComplete(true, points);
      } else {
        resetSelections();
      }
    }, 1500);
  };
  
  // Continuar sin seleccionar (solo ver)
  const handleContinue = () => {
    onComplete(false, 0);
  };
  
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.questionText}>{question}</Text>
      
      <Text style={styles.instructionText}>
        Selecciona una palabra en español y su traducción en quechua para verificar si son correctas.
      </Text>
      
      <View style={styles.columnsContainer}>
        {/* Columna de palabras en español (ordenadas) */}
        <View style={styles.column}>
          <Text style={styles.columnTitle}>Español</Text>
          <View style={styles.wordsColumn}>
            {validPairs.map(word => (
              <TouchableOpacity
                key={`spanish-${word.id}`}
                style={[
                  styles.wordButton,
                  styles.spanishWord,
                  selectedSpanish?.id === word.id && styles.selectedWord
                ]}
                onPress={() => handleSelectSpanish(word)}
                disabled={isCorrect !== null}
              >
                <Text style={styles.wordText}>{word.spanish}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Columna de palabras en quechua (mezcladas) */}
        <View style={styles.column}>
          <Text style={styles.columnTitle}>Quechua</Text>
          <View style={styles.wordsColumn}>
            {shuffledQuechuaWords.map(word => (
              <View key={`quechua-${word.id}`} style={styles.quechuaContainer}>
                <TouchableOpacity
                  style={[
                    styles.wordButton,
                    styles.quechuaWord,
                    selectedQuechua?.id === word.id && styles.selectedWord
                  ]}
                  onPress={() => handleSelectQuechua(word)}
                  disabled={isCorrect !== null}
                >
                  <Text style={styles.wordText}>{word.quechua}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.audioButton}
                  onPress={() => SpeechService.speakWord(word.quechua)}
                >
                  <Ionicons name="volume-high" size={16} color="#2196F3" />
                </TouchableOpacity>
              </View>
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
          <Text style={styles.resultText}>
            {isCorrect 
              ? `¡Correcto! "${selectedSpanish?.spanish}" se dice "${selectedQuechua?.quechua}" en quechua.` 
              : `Incorrecto. "${selectedSpanish?.spanish}" no es "${selectedQuechua?.quechua}" en quechua.`}
          </Text>
        </View>
      )}
      
      {/* Botón para verificar o continuar */}
      {(selectedSpanish && selectedQuechua && isCorrect === null) ? (
        <TouchableOpacity
          style={styles.verifyButton}
          onPress={() => verifyMatch(selectedSpanish, selectedQuechua)}
        >
          <Text style={styles.buttonText}>Verificar</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.buttonText}>Continuar</Text>
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
  },
  questionText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
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
  },
  columnTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  wordsColumn: {
    alignItems: 'stretch',
    width: '100%',
  },
  wordButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
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
    borderColor: '#FF0000',
    borderWidth: 2,
    backgroundColor: '#FFEBEE',
  },
  wordText: {
    fontSize: 16,
  },
  quechuaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
    width: '100%',
  },
  audioButton: {
    padding: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
    marginLeft: 5,
  },
  resultContainer: {
    padding: 15,
    borderRadius: 8,
    marginVertical: 15,
    marginHorizontal: 10,
    width: '95%',
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
    textAlign: 'center',
  },
  verifyButton: {
    backgroundColor: '#FF0000',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    marginVertical: 10,
    alignSelf: 'center',
    width: '80%',
  },
  continueButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    marginVertical: 10,
    alignSelf: 'center',
    width: '80%',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bottomSpace: {
    height: 80,
  },
});