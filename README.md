# QuechuaApp Native

## Requisitos Previos

- Python 3.8+
- Node.js 14+
- Expo CLI
- Cuenta de Google Cloud
- Cuenta de OpenAI

## Instalación

### Frontend

1. Ir al directorio del proyecto:
   ```bash
   cd mobile/QuechuaAppNative
   npm install
   ```

### Backend

1. Configurar entorno virtual:
   ```bash
   cd backend
   python -m venv venv
   # Activar venv (según tu sistema operativo)
   pip install -r requirements.txt
   ```

2. Configurar variables de entorno:
   ```bash
   cp .env.example .env
   # Editar .env con tus claves
   ```

3. Iniciar proyecto:
   ```bash
   python manage.py migrate
   python manage.py runserver
   ```

## Dependencias Principales

### Navegación
- `@react-navigation/native`
- `@react-navigation/bottom-tabs`

### UI y Rendimiento
- `react-native-screens`
- `react-native-safe-area-context`
- `react-native-gesture-handler`

### APIs Expo
- `expo-av`
- `expo-speech`
- `expo-media-library`
- `expo-image-picker`

### Utilidades
- `react-native-vision-camera`
- `react-native-dotenv`

## Instalación de Dependencias

```bash
npm install @react-navigation/native
npm install @react-navigation/bottom-tabs
# Instalar dependencias según necesidad
```

## Notas Importantes

- Protege tus claves API
- Verifica compatibilidad de versiones
- Consulta documentación de paquetes