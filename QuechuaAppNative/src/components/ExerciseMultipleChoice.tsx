// src/components/ExerciseMultipleChoice.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  ActivityIndicator,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SpeechService } from '../services/speechService';

interface Option {
  text: string;
  isCorrect: boolean;
}

interface MultipleChoiceProps {
  question: string;
  options: Option[];
  onComplete: (isCorrect: boolean, points: number) => void;
  difficulty: number;
}

export const ExerciseMultipleChoice: React.FC<MultipleChoiceProps> = ({ 
  question, 
  options, 
  onComplete,
  difficulty = 1
}: MultipleChoiceProps) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [animationValue] = useState(new Animated.Value(0));
  const [points, setPoints] = useState(10 * difficulty);
  const [timeLeft, setTimeLeft] = useState(30);
  const [timerActive, setTimerActive] = useState(true);

  // Countdown timer
  useEffect(() => {
    if (!timerActive) return;

    const timer = setTimeout(() => {
      if (timeLeft > 0) {
        setTimeLeft(timeLeft - 1);
        // Reduce points over time
        if (timeLeft % 5 === 0 && points > 5) {
          setPoints(prev => prev - 1);
        }
      } else {
        handleSubmit();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, timerActive]);

  // Animation for feedback
  useEffect(() => {
    if (showFeedback) {
      Animated.timing(animationValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }).start();
    } else {
      animationValue.setValue(0);
    }
  }, [showFeedback]);

  const handleOptionPress = (index: number) => {
    setSelectedOption(index);
  };

  const handleSubmit = () => {
    setTimerActive(false);
    
    if (selectedOption === null) {
      // Time's up without selection
      setShowFeedback(true);
      onComplete(false, 0);
      return;
    }

    const isCorrect = options[selectedOption].isCorrect;
    setShowFeedback(true);
    
    // Call the parent component callback with result and points
    onComplete(isCorrect, isCorrect ? points : 0);
  };

  // Función para pronunciar la palabra correcta
  const speakCorrectWord = () => {
    const correctOption = options.find(option => option.isCorrect);
    if (correctOption) {
      SpeechService.speakWord(correctOption.text);
    }
  };

  const getOptionStyle = (index: number) => {
    if (!showFeedback) {
      return index === selectedOption ? styles.optionSelected : styles.option;
    }
    
    if (options[index].isCorrect) {
      return styles.optionCorrect;
    }
    
    return index === selectedOption && !options[index].isCorrect 
      ? styles.optionIncorrect 
      : styles.option;
  };

  const getOptionTextStyle = (index: number) => {
    if (!showFeedback) {
      return index === selectedOption ? styles.optionTextSelected : styles.optionText;
    }
    
    if (options[index].isCorrect) {
      return styles.optionTextCorrect;
    }
    
    return index === selectedOption && !options[index].isCorrect 
      ? styles.optionTextIncorrect 
      : styles.optionText;
  };

  const feedbackScale = animationValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1.2, 1]
  });

  return (
    <View style={styles.container}>
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>{timeLeft}</Text>
        <Text style={styles.pointsText}>{points} puntos</Text>
      </View>

      <Text style={styles.questionText}>{question}</Text>
      
      {/* Botón para escuchar pronunciación */}
      <TouchableOpacity
        style={styles.listenButton}
        onPress={speakCorrectWord}
      >
        <Ionicons name="volume-high" size={24} color="white" />
        <Text style={styles.listenButtonText}>Escuchar pronunciación</Text>
      </TouchableOpacity>
      
      <View style={styles.optionsContainer}>
        {options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={getOptionStyle(index)}
            onPress={() => !showFeedback && handleOptionPress(index)}
            disabled={showFeedback}
          >
            <Text style={getOptionTextStyle(index)}>{option.text}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!showFeedback && (
        <TouchableOpacity 
          style={[styles.submitButton, selectedOption === null && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={selectedOption === null}
        >
          <Text style={styles.submitButtonText}>Verificar respuesta</Text>
        </TouchableOpacity>
      )}

      {showFeedback && (
        <Animated.View 
          style={[
            styles.feedbackContainer, 
            { transform: [{ scale: feedbackScale }] }
          ]}
        >
          <Text style={styles.feedbackText}>
            {selectedOption !== null && options[selectedOption].isCorrect
              ? `¡Correcto! +${points} puntos`
              : "Incorrecto. Inténtalo de nuevo."}
          </Text>
          <TouchableOpacity style={styles.nextButton} onPress={() => onComplete(selectedOption !== null && options[selectedOption].isCorrect, points)}>
            <Text style={styles.nextButtonText}>Continuar</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  timerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF5722',
  },
  pointsText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  questionText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  // Botón de escucha
  listenButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 25,
    marginBottom: 20,
  },
  listenButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  optionsContainer: {
    marginBottom: 20,
  },
  option: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  optionSelected: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  optionCorrect: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#2E7D32',
  },
  optionIncorrect: {
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#C62828',
  },
  optionText: {
    fontSize: 16,
  },
  optionTextSelected: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  optionTextCorrect: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  optionTextIncorrect: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#C62828',
  },
  submitButton: {
    backgroundColor: '#FF0000',
    padding: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  feedbackContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  feedbackText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 24,
    paddingHorizontal: 24,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});