#backend/translations/views.py
# views.py completo
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
from rest_framework.authtoken.models import Token
from datetime import timedelta
from django.http import JsonResponse
import base64
import tempfile
import os
import requests
import json

from .models import (
    ObjectTranslation, UserProfile, Exercise, UserProgress,
    Achievement, UserAchievement, ActivityLog, PronunciationRecord
)
from .serializers import (
    ObjectTranslationSerializer, UserSerializer, UserProfileSerializer,
    ExerciseSerializer, UserProgressSerializer, AchievementSerializer,
    UserAchievementSerializer, ActivityLogSerializer, PronunciationRecordSerializer
)
from .services.detection import ObjectDetectionService
from .services.exercise_generator import ExerciseGeneratorService
import logging

logger = logging.getLogger(__name__)

def get_cached_translation(english_label):
    """Obtiene una traducción del caché o de la base de datos."""
    # Reemplaza espacios con guiones
    cache_key = f"translation_{english_label.lower().replace(' ', '_')}"
    cached_translation = cache.get(cache_key)
    
    if cached_translation is None:
        translation = ObjectTranslation.objects.filter(
            english_label__iexact=english_label
        ).first()
        
        if translation:
            cached_translation = {
                'id': translation.id,
                'spanish': translation.spanish,
                'quechua': translation.quechua
            }
            cache.set(cache_key, cached_translation, timeout=86400) # 24 horas
    
    return cached_translation

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Iniciar sesión y obtener token."""
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response(
            {'error': 'Se requiere nombre de usuario y contraseña'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user = authenticate(username=username, password=password)
    
    if not user:
        return Response(
            {'error': 'Credenciales inválidas'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    token, _ = Token.objects.get_or_create(user=user)
    
    # Obtener o crear perfil de usuario si no existe
    profile, created = UserProfile.objects.get_or_create(user=user)
    
    return Response({
        'token': token.key,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'profile': UserProfileSerializer(profile).data
        }
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """Registrar un nuevo usuario."""
    try:
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        native_speaker = request.data.get('native_speaker', False)
        preferred_dialect = request.data.get('preferred_dialect', '')
        
        # Validar datos
        errors = {}
        if not username:
            errors['username'] = 'El nombre de usuario es requerido'
        if not email:
            errors['email'] = 'El correo electrónico es requerido'
        if not password:
            errors['password'] = 'La contraseña es requerida'
        
        if errors:
            return Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)
        
        # Verificar username y email existentes
        if User.objects.filter(username=username).exists():
            return Response(
                {'error': 'El nombre de usuario ya está en uso'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if User.objects.filter(email=email).exists():
            return Response(
                {'error': 'El correo electrónico ya está en uso'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Crear el usuario
        user = User.objects.create_user(username=username, email=email, password=password)
        
        # El perfil se crea automáticamente por la señal, solo necesitamos actualizarlo
        profile = UserProfile.objects.get(user=user)
        profile.native_speaker = native_speaker
        if preferred_dialect:
            profile.preferred_dialect = preferred_dialect
        profile.save()
        
        # Crear token
        token, _ = Token.objects.get_or_create(user=user)
        
        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'profile': UserProfileSerializer(profile).data
            }
        }, status=status.HTTP_201_CREATED)
    
    except Exception as e:
        # Registrar el error completo en los logs
        logger.error(f"Error en registro: {str(e)}", exc_info=True)
        return Response(
            {'error': f'Error al registrar usuario: {str(e)}'}, 
            status=status.HTTP_400_BAD_REQUEST
        )

class ObjectTranslationViewSet(viewsets.ModelViewSet):
    queryset = ObjectTranslation.objects.all()
    serializer_class = ObjectTranslationSerializer
    filterset_fields = ['english_label', 'spanish', 'quechua']
    search_fields = ['english_label', 'spanish', 'quechua']
    ordering_fields = ['english_label', 'created_at']
    ordering = ['english_label']

class ObjectDetectionViewSet(viewsets.ViewSet):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.detection_service = ObjectDetectionService()

    @action(detail=False, methods=['POST'])
    def detect(self, request):
        """
        Detecta objetos en una imagen y retorna sus traducciones.
        Espera un archivo de imagen en request.FILES['image']
        """
        try:
            image_file = request.FILES.get('image')
            if not image_file:
                return Response(
                    {'error': 'No se proporcionó ninguna imagen'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not image_file.content_type.startswith('image/'):
                return Response(
                    {'error': 'El archivo debe ser una imagen válida'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            detections = self.detection_service.detect_objects(image_file)
            
            results = []
            for detection in detections:
                translation = get_cached_translation(detection['label'])
                
                if translation:
                    result = {
                        'label': detection['label'],
                        'spanish': translation['spanish'],
                        'quechua': translation['quechua'],
                        'confidence': round(detection['confidence'] * 100, 2),
                        'bbox': detection['bbox']
                    }
                    results.append(result)
                else:
                    logger.warning(f"No se encontró traducción para: {detection['label']}")

            results.sort(key=lambda x: x['confidence'], reverse=True)

            response_data = {
                'objects': results,
                'count': len(results),
                'message': 'Detección exitosa' if results else 'No se encontraron objetos reconocibles'
            }

            return Response(response_data)
            
        except ValueError as e:
            logger.warning(f"Error de validación: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error en el proceso de detección: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Error interno del servidor'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['GET'])
    def status(self, request):
        """Verifica el estado del servicio de detección."""
        try:
            model = self.detection_service.model
            return Response({
                'status': 'operational',
                'message': 'Servicio de detección funcionando correctamente'
            })
        except Exception as e:
            logger.error(f"Error en el servicio de detección: {str(e)}")
            return Response({
                'status': 'error',
                'message': 'El servicio de detección no está disponible'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['GET'], permission_classes=[IsAuthenticated])
    def profile(self, request):
        """Obtiene el perfil del usuario actual"""
        try:
            serializer = UserProfileSerializer(request.user.profile)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error al obtener perfil: {str(e)}", exc_info=True)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['PUT', 'PATCH'])
    def update_profile(self, request):
        """Actualiza el perfil del usuario actual"""
        serializer = UserProfileSerializer(
            request.user.profile, 
            data=request.data, 
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['GET'])
    def ranking(self, request):
        """Retorna los usuarios con más puntos/nivel"""
        top_users = UserProfile.objects.order_by('-level', '-experience_points')[:20]
        serializer = UserProfileSerializer(top_users, many=True)
        return Response(serializer.data)

class ExerciseViewSet(viewsets.ModelViewSet):
    queryset = Exercise.objects.all()
    serializer_class = ExerciseSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    @action(detail=False, methods=['GET'])
    def generate(self, request):
        """Genera ejercicios personalizados para un usuario basado en un objeto detectado"""
        object_id = request.query_params.get('object_id')
        if not object_id:
            return Response({'error': 'Se requiere object_id'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            object_translation = ObjectTranslation.objects.get(id=object_id)
        except ObjectTranslation.DoesNotExist:
            return Response({'error': 'Objeto no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        
        # Determinar nivel del usuario (1 si no está autenticado)
        user_level = 1
        if request.user.is_authenticated:
            user_level = request.user.profile.level
        
        # Generar ejercicios
        exercise_generator = ExerciseGeneratorService()
        exercises = exercise_generator.generate_exercises(object_translation, user_level)
        
        # Guardar ejercicios en la base de datos
        for exercise in exercises:
            exercise.save()
        
        serializer = self.get_serializer(exercises, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['GET'])
    def generate_by_label(self, request):
        """Genera ejercicios basados en la etiqueta de un objeto detectado"""
        label = request.query_params.get('label')
        if not label:
            return Response({'error': 'Se requiere label'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            # Buscar la traducción por etiqueta
            object_translation = ObjectTranslation.objects.filter(
                english_label__iexact=label
            ).first()
            
            if not object_translation:
                return Response({'error': f'No se encontró traducción para la etiqueta: {label}'}, 
                              status=status.HTTP_404_NOT_FOUND)
            
            # Determinar nivel del usuario (1 si no está autenticado)
            user_level = 1
            if request.user.is_authenticated:
                user_level = request.user.profile.level
            
            # Generar ejercicios
            exercise_generator = ExerciseGeneratorService()
            exercises = exercise_generator.generate_exercises(object_translation, user_level)
            
            # Guardar ejercicios en la base de datos
            for exercise in exercises:
                exercise.save()
            
            serializer = self.get_serializer(exercises, many=True)
            return Response(serializer.data)
        
        except Exception as e:
            logger.error(f"Error al generar ejercicios: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Error interno del servidor: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )        
    @action(detail=True, methods=['POST'])
    def submit_answer(self, request, pk=None):
        """Verifica la respuesta de un ejercicio y actualiza el progreso del usuario"""
        if not request.user.is_authenticated:
            return Response({'error': 'Debe iniciar sesión para enviar respuestas'}, 
                           status=status.HTTP_401_UNAUTHORIZED)
                           
        exercise = self.get_object()
        answer = request.data.get('answer')
        
        if not answer:
            return Response({'error': 'Se requiere una respuesta'}, 
                           status=status.HTTP_400_BAD_REQUEST)
            
        # Verificar respuesta (lógica simplificada)
        is_correct = False
        if exercise.type == 'pronunciation':
            # Para ejercicios de pronunciación, siempre aceptamos como correcto
            # y lo guardamos para revisión por hablantes nativos
            is_correct = True
        else:
            is_correct = (answer.lower().strip() == exercise.answer.lower().strip())
        
        # Actualizar progreso del usuario
        progress, created = UserProgress.objects.get_or_create(
            user=request.user, 
            exercise=exercise,
            defaults={'attempts': 1, 'correct': is_correct, 'completed': is_correct}
        )
        
        if not created:
            progress.attempts += 1
            progress.correct = is_correct or progress.correct
            progress.completed = is_correct or progress.completed
            progress.save()
            
        # Dar puntos al usuario si es correcto
        level_up = False
        points_earned = 0
        if is_correct:
            points_earned = exercise.points
            level_up = request.user.profile.add_experience(points_earned)
            request.user.profile.update_streak()
            
            # Registrar actividad
            ActivityLog.objects.create(
                user=request.user,
                activity_type='exercise_completed',
                points=points_earned,
                details={
                    'exercise_id': exercise.id,
                    'exercise_type': exercise.type,
                    'object_translation_id': exercise.object_translation.id,
                    'is_correct': is_correct
                }
            )
            
        return Response({
            'correct': is_correct,
            'feedback': 'Correcto!' if is_correct else f'Incorrecto. La respuesta correcta es: {exercise.answer}',
            'points_earned': points_earned,
            'level_up': level_up
        })

class UserProgressViewSet(viewsets.ModelViewSet):
    queryset = UserProgress.objects.all()
    serializer_class = UserProgressSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtra resultados para mostrar solo el progreso del usuario actual"""
        if self.request.user.is_staff:
            return UserProgress.objects.all()
        return UserProgress.objects.filter(user=self.request.user)

class PronunciationViewSet(viewsets.ModelViewSet):
    queryset = PronunciationRecord.objects.all()
    serializer_class = PronunciationRecordSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['POST'])
    def record(self, request):
        """Graba y valida una pronunciación"""
        object_id = request.data.get('object_id')
        audio_file = request.FILES.get('audio')
        
        if not object_id or not audio_file:
            return Response({'error': 'Se requiere object_id y archivo de audio'}, 
                           status=status.HTTP_400_BAD_REQUEST)
                           
        try:
            object_translation = ObjectTranslation.objects.get(id=object_id)
        except ObjectTranslation.DoesNotExist:
            return Response({'error': 'Objeto no encontrado'}, 
                           status=status.HTTP_404_NOT_FOUND)
        
        # Crear el registro de pronunciación
        record = PronunciationRecord.objects.create(
            user=request.user,
            object_translation=object_translation,
            audio_file=audio_file
        )
        
        # Por ahora asumimos que es válida (pendiente de revisión)
        # y damos puntos al usuario
        request.user.profile.add_experience(5)
        
        return Response({
            'id': record.id,
            'message': 'Pronunciación guardada correctamente y pendiente de revisión'
        })
    
    @action(detail=True, methods=['POST'])
    def validate(self, request, pk=None):
        """Permite a usuarios nativos validar pronunciaciones de otros"""
        if not request.user.is_authenticated:
            return Response({'error': 'Debe iniciar sesión para validar'}, 
                           status=status.HTTP_401_UNAUTHORIZED)
                          
        if not request.user.profile.native_speaker:
            return Response({'error': 'Solo hablantes nativos pueden validar pronunciaciones'},
                          status=status.HTTP_403_FORBIDDEN)
                          
        record = self.get_object()
        is_valid = request.data.get('is_valid')
        comment = request.data.get('comment', '')
        
        if is_valid is None:
            return Response({'error': 'Se requiere is_valid (true/false)'},
                          status=status.HTTP_400_BAD_REQUEST)
                          
        record.is_approved = is_valid
        record.approved_by = request.user
        record.approval_date = timezone.now()
        record.approval_comment = comment
        record.save()
        
        # Dar puntos al validador
        request.user.profile.add_experience(2)
        
        # Notificar al usuario cuya pronunciación fue validada
        # (implementación futura con notificaciones)
        
        return Response({'status': 'Validación registrada correctamente'})

@api_view(['POST'])
@permission_classes([AllowAny])
def analyze_pronunciation(request):
    """
    Endpoint para analizar la pronunciación de una palabra en quechua
    """
    try:
        # Obtener datos de la solicitud
        audio_base64 = request.data.get('audio')
        target_word = request.data.get('target_word')
        language_code = request.data.get('language_code', 'es-ES')
        
        if not audio_base64 or not target_word:
            return JsonResponse({'error': 'Se requieren audio y palabra objetivo'}, status=400)
        
        # Normalizar el target_word para comparación
        target_word_normalized = normalize_text(target_word)
        
        # Decodificar el audio de base64
        try:
            # Eliminar el prefijo si existe (e.g., "data:audio/m4a;base64,")
            if ',' in audio_base64:
                audio_base64 = audio_base64.split(',')[1]
            
            audio_data = base64.b64decode(audio_base64)
        except Exception as e:
            return JsonResponse({'error': f'Error al decodificar el audio: {str(e)}'}, status=400)
        
        # Guardar el audio en un archivo temporal
        with tempfile.NamedTemporaryFile(suffix='.m4a', delete=False) as temp_file:
            temp_file.write(audio_data)
            temp_file_path = temp_file.name
        
        try:
            # Convertir a formato WAV con frecuencia de muestreo específica
            # Necesitamos instalar pydub: pip install pydub
            # Y también necesitamos instalar ffmpeg
            import subprocess
            wav_temp_path = temp_file_path + '.wav'
            
            # Usar ffmpeg directamente para la conversión
            subprocess.run([
                'ffmpeg', '-y', '-i', temp_file_path, 
                '-acodec', 'pcm_s16le', '-ac', '1', '-ar', '16000', 
                wav_temp_path
            ], check=True)
            
            # Configurar solicitud a Google Speech-to-Text API
            GOOGLE_CLOUD_API_KEY = os.getenv('GOOGLE_CLOUD_API_KEY', '')
            if not GOOGLE_CLOUD_API_KEY:
                return JsonResponse({'error': 'API key no configurada'}, status=500)
            
            # Leer el archivo WAV convertido
            with open(wav_temp_path, 'rb') as audio_file:
                audio_content = base64.b64encode(audio_file.read()).decode('utf-8')
            
            # Configuración de la API - Con parámetros exactos que requiere Google
            speech_url = f"https://speech.googleapis.com/v1/speech:recognize?key={GOOGLE_CLOUD_API_KEY}"
            request_body = {
                "config": {
                    "encoding": "LINEAR16",  # Formato PCM 16-bit que es lo que generamos con ffmpeg
                    "sampleRateHertz": 16000,  # Ahora podemos especificar esto con seguridad
                    "languageCode": language_code,
                    "model": "command_and_search",
                    "speechContexts": [
                        {
                            "phrases": [target_word, target_word.lower()],
                            "boost": 20
                        }
                    ],
                    "maxAlternatives": 5
                },
                "audio": {
                    "content": audio_content
                }
            }
            
            # Enviar solicitud a Google
            response = requests.post(
                speech_url,
                json=request_body,
                headers={"Content-Type": "application/json"}
            )
            
            # Procesar la respuesta
            if response.status_code != 200:
                # Si falla, podemos intentar una estrategia alternativa
                print(f"Error en la API de Google Speech: {response.status_code}, {response.text}")
                
                # Si hay error con la API, implementamos una solución de emergencia
                # que utiliza una evaluación local simple
                
                # 1. Verificar el tamaño del archivo - si es muy pequeño, no hubo audio
                file_size = os.path.getsize(wav_temp_path)
                if file_size < 10000:  # Archivo muy pequeño, probablemente sin voz
                    return JsonResponse({
                        'success': False,
                        'transcription': '[silencio]',
                        'similarity': 0.1
                    })
                
                # 2. Para emergencias, devolvemos una respuesta que permite continuar
                # pero indicando que hubo un problema técnico
                print("Implementando evaluación de emergencia para permitir continuar")
                return JsonResponse({
                    'success': True,  # Permitimos continuar
                    'transcription': target_word,  # Suponemos correcto
                    'similarity': 0.8,  # Valor razonable
                    'warning': "Evaluación de emergencia debido a problemas técnicos"
                })
            
            response_data = response.json()
            print("Respuesta de Google Speech:", response_data)
            
            # Extraer la transcripción
            transcription = ""
            if ('results' in response_data and 
                response_data['results'] and 
                'alternatives' in response_data['results'][0] and 
                response_data['results'][0]['alternatives']):
                transcription = response_data['results'][0]['alternatives'][0]['transcript']
            
            # Si no hay transcripción pero hay requestId, la API procesó correctamente
            if not transcription and 'requestId' in response_data:
                return JsonResponse({
                    'success': False,
                    'transcription': '[no reconocido]',
                    'similarity': 0.1
                })
            
            # Normalizar la transcripción para comparación
            transcription_normalized = normalize_text(transcription)
            
            # Calcular similitud
            similarity = calculate_similarity(transcription_normalized, target_word_normalized)
            print(f"Similitud calculada: {similarity}")
            
            # Determinar éxito basado en similitud
            required_similarity = 0.7
            success = similarity >= required_similarity or transcription_normalized == target_word_normalized
            
            return JsonResponse({
                'success': success,
                'transcription': transcription,
                'similarity': similarity
            })
            
        finally:
            # Limpiar los archivos temporales
            for path in [temp_file_path, wav_temp_path]:
                if os.path.exists(path):
                    os.remove(path)
        
    except Exception as e:
        print(f"Error en análisis de pronunciación: {str(e)}")
        return JsonResponse({
            'success': True,  # En caso de error crítico, permitimos avanzar
            'transcription': target_word,
            'similarity': 0.75,
            'error': 'Error técnico, evaluación limitada'
        })
def normalize_text(text):
    """Normaliza el texto para comparación y considera equivalencias fonéticas quechuas"""
    import unicodedata
    text = (
        unicodedata.normalize('NFD', text.lower().strip())
        .encode('ascii', 'ignore')
        .decode('ascii')
    )
    
    # Equivalencias fonéticas quechuas
    text = text.replace('kh', 'k')
    text = text.replace('qh', 'k')
    text = text.replace('q', 'k')
    text = text.replace('j', 'h')
    text = text.replace('c', 'k')
    
    return text

def levenshtein_distance(a, b):
    """Calcula la distancia de Levenshtein entre dos cadenas"""
    # Crear matriz
    matrix = []
    for i in range(len(b) + 1):
        matrix.append([i])
    for j in range(len(a) + 1):
        matrix[0].append(j)
        
    # Rellenar matriz
    for i in range(1, len(b) + 1):
        for j in range(1, len(a) + 1):
            if b[i-1] == a[j-1]:
                matrix[i].append(matrix[i-1][j-1])
            else:
                matrix[i].append(min(matrix[i-1][j-1] + 1, matrix[i][j-1] + 1, matrix[i-1][j] + 1))
    
    return matrix[len(b)][len(a)]

def calculate_similarity(a, b):
    """Calcula la similitud entre dos cadenas de manera más precisa y estricta"""
    # Normalizar las entradas
    a = normalize_text(a)
    b = normalize_text(b)
    
    if not a or not b:
        return 0.0
        
    # Si son idénticos, similitud perfecta
    if a == b:
        return 1.0
    
    # Separar palabras para comparar individualmente
    a_words = a.split()
    b_words = b.split()
    
    # Si la transcripción tiene más de una palabra y contiene exactamente
    # la palabra objetivo, considerar buena similitud
    if len(a_words) > 1 and b.lower() in [word.lower() for word in a_words]:
        return 0.85
        
    # Calcular distancia de Levenshtein normalizada
    lev_distance = levenshtein_distance(a, b)
    max_length = max(len(a), len(b))
    
    # Normalizar pero con un factor de castigo para diferencias graves
    raw_similarity = 1 - (lev_distance / max_length)
    
    # MUY IMPORTANTE: Castigo más fuerte a palabras muy diferentes en primera letra
    if len(a) > 0 and len(b) > 0 and a[0].lower() != b[0].lower():
        raw_similarity *= 0.6  # Castigo más fuerte (antes era 0.8)
    
    # Castigo adicional para palabras con longitud diferente
    length_diff = abs(len(a) - len(b))
    if length_diff > 1:
        raw_similarity *= (1 - 0.1 * length_diff)
    
    # Para palabras cortas (como "runa"), ser más estrictos
    if len(b) <= 5 and lev_distance > 1:
        raw_similarity *= 0.8
    
    # Umbral mínimo de similitud para palabras muy diferentes
    if raw_similarity < 0.5:
        return raw_similarity * 0.8
    
    # Limitar resultado entre 0 y 1
    return max(0.0, min(1.0, raw_similarity))