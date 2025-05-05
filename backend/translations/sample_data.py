# translations/sample_data.py
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
import random

from .models import (
    ObjectTranslation, UserProfile, Exercise, UserProgress,
    Achievement, UserAchievement, ActivityLog, PronunciationRecord,
    ProgressCategory, StreakReward, PracticeSession, AnalyticsEvent
)

def generate_sample_data():
    """Genera datos de muestra que se visualizarán correctamente en el panel de administración"""
    
    # Crear actividades recientes (para el timeline del dashboard)
    users = User.objects.all()
    activity_types = [
        'login', 'exercise_completed', 'achievement_unlocked', 
        'object_detected', 'pronunciation_recorded'
    ]
    
    # Solo crear si no existen suficientes
    if ActivityLog.objects.count() < 5 and users.exists():
        for i in range(5):
            user = random.choice(users)
            ActivityLog.objects.create(
                user=user,
                activity_type=random.choice(activity_types),
                mode=random.choice(['detection', 'practice']),
                category=random.choice(['vocabulary', 'pronunciation', 'grammar', None]),
                points=random.randint(5, 20),
                details={'sample': True},
                timestamp=timezone.now() - timedelta(minutes=i*30)
            )
    
    # Asignar algunos logros para probar la visualización
    achievements = Achievement.objects.all()
    if UserAchievement.objects.count() < 5 and achievements.exists() and users.exists():
        for i in range(min(5, len(achievements))):
            user = random.choice(users)
            UserAchievement.objects.get_or_create(
                user=user,
                achievement=achievements[i]
            )
    
    # Crear registros de pronunciación de muestra
    if PronunciationRecord.objects.count() < 3 and users.exists():
        translations = ObjectTranslation.objects.all()[:5]
        if translations.exists():
            for i in range(3):
                user = random.choice(users)
                translation = translations[i % len(translations)]
                # No podemos crear archivos reales, pero podemos crear registros
                record, created = PronunciationRecord.objects.get_or_create(
                    user=user,
                    object_translation=translation,
                    defaults={
                        'is_approved': None,  # Pendiente de revisar
                        'created_at': timezone.now() - timedelta(days=i)
                    }
                )
    
    # Crear progresos de usuario
    if UserProgress.objects.count() < 10 and users.exists():
        exercises = Exercise.objects.all()[:10]
        if exercises.exists():
            for user in users[:3]:  # Limitar a los primeros 3 usuarios
                for exercise in exercises[:5]:  # Limitar a los primeros 5 ejercicios
                    UserProgress.objects.get_or_create(
                        user=user,
                        exercise=exercise,
                        defaults={
                            'completed': random.choice([True, False]),
                            'attempts': random.randint(1, 5),
                            'correct': random.choice([True, False]),
                            'last_attempt': timezone.now() - timedelta(hours=random.randint(1, 48))
                        }
                    )
    
    # Crear recompensas por racha si no existen
    if StreakReward.objects.count() == 0:
        streak_rewards = [
            {'days': 3, 'name': 'Primeros Pasos', 'description': '¡Tres días seguidos!', 'points': 10},
            {'days': 7, 'name': 'Una Semana', 'description': '¡Has completado una semana!', 'points': 25},
            {'days': 30, 'name': 'Un Mes Dedicado', 'description': '¡Un mes completo de estudio!', 'points': 100},
        ]
        for reward in streak_rewards:
            StreakReward.objects.create(
                streak_days=reward['days'],
                reward_name=reward['name'],
                reward_description=reward['description'],
                bonus_points=reward['points']
            )
    
    # Crear categorías de progreso para usuarios
    if ProgressCategory.objects.count() < 5 and users.exists():
        categories = ['vocabulary', 'pronunciation', 'grammar', 'detection', 'phrases']
        for user in users[:3]:  # Limitar a los primeros 3 usuarios
            for category in categories:
                ProgressCategory.objects.get_or_create(
                    user=user,
                    category=category,
                    defaults={
                        'points': random.randint(10, 100),
                        'exercises_completed': random.randint(1, 20),
                        'accuracy_rate': random.uniform(0.5, 1.0),
                    }
                )
    
    # Crear sesiones de práctica
    if PracticeSession.objects.count() < 5 and users.exists():
        categories = ['vocabulary', 'pronunciation', 'grammar', 'phrases', 'memory']
        for i in range(5):
            user = random.choice(users)
            start_time = timezone.now() - timedelta(days=i, hours=random.randint(1, 5))
            end_time = start_time + timedelta(minutes=random.randint(10, 30))
            duration = int((end_time - start_time).total_seconds() // 60)
            
            PracticeSession.objects.create(
                user=user,
                category=random.choice(categories),
                start_time=start_time,
                end_time=end_time,
                duration_minutes=duration,
                exercises_completed=random.randint(5, 15),
                points_earned=random.randint(20, 100),
                accuracy_rate=random.uniform(0.6, 1.0)
            )
    
    # Crear eventos analíticos
    if AnalyticsEvent.objects.count() < 10 and users.exists():
        event_types = ['login', 'exercise_start', 'exercise_complete', 'view_translation', 'detect_object']
        for i in range(10):
            user = random.choice(users)
            AnalyticsEvent.objects.create(
                user=user,
                category=random.choice(['app_usage', 'learning', 'detection']),
                event_type=random.choice(event_types),
                duration=random.randint(10, 300),
                score=random.randint(0, 100),
                timestamp=timezone.now() - timedelta(hours=i*2)
            )
    
    print(f"Datos de muestra generados correctamente")
    print(f"Actividades: {ActivityLog.objects.count()}")
    print(f"Logros de usuario: {UserAchievement.objects.count()}")
    print(f"Registros de pronunciación: {PronunciationRecord.objects.count()}")
    print(f"Progresos de usuario: {UserProgress.objects.count()}")
    print(f"Categorías de progreso: {ProgressCategory.objects.count()}")
    print(f"Sesiones de práctica: {PracticeSession.objects.count()}")
    print(f"Eventos analíticos: {AnalyticsEvent.objects.count()}")