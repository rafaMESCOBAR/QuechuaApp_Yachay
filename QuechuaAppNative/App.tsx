// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Pantallas existentes
import HomeScreen from './src/screens/HomeScreen';
import { CameraScreen } from './src/components/CameraScreen';

// Nuevas pantallas
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ExercisesScreen from './src/screens/ExercisesScreen';

// Contexto de autenticación
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Tipos de navegación
type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type AppTabsParamList = {
  Home: undefined;
  Camera: undefined;
  Exercises: undefined;
  Profile: undefined;
};

type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

// Navegadores
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppTabs = createBottomTabNavigator<AppTabsParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

// Componente de carga
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#FF0000" />
  </View>
);

// Navegación de autenticación
const AuthStackScreen = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
  </AuthStack.Navigator>
);

// Navegación principal de la aplicación
const AppTabsScreen = () => (
  <AppTabs.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: keyof typeof Ionicons.glyphMap = 'home';

        if (route.name === 'Home') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Camera') {
          iconName = focused ? 'camera' : 'camera-outline';
        } else if (route.name === 'Exercises') {
          iconName = focused ? 'book' : 'book-outline';
        } else if (route.name === 'Profile') {
          iconName = focused ? 'person' : 'person-outline';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#FF0000',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <AppTabs.Screen name="Home" component={HomeScreen} />
    <AppTabs.Screen name="Camera" component={CameraScreen} />
    <AppTabs.Screen name="Exercises" component={ExercisesScreen} />
    <AppTabs.Screen name="Profile" component={ProfileScreen} />
  </AppTabs.Navigator>
);

// Componente principal que utiliza el contexto de autenticación
const AppContent = () => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <RootStack.Screen name="App" component={AppTabsScreen} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthStackScreen} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

// Componente raíz que provee el contexto de autenticación
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});