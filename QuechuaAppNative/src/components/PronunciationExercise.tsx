// src/components/PronunciationExercise.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
 View, 
 Text, 
 StyleSheet, 
 TouchableOpacity, 
 ActivityIndicator,
 ScrollView,
 Dimensions,
 SafeAreaView,
 Platform,
 Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { SpeechService } from '../services/speechService';
import { Alert } from 'react-native';
import { ApiService } from '../services/api';
import { ConsecutiveFailuresIndicator } from './ConsecutiveFailuresIndicator';
interface PronunciationExerciseProps {
  question: string;
  wordToProunounce: string;
  spanishTranslation: string;
  phoneticGuide?: string;
  onComplete: (isCorrect: boolean, userAnswer?: string) => void;
  difficulty: number;
 }
 
 const windowHeight = Dimensions.get('window').height;
 
 // Constante para controlar el modo de desarrollo
 const DEV_MODE = false;  // Cambia a true para pruebas sin backend
 
 // Umbral de similitud para considerar correcta la pronunciación
 const SIMILARITY_THRESHOLD = 0.7;
 
 // Variable estática para controlar tiempos de reproducción de sonido
 const lastSoundTimes: Record<string, number> = {
   correct: 0,
   incorrect: 0,
   hint: 0
 };
 
 // Función para verificar si podemos reproducir un sonido
 const canPlaySound = (type: string): boolean => {
   const now = Date.now();
   const lastPlayTime = lastSoundTimes[type] || 0;
   const cooldownPeriod = 2000; // 2 segundos de cooldown
   
   if (now - lastPlayTime >= cooldownPeriod) {
     lastSoundTimes[type] = now;
     return true;
   }
   
   console.log(`Sonido "${type}" en cooldown, evitando duplicación`);
   return false;
 };
 
 export const PronunciationExercise: React.FC<PronunciationExerciseProps> = ({
  question,
  wordToProunounce,
  spanishTranslation,
  phoneticGuide,
  onComplete,
  difficulty
 }) => {
const [recording, setRecording] = useState<Audio.Recording | null>(null);
 const [isRecording, setIsRecording] = useState(false);
 const [isProcessing, setIsProcessing] = useState(false);
 const [attempts, setAttempts] = useState(0);
 const [feedback, setFeedback] = useState('');
 const [showSuccess, setShowSuccess] = useState(false);
 const [transcription, setTranscription] = useState('');
 const [similarity, setSimilarity] = useState(0);
 const [detailedFeedback, setDetailedFeedback] = useState<string[]>([]);
 const [currentVolume, setCurrentVolume] = useState(-60);
 const [audioActivity, setAudioActivity] = useState(false);
 const [consecutiveFailures, setConsecutiveFailures] = useState(0);
 const [mode, setMode] = useState<'detection' | 'practice'>('practice');
 // Estado para control de sonido
const [soundEnabled, setSoundEnabled] = useState(true);
 
 // Referencias
 const recordingRef = useRef<Audio.Recording | null>(null);
 const isRecordingRef = useRef<boolean>(false);
 const maxDurationTimerRef = useRef<NodeJS.Timeout | null>(null);
 const scrollViewRef = useRef<ScrollView>(null);
 const maxLevelRef = useRef<number>(-60);
 const audioSamplesCountRef = useRef(0);
 const audioLevelsSumRef = useRef(0);
 const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);
 const completionTimerRef = useRef<NodeJS.Timeout | null>(null);

 // Animación para el medidor de audio
 const animatedVolume = useRef(new Animated.Value(-60)).current;
 
 // Al montar, intentar obtener información de fallos consecutivos
 useEffect(() => {
   const getVocabularyInfo = async () => {
     try {
       const vocab = await ApiService.getUserVocabulary({ sort_by: 'recent' });
       const word = vocab.find((item: any) => 
         item.quechua_word.toLowerCase() === wordToProunounce.toLowerCase()
       );
       
       if (word) {
         setConsecutiveFailures(word.consecutive_failures || 0);
       }
     } catch (error) {
       console.log('Error al obtener información de vocabulario:', error);
     }
   };
   
   // Determinar el modo a partir del contexto
   const detectMode = () => {
     // En React Native usamos el contexto de navegación en lugar de window.location
     // Esta es una implementación simulada - usar el contexto real de la app
     const currentRoute = 'practice'; // Simulado - usar la ruta real
     if (currentRoute.includes('detection') || currentRoute.includes('camera')) {
       setMode('detection');
     } else {
       setMode('practice');
     }
   };
   
   getVocabularyInfo();
   detectMode();
 }, [wordToProunounce]);
 
 // Actualizar la animación de volumen
 useEffect(() => {
   Animated.timing(animatedVolume, {
     toValue: currentVolume,
     duration: 100,
     useNativeDriver: false
   }).start();
 }, [currentVolume]);

 // Añadir un useEffect que se ejecute cuando cambia la palabra a pronunciar
 useEffect(() => {
   // Reiniciar todos los estados
   setRecording(null);
   setIsRecording(false);
   setIsProcessing(false);
   setAttempts(0);
   setFeedback('');
   setShowSuccess(false);
   setTranscription('');
   setSimilarity(0);
   setDetailedFeedback([]);
   setCurrentVolume(-60);
   setAudioActivity(false);
   
   // Limpiar temporizadores
   if (maxDurationTimerRef.current) {
     clearTimeout(maxDurationTimerRef.current);
     maxDurationTimerRef.current = null;
   }
   
   if (completionTimerRef.current) {
     clearTimeout(completionTimerRef.current);
     completionTimerRef.current = null;
   }
   
   if (safetyTimerRef.current) {
     clearTimeout(safetyTimerRef.current);
     safetyTimerRef.current = null;
   }
   
   // Limpiar estado de audio
   resetAudioState();
 }, [wordToProunounce, difficulty]);

 // Limpiar cuando el componente se desmonta
 useEffect(() => {
   return () => {
     if (maxDurationTimerRef.current) {
       clearTimeout(maxDurationTimerRef.current);
     }
     
     // Limpiar temporizador de finalización
     if (completionTimerRef.current) {
       clearTimeout(completionTimerRef.current);
       completionTimerRef.current = null;
     }
     
     // Limpiar temporizador de seguridad
     if (safetyTimerRef.current) {
       clearTimeout(safetyTimerRef.current);
       safetyTimerRef.current = null;
     }
     
     resetAudioState();
   };
 }, []);

 // Escuchar evento global para resetear fallos consecutivos
 useEffect(() => {
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
 
// Función para reproducir la pronunciación correcta
const handlePlayPronunciation = async () => {
  // Reproducir sonido de pista/pronunciación
  if (soundEnabled) {
    try {
      // Solo reproducir si no está en cooldown
      if (canPlaySound('hint')) {
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/sounds/hint.mp3')
        );
        await sound.playAsync();
        // Limpiar después de reproducir
        sound.setOnPlaybackStatusUpdate((status) => {
          if ('isLoaded' in status && status.isLoaded && !status.isPlaying) {
            sound.unloadAsync().catch(e => console.error("Error descargando sonido", e));
          }
        });
      }
    } catch (error) {
      console.error("Error reproduciendo sonido:", error);
    }
  }
  
  try {
    await SpeechService.speakWord(wordToProunounce);
  } catch (error) {
    console.error('Error reproduciendo pronunciación:', error);
    setFeedback('Error al reproducir. Intenta de nuevo.');
  }
};
 
 // Función para limpiar el estado de audio
 const resetAudioState = () => {
   if (recordingRef.current) {
     try {
       if (recordingRef.current._cleanupForUnloadedRecorder) {
         recordingRef.current._cleanupForUnloadedRecorder()
           .catch(error => console.log('Error limpiando grabadora:', error));
       }
     } catch (e) {
       console.log('Error al intentar limpiar grabación:', e);
     }
     
     recordingRef.current = null;
   }
   
   Audio.setAudioModeAsync({
     allowsRecordingIOS: false,
     playsInSilentModeIOS: true,
     staysActiveInBackground: false,
     playThroughEarpieceAndroid: false,
     shouldDuckAndroid: true,
   }).catch(error => console.log('Error al restablecer modo de audio:', error));
 };

 // Iniciar grabación de audio
 const startRecording = async () => {
   try {
     console.log("Iniciando grabación");
     
     // Verificar permisos actuales
     const { status } = await Audio.getPermissionsAsync();
     console.log("Permisos de audio:", status);
     
     if (status !== 'granted') {
       const { status: newStatus } = await Audio.requestPermissionsAsync();
       if (newStatus !== 'granted') {
         setFeedback('Necesitamos permiso del micrófono');
         return;
       }
     }
     
     // Configuración mejorada de audio
     await Audio.setAudioModeAsync({
       allowsRecordingIOS: true,
       playsInSilentModeIOS: true,
       staysActiveInBackground: false,
       playThroughEarpieceAndroid: false, 
       shouldDuckAndroid: true,
     });
     
     // Configuración de grabación optimizada para reconocimiento de voz
     const recordingOptions = {
       android: {
         extension: '.m4a',
         outputFormat: Audio.AndroidOutputFormat.MPEG_4,
         audioEncoder: Audio.AndroidAudioEncoder.AAC,
         sampleRate: 44100,        // Aumentar frecuencia de muestreo
         numberOfChannels: 1,       // Mono para mejor reconocimiento
         bitRate: 128000,           // Aumentar bitrate para mejor calidad
       },
       ios: {
         extension: '.m4a',
         outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
         audioQuality: Audio.IOSAudioQuality.HIGH,
         sampleRate: 44100,
         numberOfChannels: 1,
         bitRate: 128000,
         linearPCMBitDepth: 16,
         linearPCMIsBigEndian: false,
         linearPCMIsFloat: false,
       },
       web: {
         mimeType: 'audio/mp4',
       },
       progressUpdateIntervalMillis: 100,
     };
     
     // Reiniciar contadores de audio
     audioSamplesCountRef.current = 0;
     audioLevelsSumRef.current = 0;
     maxLevelRef.current = -60;
     setAudioActivity(false);
     
     // Crear y preparar la grabación
     const newRecording = new Audio.Recording();
     recordingRef.current = newRecording;
     
     await recordingRef.current.prepareToRecordAsync(recordingOptions);
     
     // Configurar monitoreo de audio
     recordingRef.current.setOnRecordingStatusUpdate((status) => {
       if (status.isRecording) {
         if ('metering' in status && status.metering !== undefined) {
           const level = status.metering;
           
           // Actualizar el nivel de audio en la UI
           setCurrentVolume(level);
           
           // En algunos dispositivos -60dB puede ser el valor predeterminado incluso cuando hay audio
           // Asumimos que hay audio si está grabando, independientemente del nivel reportado
           if (status.durationMillis > 500) {
             setAudioActivity(true);
             // Aumentar contador artificialmente para compensar posibles errores de medición
             audioSamplesCountRef.current++;
             audioLevelsSumRef.current += level;
             
             // Si el nivel reportado es mayor a -50dB, consideramos que hay actividad real
             if (level > -50) {
               maxLevelRef.current = Math.max(maxLevelRef.current, level);
             } else {
               // Si no, simulamos un nivel razonable basado en la duración
               const simulatedLevel = -50 + Math.min(30, status.durationMillis / 500);
               maxLevelRef.current = Math.max(maxLevelRef.current, simulatedLevel);
             }
           }
         }
       }
     });
     
     // Iniciar grabación
     await recordingRef.current.startAsync();
     isRecordingRef.current = true;
     setIsRecording(true);
     setFeedback('Grabando... Habla ahora');
     
     // Temporizador para máxima duración (5 segundos)
     maxDurationTimerRef.current = setTimeout(async () => {
       if (isRecordingRef.current) {
         console.log("Temporizador de duración máxima activado");
         
         if (audioSamplesCountRef.current > 0) {
           const avgLevel = audioLevelsSumRef.current / audioSamplesCountRef.current;
           console.log(`Nivel promedio de audio: ${avgLevel} dB, Muestras: ${audioSamplesCountRef.current}`);
         } else {
           console.log("No se recibieron muestras de audio");
         }
         
         await stopRecording();
       }
     }, 5000);
     
   } catch (error) {
     console.error('Error al iniciar grabación:', error);
     setFeedback('Error al iniciar grabación. Intenta de nuevo.');
     isRecordingRef.current = false;
     setIsRecording(false);
   }
 };

 const stopRecording = async () => {
   if (!recordingRef.current || !isRecordingRef.current) {
     console.log("No hay grabación activa que detener");
     return;
   }
   
   try {
     // Actualizar estado
     isRecordingRef.current = false;
     setIsRecording(false);
     setIsProcessing(true);
     setFeedback('Analizando tu pronunciación...');
     
     // Configurar temporizador de seguridad
     if (safetyTimerRef.current) {
       clearTimeout(safetyTimerRef.current);
     }
     safetyTimerRef.current = setTimeout(() => {
       console.log("Temporizador de seguridad activado para evitar spinner infinito");
       if (isProcessing) {
         setIsProcessing(false);
         if (attempts >= 3) {
           completeExercise(false, 0);
         }
       }
     }, 10000); // 10 segundos como máximo
     
     // Limpiar temporizador
     if (maxDurationTimerRef.current) {
       clearTimeout(maxDurationTimerRef.current);
       maxDurationTimerRef.current = null;
     }
     
     // Detener grabación
     console.log("Deteniendo grabación...");
     await recordingRef.current.stopAndUnloadAsync();
     console.log("Grabación detenida");
     
     const uri = recordingRef.current.getURI();
     console.log("URI de la grabación:", uri);
     
     // Verificar el URI
     if (!uri) {
       setFeedback("Error al obtener grabación. Por favor, intenta de nuevo.");
       setIsProcessing(false);
       return;
     }
     
     console.log(`Nivel máximo detectado: ${maxLevelRef.current} dB`);
     console.log(`Muestras de audio: ${audioSamplesCountRef.current}`);
     
     try {
       // Verificar el archivo directamente
       const fileInfo = await FileSystem.getInfoAsync(uri);
       let fileSize = 0;
       
       if (fileInfo && 'size' in fileInfo) {
         fileSize = fileInfo.size;
         console.log(`Tamaño del archivo de audio: ${fileSize} bytes`);
       }
       
       // Incrementar intentos con validación de máximo
       setAttempts(prev => {
         const newAttempts = prev + 1;
         console.log(`Intento ${newAttempts} de 3`);
         
         // Si excede el máximo, completar el ejercicio
         if (newAttempts > 3) {
           console.log("Máximo de intentos excedido (3)");
           setIsProcessing(false);
           
           // Limpiar temporizador de seguridad
           if (safetyTimerRef.current) {
             clearTimeout(safetyTimerRef.current);
             safetyTimerRef.current = null;
           }
           
           // Programar completar ejercicio
           setTimeout(() => completeExercise(false, 0), 500);
           
           return 3; // Mantener en 3 como máximo
         }
         
         return newAttempts;
       });
       
       // Verificamos si el tamaño del archivo supera un umbral mínimo
       const hasAudioContent = fileSize > 50000;
       
       // Siempre procesar el archivo si tiene tamaño suficiente, 
       // independientemente de los contadores de audio
       if (!hasAudioContent) {
         setFeedback("No pudimos detectar tu voz. Habla más fuerte por favor.");
         setTimeout(() => handlePlayPronunciation(), 1000);
         setIsProcessing(false);
         
         // Limpiar temporizador de seguridad
         if (safetyTimerRef.current) {
           clearTimeout(safetyTimerRef.current);
           safetyTimerRef.current = null;
         }
         
         return;
       }
       
       // PROCESAR EL AUDIO
       
       // En modo desarrollo, simular el reconocimiento para testear la UX
       if (DEV_MODE) {
         processSpeechDevMode(fileSize);
         return;
       }
       
       // En producción, usar el servicio real del backend
       try {
         // Enviar al backend para análisis
         const result = await SpeechService.analyzeRecordedAudioViaBackend(uri, wordToProunounce);
         processSpeechResult(result);
       } catch (error) {
         console.error('Error al analizar audio vía backend:', error);
         
         // Si falla, usar el modo desarrollo como fallback en desarrollo
         if (DEV_MODE) {
           processSpeechDevMode(fileSize);
         } else {
           // En producción, mostrar un error claro
           setFeedback("No se pudo analizar el audio. Verifica tu conexión.");
           setIsProcessing(false);
           
           // Limpiar temporizador de seguridad
           if (safetyTimerRef.current) {
             clearTimeout(safetyTimerRef.current);
             safetyTimerRef.current = null;
           }
         }
       }
       
     } catch (error) {
       console.error('Error verificando archivo de audio:', error);
       setFeedback('Error al analizar el audio. Intenta de nuevo.');
       setIsProcessing(false);
       
       // Limpiar temporizador de seguridad
       if (safetyTimerRef.current) {
         clearTimeout(safetyTimerRef.current);
         safetyTimerRef.current = null;
       }
     }
   } catch (error) {
     console.error('Error al detener grabación:', error);
     setFeedback('Error al procesar audio');
     setIsProcessing(false);
     
     // Limpiar temporizador de seguridad
     if (safetyTimerRef.current) {
       clearTimeout(safetyTimerRef.current);
       safetyTimerRef.current = null;
     }
   }
 };

 // Modificar la función processSpeechResult
 const processSpeechResult = (result: { success: boolean; transcription: string; similarity: number }) => {
   console.log("Respuesta del análisis:", result);
   
   // Limpiar temporizador de seguridad
   if (safetyTimerRef.current) {
     clearTimeout(safetyTimerRef.current);
     safetyTimerRef.current = null;
   }
   
   // Asegurar que la similitud nunca sea negativa
   const validatedSimilarity = Math.max(0, result.similarity);
   result.similarity = validatedSimilarity;
   
   // Actualizar estados con el resultado
   setTranscription(result.transcription);
   setSimilarity(validatedSimilarity);
   
   // Determinar feedback
   // Determinar feedback
let feedbackMessage = '';
let feedbackDetails: string[] = [];
let success = false;

// Para palabras compuestas (con espacios), usar umbral más bajo
const isCompoundWord = wordToProunounce.includes(' ');
const similarityThreshold = isCompoundWord ? 0.5 : 0.7;

// Evaluar éxito con criterios flexibles
if (result.success) {
  success = true;
  feedbackMessage = '¡Excelente pronunciación!';
} 
// Coincidencia exacta (insensible a mayúsculas/minúsculas)
else if (result.transcription.toLowerCase() === wordToProunounce.toLowerCase()) {
  success = true;
  result.similarity = 1.0;
  feedbackMessage = '¡Perfecta pronunciación!';
}
// Similitud alta según umbral adaptado a tipo de palabra
else if (validatedSimilarity >= similarityThreshold) {
  success = true;
  feedbackMessage = '¡Buena pronunciación!';
}
// Para palabras compuestas, ser más flexible en el tercer intento
else if (isCompoundWord && attempts >= 2 && validatedSimilarity >= 0.4) {
  success = true;
  feedbackMessage = 'Pronunciación aceptable';
}
// En cualquier otro caso, es incorrecta
else {
  feedbackMessage = `Tu pronunciación necesita práctica. Se reconoció: "${result.transcription}"`;
  feedbackDetails = ["Escucha atentamente el ejemplo e intenta de nuevo."];
  // Ya no actualizamos manualmente el contador de fallos
  // El backend lo manejará cuando se llame a onComplete
} 
   
   // Mostrar detalles de lo que se reconoció
   if (success) {
     feedbackDetails = [`Se reconoció: "${result.transcription}"`];
   }
   
   setFeedback(feedbackMessage);
   setDetailedFeedback(feedbackDetails);
   
   // IMPORTANTE: Asegurar que isProcessing siempre se restablezca
   setIsProcessing(false);
   
   // Determinar si continuar o completar
   if (success || attempts >= 3) {
     completeExercise(success, validatedSimilarity);
   } else {
     // Otro intento
     setTimeout(() => handlePlayPronunciation(), 1500);
   }
 };

 // Función para modo desarrollo (simula reconocimiento)
 const processSpeechDevMode = (fileSize: number) => {
   // Simular diferentes escenarios basados en el tamaño del archivo y el intento
   const attemptFactor = attempts <= 2 ? attempts * 0.1 : 0.25;
   const sizeFactor = Math.min(1, Math.max(0.5, fileSize / 100000));
   
   // Calcular probabilidad de éxito
   let successProbability = 0.7 + (sizeFactor * 0.3) - attemptFactor;
   
   // En el tercer intento, aumentar la probabilidad de éxito
   if (attempts >= 3) {
     successProbability = 0.9;
   }
   
   const success = Math.random() < successProbability;
   
   // Crear resultado simulado
   let result;
   if (success) {
     // Simulación de éxito
     const simSimilarity = Math.random() * 0.2 + 0.8; // Entre 0.8 y 1.0
     result = {
       success: true,
       transcription: wordToProunounce,
       similarity: simSimilarity
     };
     
     setFeedback('¡Excelente pronunciación!');
     setDetailedFeedback(["Tu pronunciación es muy buena."]);
   } else {
    // Simulación de fallo
    const simSimilarity = Math.random() * 0.3 + 0.4; // Entre 0.4 y 0.7
    
    // Crear una transcripción similar pero incorrecta
    let simTranscription;
    if (Math.random() < 0.3) {
      simTranscription = '[no reconocido]';
      setFeedback('No pudimos reconocer claramente. Habla más fuerte.');
    } else {
      // Crear una variación de la palabra
      const chars = wordToProunounce.split('');
      const pos = Math.floor(Math.random() * chars.length);
      if (chars.length > 0) {
        chars[pos] = String.fromCharCode(97 + Math.floor(Math.random() * 26));
      }
      simTranscription = chars.join('');
      setFeedback(`Tu pronunciación necesita práctica. Se reconoció: "${simTranscription}"`);
    }
    
    result = {
      success: false,
      transcription: simTranscription,
      similarity: simSimilarity
    };
    
    setDetailedFeedback(["Escucha atentamente el ejemplo e intenta de nuevo."]);
    // Ya no actualizamos manualmente el contador de fallos
  }
   
   // Actualizar estados
   setTranscription(result.transcription);
   setSimilarity(result.similarity);
   
   console.log("Resultado simulado:", result);
   
   // Determinar si continuar o completar
   if (result.success || attempts >= 3) {
     completeExercise(result.success, result.similarity);
   } else {
     // Otro intento
     setIsProcessing(false);
     setTimeout(() => handlePlayPronunciation(), 1500);
   }
 };
 
// Función para completar el ejercicio
const completeExercise = async (isSuccess: boolean, similarityValue: number) => {
  // Reproducir sonido según el resultado
  if (soundEnabled) {
    try {
      const soundType = isSuccess ? 'correct' : 'incorrect';
      
      // Solo reproducir si no está en cooldown
      if (canPlaySound(soundType)) {
        const soundFile = isSuccess 
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
      }
    } catch (error) {
      console.error("Error reproduciendo sonido:", error);
    }
  }
  
  // Mostrar éxito
  setShowSuccess(true);
  
  // Añadir variable local para prevenir llamadas múltiples
  let hasCompleted = false;
  
  // Enviar resultado al componente padre directamente
  // Los componentes superiores se encargarán de hacer la llamada API
  // y de mostrar alertas sobre cambios en el nivel de maestría
  setTimeout(() => {
    // Evitar llamar a onComplete múltiples veces
    if (!hasCompleted) {
      hasCompleted = true;
      
      // 🆕 ENVIAR LA TRANSCRIPCIÓN COMO RESPUESTA DEL USUARIO
      const userTranscription = transcription || wordToProunounce;
      
      // Importante: primero informar al padre sobre el resultado
      onComplete(isSuccess, userTranscription);
    }
  }, 3000);
};
 
 // Función para renderizar el medidor de nivel de audio
 const renderAudioLevelMeter = () => {
   if (!isRecording) return null;
   
   // Convertir de dB a porcentaje (de -60dB a 0dB)
   const levelPercent = Math.max(0, Math.min(100, ((currentVolume + 60) / 60) * 100));
   
   return (
     <View style={styles.audioLevelContainer}>
       <Text style={styles.audioLevelLabel}>Nivel de voz:</Text>
       <View style={styles.audioLevelTrack}>
         <Animated.View 
           style={[
             styles.audioLevelFill,
             {
               width: animatedVolume.interpolate({
                 inputRange: [-60, -40, -20, 0],
                 outputRange: ['0%', '30%', '70%', '100%']
               })
             },
             levelPercent > 70 ? styles.audioLevelHigh : 
             levelPercent > 40 ? styles.audioLevelMedium : 
             styles.audioLevelLow
           ]} 
         />
       </View>
       {!audioActivity && (
         <Text style={styles.audioActivityHint}>Habla más fuerte...</Text>
       )}
     </View>
   );
 };
 
 // Determinar límite de fallos según el modo
 const failuresLimit = mode === 'detection' ? 3 : 2;
 
 return (
   <SafeAreaView style={styles.safeContainer}>
     <ScrollView
       ref={scrollViewRef}
       style={styles.scrollContainer}
       contentContainerStyle={styles.contentContainer}
     >
       <View style={styles.container}>
         {/* Pregunta/instrucción - solo la primera parte para mantenerla breve */}
         <Text style={styles.questionText}>
           {question.split('.')[0]}.
         </Text>
         
         {/* Contenedor de la palabra a pronunciar */}
         <View style={styles.wordContainer}>
           <Text style={styles.wordText}>{wordToProunounce}</Text>
           <Text style={styles.translationText}>{spanishTranslation}</Text>
           
           {phoneticGuide && (
             <Text style={styles.phoneticText}>{phoneticGuide}</Text>
           )}
         </View>
         
         {/* Botón para escuchar pronunciación */}
         <TouchableOpacity
           style={styles.listenButton}
           onPress={handlePlayPronunciation}
           disabled={isRecording || isProcessing}
         >
           <Ionicons name="volume-high" size={24} color="white" />
           <Text style={styles.buttonText}>Escuchar pronunciación</Text>
         </TouchableOpacity>
         
         {/* Indicador de fallos consecutivos */}
         {consecutiveFailures > 0 && (
         <ConsecutiveFailuresIndicator
           failures={consecutiveFailures}
           limit={failuresLimit}
           mode={mode}
         />
       )}
       
       {/* Feedback para el usuario */}
       {feedback && (
         <View style={[
           styles.feedbackContainer,
           (feedback.includes('¡Excelente') || feedback.includes('¡Muy bien') || feedback.includes('¡Perfecta'))
             ? styles.successFeedback
             : (feedback.includes('Error') ? styles.errorFeedback : styles.regularFeedback)
         ]}>
           <Text style={styles.feedbackText}>{feedback}</Text>
           
           {detailedFeedback.length > 0 && (
             <Text style={styles.detailedFeedbackText}>
               {detailedFeedback[0]}
             </Text>
           )}
         </View>
       )}
       
       {/* Medidor de nivel de audio */}
       {renderAudioLevelMeter()}
       
       {/* Indicador de intentos */}
       <View style={styles.attemptsContainer}>
         <Text style={styles.attemptsText}>
            Intento {attempts}/3
         </Text>
       </View>
       
       {/* Espacio adicional para evitar que el botón fijo tape contenido */}
       <View style={styles.spacer} />
     </View>
   </ScrollView>
   
   {/* Botón de grabación fijo en la parte inferior */}
   <View style={styles.fixedButtonsBar}>
     {!isRecording && !isProcessing && !showSuccess && (
       <TouchableOpacity
         style={styles.recordButton}
         onPress={startRecording}
       >
         <Ionicons name="mic" size={28} color="white" />
         <Text style={styles.buttonText}>Presiona para hablar</Text>
       </TouchableOpacity>
     )}
     
     {isRecording && (
       <TouchableOpacity
         style={styles.recordingButton}
         onPress={stopRecording}
       >
         <Ionicons name="stop-circle" size={28} color="white" />
         <Text style={styles.buttonText}>Detener grabación</Text>
       </TouchableOpacity>
     )}
     
     {isProcessing && (
       <View style={styles.processingContainer}>
         <ActivityIndicator size="large" color="#FF0000" />
         <Text style={styles.processingText}>Analizando pronunciación...</Text>
       </View>
     )}
     
     {showSuccess && (
       <TouchableOpacity
         style={styles.continueButton}
         onPress={() => onComplete(true)} 
       >
         <Ionicons name="checkmark-circle" size={24} color="white" />
         <Text style={styles.buttonText}>Continuar</Text>
       </TouchableOpacity>
     )}
   </View>
 </SafeAreaView>
);
};

const styles = StyleSheet.create({
safeContainer: {
 flex: 1,
 backgroundColor: 'white',
 width: '100%',
},
scrollContainer: {
 flex: 1,
 width: '100%',
},
contentContainer: {
 paddingHorizontal: 20,
 paddingTop: 20,
 paddingBottom: 100, // Extra padding to account for the fixed button
 width: '100%',
},
container: {
 backgroundColor: 'white',
 borderRadius: 16,
 padding: 20,
 elevation: 4,
 shadowColor: '#000',
 shadowOffset: { width: 0, height: 2 },
 shadowOpacity: 0.1,
 shadowRadius: 8,
 flex: 1,
 width: '100%',
},
questionText: {
 fontSize: 15,
 fontWeight: '400',
 marginVertical: 10,
 textAlign: 'left',
 color: '#333',
 lineHeight: 20,
 padding: 12,
 backgroundColor: '#f9f9f9',
 borderRadius: 8,
 borderLeftWidth: 2,
 borderLeftColor: '#ddd',
 width: '100%',
},
wordContainer: {
 alignItems: 'center',
 marginBottom: 24,
 padding: 20,
 backgroundColor: '#F8F9FA',
 borderRadius: 16,
 elevation: 2,
 shadowColor: '#000',
 shadowOffset: { width: 0, height: 1 },
 shadowOpacity: 0.1,
 shadowRadius: 4,
 width: '100%',
},
wordText: {
 fontSize: 38,
 fontWeight: 'bold',
 color: '#FF0000',
 marginBottom: 12,
 textAlign: 'center',
 letterSpacing: 1,
},
translationText: {
 fontSize: 18,
 color: '#555',
 marginBottom: 12,
 fontStyle: 'italic',
},
phoneticText: {
 fontSize: 12,
 color: '#777',
 marginTop: 4,
 fontStyle: 'italic',
 textAlign: 'center',
},
listenButton: {
 backgroundColor: '#2196F3',
 flexDirection: 'row',
 alignItems: 'center',
 justifyContent: 'center',
 padding: 14,
 borderRadius: 30,
 marginBottom: 20,
 elevation: 3,
 shadowColor: '#000',
 shadowOffset: { width: 0, height: 2 },
 shadowOpacity: 0.1,
 shadowRadius: 4,
 width: '100%',
},
recordButton: {
 backgroundColor: '#4CAF50',
 flexDirection: 'row',
 alignItems: 'center',
 justifyContent: 'center',
 padding: 16,
 borderRadius: 30,
 minWidth: 220,
 elevation: 3,
 shadowColor: '#000',
 shadowOffset: { width: 0, height: 2 },
 shadowOpacity: 0.2,
 shadowRadius: 4,
 width: '80%',
 alignSelf: 'center',
},
recordingButton: {
 backgroundColor: '#F44336',
 flexDirection: 'row',
 alignItems: 'center',
 justifyContent: 'center',
 padding: 16,
 borderRadius: 30,
 minWidth: 220,
 elevation: 3,
 shadowColor: '#000',
 shadowOffset: { width: 0, height: 2 },
 shadowOpacity: 0.2,
 shadowRadius: 4,
 width: '80%',
 alignSelf: 'center',
},
continueButton: {
 backgroundColor: '#FF9800',
 flexDirection: 'row',
 alignItems: 'center',
 justifyContent: 'center',
 padding: 16,
 borderRadius: 30,
 minWidth: 220,
 elevation: 3,
 shadowColor: '#000',
 shadowOffset: { width: 0, height: 2 },
 shadowOpacity: 0.2,
 shadowRadius: 4,
 width: '80%',
 alignSelf: 'center',
},
buttonText: {
 color: 'white',
 fontWeight: 'bold',
 marginLeft: 10,
 fontSize: 16,
},
feedbackContainer: {
 padding: 16,
 borderRadius: 12,
 marginBottom: 20,
 borderLeftWidth: 4,
 width: '100%',
},
successFeedback: {
 backgroundColor: '#E8F5E9',
 borderLeftColor: '#4CAF50',
},
errorFeedback: {
 backgroundColor: '#FFEBEE',
 borderLeftColor: '#F44336',
},
regularFeedback: {
 backgroundColor: '#FFF8E1',
 borderLeftColor: '#FF9800',
},
feedbackText: {
 fontSize: 16,
 textAlign: 'center',
 color: '#333',
 fontWeight: '500',
},
detailedFeedbackText: {
 fontSize: 14,
 textAlign: 'center',
 color: '#666',
 fontStyle: 'italic',
 marginTop: 8,
},
attemptsContainer: {
 alignItems: 'center',
 marginTop: 10,
 width: '100%',
},
attemptsText: {
 fontSize: 14,
 color: '#757575',
 fontWeight: '500',
},
processingContainer: {
 alignItems: 'center',
 padding: 16,
 width: '100%',
},
processingText: {
 marginTop: 12,
 color: '#555',
 fontSize: 16,
 fontWeight: '500',
},
fixedButtonsBar: {
 position: 'absolute',
 bottom: 0,
 left: 0,
 right: 0,
 backgroundColor: 'white',
 paddingTop: 12,
 paddingBottom: Platform.OS === 'ios' ? 34 : 24,
 paddingHorizontal: 20,
 borderTopWidth: 1,
 borderTopColor: '#eee',
 elevation: 8,
 shadowColor: '#000',
 shadowOffset: { width: 0, height: -2 },
 shadowOpacity: 0.1,
 shadowRadius: 3,
 alignItems: 'center',
 justifyContent: 'center',
},
audioLevelContainer: {
 marginBottom: 16,
 padding: 10,
 backgroundColor: '#f5f5f5',
 borderRadius: 10,
 width: '100%',
},
audioLevelLabel: {
 fontSize: 14,
 color: '#555',
 marginBottom: 8,
},
audioLevelTrack: {
 height: 12,
 backgroundColor: '#e0e0e0',
 borderRadius: 6,
 overflow: 'hidden',
 width: '100%',
},
audioLevelFill: {
 height: '100%',
 backgroundColor: '#4CAF50',
},
audioLevelLow: {
 backgroundColor: '#F44336',
},
audioLevelMedium: {
 backgroundColor: '#FF9800',
},
audioLevelHigh: {
 backgroundColor: '#4CAF50',
},
audioActivityHint: {
 fontSize: 12,
 color: '#F44336',
 fontStyle: 'italic',
 marginTop: 5,
 textAlign: 'center',
},
spacer: {
 height: 80, // Espacio adicional para evitar que el botón fijo tape contenido
},
});