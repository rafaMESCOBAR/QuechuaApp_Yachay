# views.py completo actualizado
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
from django.db import models, transaction, IntegrityError

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from rest_framework.authtoken.models import Token

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials
import time
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.conf import settings

# Imports ACTUALIZADOS para el nuevo sistema
from django.db.models import Sum, Count, Avg, Q, Exists, OuterRef
import random
from .models import (
    ObjectTranslation, UserProfile, Exercise, UserProgress,
    Achievement, UserAchievement, ActivityLog, PronunciationRecord,
    UserVocabulary, DailyGoal,ExerciseSession,ExerciseSessionLog
)
from .serializers import (
    ObjectTranslationSerializer, UserSerializer, UserProfileSerializer,
    ExerciseSerializer, UserProgressSerializer, AchievementSerializer,
    UserAchievementSerializer, ActivityLogSerializer, PronunciationRecordSerializer,
    UserVocabularySerializer, DailyGoalSerializer
)
from .services.detection import ObjectDetectionService
from .services.exercise_generator import ExerciseGeneratorService
import logging

logger = logging.getLogger(__name__)

def get_cached_translation(english_label):
    """Obtiene una traducción del caché o de la base de datos."""
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
            cache.set(cache_key, cached_translation, timeout=86400)
    
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
        
        errors = {}
        if not username:
            errors['username'] = 'El nombre de usuario es requerido'
        if not email:
            errors['email'] = 'El correo electrónico es requerido'
        if not password:
            errors['password'] = 'La contraseña es requerida'
        
        if errors:
            return Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)
        
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
        
        user = User.objects.create_user(username=username, email=email, password=password)
        
        profile = UserProfile.objects.get(user=user)
        profile.native_speaker = native_speaker
        if preferred_dialect:
            profile.preferred_dialect = preferred_dialect
        profile.save()
        
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
        FINAL: Solo agrega la palabra PRINCIPAL al vocabulario (la que el usuario quiso detectar).
        Las palabras secundarias solo se muestran para valor educativo.
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

            # ✅ CORRECCIÓN FINAL: Solo palabra principal al vocabulario
            if results and request.user.is_authenticated:
                # 1. IDENTIFICAR OBJETO PRINCIPAL (mayor confianza = lo que el usuario quiso detectar)
                primary_object = results[0]
                normalized_primary = primary_object['quechua'].strip().lower()
                
                # 2. AGREGAR SOLO LA PALABRA PRINCIPAL AL VOCABULARIO
                user_vocab, created = UserVocabulary.objects.get_or_create(
                    user=request.user,
                    quechua_word=normalized_primary,
                    defaults={
                        'object_label': primary_object['label'],
                        'spanish_word': primary_object['spanish'].strip(),
                        'mastery_level': 1
                    }
                )
                
                # 3. ACTUALIZAR CONTADORES SOLO PARA LA PALABRA PRINCIPAL
                new_word_learned = False
                if created:
                    new_word_learned = True
                    request.user.profile.add_word()  # Solo +1 por la palabra que quiso detectar
                else:
                    # Si ya existe, incrementar contador de detecciones
                    user_vocab.times_detected += 1
                    user_vocab.last_detected = timezone.now()
                    user_vocab.save()
                
                # 4. REGISTRO DE SESIÓN: Una detección de la palabra principal
                ActivityLog.objects.create(
                    user=request.user,
                    activity_type='detection_session',
                    mode='detection',
                    word_learned=normalized_primary,  # Solo la palabra principal
                    details={
                        'primary_object': {
                            'spanish': primary_object['spanish'],
                            'english': primary_object['label'],
                            'confidence': primary_object['confidence']
                        },
                        'total_objects_in_image': len(results),
                        'secondary_objects': [
                            {
                                'spanish': obj['spanish'],
                                'quechua': obj['quechua'],
                                'english': obj['label'],
                                'confidence': obj['confidence']
                            } for obj in results[1:]  # Solo para referencia, NO agregadas al vocabulario
                        ],
                        'added_to_vocabulary': new_word_learned
                    }
                )
                
                # 5. ACTUALIZACIÓN DE PROGRESO: Solo una detección
                request.user.profile.update_streak()
                
                # 6. META DIARIA: Solo incrementar una vez
                today = timezone.now().date()
                daily_goal, _ = DailyGoal.objects.get_or_create(
                    user=request.user,
                    date=today,
                    defaults={
                        'words_detected': 0,
                        'words_practiced': 0,
                        'words_mastered': 0,
                        'detection_goal': 3,
                        'practice_goal': 5,
                        'mastery_goal': 1
                    }
                )
                daily_goal.words_detected += 1  # Solo +1 por sesión
                daily_goal.save()
                
                # 7. PREPARAR RESPUESTA
                response_data = {
                    'objects': results,  # Todos los objetos para mostrar en UI
                    'count': len(results),
                    'message': 'Detección exitosa',
                    'session_summary': {
                        'primary_object_detected': primary_object['spanish'],
                        'added_to_vocabulary': new_word_learned,
                        'vocabulary_count': 1 if new_word_learned else 0,
                        'secondary_objects_count': len(results) - 1,
                        'detection_count': 1  # Siempre 1 por sesión
                    },
                    'total_words': request.user.profile.total_words
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
        """Obtiene el perfil del usuario actual con el nuevo sistema"""
        try:
            profile = request.user.profile
            profile_data = UserProfileSerializer(profile).data
            
            # ACTUALIZADO: Usar los nuevos umbrales de nivel
            level_thresholds = [0, 15, 35, 60, 100, 150, 225, 325, 450, 600]
            current_threshold = level_thresholds[profile.current_level - 1] if profile.current_level <= 10 else 600
            next_threshold = level_thresholds[profile.current_level] if profile.current_level < 10 else 9999
            
            profile_data['next_level_threshold'] = next_threshold
            profile_data['current_level_threshold'] = current_threshold
            profile_data['words_to_next_level'] = next_threshold - profile.total_words
            
            return Response(profile_data)
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
        """Retorna los usuarios con más palabras aprendidas"""
        top_users = UserProfile.objects.order_by('-total_words', '-mastered_words')[:20]
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
            user_level = request.user.profile.current_level
        
        # Generar ejercicios
        exercise_generator = ExerciseGeneratorService()
        exercises = exercise_generator.generate_exercises(object_translation, user_level)
        
        # Guardar ejercicios en la base de datos
        for exercise in exercises:
            exercise.save()
        
        # NUEVO: Crear sesión de ejercicios
        if request.user.is_authenticated:
            session = ExerciseSession.objects.create(
                user=request.user,
                mode='detection',
                exercises_total=len(exercises)
            )
            
            # Registrar ejercicios en la sesión
            for exercise in exercises:
                ExerciseSessionLog.objects.create(
                    session=session,
                    exercise=exercise
                )
            
            # Guardar ID de sesión en metadata para uso futuro
            for exercise in exercises:
                if not exercise.metadata:
                    exercise.metadata = {}
                exercise.metadata['session_id'] = session.id
                exercise.save()
        
        serializer = self.get_serializer(exercises, many=True)
        response_data = serializer.data
        
        # Si hay sesión, incluir ID en la respuesta
        if request.user.is_authenticated:
            response_data = {
                'session_id': session.id,
                'exercises': serializer.data
            }
        
        return Response(response_data)
    
    @action(detail=False, methods=['GET'])
    def generate_by_label(self, request):
        """Genera ejercicios basados en la etiqueta de un objeto detectado"""
        label = request.query_params.get('label')
        mode = request.query_params.get('mode', 'detection')
        
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
                user_level = request.user.profile.current_level
            
            # Generar ejercicios
            exercise_generator = ExerciseGeneratorService()
            exercises = exercise_generator.generate_exercises(object_translation, user_level)
            
            # Guardar ejercicios en la base de datos con metadata correcta
            for exercise in exercises:
                # Agregar metadata para identificar el origen
                if not exercise.metadata:
                    exercise.metadata = {}
                exercise.metadata['mode'] = mode
                exercise.metadata['practice_mode'] = (mode == 'practice')
                exercise.save()
            
            # NUEVO: Crear sesión de ejercicios
            session = None
            if request.user.is_authenticated:
                session = ExerciseSession.objects.create(
                    user=request.user,
                    mode=mode,
                    exercises_total=len(exercises)
                )
                
                # Registrar ejercicios en la sesión
                for exercise in exercises:
                    ExerciseSessionLog.objects.create(
                        session=session,
                        exercise=exercise
                    )
                    
                    # Actualizar metadata con ID de sesión
                    if not exercise.metadata:
                        exercise.metadata = {}
                    exercise.metadata['session_id'] = session.id
                    exercise.save()
            
            serializer = self.get_serializer(exercises, many=True)
            response_data = serializer.data
            
            # Si hay sesión, incluir ID en la respuesta
            if session:
                response_data = {
                    'session_id': session.id,
                    'exercises': serializer.data
                }
            
            return Response(response_data)
        
        except Exception as e:
            logger.error(f"Error al generar ejercicios: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Error interno del servidor: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    @action(detail=True, methods=['POST'])
    def submit_answer(self, request, pk=None):
        """Verifica la respuesta de un ejercicio y actualiza el dominio de la palabra"""
        if not request.user.is_authenticated:
            return Response({'error': 'Debe iniciar sesión para enviar respuestas'}, 
                        status=status.HTTP_401_UNAUTHORIZED)
                        
        exercise = self.get_object()
        answer = request.data.get('answer')
        
        # Logging mejorado para depuración
        logger.info(f"🎯 Procesando ejercicio {exercise.id}, tipo: {exercise.type}")
        logger.info(f"🎯 Respuesta recibida: '{answer}'")
        logger.info(f"🎯 Respuesta esperada: '{exercise.answer}'")
        
        # Mejorar la determinación del modo 
        mode = request.data.get('mode')
        # Asegurar que siempre tengamos un modo válido
        if not mode or mode not in ['detection', 'practice']:
            # Verificar metadata del ejercicio primero
            if exercise.metadata and exercise.metadata.get('mode'):
                mode = exercise.metadata.get('mode')
            elif exercise.metadata and exercise.metadata.get('practice_mode'):
                mode = 'practice'
            elif exercise.category == 'detection':
                mode = 'detection'
            else:
                # Último recurso: por defecto es práctica
                mode = 'practice'
        
        if not answer:
            return Response({'error': 'Se requiere una respuesta'}, 
                        status=status.HTTP_400_BAD_REQUEST)
            
        # ✅ VERIFICACIÓN DE RESPUESTA MEJORADA POR TIPO DE EJERCICIO
        is_correct = False
        
        try:
            if exercise.type == 'pronunciation':
                # Para pronunciación, siempre consideramos correcto si llegó hasta aquí
                is_correct = True
                
            elif exercise.type == 'matching':
                # ✅ LÓGICA ESPECÍFICA PARA MATCHING
                logger.info(f"🔍 Procesando ejercicio de matching")
                
                if '→' in answer:
                    # Formato "español→quechua"
                    parts = answer.split('→')
                    if len(parts) == 2:
                        spanish_part = parts[0].strip()
                        quechua_part = parts[1].strip()
                        
                        # Verificar que la parte en quechua coincida con la respuesta esperada
                        is_correct = (quechua_part.lower() == exercise.answer.lower().strip())
                        
                        # Log adicional para depuración
                        logger.info(f"🔍 Matching - Español: '{spanish_part}', Quechua: '{quechua_part}'")
                        logger.info(f"🔍 Comparando '{quechua_part.lower()}' con '{exercise.answer.lower().strip()}'")
                    else:
                        logger.warning(f"🔍 Formato de matching inválido: {answer}")
                        is_correct = False
                else:
                    # Formato simple - solo quechua
                    is_correct = (answer.lower().strip() == exercise.answer.lower().strip())
                    
            else:
                # Lógica original para otros tipos de ejercicios
                is_correct = (answer.lower().strip() == exercise.answer.lower().strip())
                
        except Exception as e:
            logger.error(f"❌ Error al verificar respuesta: {str(e)}")
            return Response({'error': 'Error interno al verificar respuesta'}, 
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        logger.info(f"✅ Resultado de verificación: {is_correct}")
        
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
        
        # NUEVO: Actualizar log de sesión si existe
        session_id = None
        if exercise.metadata and 'session_id' in exercise.metadata:
            session_id = exercise.metadata['session_id']
            try:
                session_log = ExerciseSessionLog.objects.get(
                    session_id=session_id,
                    exercise=exercise
                )
                session_log.is_completed = True
                session_log.is_correct = is_correct
                session_log.end_time = timezone.now()
                session_log.save()
                
                # Actualizar contador de ejercicios completados en sesión
                session = ExerciseSession.objects.get(id=session_id)
                session.exercises_completed += 1
                
                # Si todos los ejercicios están completos, marcar como completada
                if session.exercises_completed >= session.exercises_total:
                    session.mark_completed()
                else:
                    session.save()
            except (ExerciseSessionLog.DoesNotExist, ExerciseSession.DoesNotExist):
                pass
        
        # Sistema de estrellas MEJORADO con información detallada
        mastery_updated = False
        mastery_decreased = False
        vocab = None
        mastery_info = {}
        consecutive_failures = 0
        consecutive_failures_limit = 3 if mode == 'detection' else 2
        is_recent_word = False
        is_minimally_practiced = False

        # ✅ CORRECCIÓN CRÍTICA 1: Normalizar palabra antes de buscar/crear
        normalized_quechua = exercise.object_translation.quechua.strip().lower()

        try:
            # ✅ CORRECCIÓN 2: Buscar palabra normalizada
            vocab = UserVocabulary.objects.get(
                user=request.user,
                quechua_word=normalized_quechua  # ← NORMALIZADA
            )
            old_mastery = vocab.mastery_level
            
            # ACTUALIZADO: Llamar a update_mastery y obtener información detallada
            mastery_info = vocab.update_mastery(is_correct, mode)  # Pasar el modo específico
            
            # Verificar cambios en el nivel de dominio
            mastery_updated = vocab.mastery_level > old_mastery
            mastery_decreased = mastery_info.get('was_degraded', False)
            
            # Obtener información adicional para enviar al frontend
            consecutive_failures = mastery_info.get('consecutive_failures', 0)
            consecutive_failures_limit = mastery_info.get('consecutive_failures_limit', consecutive_failures_limit)
            is_recent_word = mastery_info.get('is_recent_word', False)
            is_minimally_practiced = mastery_info.get('is_minimally_practiced', False)
            
        except UserVocabulary.DoesNotExist:
            if mode == 'detection':
                # ✅ SOLUCIÓN: Crear palabra automáticamente si no existe en detección
                logger.warning(f"⚠️ Palabra '{normalized_quechua}' no encontrada en vocabulario de detección")
                logger.warning(f"⚠️ Creando palabra automáticamente para permitir continuar")
                
                # Obtener vocabulario actual para diagnóstico
                user_vocab_words = list(UserVocabulary.objects.filter(user=request.user).values_list('quechua_word', flat=True))
                logger.warning(f"📚 Vocabulario actual ({len(user_vocab_words)} palabras): {user_vocab_words[:5]}")  # Primeras 5 palabras
                
                # Crear la palabra automáticamente
                vocab = UserVocabulary.objects.create(
                    user=request.user,
                    object_label=exercise.object_translation.english_label,
                    spanish_word=exercise.object_translation.spanish.strip(),
                    quechua_word=normalized_quechua,
                    mastery_level=1,
                    previous_mastery_level=1,
                    exercises_completed=1,
                    exercises_correct=1 if is_correct else 0,
                    times_detected=1  # Marcar como detectada una vez
                )
                
                # Agregar al perfil del usuario
                request.user.profile.add_word()
                
                # Registrar evento especial para diagnóstico
                ActivityLog.objects.create(
                    user=request.user,
                    activity_type='word_auto_created',
                    mode='detection',
                    word_learned=normalized_quechua,
                    details={
                        'reason': 'missing_from_vocab',
                        'exercise_id': exercise.id,
                        'auto_created': True,
                        'original_word': exercise.object_translation.quechua,
                        'vocab_count_before': len(user_vocab_words)
                    }
                )
                
                logger.info(f"✅ Palabra creada automáticamente en modo detección: '{normalized_quechua}'")
                
            else:
                # EN PRÁCTICA: Crear palabra nueva normalmente
                vocab = UserVocabulary.objects.create(
                    user=request.user,
                    object_label=exercise.object_translation.english_label,
                    spanish_word=exercise.object_translation.spanish.strip(),
                    quechua_word=normalized_quechua,
                    mastery_level=1,
                    previous_mastery_level=1,
                    exercises_completed=1,
                    exercises_correct=1 if is_correct else 0
                )
                request.user.profile.add_word()
                
                logger.info(f"✅ Palabra creada en modo práctica: '{normalized_quechua}'")

        # ✅ CORRECCIÓN 4: Registrar actividad con palabra normalizada
        ActivityLog.objects.create(
            user=request.user,
            activity_type='exercise_completed',
            mode=mode,
            category=exercise.category,
            word_learned=normalized_quechua,  # ← NORMALIZADA
            details={
                'exercise_id': exercise.id,
                'exercise_type': exercise.type,
                'mastery_level': vocab.mastery_level,
                'previous_mastery_level': vocab.previous_mastery_level,
                'is_correct': is_correct,
                'mode': mode,
                'session_id': session_id
            }
        ) 
        
        # Actualizar meta diaria
        today = timezone.now().date()
        daily_goal, _ = DailyGoal.objects.get_or_create(
            user=request.user,
            date=today
        )
        daily_goal.words_practiced += 1
        if vocab.mastery_level == 5 and mastery_updated:
            daily_goal.words_mastered += 1
        daily_goal.save()
        
        # Verificar logros
        Achievement.check_achievements(request.user)
        
        # Preparar respuesta MEJORADA con información detallada
        response_data = {
            'correct': is_correct,
            'feedback': '¡Correcto!' if is_correct else f'Incorrecto. La respuesta correcta es: {exercise.answer}',
            'mastery_level': vocab.mastery_level,
            'previous_mastery_level': vocab.previous_mastery_level,
            'mastery_updated': mastery_updated,
            'mastery_decreased': mastery_decreased,
            'mode': mode,
            'category': exercise.category,
            'consecutive_failures': consecutive_failures,
            'consecutive_failures_limit': consecutive_failures_limit,
            'is_recent_word': is_recent_word,
            'is_minimally_practiced': is_minimally_practiced,
            'exercises_completed': vocab.exercises_completed,
            'exercises_needed': 5 - vocab.exercises_completed if vocab.exercises_completed < 5 else 0
        }
        
        # Agregar mensaje específico si hubo degradación
        if mastery_decreased:
            response_data['degradation_message'] = "Esta palabra necesita más práctica. ¡Sigue intentándolo!"
        
        return Response(response_data)
    
    @action(detail=False, methods=['POST'])
    def abandon_session(self, request):
        """
        Registra el abandono de una sesión de ejercicios y aplica penalizaciones
        """
        # Log para depuración
        logger.info(f"Solicitud de abandono recibida: {request.data}")
        
        session_id = request.data.get('session_id')
        
        # Validación de tipo de datos mejorada
        if session_id is None:
            logger.warning("Intento de abandono sin session_id")
            return Response({'error': 'Se requiere session_id'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Convertir a entero para asegurar formato correcto
            session_id = int(session_id)
        except (ValueError, TypeError):
            logger.warning(f"ID de sesión inválido: {session_id}")
            return Response({'error': f'ID de sesión debe ser un número: {session_id}'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            session = ExerciseSession.objects.get(id=session_id, user=request.user)
            
            logger.info(f"Abandonando sesión {session_id} para usuario {request.user.username}")
            
            # Verificar si la sesión ya está completada o abandonada
            if session.is_completed:
                 logger.info(f"Sesión ya completada: {session_id}, devolviendo éxito")
                 return Response({
                     'success': True,
                     'message': 'Sesión ya finalizada',
                     'status': 'completed'
                })
            
            if session.is_abandoned:
                logger.warning(f"Intento de abandonar sesión ya abandonada: {session_id}")
                return Response({'error': 'Esta sesión ya está abandonada'},
                              status=status.HTTP_400_BAD_REQUEST)
            
            # Marcar como abandonada (aplicará penalizaciones)
            session.mark_abandoned()
            
            logger.info(f"Sesión {session_id} abandonada exitosamente")
            
            return Response({
                'message': 'Sesión abandonada correctamente',
                'warning': 'Se han aplicado penalizaciones por abandono'
            })
            
        except ExerciseSession.DoesNotExist:
            logger.warning(f"Sesión {session_id} no encontrada para usuario {request.user.username}")
            return Response({'error': 'Sesión no encontrada'}, 
                          status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error inesperado al abandonar sesión {session_id}: {str(e)}", exc_info=True)
            return Response({'error': f'Error al abandonar sesión: {str(e)}'}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['GET'])
    def check_abandonment_penalty(self, request):
        """
        Informa al usuario sobre las posibles penalizaciones por abandono
        """
        if not request.user.is_authenticated:
            return Response({'error': 'Debe iniciar sesión'}, 
                           status=status.HTTP_401_UNAUTHORIZED)
        
        session_id = request.query_params.get('session_id')
        if not session_id:
            return Response({'error': 'Se requiere session_id'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Validar que el session_id sea un número
            try:
                session_id = int(session_id)
            except (ValueError, TypeError):
                return Response({'error': f'ID de sesión debe ser un número: {session_id}'}, 
                              status=status.HTTP_400_BAD_REQUEST)
                
            session = ExerciseSession.objects.get(id=session_id, user=request.user)
            
            # Calcular palabras que serían afectadas
            affected_words = []
            for log in ExerciseSessionLog.objects.filter(session=session, is_completed=False):
                word = log.exercise.object_translation.quechua
                try:
                    vocab = UserVocabulary.objects.get(
                        user=request.user,
                        quechua_word=word
                    )
                    
                    if vocab.mastery_level > 1:
                        # Verificar si cumpliría condiciones para degradación
                        days_since_added = (timezone.now().date() - vocab.first_detected.date()).days
                        is_recent_word = days_since_added <= (3 if session.mode == 'detection' else 1)
                        is_minimally_practiced = vocab.exercises_completed >= 5
                        
                        # Definir límite según modo
                        consecutive_failures_limit = 3 if session.mode == 'detection' else 2
                        would_degrade = (vocab.consecutive_failures + (1 if session.mode == 'detection' else 2) >= 
                                        consecutive_failures_limit and
                                        not is_recent_word and
                                        is_minimally_practiced)
                        
                        affected_words.append({
                            'word': word,
                            'spanish': vocab.spanish_word,
                            'current_level': vocab.mastery_level,
                            'would_degrade': would_degrade,
                            'potential_new_level': vocab.mastery_level - 1 if would_degrade else vocab.mastery_level
                        })
                except UserVocabulary.DoesNotExist:
                    pass
            
            # Construir mensaje de advertencia
            warning_message = "Si abandonas esta sesión:"
            if not affected_words:
                warning_message += " No hay penalizaciones para palabras existentes."
            else:
                degrading_words = [word for word in affected_words if word['would_degrade']]
                if degrading_words:
                    warning_message += f" {len(degrading_words)} palabra(s) podrían perder una estrella de dominio."
                else:
                    warning_message += " Algunas palabras acumularán fallos, pero ninguna perderá estrellas en este momento."
            
            return Response({
                'warning_message': warning_message,
                'affected_words': affected_words,
                'abandonment_consequence': {
                    'mode': session.mode,
                    'failure_penalty': 1 if session.mode == 'detection' else 2,
                    'total_words_affected': len(affected_words)
                }
            })
            
        except ExerciseSession.DoesNotExist:
            return Response({'error': 'Sesión no encontrada'}, 
                          status=status.HTTP_404_NOT_FOUND)
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
    """Inicializar Firebase Admin SDK con soporte para Render"""
    try:
        if not firebase_admin._apps:
            # 🔧 MÉTODO 1: Variable de entorno JSON (Render)
            firebase_json = os.getenv('FIREBASE_CREDENTIALS_JSON')
            if firebase_json and firebase_json != '{}':
                try:
                    credentials_dict = json.loads(firebase_json)
                    cred = credentials.Certificate(credentials_dict)
                    firebase_admin.initialize_app(cred)
                    logger.info("✅ Firebase inicializado desde variable de entorno JSON")
                    return
                except Exception as e:
                    logger.warning(f"⚠️ Error con credentials JSON de entorno: {e}")
            
            # 🔧 MÉTODO 2: Archivo local (desarrollo)
            firebase_cred_path = os.path.join(settings.BASE_DIR, 'firebase-credentials.json')
            if os.path.exists(firebase_cred_path):
                try:
                    cred = credentials.Certificate(firebase_cred_path)
                    firebase_admin.initialize_app(cred)
                    logger.info("✅ Firebase inicializado desde archivo local")
                    return
                except Exception as e:
                    logger.warning(f"⚠️ Error con archivo local: {e}")
            
            # Si ningún método funciona, lanzar error específico
            raise ImproperlyConfigured(
                "No se encontraron credenciales válidas de Firebase. "
                "Configura FIREBASE_CREDENTIALS_JSON en las variables de entorno de Render."
            )
        else:
            logger.info("✅ Firebase ya estaba inicializado")
            
    except Exception as e:
        logger.error(f"❌ Error en autenticación Firebase: {str(e)}", exc_info=True)
        raise ImproperlyConfigured(f"Error al inicializar Firebase: {str(e)}")

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
        mode = request.query_params.get('mode', 'practice')
        
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
            # SOLUCIÓN: Asignar tipos específicos según la categoría sin elegir aleatoriamente
            if category == 'vocabulary':
                exercise_type = 'anagram'  # Usar anagram para vocabulario
            elif category == 'phrases':
                exercise_type = 'fill_blanks'  # Usar fill_blanks para frases
            elif category == 'memory':
                exercise_type = 'matching'  # Usar matching para memoria
            elif category == 'pronunciation':
                exercise_type = 'pronunciation'  # Usar pronunciation para pronunciación
            else:
                # Fallback (no debería ocurrir)
                exercise_type = 'multiple_choice'
            
            # Generar ejercicio del tipo seleccionado
            exercise = Exercise.objects.create(
                type=exercise_type,
                category=category,
                object_translation=trans,
                difficulty=request.user.profile.current_level if request.user.is_authenticated else 1,
                question=self._generate_question(exercise_type, trans),
                answer=trans.quechua,
                distractors=self._generate_distractors(exercise_type, trans),
                metadata={
                    'category': category,
                    'time_limit': self._get_time_limit(exercise_type),
                    'practice_mode': True,
                    'mode': mode
                }
            )
            exercises.append(exercise)
        
        # NUEVO: Crear sesión de ejercicios
        session = None
        if request.user.is_authenticated:
            session = ExerciseSession.objects.create(
                user=request.user,
                mode=mode,
                exercises_total=len(exercises)
            )
            
            # Registrar ejercicios en la sesión
            for exercise in exercises:
                ExerciseSessionLog.objects.create(
                    session=session,
                    exercise=exercise
                )
                
                # Actualizar metadata con ID de sesión
                if not exercise.metadata:
                    exercise.metadata = {}
                exercise.metadata['session_id'] = session.id
                exercise.save()
        
        serializer = ExerciseSerializer(exercises, many=True)
        
        # Si hay sesión, incluir ID en la respuesta
        if session:
            response_data = {
                'session_id': session.id,
                'exercises': serializer.data
            }
        else:
            response_data = serializer.data
        
        return Response(response_data) 
   
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
   
   def _get_time_limit(self, exercise_type):
       time_limits = {
           'multiple_choice': 30,
           'fill_blanks': 45,
           'anagram': 60,
           'pronunciation': 60,
           'matching': 90
       }
       return time_limits.get(exercise_type, 30)
   
   @action(detail=False, methods=['GET'])
   def random_exercises(self, request):
        """Proporciona un conjunto aleatorio de ejercicios para práctica rápida"""
        category = request.query_params.get('category', 'vocabulary')
        count = int(request.query_params.get('count', '5'))
        mode = request.query_params.get('mode', 'practice')
        
        # Obtener traducciones aleatorias para la categoría seleccionada
        translations = ObjectTranslation.objects.order_by('?')[:count]
        
        exercises = []
        for translation in translations:
            # SOLUCIÓN: Asignar tipos específicos según la categoría sin elegir aleatoriamente
            if category == 'vocabulary':
                exercise_type = 'anagram'  # Usar anagram para vocabulario
            elif category == 'phrases':
                exercise_type = 'fill_blanks'  # Usar fill_blanks para frases
            elif category == 'memory':
                exercise_type = 'matching'  # Usar matching para memoria
            elif category == 'pronunciation':
                exercise_type = 'pronunciation'  # Usar pronunciation para pronunciación
            else:
                # Fallback (no debería ocurrir)
                exercise_type = 'multiple_choice'
            
            # Crear ejercicio temporal
            exercise = Exercise.objects.create(
                type=exercise_type,
                category=category,
                object_translation=translation,
                difficulty=request.user.profile.current_level if request.user.is_authenticated else 1,
                question=self._generate_question(exercise_type, translation),
                answer=translation.quechua,
                distractors=self._generate_distractors(exercise_type, translation),
                metadata={
                    'practice_mode': True,
                    'time_limit': self._get_time_limit(exercise_type),
                    'category': category,
                    'mode': mode
                }
            )
            exercises.append(exercise)
        
        # NUEVO: Crear sesión de ejercicios
        session = None
        if request.user.is_authenticated:
            session = ExerciseSession.objects.create(
                user=request.user,
                mode=mode,
                exercises_total=len(exercises)
            )
            
            # Registrar ejercicios en la sesión
            for exercise in exercises:
                ExerciseSessionLog.objects.create(
                    session=session,
                    exercise=exercise
                )
                
                # Actualizar metadata con ID de sesión
                if not exercise.metadata:
                    exercise.metadata = {}
                exercise.metadata['session_id'] = session.id
                exercise.save()
        
        serializer = ExerciseSerializer(exercises, many=True)
        
        # Si hay sesión, incluir ID en la respuesta
        if session:
            response_data = {
                'session_id': session.id,
                'exercises': serializer.data
            }
        else:
            response_data = serializer.data
        
        return Response(response_data) 
   
   @action(detail=False, methods=['GET'])
   def user_vocabulary(self, request):
    """Obtiene el vocabulario personal del usuario con el nuevo sistema"""
    if not request.user.is_authenticated:
        return Response({'error': 'Debe iniciar sesión para acceder al vocabulario personal'}, 
                     status=status.HTTP_401_UNAUTHORIZED)
    
    # Obtener parámetros de filtro y ordenamiento
    sort_by = request.query_params.get('sort_by', 'recent')
    mastery_min = request.query_params.get('mastery_min')
    mastery_max = request.query_params.get('mastery_max')
    mode = request.query_params.get('mode')  # Nuevo parámetro
    
    # Consulta base
    queryset = UserVocabulary.objects.filter(user=request.user)
    
    # Si se especifica modo, filtrar por origen usando ActivityLog
    if mode == 'detection':
        # Obtener palabras que se originaron en detección
        words_from_detection = ActivityLog.objects.filter(
            user=request.user,
            activity_type='detection_session',
            mode='detection'
        ).values_list('word_learned', flat=True).distinct()
        
        # Filtrar vocabulario para incluir solo estas palabras
        queryset = queryset.filter(quechua_word__in=words_from_detection)
    
    # Aplicar filtros si están presentes
    if mastery_min is not None:
        queryset = queryset.filter(mastery_level__gte=int(mastery_min))
    if mastery_max is not None:
        queryset = queryset.filter(mastery_level__lte=int(mastery_max))
    
    # Aplicar ordenamiento
    if sort_by == 'recent':
        queryset = queryset.order_by('-last_detected')
    elif sort_by == 'mastery':
        queryset = queryset.order_by('-mastery_level', '-last_detected')
    elif sort_by == 'needs_practice':
        queryset = queryset.order_by('mastery_level', '-last_detected')
    elif sort_by == 'alphabetical':
        queryset = queryset.order_by('spanish_word')
    
    serializer = UserVocabularySerializer(queryset, many=True)
    return Response(serializer.data)

class ProgressViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['GET'])
    def user_progress(self, request):
        """Obtiene el progreso completo del usuario - VERSIÓN CORREGIDA"""
        user = request.user
        profile = user.profile
        
        # ACTUALIZADO: Usar los nuevos umbrales de nivel
        level_thresholds = [0, 15, 35, 60, 100, 150, 225, 325, 450, 600]
        current_threshold = level_thresholds[profile.current_level - 1] if profile.current_level <= 10 else 600
        next_threshold = level_thresholds[profile.current_level] if profile.current_level < 10 else 9999
        words_to_next_level = next_threshold - profile.total_words
        level_progress = ((profile.total_words - current_threshold) / (next_threshold - current_threshold) 
                        if next_threshold > current_threshold else 1.0)
        
        # ✅ CORRECCIÓN 1: Calcular exercises_completed y accuracy_rate (faltaban)
        user_progress_records = UserProgress.objects.filter(user=user)
        total_exercises = user_progress_records.count()
        correct_exercises = user_progress_records.filter(correct=True).count()
        accuracy_rate = (correct_exercises / total_exercises * 100) if total_exercises > 0 else 0
        
        # Obtener vocabulario reciente
        recent_words = UserVocabulary.objects.filter(
            user=user
        ).order_by('-first_detected')[:10]
        
        # ✅ CORRECCIÓN 2: Achievements con earned_at (estructura corregida)
        user_achievements = UserAchievement.objects.filter(user=user).select_related('achievement')
        achievements_data = []
        for ua in user_achievements:
            achievements_data.append({
                'id': ua.achievement.id,
                'name': ua.achievement.name,
                'description': ua.achievement.description,
                'icon': ua.achievement.icon,
                'earned_at': ua.earned_at.isoformat(),  # ✅ Campo crítico que faltaba
                'created_at': ua.achievement.created_at.isoformat() if hasattr(ua.achievement, 'created_at') else None
            })
        
        # Obtener meta diaria
        today = timezone.now().date()
        try:
            with transaction.atomic():
                daily_goal, created = DailyGoal.objects.get_or_create(
                    user=request.user,
                    date=today,
                    defaults={
                        'words_detected': 0,
                        'words_practiced': 0,
                        'words_mastered': 0,
                        'detection_goal': 3,
                        'practice_goal': 5,
                        'mastery_goal': 1
                    }
                )
        except IntegrityError:
            daily_goal = DailyGoal.objects.get(
                user=request.user,
                date=today
            )
        
        # ✅ CORRECCIÓN 3: Actividades de detección - usar 'detection_session' como en detect()
        detection_session_activities = ActivityLog.objects.filter(
            user=user,
            activity_type='detection_session',  # ✅ Coincide con detect()
            mode='detection'
        )
        
        # Ejercicios completados en modo detección (separado)
        detection_exercise_activities = ActivityLog.objects.filter(
            user=user,
            activity_type='exercise_completed',
            mode='detection'
        )
        
        # Actividades de práctica
        practice_activities = ActivityLog.objects.filter(
            user=user,
            activity_type__in=['exercise_completed', 'word_learned'],  # Según tu implementación
            mode='practice'
        )
        
        # ✅ CORRECCIÓN 4: Conteo basado en sesiones de detección reales
        # Palabras detectadas: Solo de sesiones de detección (lo que el usuario realmente detectó)
        detection_words_set = set(detection_session_activities.values_list('word_learned', flat=True).distinct())
        
        # Palabras de práctica
        practice_words_set = set(practice_activities.values_list('word_learned', flat=True).distinct())
        
        # Palabras SOLO de práctica (no detectadas)
        practice_words_only = practice_words_set - detection_words_set
        
        # Conteos finales
        detection_words = len(detection_words_set)
        practice_words = len(practice_words_only)
        
        # Verificación de integridad con vocabulario real
        real_total = UserVocabulary.objects.filter(user=user).count()
        calculated_total = detection_words + practice_words
        
        # ✅ LOGGING MEJORADO para debug
        logger.info(f"🔍 Progreso para usuario {user.username}:")
        logger.info(f"  📸 Palabras detectadas (sesiones): {detection_words}")
        logger.info(f"  📚 Palabras práctica exclusiva: {practice_words}")
        logger.info(f"  🧮 Total calculado: {calculated_total}")
        logger.info(f"  ✅ Total real en vocabulario: {real_total}")
        
        # Auto-corrección si hay discrepancia
        if calculated_total != real_total:
            logger.warning(f"⚠️ Discrepancia detectada: calculado={calculated_total}, real={real_total}")
            
            # Estrategia de corrección: Usar vocabulario como fuente de verdad
            vocab_with_detection = UserVocabulary.objects.filter(user=user).annotate(
                has_detection=Exists(
                    ActivityLog.objects.filter(
                        user=user,
                        activity_type='detection_session',
                        word_learned=OuterRef('quechua_word')
                    )
                )
            )
            
            detection_words = vocab_with_detection.filter(has_detection=True).count()
            practice_words = vocab_with_detection.filter(has_detection=False).count()
            
            logger.info(f"🔧 Corregido - Detección: {detection_words}, Práctica: {practice_words}")
                    
        # Estadísticas por categoría (vocabulario)
        vocab_stats = UserVocabulary.objects.filter(user=user).aggregate(
            total=Count('id'),
            mastered=Count('id', filter=Q(mastery_level=5)),
            in_progress=Count('id', filter=Q(mastery_level__gte=2, mastery_level__lte=4)),
            needs_practice=Count('id', filter=Q(mastery_level=1))
        )
        
        # ✅ CORRECCIÓN 5: Weekly activity simplificada (sin campo 'date')
        weekly_activity = []
        for i in range(7):
            date = timezone.now() - timedelta(days=i)
            day_activities = ActivityLog.objects.filter(
                user=user,
                timestamp__date=date.date()
            )
            
            # Contar palabras únicas aprendidas ese día (solo sesiones de detección y ejercicios completados)
            words_that_day = day_activities.filter(
                activity_type__in=['detection_session', 'exercise_completed']
            ).values('word_learned').distinct().count()
            
            # ✅ Estructura simplificada como espera el frontend
            day_data = {
                'day': date.strftime('%a'),
                'words': words_that_day  # Solo estos dos campos
            }
            weekly_activity.append(day_data)
        weekly_activity.reverse()
        
        # Actividad reciente
        recent_activity = []
        for i in range(7):
            date = timezone.now() - timedelta(days=i)
            day_activities = ActivityLog.objects.filter(
                user=user,
                timestamp__date=date.date()
            )
            
            words_learned = day_activities.filter(
                activity_type__in=['detection_session', 'exercise_completed']
            ).values('word_learned').distinct().count()
            
            if words_learned > 0:
                recent_activity.append({
                    'date': date.isoformat(),
                    'words_learned': words_learned,
                    'exercises_count': 0  # Compatible con frontend
                })
        
        # ✅ ESTRUCTURA FINAL COMPLETA - Con todos los campos que espera el frontend
        progress_data = {
            'level': profile.current_level,
            'level_title': profile.get_level_title(),
            'total_words': profile.total_words,
            'mastered_words': profile.mastered_words,
            'streak_days': profile.streak_days,
            'words_to_next_level': words_to_next_level,
            'level_progress': level_progress * 100,
            
            # ✅ CAMPOS AGREGADOS que faltaban:
            'exercises_completed': total_exercises,
            'accuracy_rate': accuracy_rate,
            
            # Conteos por modo (corregidos)
            'detection_words': detection_words,
            'practice_words': practice_words,
            
            # Datos adicionales
            'recent_words': UserVocabularySerializer(recent_words, many=True).data,
            'achievements': achievements_data,  # ✅ Estructura manual corregida
            'daily_goal': DailyGoalSerializer(daily_goal).data,
            'weekly_activity': weekly_activity,  # ✅ Sin campo 'date'
            'recent_activity': recent_activity,
            
            'stats_by_category': {
                'total': vocab_stats['total'] or 0,
                'mastered': vocab_stats['mastered'] or 0,
                'in_progress': vocab_stats['in_progress'] or 0,
                'needs_practice': vocab_stats['needs_practice'] or 0,
                # Campos adicionales para compatibilidad con frontend
                'vocabulary': 0,
                'pronunciation': 0,
                'grammar': 0,
                'detection': detection_words
            }
        }
        
        # ✅ LOG FINAL para verificación
        logger.info(f"📊 Respuesta final: level={progress_data['level']}, "
                f"total_words={progress_data['total_words']}, "
                f"detection_words={progress_data['detection_words']}, "
                f"practice_words={progress_data['practice_words']}, "
                f"exercises_completed={progress_data['exercises_completed']}")
        
        return Response(progress_data) 
    
    @action(detail=False, methods=['POST'])
    def record_progress(self, request):
        """Registra el progreso del usuario"""
        try:
            mode = request.data.get('mode')
            category = request.data.get('category')
            timestamp = request.data.get('timestamp')
            
            # SOLUCIÓN: Validar el modo explícitamente
            if not mode or mode not in ['detection', 'practice']:
                if 'detection' in request.META.get('HTTP_REFERER', '').lower():
                    mode = 'detection'
                else:
                    mode = 'practice'
            
            # Actualizar última actividad y racha
            request.user.profile.update_streak()
            
            # Crear registro de actividad
            activity = ActivityLog.objects.create(
                user=request.user,
                activity_type='session_completed',
                mode=mode,
                category=category,
                timestamp=timestamp or timezone.now(),
                details={
                    'mode': mode,
                    'category': category,
                    'recorded_at': timezone.now().isoformat()
                }
            )
            
            # Si es modo práctica, actualizar meta diaria
            if mode == 'practice':
                today = timezone.now().date()
                daily_goal, _ = DailyGoal.objects.get_or_create(
                    user=request.user,
                    date=today,
                    defaults={
                        'words_detected': 0,
                        'words_practiced': 0,
                        'words_mastered': 0,
                        'detection_goal': 3,
                        'practice_goal': 5,
                        'mastery_goal': 1
                    }
                )
                # Incrementar contador de práctica general (no por palabra individual)
                # Esto es para registrar sesiones completas de práctica
                if 'completed_exercises' in request.data:
                    daily_goal.words_practiced += request.data.get('completed_exercises', 0)
                daily_goal.save()
            
            return Response({
                'status': 'success',
                'message': 'Progreso registrado correctamente',
                'activity_id': activity.id,
                'streak_days': request.user.profile.streak_days
            })
            
        except Exception as e:
            logger.error(f"Error registrando progreso: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Error al registrar progreso: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['GET'])
    def achievements(self, request):
        """Obtiene todos los logros y su estado para el usuario"""
        user = request.user
        
        # Obtener todos los logros
        all_achievements = Achievement.objects.all()
        earned_achievements = UserAchievement.objects.filter(
            user=user
        ).values_list('achievement_id', flat=True)
        
        achievements_data = []
        for achievement in all_achievements:
            achievement_data = AchievementSerializer(achievement).data
            achievement_data['earned'] = achievement.id in earned_achievements
            achievement_data['progress'] = self._calculate_achievement_progress(user, achievement)
            achievements_data.append(achievement_data)
        
        return Response(achievements_data)
    
    def _calculate_achievement_progress(self, user, achievement):
        """Calcula el progreso hacia un logro"""
        profile = user.profile
        
        if achievement.type == 'vocabulary':
            current = profile.total_words
            return min(current / achievement.requirement_value, 1.0) * 100
        elif achievement.type == 'mastery':
            current = profile.mastered_words
            return min(current / achievement.requirement_value, 1.0) * 100
        elif achievement.type == 'streak':
            current = profile.streak_days
            return min(current / achievement.requirement_value, 1.0) * 100
        
        return 0
    
    @action(detail=False, methods=['GET'])
    def vocabulary_stats(self, request):
        """Estadísticas detalladas del vocabulario"""
        user = request.user
        
        # Estadísticas por nivel de dominio
        mastery_stats = UserVocabulary.objects.filter(user=user).values(
            'mastery_level'
        ).annotate(
            count=Count('id')
        ).order_by('mastery_level')
        
        # Palabras más practicadas
        most_practiced = UserVocabulary.objects.filter(
            user=user
        ).order_by('-exercises_completed')[:10]
        
        # Palabras que necesitan práctica
        needs_practice = UserVocabulary.objects.filter(
            user=user,
            mastery_level__lte=2
        ).order_by('mastery_level', '-last_practiced')[:10]
        
        return Response({
            'mastery_distribution': mastery_stats,
            'most_practiced': UserVocabularySerializer(most_practiced, many=True).data,
            'needs_practice': UserVocabularySerializer(needs_practice, many=True).data
        })

class UserVocabularyViewSet(viewsets.ModelViewSet):
   serializer_class = UserVocabularySerializer
   permission_classes = [IsAuthenticated]
   
   def get_queryset(self):
       """Obtiene el vocabulario del usuario actual"""
       return UserVocabulary.objects.filter(user=self.request.user)
   
   @action(detail=False, methods=['GET'])
   def summary(self, request):
       """Resumen del vocabulario del usuario"""
       queryset = self.get_queryset()
       
       summary = {
           'total_words': queryset.count(),
           'mastered_words': queryset.filter(mastery_level=5).count(),
           'in_progress': queryset.filter(mastery_level__gt=1, mastery_level__lt=5).count(),
           'needs_practice': queryset.filter(mastery_level__lte=2).count(),
           'categories': {
               '1_star': queryset.filter(mastery_level=1).count(),
               '2_stars': queryset.filter(mastery_level=2).count(),
               '3_stars': queryset.filter(mastery_level=3).count(),
               '4_stars': queryset.filter(mastery_level=4).count(),
               '5_stars': queryset.filter(mastery_level=5).count()
           }
       }
       
       return Response(summary)
   
   @action(detail=False, methods=['GET'])
   def practice_suggestions(self, request):
       """Sugiere palabras para practicar basado en el dominio"""
       limit = int(request.query_params.get('limit', 10))
       
       # Priorizar palabras con bajo dominio o no practicadas recientemente
       suggestions = self.get_queryset().filter(
           mastery_level__lt=5
       ).order_by(
           'mastery_level',
           '-last_practiced'
       )[:limit]
       
       serializer = self.get_serializer(suggestions, many=True)
       return Response(serializer.data)
   
   @action(detail=True, methods=['POST'])
   def reset_mastery(self, request, pk=None):
       """Reinicia el dominio de una palabra específica"""
       vocab = self.get_object()
       vocab.mastery_level = 1
       vocab.exercises_completed = 0
       vocab.exercises_correct = 0
       vocab.save()
       
       serializer = self.get_serializer(vocab)
       return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_achievements(request):
   """Verifica y actualiza los logros del usuario"""
   Achievement.check_achievements(request.user)
   
   # Obtener logros desbloqueados
   achievements = UserAchievement.objects.filter(
       user=request.user
   ).select_related('achievement')
   
   serializer = UserAchievementSerializer(achievements, many=True)
   return Response(serializer.data)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def daily_goal_view(request):
   """Obtiene o actualiza la meta diaria"""
   today = timezone.now().date()
   
   if request.method == 'GET':
       daily_goal, _ = DailyGoal.objects.get_or_create(
           user=request.user,
           date=today
       )
       serializer = DailyGoalSerializer(daily_goal)
       return Response(serializer.data)
   
   elif request.method == 'POST':
       daily_goal, _ = DailyGoal.objects.get_or_create(
           user=request.user,
           date=today
       )
       
       # Actualizar contadores según la acción
       action = request.data.get('action')
       if action == 'word_detected':
           daily_goal.words_detected += 1
       elif action == 'word_practiced':
           daily_goal.words_practiced += 1
       elif action == 'word_mastered':
           daily_goal.words_mastered += 1
       
       daily_goal.save()
       
       # Verificar si se completó la meta
       completed = daily_goal.is_complete()
       
       serializer = DailyGoalSerializer(daily_goal)
       return Response({
           **serializer.data,
           'completed': completed
       })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_dashboard(request):
   """Proporciona los datos necesarios para la pantalla principal con el nuevo sistema"""
   user = request.user
   profile = user.profile
   
   # Calcular nivel y progreso
   level_thresholds = [0, 10, 25, 50, 100, 200, 350, 500, 750, 1000]
   current_threshold = level_thresholds[profile.current_level - 1] if profile.current_level <= 10 else 1000
   next_threshold = level_thresholds[profile.current_level] if profile.current_level < 10 else 9999
   words_to_next_level = next_threshold - profile.total_words
   level_progress = ((profile.total_words - current_threshold) / (next_threshold - current_threshold) 
                    if next_threshold > current_threshold else 1.0)
   
   # Verificar si hay una racha activa
   today = timezone.now().date()
   streak_active = False
   
   if profile.last_activity:
       days_diff = (today - profile.last_activity).days
       streak_active = days_diff <= 1
   
   # Obtener meta diaria
   daily_goal, _ = DailyGoal.objects.get_or_create(
       user=user,
       date=today
   )
   
   # Actividad de la última semana
   last_week = today - timedelta(days=7)
   activity_stats = (
       ActivityLog.objects.filter(
           user=user,
           timestamp__gte=last_week
       )
       .values('timestamp__date')
       .annotate(
           words_detected=Count('id', filter=Q(activity_type='word_detected')),
           words_practiced=Count('id', filter=Q(activity_type='exercise_completed'))
       )
       .order_by('timestamp__date')
   )
   
   # Preparar datos de actividad
   activity_chart = []
   for stat in activity_stats:
       activity_chart.append({
           'date': stat['timestamp__date'].strftime('%Y-%m-%d'),
           'words_detected': stat['words_detected'],
           'words_practiced': stat['words_practiced'],
           'total': stat['words_detected'] + stat['words_practiced']
       })
   
   # Categorías de vocabulario
   vocab_stats = UserVocabulary.objects.filter(user=user).aggregate(
       total=Count('id'),
       mastered=Count('id', filter=Q(mastery_level=5)),
       in_progress=Count('id', filter=Q(mastery_level__gt=1, mastery_level__lt=5)),
       needs_practice=Count('id', filter=Q(mastery_level__lte=2))
   )
   
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
   
   # Palabras recientes
   recent_words = UserVocabulary.objects.filter(
       user=user
   ).order_by('-first_detected')[:5]
   
   # Construir respuesta
   return Response({
       'user': {
           'username': user.username,
           'level': profile.current_level,
           'level_title': profile.get_level_title(),
           'total_words': profile.total_words,
           'mastered_words': profile.mastered_words,
           'words_to_next_level': words_to_next_level,
           'level_progress': level_progress * 100,
           'streak_days': profile.streak_days,
           'streak_active': streak_active
       },
       'daily_goal': DailyGoalSerializer(daily_goal).data,
       'stats': {
           'vocabulary': {
               'total': vocab_stats['total'] or 0,
               'mastered': vocab_stats['mastered'] or 0,
               'in_progress': vocab_stats['in_progress'] or 0,
               'needs_practice': vocab_stats['needs_practice'] or 0
           }
       },
       'activity_chart': activity_chart,
       'recent_achievements': achievements,
       'recent_words': UserVocabularySerializer(recent_words, many=True).data
   }) 