// src/components/MasteryLevelChangeAlert.tsx
import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  Animated, 
  Easing 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type MasteryChangeType = 'increase' | 'decrease';

interface MasteryLevelChangeAlertProps {
  visible: boolean;
  onDismiss: () => void;
  word: string;
  wordTranslation: string;
  previousLevel: number;
  newLevel: number;
  changeType: MasteryChangeType;
  message?: string;
}

export const MasteryLevelChangeAlert: React.FC<MasteryLevelChangeAlertProps> = ({
  visible,
  onDismiss,
  word,
  wordTranslation,
  previousLevel,
  newLevel,
  changeType,
  message
}) => {
  // Animaciones
  const scaleAnimation = useRef(new Animated.Value(0)).current;
  const starScale = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (visible) {
      // Animación de entrada
      Animated.sequence([
        Animated.timing(scaleAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5))
        }),
        Animated.timing(starScale, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.elastic(1.5)
        })
      ]).start();
    } else {
      // Reset para próxima vez
      scaleAnimation.setValue(0);
      starScale.setValue(0);
    }
  }, [visible]);
  
  // Determinar estilo y mensaje según tipo de cambio
  const isIncrease = changeType === 'increase';
  const changeMessage = message || (isIncrease 
    ? `¡Felicidades! Has mejorado tu dominio de "${word}".` 
    : `Necesitas practicar más la palabra "${word}".`);
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.modalOverlay}>
        <Animated.View 
          style={[
            styles.modalContainer,
            { transform: [{ scale: scaleAnimation }] },
            isIncrease ? styles.increaseContainer : styles.decreaseContainer
          ]}
        >
          <View style={styles.iconContainer}>
            <Ionicons 
              name={isIncrease ? "trending-up" : "trending-down"} 
              size={32} 
              color={isIncrease ? "#4CAF50" : "#F44336"} 
            />
          </View>
          
          <Text style={styles.titleText}>
            {isIncrease ? "¡Nivel de Maestría Aumentado!" : "Nivel de Maestría Reducido"}
          </Text>
          
          <View style={styles.wordContainer}>
            <Text style={styles.wordText}>{word}</Text>
            <Text style={styles.translationText}>({wordTranslation})</Text>
          </View>
          
          <Text style={styles.messageText}>{changeMessage}</Text>
          
          <View style={styles.starsContainer}>
            <View style={styles.starsRow}>
              <Text style={styles.starsLabel}>Antes:</Text>
              <Text style={styles.stars}>
                {Array(previousLevel).fill('⭐').join('')}
                {Array(5 - previousLevel).fill('☆').join('')}
              </Text>
            </View>
            
            <Animated.View 
              style={[
                styles.starsRow, 
                { transform: [{ scale: starScale }] }
              ]}
            >
              <Text style={styles.starsLabel}>Ahora:</Text>
              <Text style={styles.stars}>
                {Array(newLevel).fill('⭐').join('')}
                {Array(5 - newLevel).fill('☆').join('')}
              </Text>
            </Animated.View>
          </View>
          
          <TouchableOpacity 
            style={[
              styles.dismissButton,
              isIncrease ? styles.greenButton : styles.redButton
            ]} 
            onPress={onDismiss}
          >
            <Text style={styles.dismissText}>
              {isIncrease ? "¡Genial!" : "Entendido"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  increaseContainer: {
    borderLeftWidth: 6,
    borderLeftColor: '#4CAF50',
  },
  decreaseContainer: {
    borderLeftWidth: 6,
    borderLeftColor: '#F44336',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    color: '#333',
  },
  wordContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  wordText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF0000',
    marginBottom: 4,
  },
  translationText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  messageText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
    lineHeight: 22,
  },
  starsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 10,
  },
  starsLabel: {
    fontSize: 16,
    color: '#757575',
    width: 60,
  },
  stars: {
    fontSize: 18,
    letterSpacing: 2,
  },
  dismissButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    width: '80%',
  },
  greenButton: {
    backgroundColor: '#4CAF50',
  },
  redButton: {
    backgroundColor: '#F44336',
  },
  dismissText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});