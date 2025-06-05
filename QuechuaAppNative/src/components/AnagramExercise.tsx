//src/components/AnagramExercise.tsx

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
import { Alert } from 'react-native';
import { ApiService } from '../services/api';
import { ConsecutiveFailuresIndicator } from './ConsecutiveFailuresIndicator';

interface AnagramExerciseProps {
 question: string;
 correctWord: string;
 spanishTranslation: string;
 onComplete: (isCorrect: boolean) => void;
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
 const [showFeedback, setShowFeedback] = useState(false);
 const [isCorrect, setIsCorrect] = useState(false);
 const [isProcessing, setIsProcessing] = useState(false);
 const [consecutiveFailures, setConsecutiveFailures] = useState(0);
 const [mode, setMode] = useState<'detection' | 'practice'>('practice');
 
 // Nuevos estados para la información de vocabulario
 const [isNewWord, setIsNewWord] = useState(false);
 const [daysProtection, setDaysProtection] = useState(0);
 const [exercisesNeeded, setExercisesNeeded] = useState(0);
 const [masteryLevel, setMasteryLevel] = useState(0);
 
 // Al montar, intentar obtener información de fallos consecutivos
 useEffect(() => {
   const getVocabularyInfo = async () => {
     try {
       const vocab = await ApiService.getUserVocabulary({ sort_by: 'recent' });
       const word = vocab.find((item: any) => 
         item.quechua_word.toLowerCase() === correctWord.toLowerCase()
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
   
   // Determinar el modo a partir de la navegación en React Native
   const detectMode = () => {
     // En React Native, podemos usar una prop para determinar el modo
     // o detectarlo a partir del contexto de navegación
     setMode('practice'); // Valor por defecto
   };
   
   getVocabularyInfo();
   detectMode();
 }, [correctWord]);
 
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
 
 const speakWord = async () => {
   await SpeechService.speakWord(correctWord);
 };
 
 const placeLetter = (letterId: string) => {
   if (isProcessing) return;
   
   const letterIndex = shuffledLetters.findIndex(l => l.id === letterId && !l.isPlaced);
   if (letterIndex === -1) return;
   
   const emptySlotIndex = placedLetters.findIndex(l => l === null);
   if (emptySlotIndex === -1) return;
   
   const letter = shuffledLetters[letterIndex];
   
   setShuffledLetters(prev => {
     const updated = [...prev];
     updated[letterIndex] = { ...updated[letterIndex], isPlaced: true };
     return updated;
   });
   
   setPlacedLetters(prev => {
     const updated = [...prev];
     updated[emptySlotIndex] = { id: letter.id, letter: letter.letter };
     return updated;
   });
 };
 
 const removeLetter = (slotIndex: number) => {
   if (isProcessing) return;
   
   if (slotIndex < 0 || slotIndex >= placedLetters.length) return;
   const letterInSlot = placedLetters[slotIndex];
   if (!letterInSlot) return;
   
   setShuffledLetters(prev => {
     const updated = [...prev];
     const letterIndex = updated.findIndex(l => l.id === letterInSlot.id);
     if (letterIndex !== -1) {
       updated[letterIndex] = { ...updated[letterIndex], isPlaced: false };
     }
     return updated;
   });
   
   setPlacedLetters(prev => {
     const updated = [...prev];
     updated[slotIndex] = null;
     return updated;
   });
 };
 
 const handleSubmit = async () => {
  if (isProcessing) return;
  
  const allSlotsFilled = placedLetters.every(l => l !== null);
  if (!allSlotsFilled) {
    Alert.alert('Completa la palabra', '¡Coloca todas las letras para formar la palabra!');
    return;
  }
  
  setIsProcessing(true);
  const formedWord = placedLetters.map(l => l?.letter || '').join('');
  const correct = formedWord === correctWord;
  setIsCorrect(correct);
  setShowFeedback(true);
  
  speakWord();
  
  // Ya no necesitamos incrementar el contador manualmente
  // ni hacer consultas adicionales al vocabulario
  // El componente padre se encargará de eso cuando llamemos a onComplete
  
  // Añadir variable local para prevenir llamadas múltiples
  let hasCompleted = false;
  
  // Dar tiempo para ver el feedback
  setTimeout(() => {
    setIsProcessing(false);
    // Evitar llamar a onComplete múltiples veces
    if (!hasCompleted) {
      hasCompleted = true;
      onComplete(correct);
    }
  }, 1500);
};
 
 const resetExercise = () => {
   if (isProcessing) return;
   
   setShuffledLetters(getShuffledLetters(correctWord));
   setPlacedLetters(Array(correctWord.length).fill(null));
   setShowFeedback(false);
 };
 
 // Determinar límite de fallos según el modo
 const failuresLimit = mode === 'detection' ? 3 : 2;
 
 return (
   <ScrollView style={styles.scrollContainer}>
     <View style={styles.container}>
       <Text style={styles.questionText}>{question}</Text>
       <Text style={styles.translationText}>{spanishTranslation}</Text>
       
       <TouchableOpacity
         style={styles.listenButton}
         onPress={speakWord}
         disabled={isProcessing}
       >
         <Ionicons name="volume-high" size={24} color="white" />
         <Text style={styles.listenButtonText}>Escuchar palabra</Text>
       </TouchableOpacity>
       
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
       
       {/* Espacios para letras ordenadas */}
       <View style={styles.wordContainer}>
         {placedLetters.map((slot, index) => (
           <TouchableOpacity
             key={`slot-${index}`}
             style={[
               styles.letterSlot,
               slot ? styles.filledSlot : styles.emptySlot
             ]}
             onPress={() => !showFeedback && !isProcessing && slot && removeLetter(index)}
             disabled={showFeedback || isProcessing}
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
             onPress={() => !showFeedback && !isProcessing && !letterObj.isPlaced && placeLetter(letterObj.id)}
             disabled={letterObj.isPlaced || showFeedback || isProcessing}
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
           style={[styles.resetButton, isProcessing && styles.disabledButton]}
           onPress={resetExercise}
           disabled={showFeedback || isProcessing}
         >
           <Text style={styles.buttonText}>Reiniciar</Text>
         </TouchableOpacity>
         
         <TouchableOpacity
           style={[styles.submitButton, isProcessing && styles.disabledButton]}
           onPress={handleSubmit}
           disabled={showFeedback || isProcessing}
         >
           <Text style={styles.buttonText}>Verificar</Text>
         </TouchableOpacity>
       </View>
       
       {/* Feedback sin puntos */}
       {showFeedback && (
         <View style={[
           styles.feedbackContainer,
           isCorrect ? styles.correctFeedback : styles.incorrectFeedback
         ]}>
           <Text style={styles.feedbackText}>
             {isCorrect 
               ? '¡Correcto! Has ordenado la palabra perfectamente.' 
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
 disabledButton: {
   opacity: 0.5,
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