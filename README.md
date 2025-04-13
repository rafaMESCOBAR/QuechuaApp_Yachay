
## ✅ Requisitos

- Python 3.8+
- Node.js 14+
- Expo CLI
- Cuenta en Google Cloud (reconocimiento de voz)
- Cuenta en OpenAI (generación de ejercicios)

---

## ⚙️ Instalar dependencias frontend:
```bash
cd mobile/QuechuaAppNative
# QuechuaAppNative

## Dependencias Instaladas

A continuación se detallan las dependencias que se han instalado en el proyecto y su propósito:

### 1. **`@react-navigation/native`**
   - **Descripción:** Dependencia principal para la navegación entre pantallas en la aplicación.
   - **Comando de instalación:**
     ```bash
     npm install @react-navigation/native
     ```

### 2. **`@react-navigation/bottom-tabs`**
   - **Descripción:** Necesaria para crear una barra de navegación de pestañas en la parte inferior de la aplicación.
   - **Comando de instalación:**
     ```bash
     npm install @react-navigation/bottom-tabs
     ```

### 3. **`react-native-screens`**
   - **Descripción:** Mejora el rendimiento de las pantallas al utilizar la API nativa de pantallas en React Native.
   - **Comando de instalación:**
     ```bash
     npm install react-native-screens
     ```

### 4. **`react-native-safe-area-context`**
   - **Descripción:** Maneja el área segura en las pantallas, evitando que los elementos de la UI se solapen con las áreas del sistema.
   - **Comando de instalación:**
     ```bash
     npm install react-native-safe-area-context
     ```

### 5. **`react-native-gesture-handler`**
   - **Descripción:** Proporciona el manejo de gestos (deslizar, arrastrar, etc.) necesarios para las interacciones en la app.
   - **Comando de instalación:**
     ```bash
     npm install react-native-gesture-handler
     ```

### 6. **`react-native-reanimated`**
   - **Descripción:** Permite animaciones fluidas y de alto rendimiento para la navegación y otras interacciones.
   - **Comando de instalación:**
     ```bash
     npm install react-native-reanimated
     ```

### 7. **`expo-av`**
   - **Descripción:** API para reproducir audio y video en la aplicación utilizando Expo.
   - **Comando de instalación:**
     ```bash
     npm install expo-av
     ```

### 8. **`expo-speech`**
   - **Descripción:** API para convertir texto en voz (TTS - Text to Speech).
   - **Comando de instalación:**
     ```bash
     npm install expo-speech
     ```

### 9. **`expo-media-library`**
   - **Descripción:** Permite acceder a la biblioteca de medios del dispositivo (fotos, videos, etc.).
   - **Comando de instalación:**
     ```bash
     npm install expo-media-library
     ```

### 10. **`expo-image-picker`**
   - **Descripción:** Permite seleccionar imágenes o fotos desde la galería o la cámara del dispositivo.
   - **Comando de instalación:**
     ```bash
     npm install expo-image-picker
     ```

### 11. **`react-native-vision-camera`**
   - **Descripción:** Proporciona acceso a la cámara del dispositivo para capturar imágenes y videos.
   - **Comando de instalación:**
     ```bash
     npm install react-native-vision-camera
     ```

### 12. **`react-native-dotenv`**
   - **Descripción:** Carga variables de entorno desde archivos `.env` para usarlas en el código JavaScript de forma segura.
   - **Comando de instalación:**
     ```bash
     npm install react-native-dotenv
     ```

---






## Instrucciones de Instalación

1. Clona el repositorio:
   ```bash
   git clone https://github.com/tu-usuario/QuechuaAppNative.git


## ⚙️ Configuración del Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

REM Crear archivo .env a partir del ejemplo
copy .env.example .env

REM Edita .env y agrega tus claves API
notepad .env

python manage.py migrate
python manage.py runserver
