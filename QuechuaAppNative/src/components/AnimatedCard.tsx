// src/components/AnimatedCard.tsx
import React, { useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Animated, 
  Easing, 
  ViewStyle, 
  TextStyle 
} from 'react-native';

interface AnimatedCardProps {
  title?: string;
  titleStyle?: TextStyle;
  containerStyle?: ViewStyle;
  children: React.ReactNode;
  animationDelay?: number;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  title,
  titleStyle,
  containerStyle,
  children,
  animationDelay = 0
}) => {
  const translateY = useRef(new Animated.Value(50)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(animationDelay),
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true
        })
      ])
    ]).start();
  }, []);

  return (
    <Animated.View 
      style={[
        styles.container, 
        containerStyle,
        {
          opacity,
          transform: [{ translateY }]
        }
      ]}
    >
      {title && <Text style={[styles.title, titleStyle]}>{title}</Text>}
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333'
  }
});