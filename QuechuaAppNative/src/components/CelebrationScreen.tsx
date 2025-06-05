// src/components/CelebrationScreen.tsx
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Easing,
  Dimensions,
  ImageBackground,
  Image,
  Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';

interface CelebrationScreenProps {
  objectName: string;
  exercisesCompleted: number;
  correctAnswers?: number;
  onContinue: () => void;
  onPracticeMore?: () => void; // Prop para el botón de práctica
}

export const CelebrationScreen: React.FC<CelebrationScreenProps> = ({
  objectName,
  exercisesCompleted,
  correctAnswers,
  onContinue,
  onPracticeMore
}) => {
  // Estado para controlar la animación de confeti
  const [showConfetti, setShowConfetti] = useState(true);
  
  // Animaciones ref
  const scale = React.useRef(new Animated.Value(0.5)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;
  const trophyY = React.useRef(new Animated.Value(-80)).current;
  const trophyRotate = React.useRef(new Animated.Value(0)).current;
  const statsY = React.useRef(new Animated.Value(50)).current;
  const statsOpacity = React.useRef(new Animated.Value(0)).current;
  const buttonScale = React.useRef(new Animated.Value(0)).current;
  const practiceButtonScale = React.useRef(new Animated.Value(0)).current;
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Nuevas animaciones para textos más gamificados
  const titleScale = React.useRef(new Animated.Value(0.7)).current;
  const titleRotate = React.useRef(new Animated.Value(-5)).current;
  const objectNameGlow = React.useRef(new Animated.Value(0)).current;
  const subtitleY = React.useRef(new Animated.Value(20)).current;
  
  // Referencia para mantener la instancia de sonido
  const celebrationSoundRef = React.useRef<Audio.Sound | null>(null);
  
  // Animaciones para estrellas
  const star1Opacity = React.useRef(new Animated.Value(0)).current;
  const star2Opacity = React.useRef(new Animated.Value(0)).current;
  const star3Opacity = React.useRef(new Animated.Value(0)).current;
  
  // Animaciones para estrellas - rotación y escala para más dinamismo
  const star1Rotate = React.useRef(new Animated.Value(0)).current;
  const star2Rotate = React.useRef(new Animated.Value(0)).current;
  const star3Rotate = React.useRef(new Animated.Value(0)).current;
  const star1Scale = React.useRef(new Animated.Value(1)).current;
  const star2Scale = React.useRef(new Animated.Value(1)).current;
  const star3Scale = React.useRef(new Animated.Value(1)).current;
    
  // Determinar mensaje basado en la puntuación
  const getFeedbackMessage = () => {
    if (correctAnswers && exercisesCompleted > 0) {
      const scorePercentage = Math.round((correctAnswers / exercisesCompleted) * 100);
      if (scorePercentage >= 90) return "¡Excelente dominio!";
      if (scorePercentage >= 70) return "¡Muy buen trabajo!";
      if (scorePercentage >= 50) return "¡Buen esfuerzo!";
      return "¡Sigue practicando!";
    }
    return "¡Excelente dominio!";
  };
  
  // Efecto para animar las estrellas de forma continua
  useEffect(() => {
    // Animar la rotación de las estrellas
    Animated.loop(
      Animated.sequence([
        Animated.timing(star1Rotate, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.linear
        }),
        Animated.timing(star1Rotate, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.linear
        })
      ])
    ).start();
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(star2Rotate, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
          easing: Easing.linear
        }),
        Animated.timing(star2Rotate, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
          easing: Easing.linear
        })
      ])
    ).start();
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(star3Rotate, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
          easing: Easing.linear
        }),
        Animated.timing(star3Rotate, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
          easing: Easing.linear
        })
      ])
    ).start();
    
    // Animar la escala de las estrellas para que pulsen
    Animated.loop(
      Animated.sequence([
        Animated.timing(star1Scale, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.ease
        }),
        Animated.timing(star1Scale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.ease
        })
      ])
    ).start();
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(star2Scale, {
          toValue: 1.2,
          duration: 1200,
          useNativeDriver: true,
          easing: Easing.ease
        }),
        Animated.timing(star2Scale, {
          toValue: 0.9,
          duration: 1200,
          useNativeDriver: true,
          easing: Easing.ease
        })
      ])
    ).start();
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(star3Scale, {
          toValue: 1.4,
          duration: 900,
          useNativeDriver: true,
          easing: Easing.ease
        }),
        Animated.timing(star3Scale, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
          easing: Easing.ease
        })
      ])
    ).start();
    
    // Animar pulsación del título
    Animated.loop(
      Animated.sequence([
        Animated.timing(titleScale, {
          toValue: 1.05,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.ease
        }),
        Animated.timing(titleScale, {
          toValue: 0.95,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.ease
        })
      ])
    ).start();
    
    // Animar rotación suave del título
    Animated.loop(
      Animated.sequence([
        Animated.timing(titleRotate, {
          toValue: 5,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.ease
        }),
        Animated.timing(titleRotate, {
          toValue: -5,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.ease
        })
      ])
    ).start();
    
    // Animación de brillo para el nombre del objeto
    Animated.loop(
      Animated.sequence([
        Animated.timing(objectNameGlow, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false, // No se puede usar con shadowOpacity
          easing: Easing.ease
        }),
        Animated.timing(objectNameGlow, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false, // No se puede usar con shadowOpacity
          easing: Easing.ease
        })
      ])
    ).start();
    
  }, []);
  
  // Efecto para secuencia de animaciones principales
  useEffect(() => {
    const animationSequence = Animated.sequence([
      // Fade in y escala de entrada
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }),
      
      // Trofeo entra rebotando
      Animated.parallel([
        Animated.spring(trophyY, {
          toValue: 0,
          friction: 4,
          tension: 40,
          useNativeDriver: true
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          tension: 50,
          useNativeDriver: true
        }),
        Animated.timing(trophyRotate, {
          toValue: 1,
          duration: 700,
          easing: Easing.elastic(1.5),
          useNativeDriver: true
        })
      ]),
      
      // Estrellas aparecen en secuencia
      Animated.stagger(150, [
        Animated.timing(star1Opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(star2Opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(star3Opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        })
      ]),
      
      // Animación de subtítulo
      Animated.timing(subtitleY, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      
      // Estadísticas suben
      Animated.parallel([
        Animated.timing(statsY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        }),
        Animated.timing(statsOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true
        })
      ]),
      
      // Botones aparecen en secuencia
      Animated.stagger(150, [
        Animated.spring(buttonScale, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true
        }),
        Animated.spring(practiceButtonScale, { // Animación para el nuevo botón
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true
        })
      ])
    ]);
    
    // Iniciar secuencia
    animationSequence.start();
    
    // Temporizador para ocultar confeti después de un tiempo
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    
    return () => clearTimeout(timer);
  }, []);

  // Efecto para reproducir sonido de celebración
  useEffect(() => {
    const playCelebrationSound = async () => {
      if (soundEnabled) {
        try {
          // Crear y cargar el sonido
          const { sound } = await Audio.Sound.createAsync(
            require('../assets/sounds/celebration.mp3'),
            { volume: 0.8 }
          );
          celebrationSoundRef.current = sound;
          
          // Reproducir sonido
          await sound.playAsync();
          
          // Limpiar después de reproducir
          sound.setOnPlaybackStatusUpdate((status) => {
            if ('isLoaded' in status && status.isLoaded && !status.isPlaying) {
              sound.unloadAsync().catch(e => console.error("Error descargando sonido", e));
              celebrationSoundRef.current = null;
            }
          });
        } catch (error) {
          console.error("Error reproduciendo sonido de celebración:", error);
        }
      }
    };
    
    playCelebrationSound();
    
    // Limpiar cuando se desmonte el componente
    return () => {
      if (celebrationSoundRef.current) {
        celebrationSoundRef.current.unloadAsync().catch(e => 
          console.error("Error descargando sonido de celebración:", e)
        );
        celebrationSoundRef.current = null;
      }
    };
  }, []);

  // Interpolaciones para animaciones
  const trophyRotateInterpolation = trophyRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-20deg', '0deg']
  });
  
  // Interpolaciones para rotación de estrellas
  const star1RotateInterpolation = star1Rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });
  
  const star2RotateInterpolation = star2Rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg']
  });
  
  const star3RotateInterpolation = star3Rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });
  
  // Interpolación para shadow del nombre del objeto
  const objectNameShadowOpacity = objectNameGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.8]
  });
  
  const objectNameShadowRadius = objectNameGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 12]
  });
  
  // Interpolación para rotación del título
  const titleRotateInterpolation = titleRotate.interpolate({
    inputRange: [-5, 5],
    outputRange: ['-3deg', '3deg']
  });
  
  // Componente de confeti actualizado para usar valores numéricos en lugar de porcentajes
  const Confetti = () => {
    if (!showConfetti) return null;
    
    return (
      <View style={styles.confettiContainer}>
        {Array.from({ length: 80 }).map((_, index) => { // Aumentado la cantidad para más densidad
          const size = Math.random() * 10 + 5; // Tamaños ligeramente más grandes
          const colors = ['#FF5252', '#FFEB3B', '#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#E91E63', '#00BCD4'];
          const color = colors[Math.floor(Math.random() * colors.length)];
          
          // Usar un valor numérico absoluto en lugar de un porcentaje
          const left = Math.random() * width;
          const animDuration = Math.random() * 3000 + 2000;
          
          const animatedValue = React.useRef(new Animated.Value(0)).current;
          
          // Animar confeti
          useEffect(() => {
            Animated.timing(animatedValue, {
              toValue: 1,
              duration: animDuration,
              useNativeDriver: true,
              easing: Easing.linear
            }).start();
          }, []);
          
          const translateY = animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [-50, height]
          });
          
          const rotate = animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', `${Math.random() * 360}deg`]
          });
          
          // Agregar movimiento horizontal
          const translateX = animatedValue.interpolate({
            inputRange: [0, 0.3, 0.7, 1],
            outputRange: [0, Math.random() * 30 - 15, Math.random() * 30 - 15, 0]
          });
          
          // Decidir forma aleatoriamente (círculo, cuadrado, estrella)
          const shape = Math.random() > 0.6 ? 
                        (Math.random() > 0.5 ? 'circle' : 'square') : 
                        'star';
          
          return (
            <Animated.View
              key={index}
              style={{
                position: 'absolute',
                top: -20,
                left, // Ahora es un número, no un string
                width: size,
                height: size,
                backgroundColor: shape !== 'star' ? color : 'transparent',
                borderRadius: shape === 'circle' ? size / 2 : shape === 'square' ? 0 : 0,
                transform: [
                  { translateY },
                  { translateX },
                  { rotate }
                ],
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 5
              }}
            >
              {shape === 'star' && (
                <FontAwesome5 
                  name="star" 
                  size={size} 
                  color={color} 
                  style={{ opacity: 0.9 }}
                />
              )}
            </Animated.View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.outerContainer}>
      {/* Fondo con degradado */}
      <LinearGradient
        colors={['#f5f7fa', '#c3cfe2']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Patrones sutiles en el fondo */}
      <View style={styles.patternOverlay} />
      
      {/* Confeti animado */}
      <Confetti />
      
      <Animated.View 
        style={[
          styles.container,
          {
            opacity,
            transform: [{ scale }]
          }
        ]}
      >
        {/* Encabezado con trofeo */}
        <View style={styles.header}>
          <Animated.View 
            style={[
              styles.trophyContainer, 
              { 
                transform: [
                  { translateY: trophyY },
                  { rotate: trophyRotateInterpolation }
                ] 
              }
            ]}
          >
            <View style={styles.trophyInner}>
              <Ionicons name="trophy" size={70} color="#FFD700" />
              <View style={styles.trophyGlow} />
            </View>
            
            {/* Estrellas animadas alrededor del trofeo */}
            <Animated.View 
              style={[
                styles.star, 
                styles.star1, 
                { 
                  opacity: star1Opacity,
                  transform: [
                    { rotate: star1RotateInterpolation },
                    { scale: star1Scale }
                  ] 
                }
              ]}
            >
              <Ionicons name="star" size={28} color="#FFC107" />
            </Animated.View>
            <Animated.View 
              style={[
                styles.star, 
                styles.star2, 
                { 
                  opacity: star2Opacity,
                  transform: [
                    { rotate: star2RotateInterpolation },
                    { scale: star2Scale }
                  ]
                }
              ]}
            >
              <Ionicons name="star" size={20} color="#FFC107" />
            </Animated.View>
            <Animated.View 
              style={[
                styles.star, 
                styles.star3, 
                { 
                  opacity: star3Opacity,
                  transform: [
                    { rotate: star3RotateInterpolation },
                    { scale: star3Scale }
                  ]
                }
              ]}
            >
              <Ionicons name="star" size={24} color="#FFC107" />
            </Animated.View>
          </Animated.View>
          
          {/* Título con animación */}
          <Animated.Text 
            style={[
              styles.title,
              {
                transform: [
                  { scale: titleScale },
                  { rotate: titleRotateInterpolation }
                ]
              }
            ]}
          >
            ¡FELICIDADES!
          </Animated.Text>
          
          {/* Subtítulo con animación */}
          <Animated.Text 
            style={[
              styles.subtitle,
              {
                transform: [{ translateY: subtitleY }]
              }
            ]}
          >
            {getFeedbackMessage()}
          </Animated.Text>
          
          <Text style={styles.message}>
            Has completado todos los ejercicios para:
          </Text>
          
          {/* Nombre del objeto con efecto de brillo */}
          <Animated.View
            style={[
              styles.objectNameContainer,
              {
                shadowOpacity: objectNameShadowOpacity,
                shadowRadius: objectNameShadowRadius
              }
            ]}
          >
            <Text style={styles.objectName}>{objectName}</Text>
          </Animated.View>
        </View>
        
        {/* Sección de estadísticas */}
        <Animated.View 
          style={[
            styles.statsContainer,
            {
              opacity: statsOpacity,
              transform: [{ translateY: statsY }]
            }
          ]}
        >
          <View style={styles.statsHeader}>
            <Text style={styles.statsTitle}>Resumen</Text>
          </View>
          
          <View style={styles.statsContent}>
            <View style={styles.statRow}>
              <MaterialCommunityIcons name="check-circle-outline" size={24} color="#4CAF50" />
              <Text style={styles.statText}>
                Ejercicios completados: {exercisesCompleted}
              </Text>
            </View>
            
            <View style={styles.statRow}>
              <MaterialCommunityIcons name="book-open-variant" size={24} color="#2196F3" />
              <Text style={styles.statText}>
                ¡Has mejorado tu dominio del quechua!
              </Text>
            </View>
            
            <View style={styles.statRow}>
              <MaterialCommunityIcons name="crown-outline" size={24} color="#9C27B0" />
              <Text style={styles.statText}>
                ¡Sigue practicando para mejorar tu nivel!
              </Text>
            </View>
          </View>
        </Animated.View>
        
        {/* Contenedor para ambos botones */}
        <View style={styles.buttonsContainer}>
          {/* Botón para continuar */}
          <Animated.View style={{ transform: [{ scale: buttonScale }], marginBottom: 20 }}>
            <TouchableOpacity 
              style={styles.continueButton}
              onPress={() => {
                // Reproducir sonido de botón
                if (soundEnabled) {
                  Audio.Sound.createAsync(
                    require('../assets/sounds/button-press.mp3')
                  ).then(({ sound }) => {
                    sound.playAsync();
                    sound.setOnPlaybackStatusUpdate((status) => {
                      if ('isLoaded' in status && status.isLoaded && !status.isPlaying) {
                        sound.unloadAsync();
                      }
                    });
                  }).catch(error => console.error("Error reproduciendo sonido:", error));
                }
                onContinue();
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FF512F', '#DD2476']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.buttonText}>CONTINUAR</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
          
          {/* Contenedor horizontal para descripción y botón de práctica */}
          <Animated.View 
            style={[
              styles.practiceContainer,
              { transform: [{ scale: practiceButtonScale }] }
            ]}
          >
            <Text style={styles.practiceDescription}>
              Descubre palabras en quechua y practica
            </Text>
            
            <TouchableOpacity 
              style={styles.practiceButton}
              onPress={() => {
                // Reproducir sonido de botón
                if (soundEnabled) {
                  Audio.Sound.createAsync(
                    require('../assets/sounds/button-press.mp3')
                  ).then(({ sound }) => {
                    sound.playAsync();
                    sound.setOnPlaybackStatusUpdate((status) => {
                      if ('isLoaded' in status && status.isLoaded && !status.isPlaying) {
                        sound.unloadAsync();
                      }
                    });
                  }).catch(error => console.error("Error reproduciendo sonido:", error));
                }
                if (onPracticeMore) onPracticeMore();
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#4CAF50', '#2196F3']}
                style={styles.actionButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.actionButtonText}>COMENZAR AHORA</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
        
      </Animated.View>
    </View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    position: 'relative',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  patternOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.05,
    backgroundColor: 'transparent',
    // Aquí podríamos añadir un backgroundImage con un patrón sutil si estuviéramos en web
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  trophyContainer: {
    marginBottom: 15,
    position: 'relative',
  },
  trophyInner: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 215, 0, 0.4)', // Brillo más intenso
    top: -15,
    left: -15,
    zIndex: -1,
  },
  star: {
    position: 'absolute',
    zIndex: 2,
  },
  star1: {
    top: -12,
    right: -15,
  },
  star2: {
    bottom: 10,
    left: -18,
  },
  star3: {
    top: 15,
    right: -20,
  },
  title: {
    fontSize: 36, // Tamaño más grande
    fontWeight: 'bold',
    color: '#FF0000',
    marginBottom: 5,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1.2, // Espaciado entre letras
    textTransform: 'uppercase', // Todo en mayúsculas
    ...Platform.select({
      ios: {
        fontFamily: 'Avenir-Black',
      },
      android: {
        fontFamily: 'sans-serif-black',
      },
    }),
  },
  subtitle: {
    fontSize: 22, // Tamaño más grande
    fontWeight: 'bold',
    color: '#444',
    marginBottom: 15,
    textAlign: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)', // Fondo semitransparente
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    letterSpacing: 0.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8, // Espacio reducido
    color: '#555',
  },
  objectNameContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderWidth: 2.5, // Borde más grueso
    borderColor: '#28a745',
    marginBottom: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#28a745',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  objectName: {
    fontSize: 28, // Más grande
    fontWeight: 'bold',
    color: '#28a745',
    textAlign: 'center',
    letterSpacing: 1, // Espaciado entre letras
    textTransform: 'uppercase', // Todo en mayúsculas
    ...Platform.select({
      ios: {
        fontFamily: 'Avenir-Heavy',
      },
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },
  statsContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '95%',
    marginBottom: 25,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  statsTitle: {
    fontSize: 22, // Más grande
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 0.5, // Espaciado entre letras
  },
  statsContent: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    paddingVertical: 4, // Más espaciado
  },
  statText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#505050',
    fontWeight: '500', // Más peso
  },
  buttonsContainer: {
    alignItems: 'center',
    width: '100%',
  },
  continueButton: {
    overflow: 'hidden',
    borderRadius: 30,
    width: 220, // Más ancho
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  buttonGradient: {
    paddingVertical: 16, // Más alto
    paddingHorizontal: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18, // Más grande
    fontWeight: 'bold',
    marginRight: 10,
    letterSpacing: 1, // Espaciado entre letras
  },
  // Estilos para el contenedor de práctica
  practiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16, // Más redondeado
    padding: 12, // Más padding
    width: '95%',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.05)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  practiceDescription: {
    fontSize: 15,
    color: '#333',
    flexShrink: 1,
    marginRight: 10,
    flexWrap: 'wrap',
    width: '55%',
    fontWeight: '500', // Más peso
    lineHeight: 20, // Mejor interlineado
  },
  practiceButton: {
    overflow: 'hidden',
    borderRadius: 22, // Más redondeado
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  actionButtonGradient: {
    paddingVertical: 12, // Más alto
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5, // Espaciado entre letras
  }
}); 