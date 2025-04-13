// src/components/TutorialOverlay.tsx

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Dimensions, 
  Modal 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TutorialStep {
  title: string;
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
  position?: 'center' | 'top' | 'bottom';
}

interface TutorialOverlayProps {
  steps: TutorialStep[];
  onComplete: () => void;
  showSkip?: boolean;
}

const { width, height } = Dimensions.get('window');

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  steps,
  onComplete,
  showSkip = true
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;
  
  useEffect(() => {
    // Animar la aparición de cada paso
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true
      })
    ]).start();
    
    return () => {
      // Resetear animaciones al cambiar de paso
      opacity.setValue(0);
      translateY.setValue(50);
    };
  }, [currentStep]);
  
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };
  
  const handleSkip = () => {
    onComplete();
  };
  
  const step = steps[currentStep];
  const icon = step.icon || 'information-circle';
  const position = step.position || 'center';
  
  return (
    <Modal
      transparent
      animationType="fade"
      visible={true}
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.stepContainer,
            getPositionStyle(position),
            {
              opacity,
              transform: [{ translateY }]
            }
          ]}
        >
          <Ionicons name={icon} size={60} color="#FF0000" style={styles.icon} />
          
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.description}>{step.description}</Text>
          
          <View style={styles.pagination}>
            {steps.map((_, index) => (
              <View 
                key={index}
                style={[
                  styles.dot,
                  currentStep === index && styles.activeDot
                ]}
              />
            ))}
          </View>
          
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>
              {currentStep < steps.length - 1 ? 'Siguiente' : 'Entendido'}
            </Text>
          </TouchableOpacity>
          
          {showSkip && currentStep < steps.length - 1 && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
            >
              <Text style={styles.skipButtonText}>Omitir tutorial</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const getPositionStyle = (position: 'center' | 'top' | 'bottom') => {
    switch (position) {
      case 'top':
        return { top: height * 0.15 };
      case 'bottom':
        return { bottom: height * 0.15 };
      case 'center':
      default:
        return { top: height * 0.4 }; // Cambiar de '40%' a height * 0.4
    }
  };

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepContainer: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: width * 0.85,
    maxWidth: 400,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
  },
  pagination: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#FF0000',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  nextButton: {
    backgroundColor: '#FF0000',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButton: {
    marginTop: 16,
    padding: 8,
  },
  skipButtonText: {
    color: '#666',
    fontSize: 14,
  },
});