// src/services/speechService.ts

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Speech from 'expo-speech';
import { API_URL } from '@env';
// Para acceder a la API de Google Cloud
import { GOOGLE_CLOUD_API_KEY } from '@env';
const SPEECH_TO_TEXT_URL = 'https://speech.googleapis.com/v1/speech:recognize';
const TEXT_TO_SPEECH_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

export class SpeechService {
  // Reproduce la pronunciación de una palabra en quechua
  static async speakWord(word: string, languageCode: string = 'es-ES'): Promise<void> {
    try {
      // Primero intentamos usar la API de Google Text-to-Speech
      const success = await this.useGoogleTTS(word, languageCode);
      
      // Si falla, usamos la API local de Speech
      if (!success) {
        await Speech.speak(word, {
          language: languageCode,
          pitch: 1.0,
          rate: 0.75 // Más lento para facilitar la comprensión
        });
      }
    } catch (error) {
      console.error('Error al reproducir palabra:', error);
      // Fallback a la API local
      await Speech.speak(word, { language: languageCode });
    }
  }

  // Usa Google Text-to-Speech API para generar y reproducir audio
  private static async useGoogleTTS(text: string, languageCode: string): Promise<boolean> {
    try {
      // Solicitud a Google Text-to-Speech API
      const response = await fetch(`${TEXT_TO_SPEECH_URL}?key=${GOOGLE_CLOUD_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode, ssmlGender: 'NEUTRAL' },
          audioConfig: { audioEncoding: 'MP3' },
        }),
      });

      if (!response.ok) {
        throw new Error(`Error en API Google TTS: ${response.status}`);
      }

      const responseData = await response.json();
      
      // Decodificar el audio Base64
      const audioContent = responseData.audioContent;
      
      // Guardar temporalmente el archivo de audio
      const fileUri = `${FileSystem.cacheDirectory}speech.mp3`;
      await FileSystem.writeAsStringAsync(fileUri, audioContent, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Reproducir el audio
      const { sound } = await Audio.Sound.createAsync({ uri: fileUri });
      await sound.playAsync();
      
      // Esperar a que termine y liberar recursos
      const status = await sound.getStatusAsync();
      
      // Establecer una duración predeterminada en caso de que no tenga la propiedad durationMillis
      let duration = 2000; // Duración predeterminada de 2 segundos
      
      // Verificar si el status es un objeto de estado correcto (no error) y tiene durationMillis
      if ('durationMillis' in status) {
        duration = status.durationMillis || duration;
      }
      
      return new Promise((resolve) => {
        setTimeout(async () => {
          await sound.unloadAsync();
          resolve(true);
        }, duration + 500); // Añadir margen
      });
    } catch (error) {
      console.error('Error Google TTS:', error);
      return false;
    }
  }

  // Escucha y reconoce la pronunciación del usuario
  static async listenAndRecognize(
    targetWord: string, 
    languageCode: string = 'es-ES',
    durationMillis: number = 5000
  ): Promise<{ success: boolean; transcription: string; similarity: number }> {
    try {
      console.log(`Iniciando grabación para reconocer: "${targetWord}"`);
      
      // Configuración optimizada para la API de Google Speech-to-Text
      // Usamos LINEAR16 (PCM) que es mejor soportado por Google
      const recordingOptions: any = {
        android: {
          extension: '.wav', 
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 16000, // Google prefiere 16kHz
          numberOfChannels: 1, // Mono es mejor para reconocimiento de voz
          bitRate: 16 * 16000, // 16 bits PCM
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 16 * 16000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/wav',
        },
        progressUpdateIntervalMillis: 200
      };
      
      // Iniciar grabación
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(recordingOptions);
      
      // Variables para monitoreo de audio
      let detectedSpeech = false;
      let maxDb = -100;
      
      // Monitorear nivel de audio si está disponible
      recording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording && 'metering' in status && status.metering !== undefined) {
          const currentDb = status.metering;
          console.log(`Nivel de audio: ${currentDb} dB`);
          maxDb = Math.max(maxDb, currentDb);
          
          if (currentDb > -30) {
            detectedSpeech = true;
          }
        }
      });
      
      await recording.startAsync();
      console.log('Grabación iniciada con éxito');
      
      // Esperar el tiempo especificado
      await new Promise(resolve => setTimeout(resolve, durationMillis));
      
      // Detener grabación
      await recording.stopAndUnloadAsync();
      console.log('Grabación finalizada');
      
      // Obtener URI del archivo grabado
      const uri = recording.getURI();
      if (!uri) {
        throw new Error('No se pudo obtener el URI de la grabación');
      }
      
      console.log(`Archivo grabado en: ${uri}`);
      
      // Leer el archivo como base64
      const audioBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      console.log(`Tamaño del audio en base64: ${audioBase64.length} bytes`);
      
      // Configurar la petición a la API de Google con parámetros optimizados
      const requestBody = {
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: 16000,
          languageCode: languageCode, // Usar es-ES para español
          model: 'default', // Usar el modelo general
          speechContexts: [
            {
              phrases: [targetWord, targetWord.toLowerCase()], // Ayuda al reconocimiento indicando la palabra objetivo
              boost: 15 // Aumentar probabilidad de esta palabra
            }
          ],
          profanityFilter: false,
          enableAutomaticPunctuation: false,
          enableWordTimeOffsets: false,
        },
        audio: {
          content: audioBase64,
        },
      };
      
      console.log('Enviando audio a Google Speech-to-Text API...');
      
      // Enviar a Google Speech-to-Text API
      const response = await fetch(`${SPEECH_TO_TEXT_URL}?key=${GOOGLE_CLOUD_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      // Verificar si la petición fue exitosa
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error en API (${response.status}): ${errorText}`);
        throw new Error(`Error en API Google STT: ${response.status}`);
     }
     
     const responseData = await response.json();
     console.log('Respuesta recibida de Google STT:', JSON.stringify(responseData, null, 2));
     
     // Extraer transcripción
     let transcription = '';
     if (responseData.results && responseData.results.length > 0) {
       transcription = responseData.results[0].alternatives[0].transcript || '';
     }
     
     console.log(`Transcripción obtenida: "${transcription}"`);
     
     // Si no hay transcripción a pesar de enviar audio, asignar un valor específico
     if (!transcription) {
       // Verificamos si detectamos audio pero no se pudo transcribir
       if (detectedSpeech || maxDb > -40) {
         console.log('Audio detectado pero no se pudo transcribir');
         transcription = '[no reconocido]';
       } else {
         console.log('No se detectó audio suficiente');
         transcription = '[silencio]';
       }
       
       return { 
         success: false, 
         transcription, 
         similarity: 0.1
       };
     }
     
     // Normalizar la transcripción y la palabra objetivo
     const normalizedTranscription = this.normalizeText(transcription);
     const normalizedTarget = this.normalizeText(targetWord);
     
     console.log(`Transcripción normalizada: "${normalizedTranscription}"`);
     console.log(`Objetivo normalizado: "${normalizedTarget}"`);
     
     // Calcular similitud
     const similarity = this.calculateSimilarity(normalizedTranscription, normalizedTarget);
     console.log(`Similitud calculada: ${similarity}`);
     
     // Criterios para considerar éxito
     const requiredSimilarity = targetWord.length <= 4 ? 0.85 : 0.80;
     
     // Verificación de similitud y características clave
     const exactMatch = normalizedTranscription === normalizedTarget;
     const highSimilarity = similarity >= requiredSimilarity;
     
     // Longitud similar (permitimos más flexibilidad)
     const lengthDifferenceOk = Math.abs(normalizedTranscription.length - normalizedTarget.length) <= 3;
     
     // Si coincide exactamente, éxito automático
     let success = exactMatch;
     
     // Si no coincide exactamente pero es muy similar, también considerar éxito
     if (!success && highSimilarity && lengthDifferenceOk) {
       success = true;
     }
     
     console.log(`Evaluación final: ${success ? 'EXITOSO' : 'INCORRECTO'}`);
     
     return { success, transcription, similarity };
   } catch (error) {
     console.error('Error completo en reconocimiento de voz:', error);
     
     // En caso de error, damos retroalimentación útil
     return {
       success: false,
       transcription: 'Error al procesar audio',
       similarity: 0
     };
   }
 }
 
 // NUEVA FUNCIÓN: Analiza un archivo de audio grabado
 static async analyzeRecordedAudio(
   audioUri: string,
   targetWord: string,
   languageCode: string = 'es-ES'
 ): Promise<{ success: boolean; transcription: string; similarity: number }> {
   try {
     console.log(`Analizando grabación para la palabra: "${targetWord}"`);
     
     // Verificar el archivo
     const fileInfo = await FileSystem.getInfoAsync(audioUri);
     console.log(`Verificando archivo: Existe=${fileInfo.exists}, URI=${fileInfo.uri}`);

     if (!fileInfo.exists) {
       console.error("Archivo de audio no existe");
       return { success: false, transcription: "[error de grabación]", similarity: 0 };
     }

     // Si el archivo existe, verificamos su tamaño si está disponible
     let fileSize = 0;
     if ('size' in fileInfo) {
       fileSize = (fileInfo as any).size;
       console.log(`Tamaño del archivo: ${fileSize} bytes`);
       
       if (fileSize < 1000) {
         console.error("Archivo de audio demasiado pequeño");
         return { success: false, transcription: "[grabación muy corta]", similarity: 0 };
       }
     }

     // Leer el archivo como base64
     const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
       encoding: FileSystem.EncodingType.Base64,
     });

     console.log(`Tamaño del audio en base64: ${audioBase64.length} bytes`);

     // Si el archivo es demasiado pequeño, probablemente no haya grabado nada
     if (audioBase64.length < 5000) {
       console.warn("Archivo de audio demasiado pequeño, probablemente no hay voz");
       return { success: false, transcription: "[silencio]", similarity: 0.1 };
     }
     
     // Configuración de la API con parámetros optimizados
     const requestBody = {
       config: {
         encoding: 'LINEAR16',
         sampleRateHertz: 16000,
         languageCode: languageCode,
         model: 'default',
         audioChannelCount: 1,
         speechContexts: [
           {
             phrases: [targetWord, targetWord.toLowerCase()],
             boost: 15
           }
         ],
         profanityFilter: false,
         enableAutomaticPunctuation: false,
       },
       audio: {
         content: audioBase64,
       },
     };
     
     // Enviar a Google Speech-to-Text API
     console.log("Enviando solicitud a Google STT API...");
     const response = await fetch(`${SPEECH_TO_TEXT_URL}?key=${GOOGLE_CLOUD_API_KEY}`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
       },
       body: JSON.stringify(requestBody),
     });
     
     // Verificar respuesta
     if (!response.ok) {
       const errorText = await response.text();
       console.error(`Error API (${response.status}): ${errorText}`);
       throw new Error(`Error en API: ${response.status}`);
     }
     
     const responseData = await response.json();
     console.log('Respuesta completa:', JSON.stringify(responseData, null, 2));
     
     // Procesar resultado
     let transcription = '';
     if (responseData.results && responseData.results.length > 0 && 
         responseData.results[0].alternatives && 
         responseData.results[0].alternatives.length > 0) {
       transcription = responseData.results[0].alternatives[0].transcript || '';
     }
     
     console.log(`Transcripción: "${transcription}"`);
     
     // Si no hay transcripción pero hay requestId, el API procesó correctamente
     if (!transcription && responseData.requestId) {
       return { success: false, transcription: "[no reconocido]", similarity: 0.1 };
     }
     
     // Calcular similitud
     const normalizedTranscription = this.normalizeText(transcription);
     const normalizedTarget = this.normalizeText(targetWord);
     
     const similarity = this.calculateSimilarity(normalizedTranscription, normalizedTarget);
     
     // Determinar éxito
     const requiredSimilarity = 0.7; // Umbral razonable
     const success = similarity >= requiredSimilarity || normalizedTranscription === normalizedTarget;
     
     return { success, transcription, similarity };
   } catch (error) {
     console.error('Error procesando audio:', error);
     return {
       success: false,
       transcription: 'Error al procesar audio',
       similarity: 0
     };
   }
 }

 // FUNCIÓN NUEVA: Analizar audio a través del backend
 static async analyzeRecordedAudioViaBackend(
  audioUri: string,
  targetWord: string,
  languageCode: string = 'es-ES'
): Promise<{ success: boolean; transcription: string; similarity: number }> {
  try {
    console.log(`Analizando grabación vía backend para: "${targetWord}"`);
    
    // Verificar el archivo
    const fileInfo = await FileSystem.getInfoAsync(audioUri);
    console.log(`Verificando archivo: Existe=${fileInfo.exists}, URI=${fileInfo.uri}`);

    if (!fileInfo.exists) {
      console.error("Archivo de audio no existe");
      return { success: false, transcription: "[error de grabación]", similarity: 0 };
    }

    // Leer el archivo como base64
    const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log(`Tamaño del audio en base64: ${audioBase64.length} bytes`);

    // Enviar al backend
   // Asegúrate que esta URL sea correcta
    const response = await fetch(`${API_URL}/speech/analyze/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio: audioBase64,
        target_word: targetWord,
        language_code: languageCode
      }),
    });

    // Verificar respuesta
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error API (${response.status}): ${errorText}`);
      throw new Error(`Error en API: ${response.status}`);
    }

    const result = await response.json();
    console.log("Respuesta del backend:", result);
    
    return {
      success: result.success || false,
      transcription: result.transcription || '[error]',
      similarity: result.similarity || 0
    };
  } catch (error) {
    console.error('Error procesando audio vía backend:', error);
    return {
      success: false,
      transcription: 'Error al procesar audio',
      similarity: 0
    };
  }
}
 
 // Función para normalizar texto (quitar acentos, mayúsculas, etc.)
 private static normalizeText(text: string): string {
   return text
     .toLowerCase()
     .trim()
     .normalize("NFD") // Descomponer caracteres acentuados
     .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
     .replace(/[^\w\s]/gi, ""); // Eliminar caracteres especiales
 }
 
 // Calcula similitud entre dos strings (algoritmo Levenshtein mejorado)
 static calculateSimilarity(a: string, b: string): number {
   if (a.length === 0) return b.length === 0 ? 1 : 0;
   if (b.length === 0) return 0;
   
   // Verificación rápida - si son exactamente iguales, similitud perfecta
   if (a === b) return 1.0;
   
   // Calcular distancia de Levenshtein
   const levDistance = this.levenshteinDistance(a, b);
   const maxLength = Math.max(a.length, b.length);
   
   // Convertir distancia a un valor de similitud entre 0 y 1
   return 1 - (levDistance / maxLength);
 }

 // Función auxiliar que calcula la distancia de Levenshtein
 private static levenshteinDistance(a: string, b: string): number {
   const matrix = [];
   
   // Inicializar primera fila y columna
   for (let i = 0; i <= b.length; i++) {
     matrix[i] = [i];
   }
   for (let j = 0; j <= a.length; j++) {
     matrix[0][j] = j;
   }
   
   // Llenar la matriz
   for (let i = 1; i <= b.length; i++) {
     for (let j = 1; j <= a.length; j++) {
       if (b.charAt(i-1) === a.charAt(j-1)) {
         matrix[i][j] = matrix[i-1][j-1];
       } else {
         matrix[i][j] = Math.min(
           matrix[i-1][j-1] + 1, // sustitución
           Math.min(
             matrix[i][j-1] + 1, // inserción
             matrix[i-1][j] + 1  // eliminación
           )
         );
       }
     }
   }
   
   return matrix[b.length][a.length];
 }
}