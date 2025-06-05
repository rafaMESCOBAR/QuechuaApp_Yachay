// src/services/SoundEffectService.tsx
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tipos de efectos de sonido disponibles
export type SoundEffect = 
  | 'correct'            // Respuesta correcta
  | 'incorrect'          // Respuesta incorrecta
  | 'option-select'      // Selección de opción
  | 'camera-shutter'     // Tomar foto
  | 'object-detected'    // Objeto detectado
  | 'celebration'        // Celebración
  | 'button-press'       // Botón presionado
  | 'start-learning'     // Iniciar aprendizaje
  | 'hint'               // Mostrar pista
  | 'level-up'           // Subir nivel
  | 'level-down'         // Bajar nivel
  | 'listen';            // Escuchar pronunciación

// Mapa de ruta de archivos para cada efecto
const soundFiles: Record<SoundEffect, any> = {
  'correct': require('../assets/sounds/correct.mp3'),
  'incorrect': require('../assets/sounds/incorrect.mp3'),
  'option-select': require('../assets/sounds/option-select.mp3'),
  'camera-shutter': require('../assets/sounds/camera-shutter.mp3'),
  'object-detected': require('../assets/sounds/object-detected.mp3'),
  'celebration': require('../assets/sounds/celebration.mp3'),
  'button-press': require('../assets/sounds/button-press.mp3'),
  'start-learning': require('../assets/sounds/start-learning.mp3'),
  'hint': require('../assets/sounds/hint.mp3'),
  'level-up': require('../assets/sounds/level-up.mp3'),
  'level-down': require('../assets/sounds/level-down.mp3'),
  'listen': require('../assets/sounds/listen.mp3')
};

// Clave para guardar preferencia de sonido
const SOUND_ENABLED_KEY = 'sound_enabled';

/**
 * Servicio para gestionar efectos de sonido en la aplicación
 */
export class SoundEffectService {
  // Estado global de sonido
  private static _enabled: boolean = true;
  private static _initialized: boolean = false;
  
  /**
   * Inicializa el servicio, cargando la preferencia de sonido guardada
   */
  public static async initialize(): Promise<void> {
    try {
      const value = await AsyncStorage.getItem(SOUND_ENABLED_KEY);
      // Si existe un valor guardado, utilizarlo
      if (value !== null) {
        this._enabled = value === 'true';
      }
      
      // Pre-cargar los sonidos para mejor rendimiento
      await this.preloadSounds();
      
      this._initialized = true;
    } catch (error) {
      console.error('Error initializing SoundEffectService:', error);
    }
  }
  
  /**
   * Pre-carga los sonidos para mejor rendimiento
   */
  private static async preloadSounds(): Promise<void> {
    try {
      // Cargar los sonidos más frecuentes
      const frequentSounds: SoundEffect[] = ['correct', 'incorrect', 'button-press', 'option-select'];
      await Promise.all(frequentSounds.map(async (sound) => {
        const { sound: audioSound } = await Audio.Sound.createAsync(soundFiles[sound]);
        audioSound.unloadAsync(); // Cargar y descargar para pre-caché
      }));
    } catch (error) {
      console.error('Error preloading sounds:', error);
    }
  }

  /**
   * Reproduce un efecto de sonido
   * @param effect - El tipo de efecto a reproducir
   * @param volume - Volumen opcional (0.0 a 1.0)
   */
  public static async play(effect: SoundEffect, volume: number = 1.0): Promise<void> {
    if (!this._initialized) {
      await this.initialize();
    }
    
    if (!this._enabled) return;
    
    try {
      const { sound } = await Audio.Sound.createAsync(
        soundFiles[effect],
        { volume }
      );
      
      await sound.playAsync();
      
      // Limpiar recursos cuando finaliza la reproducción
      sound.setOnPlaybackStatusUpdate((status) => {
        if ('isLoaded' in status && status.isLoaded && !status.isPlaying) {
          sound.unloadAsync().catch(e => 
            console.error(`Error unloading sound (${effect}):`, e)
          );
        }
      });
      
    } catch (error) {
      console.error(`Error playing sound effect (${effect}):`, error);
    }
  }
  
  /**
   * Activa o desactiva todos los efectos de sonido
   * @param enabled - Estado de activación
   */
  public static async setEnabled(enabled: boolean): Promise<void> {
    this._enabled = enabled;
    
    try {
      await AsyncStorage.setItem(SOUND_ENABLED_KEY, enabled.toString());
    } catch (error) {
      console.error('Error saving sound preference:', error);
    }
  }
  
  /**
   * Retorna si los efectos de sonido están activados
   */
  public static isEnabled(): boolean {
    return this._enabled;
  }
  
  /**
   * Alternancia del estado de efectos de sonido
   */
  public static async toggleSound(): Promise<boolean> {
    await this.setEnabled(!this._enabled);
    return this._enabled;
  }
}

// Inicializar automáticamente al importar
SoundEffectService.initialize();

export default SoundEffectService;