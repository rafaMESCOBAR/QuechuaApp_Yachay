#backend/translations/views.py
# views.py completo
import os
import base64
import tempfile
import requests
import json
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.core.cache import cache
from django.core.exceptions import ImproperlyConfigured
from django.http import JsonResponse
from django.utils import timezone

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from rest_framework.authtoken.models import Token

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials
# Agregue estas importaciones al inicio del archivo
import time
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.conf import settings

# Imports ACTUALIZADOS - Añadir los nuevos modelos
from django.db.models import Sum, Count, Avg  # Nuevo
import random  # Nuevo
from .models import (
    ObjectTranslation, UserProfile, Exercise, UserProgress,
    Achievement, UserAchievement, ActivityLog, PronunciationRecord,
    ProgressCategory, StreakReward, PracticeSession, AnalyticsEvent
)
from .serializers import (
    ObjectTranslationSerializer, UserSerializer, UserProfileSerializer,
    ExerciseSerializer, UserProgressSerializer, AchievementSerializer,
    UserAchievementSerializer, ActivityLogSerializer, PronunciationRecordSerializer,
    ProgressCategorySerializer, StreakRewardSerializer, PracticeSessionSerializer  # Nuevos serializers añadidos
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

            # Añadir puntos al usuario cuando se hace una detección exitosa
            if results and request.user.is_authenticated:
                # Asignar puntos basados en la cantidad de objetos detectados
                detection_points = min(len(results), 5) * 10  # Limitar a 5 objetos máximo
                
                # Actualizar puntos de usuario específicamente en el modo "detection"
                request.user.profile.add_experience_by_mode(detection_points, 'detection')
                
                # Registrar actividad
                ActivityLog.objects.create(
                    user=request.user,
                    activity_type='object_detection',
                    mode='detection',
                    points=detection_points,
                    details={
                        'detected_objects': [obj['label'] for obj in results],
                        'confidence_levels': [obj['confidence'] for obj in results]
                    }
                )
                
                # Agregar los puntos a la respuesta para informar al usuario
                response_data = {
                    'objects': results,
                    'count': len(results),
                    'message': 'Detección exitosa' if results else 'No se encontraron objetos reconocibles',
                    'points_earned': detection_points
                }
            else:
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
    mode = request.data.get('mode', 'detection')  # Añadir modo (detection o practice)
    
    if not answer:
        return Response({'error': 'Se requiere una respuesta'}, 
                       status=status.HTTP_400_BAD_REQUEST)
        
    # Verificar respuesta
    is_correct = False
    if exercise.type == 'pronunciation':
        # Para ejercicios de pronunciación, siempre aceptamos como correcto
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
        
        # Actualizar puntos según el modo (detection o practice)
        request.user.profile.add_experience_by_mode(points_earned, mode)
        request.user.profile.update_streak()
        
        # Registrar actividad
        ActivityLog.objects.create(
            user=request.user,
            activity_type='exercise_completed',
            mode=mode,  # Guardar el modo
            category=exercise.category,  # Guardar la categoría
            points=points_earned,
            details={
                'exercise_id': exercise.id,
                'exercise_type': exercise.type,
                'object_translation_id': exercise.object_translation.id,
                'is_correct': is_correct
            }
        )
        
        # Actualizar ProgressCategory
        category, created = ProgressCategory.objects.get_or_create(
            user=request.user,
            category=exercise.category,
            defaults={
                'points': 0,
                'exercises_completed': 0,
                'accuracy_rate': 0.0
            }
        )
        
        category.points += points_earned
        category.exercises_completed += 1
        
        # Calcular tasa de precisión
        total_exercises = UserProgress.objects.filter(
            user=request.user,
            exercise__category=exercise.category
        ).count()
        
        correct_exercises = UserProgress.objects.filter(
            user=request.user,
            exercise__category=exercise.category,
            correct=True
        ).count()
        
        if total_exercises > 0:
            category.accuracy_rate = correct_exercises / total_exercises
        
        category.save()
        
    return Response({
        'correct': is_correct,
        'feedback': 'Correcto!' if is_correct else f'Incorrecto. La respuesta correcta es: {exercise.answer}',
        'points_earned': points_earned,
        'level_up': level_up,
        'mode': mode,
        'category': exercise.category
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
 # Inicializar Firebase Admin SDK (solo una vez)
def initialize_firebase():
    try:
        if not firebase_admin._apps:
            # Ruta al archivo de credenciales (debes crearlo)
            firebase_cred_path = os.path.join(settings.BASE_DIR, 'firebase-credentials.json')
            if not os.path.exists(firebase_cred_path):
                raise ImproperlyConfigured(
                    "Firebase credentials file not found. Create a service account key in Firebase console "
                    "and save it as 'firebase-credentials.json' in your project root."
                )
            
            cred = credentials.Certificate(firebase_cred_path)
            firebase_admin.initialize_app(cred)
            print("Firebase inicializado correctamente")
        else:
            print("Firebase ya estaba inicializado")
    except Exception as e:
        logger.error(f"Error en autenticación Firebase: {str(e)}", exc_info=True)
        return Response(
            {'error': f'Error en el servidor: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
        # No se necesita esta línea:
        # print(f"Error inicializando Firebase: {str(e)}")   
        # Pasar esto al log ya está bien.

# Intentar inicializar Firebase al cargar la aplicación
initialize_firebase()

@api_view(['POST'])
@permission_classes([AllowAny])
def firebase_login_view(request):
    """Iniciar sesión o registrar usuario con token de Firebase."""
    firebase_token = request.data.get('firebase_token')
    email = request.data.get('email')
    name = request.data.get('name', '')
    photo_url = request.data.get('photo_url', '')
    
    if not firebase_token or not email:
        return Response(
            {'error': 'Se requiere token de Firebase y correo electrónico'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Verificar el token de Firebase
        try:
            firebase_user = firebase_auth.verify_id_token(firebase_token)
        except Exception as e:
            logger.error(f"Error al verificar token de Firebase: {str(e)}")
            return Response(
                {'error': 'Token de Firebase inválido'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Verificar que el email coincida con el del token
        if email != firebase_user.get('email'):
            return Response(
                {'error': 'El correo electrónico no coincide con el token'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Buscar usuario por email
        try:
            user = User.objects.get(email=email)
            # Usuario existente, actualizar nombre si es necesario
            if name and not user.first_name:
                name_parts = name.split(' ', 1)
                user.first_name = name_parts[0]
                if len(name_parts) > 1:
                    user.last_name = name_parts[1]
                user.save()
        except User.DoesNotExist:
            # Crear nuevo usuario
            username = email.split('@')[0]
            base_username = username
            counter = 1
            
            # Asegurarse de que el username sea único
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
            
            # Crear el usuario
            user = User.objects.create_user(
                username=username,
                email=email,
                password=None  # Usuario autenticado por Firebase, no necesita contraseña
            )
            
            # Establecer nombre si está disponible
            if name:
                name_parts = name.split(' ', 1)
                user.first_name = name_parts[0]
                if len(name_parts) > 1:
                    user.last_name = name_parts[1]
                user.save()
            
            # Verificar si el perfil se creó automáticamente por la señal
            profile = getattr(user, 'profile', None)
            if profile:
                if photo_url:
                    profile.profile_image = photo_url
                profile.save()
        
        # Crear o recuperar token de autenticación
        token, _ = Token.objects.get_or_create(user=user)
        
        # Obtener perfil
        profile = user.profile
        
        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'profile': UserProfileSerializer(profile).data
            }
        })
    
    except Exception as e:
        logger.error(f"Error en la autenticación: {str(e)}", exc_info=True)
        return Response(
            {'error': 'Error en el servidor'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
@api_view(['POST'])
@permission_classes([AllowAny])
def google_login_view(request):
    """Iniciar sesión o registrar usuario con token de Google directamente."""
    google_token = request.data.get('id_token')
    email = request.data.get('email')
    name = request.data.get('name', '')
    photo_url = request.data.get('photo_url', '')
    
    if not google_token or not email:
        return Response(
            {'error': 'Se requiere token de Google y correo electrónico'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Verificar el token de Google directamente usando la API de Google
        try:
            id_info = id_token.verify_oauth2_token(
                google_token, 
                google_requests.Request(), 
                settings.GOOGLE_CLIENT_ID
            )
            
            # Verificar que el token no esté expirado
            if id_info['exp'] < time.time():
                return Response(
                    {'error': 'Token de Google expirado'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
                
            # Verificar que el email coincida con el token
            if email.lower() != id_info.get('email', '').lower():
                return Response(
                    {'error': 'El correo electrónico no coincide con el token'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except ValueError as ve:
            logger.error(f"Error al verificar token de Google: {str(ve)}")
            return Response(
                {'error': 'Token de Google inválido'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Buscar usuario por email
        try:
            user = User.objects.get(email=email)
            # Usuario existente, actualizar nombre si es necesario
            if name and not user.first_name:
                name_parts = name.split(' ', 1)
                user.first_name = name_parts[0]
                if len(name_parts) > 1:
                    user.last_name = name_parts[1]
                user.save()
        except User.DoesNotExist:
            # Crear nuevo usuario
            username = email.split('@')[0]
            base_username = username
            counter = 1
            
            # Asegurarse de que el username sea único
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
            
            # Crear el usuario
            user = User.objects.create_user(
                username=username,
                email=email,
                password=None  # Usuario autenticado por Google, no necesita contraseña
            )
            
            # Establecer nombre si está disponible
            if name:
                name_parts = name.split(' ', 1)
                user.first_name = name_parts[0]
                if len(name_parts) > 1:
                    user.last_name = name_parts[1]
                user.save()
            
            # Verificar si el perfil se creó automáticamente por la señal
            profile = getattr(user, 'profile', None)
            if profile:
                if photo_url:
                    profile.profile_image = photo_url
                profile.save()
        
        # Crear o recuperar token de autenticación
        token, _ = Token.objects.get_or_create(user=user)
        
        # Obtener perfil
        profile = user.profile
        
        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'profile': UserProfileSerializer(profile).data
            }
        })
    
    except Exception as e:
        logger.error(f"Error en la autenticación con Google: {str(e)}", exc_info=True)
        return Response(
            {'error': f'Error en el servidor: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    
class PracticeViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    @action(detail=False, methods=['GET'])
    def categories(self, request):
        """Obtiene las categorías disponibles para práctica"""
        categories = [
            {
                'id': 'vocabulary',
                'title': 'Vocabulario',
                'description': 'Aprende nuevas palabras en quechua',
                'icon': 'book',
                'color': '#4CAF50',
                'exercise_types': ['multiple_choice', 'fill_blanks', 'anagram']
            },
            {
                'id': 'phrases',
                'title': 'Frases Comunes',
                'description': 'Domina frases cotidianas',
                'icon': 'chatbubbles',
                'color': '#2196F3',
                'exercise_types': ['multiple_choice', 'fill_blanks']
            },
            {
                'id': 'memory',
                'title': 'Memoria',
                'description': 'Desafía tu memoria con palabras',
                'icon': 'brain',
                'color': '#FF9800',
                'exercise_types': ['matching']
            },
            {
                'id': 'pronunciation',
                'title': 'Pronunciación',
                'description': 'Mejora tu pronunciación',
                'icon': 'mic',
                'color': '#9C27B0',
                'exercise_types': ['pronunciation']
            }
        ]
        return Response(categories)
    
    @action(detail=False, methods=['GET'])
    def get_exercises_by_category(self, request):
        """Obtiene ejercicios para una categoría específica"""
        category = request.query_params.get('category')
        if not category:
            return Response({'error': 'Se requiere categoría'}, status=400)
        
        # Obtener traducciones según la categoría
        if category == 'vocabulary':
            translations = ObjectTranslation.objects.order_by('?')[:10]
        elif category == 'phrases':
            # Filtrar frases comunes (traducciones con más de una palabra)
            translations = ObjectTranslation.objects.filter(
                spanish__contains=' '
            ).order_by('?')[:10]
        elif category == 'memory':
            translations = ObjectTranslation.objects.order_by('?')[:10]
        elif category == 'pronunciation':
            translations = ObjectTranslation.objects.order_by('?')[:10]
        else:
            return Response({'error': 'Categoría no válida'}, status=400)
        
        # Generar ejercicios
        exercises = []
        for trans in translations:
            # Determinar tipo de ejercicio según categoría
            exercise_types = {
                'vocabulary': ['multiple_choice', 'fill_blanks', 'anagram'],
                'phrases': ['multiple_choice', 'fill_blanks'],
                'memory': ['matching'],
                'pronunciation': ['pronunciation']
            }
            
            exercise_type = random.choice(exercise_types[category])
            
            # Generar ejercicio del tipo seleccionado
            exercise = Exercise.objects.create(
                type=exercise_type,
                category=category,  # Nuevo campo
                object_translation=trans,
                difficulty=request.user.profile.level if request.user.is_authenticated else 1,
                question=self._generate_question(exercise_type, trans),
                answer=trans.quechua,
                distractors=self._generate_distractors(exercise_type, trans),
                points=self._calculate_points(exercise_type),
                metadata={
                    'category': category,
                    'time_limit': self._get_time_limit(exercise_type),
                    'streak_bonus': True,
                    'practice_mode': True
                }
            )
            exercises.append(exercise)
        
        serializer = ExerciseSerializer(exercises, many=True)
        return Response(serializer.data)
    
    def _generate_question(self, exercise_type, translation):
        questions = {
            'multiple_choice': f"¿Cómo se dice '{translation.spanish}' en quechua?",
            'fill_blanks': f"Completa la palabra en quechua para '{translation.spanish}'",
            'anagram': f"Ordena las letras para formar la palabra en quechua que significa '{translation.spanish}'",
            'pronunciation': f"Practica la pronunciación de la palabra '{translation.quechua}' que significa '{translation.spanish}'",
            'matching': f"Relaciona las palabras en español con su traducción en quechua"
        }
        return questions.get(exercise_type, "Práctica de quechua")
    
    def _generate_distractors(self, exercise_type, translation):
        if exercise_type == 'multiple_choice':
            other_translations = ObjectTranslation.objects.exclude(
                id=translation.id
            ).order_by('?')[:3]
            return [t.quechua for t in other_translations]
        elif exercise_type == 'matching':
            other_translations = ObjectTranslation.objects.exclude(
                id=translation.id
            ).order_by('?')[:3]
            # CORRECCIÓN: Asegurar que cada par tenga un ID único
            pairs = [{'id': 1, 'spanish': translation.spanish, 'quechua': translation.quechua}]
            for i, trans in enumerate(other_translations, start=2):
                pairs.append({'id': i, 'spanish': trans.spanish, 'quechua': trans.quechua})
            return {'pairs': pairs}
        elif exercise_type == 'fill_blanks':
            return {'hint': f"La palabra tiene {len(translation.quechua)} letras"}
        return None
    
    def _calculate_points(self, exercise_type):
        base_points = {
            'multiple_choice': 10,
            'fill_blanks': 15,
            'anagram': 20,
            'pronunciation': 25,
            'matching': 18
        }
        return base_points.get(exercise_type, 10)
    
    def _get_time_limit(self, exercise_type):
        time_limits = {
            'multiple_choice': 30,
            'fill_blanks': 45,
            'anagram': 60,
            'pronunciation': 60,
            'matching': 90
        }
        return time_limits.get(exercise_type, 30)
    
    @action(detail=False, methods=['POST'])
    def start_session(self, request):
        """Inicia una nueva sesión de práctica"""
        category = request.data.get('category')
        if not category:
            return Response({'error': 'Se requiere categoría'}, status=400)
        
        session = PracticeSession.objects.create(
            user=request.user,
            category=category,
            start_time=timezone.now()
        )
        
        serializer = PracticeSessionSerializer(session)
        return Response(serializer.data)
    
    @action(detail=False, methods=['POST'])
    def end_session(self, request):
        """Finaliza una sesión de práctica"""
        session_id = request.data.get('session_id')
        if not session_id:
            return Response({'error': 'Se requiere ID de sesión'}, status=400)
        
        try:
            session = PracticeSession.objects.get(id=session_id, user=request.user)
            session.end_time = timezone.now()
            session.exercises_completed = request.data.get('exercises_completed', 0)
            session.points_earned = request.data.get('points_earned', 0)
            session.accuracy_rate = request.data.get('accuracy_rate', 0.0)
            session.calculate_duration()
            session.save()
            
            # Actualizar el perfil del usuario
            profile = request.user.profile
            profile.total_practice_time += session.duration_minutes
            profile.save()
            
            serializer = PracticeSessionSerializer(session)
            return Response(serializer.data)
        except PracticeSession.DoesNotExist:
            return Response({'error': 'Sesión no encontrada'}, status=404)


@action(detail=False, methods=['GET'])
def random_exercises(self, request):
    """Proporciona un conjunto aleatorio de ejercicios para práctica rápida"""
    category = request.query_params.get('category', 'vocabulary')
    count = int(request.query_params.get('count', '5'))
    
    # Obtener traducciones aleatorias para la categoría seleccionada
    translations = ObjectTranslation.objects.order_by('?')[:count]
    
    exercises = []
    for translation in translations:
        # Asignar tipos de ejercicio según la categoría
        if category == 'vocabulary':
            exercise_type = random.choice(['multiple_choice', 'fill_blanks', 'anagram'])
        elif category == 'pronunciation':
            exercise_type = 'pronunciation'
        elif category == 'memory':
            exercise_type = 'matching'
        else:
            exercise_type = random.choice(['multiple_choice', 'fill_blanks'])
        
        # Crear ejercicio temporal
        exercise = Exercise.objects.create(
            type=exercise_type,
            category=category,
            object_translation=translation,
            difficulty=request.user.profile.level if request.user.is_authenticated else 1,
            question=self._generate_question(exercise_type, translation),
            answer=translation.quechua,
            distractors=self._generate_distractors(exercise_type, translation),
            points=self._calculate_points(exercise_type),
            metadata={
                'practice_mode': True,
                'time_limit': self._get_time_limit(exercise_type),
                'category': category
            }
        )
        exercises.append(exercise)
    
    serializer = ExerciseSerializer(exercises, many=True)
    return Response(serializer.data)
class ProgressViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['GET'])
    def user_progress(self, request):
        """Obtiene el progreso completo del usuario incluyendo puntos por modo"""
        user = request.user
        profile = user.profile
        
        # Actividad semanal
        weekly_activity = []
        for i in range(7):
            date = timezone.now() - timedelta(days=i)
            day_points = ActivityLog.objects.filter(
                user=user,
                timestamp__date=date.date()
            ).aggregate(total=Sum('points'))['total'] or 0
            
            weekly_activity.append({
                'day': date.strftime('%a'),
                'points': day_points
            })
        weekly_activity.reverse()
        
        # Obtener logros
        user_achievements = UserAchievement.objects.filter(user=user).select_related('achievement')
        # Extraer los objetos Achievement de UserAchievement para serializar correctamente
        achievement_objects = [ua.achievement for ua in user_achievements]
        
        # Actividad reciente (últimos 7 días)
        seven_days_ago = timezone.now() - timedelta(days=7)
        recent_activity = (
            ActivityLog.objects.filter(
                user=user,
                timestamp__gte=seven_days_ago
            )
            .values('timestamp__date')
            .annotate(
                points_earned=Sum('points'),
                exercises_count=Count('id')
            )
            .order_by('-timestamp__date')
        )
        
        # Estadísticas por categoría
        stats_by_category = ProgressCategory.objects.filter(user=user).values(
            'category'
        ).annotate(
            total_points=Sum('points'),
            total_exercises=Sum('exercises_completed'),
            avg_accuracy=Avg('accuracy_rate')
        )
        
        # Preparar datos para el frontend
        progress_data = {
            'level': profile.level,
            'experience_points': profile.experience_points,
            'experience_to_next_level': profile.level * 100,
            'streak_days': profile.streak_days,
            'total_points': profile.total_points,
            'detection_points': profile.detection_points,
            'practice_points': profile.practice_points,
            'weekly_activity': weekly_activity,
            'exercises_completed': UserProgress.objects.filter(
                user=user, completed=True
            ).count(),
            'accuracy_rate': self._calculate_accuracy(user),
            'achievements': AchievementSerializer(achievement_objects, many=True).data,
            'recent_activity': self._format_recent_activity(recent_activity),
            'stats_by_category': self._format_category_stats(stats_by_category)
        }
        
        return Response(progress_data)
    
    def _calculate_accuracy(self, user):
        """Calcula precisión del usuario"""
        attempts = UserProgress.objects.filter(user=user)
        if not attempts.exists():
            return 0
        
        correct = attempts.filter(correct=True).count()
        return int((correct / attempts.count()) * 100)
    
    def _format_recent_activity(self, activity_logs):
        """Formatea actividad reciente para gráficos"""
        return [
            {
                'date': str(entry['timestamp__date']),
                'points_earned': entry['points_earned'],
                'exercises_count': entry['exercises_count']
            }
            for entry in activity_logs
        ]
    
    def _format_category_stats(self, stats):
        """Formatea estadísticas por categoría"""
        formatted = {
            'vocabulary': 0,
            'pronunciation': 0,
            'grammar': 0,
            'detection': 0,
            'phrases': 0,
            'memory': 0
        }
        
        for stat in stats:
            if stat['category'] in formatted:
                formatted[stat['category']] = stat['total_points']
        
        return formatted
    
    @action(detail=False, methods=['POST'])
    def record_points(self, request):
        """Registra puntos con modo específico"""
        points = request.data.get('points', 0)
        mode = request.data.get('mode', 'detection')
        category = request.data.get('category')
        
        profile = request.user.profile
        profile.add_experience_by_mode(points, mode)
        profile.update_streak()
        
        # Registrar en ActivityLog
        ActivityLog.objects.create(
            user=request.user,
            activity_type=f'{mode}_activity',
            mode=mode,
            category=category,
            points=points,
            timestamp=timezone.now()
        )
        
        # Actualizar ProgressCategory si aplica
        if category:
            progress_category, created = ProgressCategory.objects.get_or_create(
                user=request.user,
                category=category
            )
            progress_category.points += points
            progress_category.exercises_completed += 1
            progress_category.save()
        
        # Verificar logros
        self._check_achievements(request.user, profile)
        
        return Response({
            'success': True,
            'points_added': points,
            'total_points': profile.total_points,
            'detection_points': profile.detection_points,
            'practice_points': profile.practice_points,
            'level': profile.level,
            'streak_days': profile.streak_days
        })
    
    def _check_achievements(self, user, profile):
        """Verifica y asigna logros"""
        # Verificar logros por nivel
        level_achievements = Achievement.objects.filter(
            achievement_type='level',
            required_value__lte=profile.level
        )
        
        # Verificar logros por racha
        streak_achievements = Achievement.objects.filter(
            achievement_type='streak',
            required_value__lte=profile.streak_days
        )
        
        # Verificar logros por puntos
        points_achievements = Achievement.objects.filter(
            achievement_type='points',
            required_value__lte=profile.total_points
        )
        
        # Asignar logros no obtenidos aún
        for achievement in level_achievements | streak_achievements | points_achievements:
            UserAchievement.objects.get_or_create(
                user=user,
                achievement=achievement
            )
    
    @action(detail=False, methods=['GET'])
    def streaks_rewards(self, request):
        """Obtiene información de rachas y recompensas"""
        profile = request.user.profile
        
        # Obtener recompensas por racha
        streak_rewards = StreakReward.objects.order_by('streak_days')
        earned_rewards = [
            reward for reward in streak_rewards 
            if reward.streak_days <= profile.streak_days
        ]
        
        # Próxima recompensa
        next_reward = StreakReward.objects.filter(
            streak_days__gt=profile.streak_days
        ).order_by('streak_days').first()
        
        return Response({
            'current_streak': profile.streak_days,
            'max_streak': profile.max_streak,
            'earned_rewards': StreakRewardSerializer(earned_rewards, many=True).data,
            'next_reward': StreakRewardSerializer(next_reward).data if next_reward else None
        })
    
    @action(detail=False, methods=['GET'])
    def category_stats(self, request):
        """Obtiene estadísticas detalladas por categoría"""
        stats = ProgressCategory.objects.filter(user=request.user)
        serializer = ProgressCategorySerializer(stats, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['POST'])
    def sync_analytics(self, request):
        """Sincroniza eventos de analytics desde el frontend"""
        try:
            events = request.data.get('events', [])
            
            for event in events:
                AnalyticsEvent.objects.create(
                    user=request.user,
                    category=event.get('category', ''),
                    event_type=event.get('type', ''),
                    duration=event.get('duration', 0),
                    score=event.get('score', 0),
                    timestamp=timezone.now()
                )
            
            return Response({
                'success': True,
                'synced_count': len(events)
            })
        except Exception as e:
            logger.error(f"Error sincronizando analytics: {str(e)}")
            return Response({'error': str(e)}, status=500)
        
@action(detail=False, methods=['GET'])
def detailed_stats(self, request):
   
    user = request.user
    profile = user.profile
    
    # Estadísticas generales
    stats = {
        'general': {
            'level': profile.level,
            'total_points': profile.total_points,
            'experience_points': profile.experience_points,
            'next_level_at': profile.level * 100,
            'progress_percentage': (profile.experience_points / (profile.level * 100)) * 100,
            'streak_days': profile.streak_days,
            'max_streak': profile.max_streak
        },
        'mode_stats': {
            'detection': {
                'points': profile.detection_points,
                'percentage': (profile.detection_points / profile.total_points * 100) if profile.total_points > 0 else 0
            },
            'practice': {
                'points': profile.practice_points,
                'percentage': (profile.practice_points / profile.total_points * 100) if profile.total_points > 0 else 0
            }
        }
    }
    
    # Estadísticas por categoría
    categories = ProgressCategory.objects.filter(user=user)
    category_stats = {}
    
    for cat in categories:
        category_stats[cat.category] = {
            'points': cat.points,
            'exercises_completed': cat.exercises_completed,
            'accuracy_rate': cat.accuracy_rate * 100  # Convertir a porcentaje
        }
    
    stats['categories'] = category_stats
    
    # Logros
    achievements = UserAchievement.objects.filter(user=user).select_related('achievement')
    achievement_list = []
    
    for ua in achievements:
        achievement_list.append({
            'id': ua.achievement.id,
            'name': ua.achievement.name,
            'description': ua.achievement.description,
            'icon': ua.achievement.icon,
            'earned_at': ua.earned_at
        })
    
    stats['achievements'] = achievement_list
    
    # Sesiones recientes
    recent_sessions = PracticeSession.objects.filter(user=user).order_by('-start_time')[:5]
    session_list = []
    
    for session in recent_sessions:
        session_list.append({
            'id': session.id,
            'category': session.category,
            'date': session.start_time.date(),
            'duration_minutes': session.duration_minutes,
            'exercises_completed': session.exercises_completed,
            'points_earned': session.points_earned
        })
    
    stats['recent_sessions'] = session_list
    
    # Gráfico de progreso semanal
    today = timezone.now().date()
    week_stats = []
    
    for i in range(7):
        day = today - timedelta(days=i)
        points = ActivityLog.objects.filter(
            user=user, 
            timestamp__date=day
        ).aggregate(Sum('points'))['points__sum'] or 0
        
        week_stats.append({
            'day': day.strftime('%a'),
            'date': day,
            'points': points
        })
    
    week_stats.reverse()  # Poner en orden cronológico
    stats['weekly_progress'] = week_stats
    
    return Response(stats)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_dashboard(request):
    """Proporciona los datos necesarios para la pantalla principal"""
    user = request.user
    profile = user.profile
    
    # Obtener estadísticas generales
    detection_points = profile.detection_points
    practice_points = profile.practice_points
    
    # Verificar si hay una racha activa
    today = timezone.now().date()
    streak_active = False
    
    if profile.last_activity:
        days_diff = (today - profile.last_activity).days
        streak_active = days_diff <= 1
    
    # Obtener próxima recompensa por racha
    next_reward = None
    if streak_active:
        next_reward = StreakReward.objects.filter(
            streak_days__gt=profile.streak_days
        ).order_by('streak_days').first()
    
    # Datos para gráfico de actividad reciente
    last_week = today - timedelta(days=7)
    activity_stats = (
        ActivityLog.objects.filter(
            user=user,
            timestamp__gte=last_week
        )
        .values('timestamp__date', 'mode')
        .annotate(
            points=Sum('points'),
            exercises=Count('id')
        )
        .order_by('timestamp__date')
    )
    
    # Agrupar por modo
    activity_by_date = {}
    for stat in activity_stats:
        date_key = stat['timestamp__date'].strftime('%Y-%m-%d')
        if date_key not in activity_by_date:
            activity_by_date[date_key] = {
                'date': date_key,
                'detection': 0,
                'practice': 0,
                'total': 0
            }
        
        mode = stat['mode']
        activity_by_date[date_key][mode] = stat['points']
        activity_by_date[date_key]['total'] += stat['points']
    
    activity_chart = list(activity_by_date.values())
    
    # Obtener categorías más populares
    top_categories = (
        ProgressCategory.objects.filter(user=user)
        .order_by('-points')[:3]
    )
    
    categories = []
    for cat in top_categories:
        categories.append({
            'name': cat.get_category_display(),
            'category': cat.category,
            'points': cat.points,
            'exercises_completed': cat.exercises_completed
        })
    
    # Logros recientes
    recent_achievements = (
        UserAchievement.objects.filter(user=user)
        .select_related('achievement')
        .order_by('-earned_at')[:3]
    )
    
    achievements = []
    for ua in recent_achievements:
        achievements.append({
            'id': ua.achievement.id,
            'name': ua.achievement.name,
            'description': ua.achievement.description,
            'icon': ua.achievement.icon,
            'earned_at': ua.earned_at
        })
    
    # Construir respuesta
    return Response({
        'user': {
            'username': user.username,
            'level': profile.level,
            'experience': profile.experience_points,
            'next_level_at': profile.level * 100,
            'progress': (profile.experience_points / (profile.level * 100)) * 100,
            'streak_days': profile.streak_days,
            'streak_active': streak_active
        },
        'stats': {
            'detection_points': detection_points,
            'practice_points': practice_points,
            'total_points': profile.total_points,
            'categories': categories
        },
        'next_reward': StreakRewardSerializer(next_reward).data if next_reward else None,
        'activity_chart': activity_chart,
        'recent_achievements': achievements,
    })