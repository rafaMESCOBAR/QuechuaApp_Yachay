// index.ts
import { registerRootComponent } from 'expo';
import App from './App';

// Importar la inicialización de Firebase después, para asegurar que App esté registrado primero
import { initializeFirebase } from './src/services/firebase';

// Inicializar Firebase sin bloquear la carga de la app
console.log('====== INICIALIZACIÓN DE LA APLICACIÓN ======');
setTimeout(() => {
  initializeFirebase()
    .then(result => {
      console.log('Servicio de autenticación inicializado:', result ? 'OK' : 'Con advertencias');
    })
    .catch(error => {
      console.warn('Error en inicialización del servicio de autenticación, la app continuará sin algunas funcionalidades');
    });
}, 1000);

// Registrar el componente principal primero
registerRootComponent(App);