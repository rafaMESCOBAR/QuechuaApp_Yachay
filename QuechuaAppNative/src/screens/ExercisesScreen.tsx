// src/screens/ExercisesScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '../services/api';
import { useNavigation } from '@react-navigation/native';

// Define una interfaz para los ejercicios
interface Exercise {
  id: number;
  type: 'multiple_choice' | 'fill_blanks' | 'pronunciation' | 'matching';
  object_translation: {
    spanish: string;
    quechua: string;
  };
  difficulty: number;
  completed: boolean;
}

export default function ExercisesScreen() {
  // Mock data para demostración
  const mockExercises: Exercise[] = [
    {
      id: 1,
      type: 'multiple_choice',
      object_translation: {
        spanish: 'mesa',
        quechua: 'qhatu'
      },
      difficulty: 1,
      completed: false
    },
    {
      id: 2,
      type: 'fill_blanks',
      object_translation: {
        spanish: 'perro',
        quechua: 'allqu'
      },
      difficulty: 2,
      completed: true
    },
    {
      id: 3,
      type: 'pronunciation',
      object_translation: {
        spanish: 'persona',
        quechua: 'runa'
      },
      difficulty: 1,
      completed: false
    }
  ];

  const [exercises, setExercises] = useState<Exercise[]>(mockExercises);
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    // En una implementación real, cargaríamos los ejercicios desde la API
    // loadExercises();
  }, []);

  const loadExercises = async () => {
    setIsLoading(true);
    try {
      // Implementación futura: obtener ejercicios del backend
      // const exercisesData = await ApiService.getExercises();
      // setExercises(exercisesData);
    } catch (error: any) {
      console.error('Error al cargar ejercicios:', error);
      Alert.alert('Error', 'No se pudieron cargar los ejercicios');
    } finally {
      setIsLoading(false);
    }
  };

  const getExerciseTypeIcon = (type: Exercise['type']): string => {
    switch (type) {
      case 'multiple_choice':
        return 'list';
      case 'fill_blanks':
        return 'create';
      case 'pronunciation':
        return 'mic';
      case 'matching':
        return 'git-compare';
      default:
        return 'help-circle';
    }
  };

  const getExerciseTypeText = (type: Exercise['type']): string => {
    switch (type) {
      case 'multiple_choice':
        return 'Selección múltiple';
      case 'fill_blanks':
        return 'Completar espacios';
      case 'pronunciation':
        return 'Pronunciación';
      case 'matching':
        return 'Relacionar';
      default:
        return 'Desconocido';
    }
  };

  const getDifficultyText = (difficulty: number): string => {
    switch (difficulty) {
      case 1:
        return 'Fácil';
      case 2:
        return 'Medio';
      case 3:
        return 'Difícil';
      default:
        return `Nivel ${difficulty}`;
    }
  };

  const renderExerciseItem = ({ item }: { item: Exercise }) => (
    <TouchableOpacity 
      style={[
        styles.exerciseCard,
        item.completed && styles.completedExerciseCard
      ]}
      // onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: item.id })}
    >
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseTypeContainer}>
          <Ionicons 
            name={getExerciseTypeIcon(item.type) as any} 
            size={20} 
            color="#FF0000" 
          />
          <Text style={styles.exerciseType}>
            {getExerciseTypeText(item.type)}
          </Text>
        </View>
        
        {item.completed && (
          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
        )}
      </View>
      
      <View style={styles.exerciseContent}>
        <Text style={styles.exerciseWord}>
          {item.object_translation.spanish} ➔ {item.object_translation.quechua}
        </Text>
        
        <View style={styles.difficultyContainer}>
          <Text style={styles.difficultyText}>
            {getDifficultyText(item.difficulty)}
          </Text>
          {Array(item.difficulty).fill(0).map((_, i) => (
            <Ionicons key={i} name="star" size={14} color="#FFC107" />
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF0000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ejercicios</Text>
      </View>

      <FlatList
        data={exercises}
        renderItem={renderExerciseItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.exercisesList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay ejercicios disponibles</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={loadExercises}
            >
              <Text style={styles.retryButtonText}>Actualizar</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#FF0000',
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  exercisesList: {
    padding: 16,
  },
  exerciseCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  completedExerciseCard: {
    backgroundColor: '#F5F5F5',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseType: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  exerciseContent: {
    marginTop: 8,
  },
  exerciseWord: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  difficultyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  difficultyText: {
    fontSize: 12,
    color: '#666',
    marginRight: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#FF0000',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});