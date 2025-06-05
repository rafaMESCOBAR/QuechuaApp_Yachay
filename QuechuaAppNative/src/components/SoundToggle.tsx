// src/components/SoundToggle.tsx
import React, { useState, useEffect } from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  View,
  Animated,
  Easing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SoundEffectService } from '../services/SoundEffectService';

interface SoundToggleProps {
  style?: any;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
  onToggle?: (enabled: boolean) => void;
}

export const SoundToggle: React.FC<SoundToggleProps> = ({ 
  style,
  showLabel = true,
  size = 'medium',
  onToggle
}) => {
  // Estado local sincronizado con el servicio
  const [enabled, setEnabled] = useState<boolean>(SoundEffectService.isEnabled());
  
  // Animación para el ícono
  const iconAnim = React.useRef(new Animated.Value(1)).current;
  
  // Sincronizar estado local con el servicio
  useEffect(() => {
    const updateState = async () => {
      const currentState = SoundEffectService.isEnabled();
      setEnabled(currentState);
    };
    
    updateState();
  }, []);
  
  // Manejar el cambio de estado
  const handleToggle = async () => {
    // Animar el botón
    Animated.sequence([
      Animated.timing(iconAnim, {
        toValue: 0.7,
        duration: 100,
        useNativeDriver: true,
        easing: Easing.linear
      }),
      Animated.timing(iconAnim, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
        easing: Easing.elastic(1.5)
      }),
      Animated.timing(iconAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
        easing: Easing.linear
      })
    ]).start();
    
    // Actualizar estado
    const newState = await SoundEffectService.toggleSound();
    setEnabled(newState);
    
    // Reproducir sonido de botón si se enciende
    if (newState) {
      SoundEffectService.play('button-press', 0.5);
    }
    
    // Notificar al componente padre
    if (onToggle) {
      onToggle(newState);
    }
  };
  
  // Tamaños dependiendo de la propiedad size
  const iconSize = size === 'small' ? 18 : size === 'large' ? 30 : 24;
  const buttonSize = size === 'small' ? 30 : size === 'large' ? 50 : 40;
  const containerStyles = [
    styles.container,
    size === 'small' ? styles.smallContainer : null,
    size === 'large' ? styles.largeContainer : null,
    enabled ? styles.enabledContainer : styles.disabledContainer,
    style
  ];
  
  return (
    <View style={containerStyles}>
      <TouchableOpacity 
        style={[
          styles.button,
          { width: buttonSize, height: buttonSize }
        ]} 
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        <Animated.View style={{ transform: [{ scale: iconAnim }] }}>
          <Ionicons 
            name={enabled ? "volume-high" : "volume-mute"} 
            size={iconSize} 
            color={enabled ? "#FF0000" : "#777"} 
          />
        </Animated.View>
      </TouchableOpacity>
      
      {showLabel && (
        <Text style={[
          styles.label,
          enabled ? styles.enabledLabel : styles.disabledLabel
        ]}>
          Sonido {enabled ? "ON" : "OFF"}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  smallContainer: {
    padding: 2,
  },
  largeContainer: {
    padding: 6,
  },
  enabledContainer: {
    backgroundColor: '#FFF3E0',
  },
  disabledContainer: {
    backgroundColor: '#f0f0f0',
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  enabledLabel: {
    color: '#FF0000',
  },
  disabledLabel: {
    color: '#777',
  },
});

export default SoundToggle;