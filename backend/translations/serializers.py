#translations\serializers.py

from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils import timezone 
from .models import (
    ObjectTranslation, UserProfile, Exercise, UserProgress,
    Achievement, UserAchievement, ActivityLog, PronunciationRecord,
    UserVocabulary, DailyGoal
)

# Serializer existente
class ObjectTranslationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ObjectTranslation
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')

# Serializers existentes
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name')
        read_only_fields = ('id',)

# ACTUALIZADO - UserProfileSerializer para nuevo sistema
class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    level_title = serializers.CharField(source='get_level_title', read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'id', 'user', 'total_words', 'mastered_words', 
            'current_level', 'level_title', 'streak_days',
            'last_activity', 'native_speaker', 'preferred_dialect',
            'profile_image', 'created_at', 'updated_at'
        ]
        read_only_fields = ('created_at', 'updated_at', 'total_words', 'mastered_words', 'current_level')

# ACTUALIZADO - ExerciseSerializer sin puntos
class ExerciseSerializer(serializers.ModelSerializer):
    object_translation = ObjectTranslationSerializer(read_only=True)
    
    class Meta:
        model = Exercise
        fields = [
            'id', 'type', 'category', 'object_translation',
            'difficulty', 'question', 'answer', 'distractors',
            'metadata', 'created_at'
        ]
        read_only_fields = ('created_at',)

class UserProgressSerializer(serializers.ModelSerializer):
    exercise = ExerciseSerializer(read_only=True)
    
    class Meta:
        model = UserProgress
        fields = '__all__'
        read_only_fields = ('last_attempt',)

# ACTUALIZADO - AchievementSerializer simplificado
class AchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Achievement
        fields = ['id', 'name', 'description', 'type', 'requirement_value', 'icon']

class UserAchievementSerializer(serializers.ModelSerializer):
    achievement = AchievementSerializer(read_only=True)
    
    class Meta:
        model = UserAchievement
        fields = '__all__'
        read_only_fields = ('earned_at',)

# ACTUALIZADO - ActivityLogSerializer sin puntos
class ActivityLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLog
        fields = [
            'id', 'user', 'activity_type', 'mode', 'category',
            'word_learned', 'details', 'timestamp'
        ]
        read_only_fields = ('timestamp',)

class PronunciationRecordSerializer(serializers.ModelSerializer):
    object_translation = ObjectTranslationSerializer(read_only=True)
    
    class Meta:
        model = PronunciationRecord
        fields = '__all__'
        read_only_fields = ('created_at', 'approval_date')

# ACTUALIZADO - UserVocabularySerializer con estrellas
class UserVocabularySerializer(serializers.ModelSerializer):
    days_since_practice = serializers.SerializerMethodField()
    
    class Meta:
        model = UserVocabulary
        fields = [
            'id', 'object_label', 'spanish_word', 'quechua_word', 
            'mastery_level', 'exercises_completed', 'exercises_correct',
            'times_detected', 'first_detected', 'last_detected',
            'last_practiced', 'mastered_date', 'days_since_practice'
        ]
        read_only_fields = ('first_detected', 'last_detected', 'mastered_date')
    
    def get_days_since_practice(self, obj):
        if not obj.last_practiced:
            return None
        
        now = timezone.now()
        delta = now - obj.last_practiced
        return delta.days

# NUEVO - DailyGoalSerializer
class DailyGoalSerializer(serializers.ModelSerializer):
    is_complete = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = DailyGoal
        fields = [
            'id', 'date', 'words_detected', 'words_practiced', 'words_mastered',
            'detection_goal', 'practice_goal', 'mastery_goal', 'is_complete'
        ]
        read_only_fields = ('date', 'is_complete')

# ACTUALIZADO - UserProgressSummarySerializer
class UserProgressSummarySerializer(serializers.Serializer):
    """Serializer para el resumen de progreso del usuario"""
    current_level = serializers.IntegerField()
    level_title = serializers.CharField()
    total_words = serializers.IntegerField()
    mastered_words = serializers.IntegerField()
    streak_days = serializers.IntegerField()
    words_to_next_level = serializers.IntegerField()
    level_progress = serializers.FloatField()
    
    # Datos adicionales
    recent_words = UserVocabularySerializer(many=True, read_only=True)
    achievements = UserAchievementSerializer(many=True, read_only=True)
    daily_goal = DailyGoalSerializer(read_only=True)
    
    # Estadísticas por categoría (simplificado)
    stats_by_category = serializers.DictField(read_only=True)