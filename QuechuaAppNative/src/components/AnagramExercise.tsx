// src/components/AnagramExercise.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SpeechService } from '../services/speechService';

interface AnagramExerciseProps {
  question: string;
  correctWord: string;
  spanishTranslation: string;
  onComplete: (isCorrect: boolean, points: number) => void;
  difficulty: number;
}

export const AnagramExercise: React.FC<AnagramExerciseProps> = ({
  question,
  correctWord,
  spanishTranslation,
  onComplete,
  difficulty
}) => {
  // Crear letras desordenadas
  const getShuffledLetters = (word: string) => {
    const letters = word.split('');
    // Asegurarnos que esté realmente desordenado
    let shuffled = [...letters];
    while (shuffled.join('') === word) {
      shuffled.sort(() => Math.random() - 0.5);
    }
    return shuffled.map((letter, index) => ({
      id: `${letter}-${index}`,
      letter,
      isPlaced: false
    }));
  };

  const [shuffledLetters, setShuffledLetters] = useState(() => getShuffledLetters(correctWord));
  const [placedLetters, setPlacedLetters] = useState<Array<{id: string, letter: string} | null>>(
    Array(correctWord.length).fill(null)
  );
  const [timeLeft, setTimeLeft] = useState(60 - (difficulty * 5)); // Menos tiempo en niveles altos
  const [points, setPoints] = useState(20 * difficulty);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  // Timer para reducir puntos y tiempo
  useEffect(() => {
    if (showFeedback) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
      
      // Reducir puntos gradualmente
      if (timeLeft % 5 === 0 && points > 10) {
        setPoints(prev => prev - 1);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft, points, showFeedback]);
  
  // Función para pronunciar la palabra
  const speakWord = async () => {
    await SpeechService.speakWord(correctWord);
  };
  
  // Función para mover una letra de shuffledLetters a placedLetters
  const placeLetter = (letterId: string) => {
    // Encontrar la letra en shuffledLetters
    const letterIndex = shuffledLetters.findIndex(l => l.id === letterId && !l.isPlaced);
    if (letterIndex === -1) return;
    
    // Encontrar el primer espacio vacío en placedLetters
    const emptySlotIndex = placedLetters.findIndex(l => l === null);
    if (emptySlotIndex === -1) return;
    
    // Actualizar ambos arrays
    const letter = shuffledLetters[letterIndex];
    
    // Actualizar shuffledLetters para marcar la letra como colocada
    setShuffledLetters(prev => {
      const updated = [...prev];
      updated[letterIndex] = { ...updated[letterIndex], isPlaced: true };
      return updated;
    });
    
    // Actualizar placedLetters para añadir la letra
    setPlacedLetters(prev => {
      const updated = [...prev];
      updated[emptySlotIndex] = { id: letter.id, letter: letter.letter };
      return updated;
    });
  };
  
  // Función para devolver una letra de placedLetters a shuffledLetters
  const removeLetter = (slotIndex: number) => {
    if (slotIndex < 0 || slotIndex >= placedLetters.length) return;
    const letterInSlot = placedLetters[slotIndex];
    if (!letterInSlot) return;
    
    // Actualizar shuffledLetters para marcar la letra como no colocada
    setShuffledLetters(prev => {
      const updated = [...prev];
      const letterIndex = updated.findIndex(l => l.id === letterInSlot.id);
      if (letterIndex !== -1) {
        updated[letterIndex] = { ...updated[letterIndex], isPlaced: false };
      }
      return updated;
    });
    
    // Actualizar placedLetters para eliminar la letra
    setPlacedLetters(prev => {
      const updated = [...prev];
      updated[slotIndex] = null;
      return updated;
    });
  };
  
  // Verificar respuesta
  const handleSubmit = () => {
    // Verificar si todos los espacios están llenos
    const allSlotsFilled = placedLetters.every(l => l !== null);
    if (!allSlotsFilled) {
      // Feedback de que faltan letras
      alert('¡Completa todas las letras!');
      return;
    }
    
    // Obtener la palabra formada
    const formedWord = placedLetters.map(l => l?.letter || '').join('');
    
    // Verificar si es correcta
    const correct = formedWord === correctWord;
    setIsCorrect(correct);
    
    // Mostrar feedback
    setShowFeedback(true);
    
    // Reproducir la palabra correcta
    speakWord();
    
    // Enviar resultado al componente padre después de un tiempo
    setTimeout(() => {
      onComplete(correct, correct ? points : 0);
    }, 2000);
  };
  
  // Reiniciar ejercicio
  const resetExercise = () => {
    setShuffledLetters(getShuffledLetters(correctWord));
    setPlacedLetters(Array(correctWord.length).fill(null));
    setShowFeedback(false);
  };
  
  return (
    <ScrollView style={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.questionText}>{question}</Text>
        <Text style={styles.translationText}>{spanishTranslation}</Text>
        
        {/* Botón para escuchar la palabra */}
        <TouchableOpacity
          style={styles.listenButton}
          onPress={speakWord}
        >
          <Ionicons name="volume-high" size={24} color="white" />
          <Text style={styles.listenButtonText}>Escuchar palabra</Text>
        </TouchableOpacity>
        
        {/* Timer y puntos */}
        <View style={styles.statsRow}>
          <View style={styles.timerContainer}>
            <Ionicons name="timer-outline" size={20} color="#FF5722" />
            <Text style={styles.timerText}>{timeLeft}s</Text>
          </View>
          
          <View style={styles.pointsContainer}>
            <Ionicons name="star" size={20} color="#FFC107" />
            <Text style={styles.pointsText}>{points}</Text>
          </View>
        </View>
        
        {/* Espacios para letras ordenadas */}
        <View style={styles.wordContainer}>
          {placedLetters.map((slot, index) => (
            <TouchableOpacity
              key={`slot-${index}`}
              style={[
                styles.letterSlot,
                slot ? styles.filledSlot : styles.emptySlot
              ]}
              onPress={() => !showFeedback && slot && removeLetter(index)}
              disabled={showFeedback}
            >
              <Text style={styles.letterText}>
                {slot ? slot.letter : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Letras desordenadas */}
        <View style={styles.shuffledContainer}>
          {shuffledLetters.map((letterObj) => (
            <TouchableOpacity
              key={letterObj.id}
              style={[
                styles.shuffledLetter,
                letterObj.isPlaced && styles.placedLetter
              ]}
              onPress={() => !showFeedback && !letterObj.isPlaced && placeLetter(letterObj.id)}
              disabled={letterObj.isPlaced || showFeedback}
            >
              <Text style={[
                styles.letterText,
                letterObj.isPlaced && styles.placedLetterText
              ]}>
                {letterObj.letter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Botones */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetExercise}
            disabled={showFeedback}
          >
            <Text style={styles.buttonText}>Reiniciar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={showFeedback}
          >
            <Text style={styles.buttonText}>Verificar</Text>
          </TouchableOpacity>
        </View>
        
        {/* Feedback */}
        {showFeedback && (
          <View style={[
            styles.feedbackContainer,
            isCorrect ? styles.correctFeedback : styles.incorrectFeedback
          ]}>
            <Text style={styles.feedbackText}>
              {isCorrect 
                ? `¡Correcto! +${points} puntos` 
                : `Incorrecto. La palabra correcta es: ${correctWord}`}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    width: '100%',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    margin: 0,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    flex: 1,
    width: '100%',
  },
  questionText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  translationText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  listenButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 25,
    marginBottom: 20,
    width: '100%',
  },
  listenButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    width: '100%',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timerText: {
    marginLeft: 5,
    fontWeight: 'bold',
    color: '#FF5722',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pointsText: {
    marginLeft: 5,
    fontWeight: 'bold',
    color: '#FFC107',
  },
  wordContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
    flexWrap: 'wrap',
    width: '100%',
  },
  letterSlot: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
    borderRadius: 8,
  },
  emptySlot: {
    borderWidth: 2,
    borderColor: '#BDBDBD',
    borderStyle: 'dashed',
  },
  filledSlot: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  shuffledContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
    width: '100%',
  },
  shuffledLetter: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
    backgroundColor: '#FF9800',
    borderRadius: 8,
  },
  placedLetter: {
    backgroundColor: '#E0E0E0',
  },
  letterText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  placedLetterText: {
    color: '#9E9E9E',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  resetButton: {
    backgroundColor: '#9E9E9E',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#FF0000',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  feedbackContainer: {
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
    width: '100%',
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
});