// src/components/ProgressBar.tsx
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Text, ViewStyle } from 'react-native';

interface ProgressBarProps {
  progress: number; // Valor entre 0 y 1
  height?: number;
  backgroundColor?: string;
  fillColor?: string;
  animationDuration?: number;
  containerStyle?: ViewStyle;
  showPercentage?: boolean;
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 10,
  backgroundColor = '#e0e0e0',
  fillColor = '#FF0000',
  animationDuration = 500,
  containerStyle,
  showPercentage = false,
  label
}) => {
  // Garantizar que el progreso esté entre 0 y 1
  const normalizedProgress = Math.max(0, Math.min(1, progress));
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: normalizedProgress,
      duration: animationDuration,
      useNativeDriver: false
    }).start();
  }, [normalizedProgress]);
  
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={[styles.progressBar, { backgroundColor, height }]}>
        <Animated.View 
          style={[
            styles.progress, 
            { 
              backgroundColor: fillColor,
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%']
              })
            }
          ]}
        />
      </View>
      
      {showPercentage && (
        <Text style={styles.percentage}>{`${Math.round(normalizedProgress * 100)}%`}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    width: '100%',
  },
  progressBar: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
  },
  percentage: {
    textAlign: 'right',
    fontSize: 12,
    marginTop: 4,
    color: '#666'
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    color: '#333'
  }
});