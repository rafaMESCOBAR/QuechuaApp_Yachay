// src/components/FillBlanksExercise.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  question: string;
  answer: string;
  difficulty: number;
  onComplete: (isCorrect: boolean, points: number) => void;
}

export const FillBlanksExercise: React.FC<Props> = ({
  question,
  answer,
  difficulty,
  onComplete
}) => {
  const [userAnswer, setUserAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  const basePoints = 10 * difficulty;
  const pointsAfterAttempts = Math.max(1, basePoints - (attemptCount * 2));
  
  const handleSubmit = () => {
    Keyboard.dismiss();
    const normalizedUserAnswer = userAnswer.trim().toLowerCase();
    const normalizedCorrectAnswer = answer.trim().toLowerCase();
    
    const correctness = normalizedUserAnswer === normalizedCorrectAnswer;
    setIsCorrect(correctness);
    setIsSubmitted(true);
    setAttemptCount(prev => prev + 1);
    
    if (correctness) {
      setTimeout(() => {
        onComplete(true, pointsAfterAttempts);
      }, 1500);
    } else if (attemptCount >= 2) {
      // Si falló 3 veces, mostrar respuesta y continuar
      setTimeout(() => {
        onComplete(false, 0);
      }, 3000);
    }
  };
  
  const handleTryAgain = () => {
    setIsSubmitted(false);
    setUserAnswer('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.question}>{question}</Text>
      
      <TextInput
        style={[
          styles.input,
          isSubmitted && (isCorrect ? styles.correctInput : styles.incorrectInput)
        ]}
        value={userAnswer}
        onChangeText={setUserAnswer}
        placeholder="Escribe tu respuesta"
        autoCapitalize="none"
        editable={!isSubmitted || !isCorrect}
      />
      
      {isSubmitted ? (
        <View style={styles.resultContainer}>
          {isCorrect ? (
            <View style={styles.correctFeedback}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.correctText}>¡Correcto!</Text>
              <Text style={styles.pointsText}>+{pointsAfterAttempts} puntos</Text>
            </View>
          ) : (
            <View style={styles.incorrectFeedback}>
              <Ionicons name="close-circle" size={24} color="#F44336" />
              <Text style={styles.incorrectText}>Intenta nuevamente</Text>
              
              {attemptCount >= 2 && (
                <Text style={styles.hintText}>
                  Respuesta correcta: {answer}
                </Text>
              )}
              
              {attemptCount < 3 && (
                <TouchableOpacity 
                  style={styles.tryAgainButton}
                  onPress={handleTryAgain}
                >
                  <Text style={styles.tryAgainText}>Intentar otra vez</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      ) : (
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={userAnswer.trim() === ''}
        >
          <Text style={styles.submitButtonText}>Verificar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  question: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    textAlign: 'center',
    backgroundColor: '#f9f9f9',
  },
  correctInput: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  incorrectInput: {
    borderColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  submitButton: {
    backgroundColor: '#FF0000',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  correctFeedback: {
    alignItems: 'center',
  },
  incorrectFeedback: {
    alignItems: 'center',
  },
  correctText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 8,
  },
  incorrectText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 8,
  },
  pointsText: {
    fontSize: 16,
    color: '#4CAF50',
    marginTop: 4,
  },
  hintText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  tryAgainButton: {
    backgroundColor: '#FF9800',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  tryAgainText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});