# translations/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    ObjectTranslation, UserProfile, Exercise, UserProgress,
    Achievement, UserAchievement, ActivityLog, PronunciationRecord,
    ProgressCategory, StreakReward, PracticeSession, AnalyticsEvent
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

# Actualizar UserProfileSerializer para incluir nuevos campos
class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = UserProfile
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'experience_points', 'level', 'streak_days', 'total_points', 'max_streak')

# Actualizar ExerciseSerializer para incluir categoría
class ExerciseSerializer(serializers.ModelSerializer):
    object_translation = ObjectTranslationSerializer(read_only=True)
    
    class Meta:
        model = Exercise
        fields = '__all__'
        read_only_fields = ('created_at',)

class UserProgressSerializer(serializers.ModelSerializer):
    exercise = ExerciseSerializer(read_only=True)
    
    class Meta:
        model = UserProgress
        fields = '__all__'
        read_only_fields = ('last_attempt',)

class AchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Achievement
        fields = '__all__'

class UserAchievementSerializer(serializers.ModelSerializer):
    achievement = AchievementSerializer(read_only=True)
    
    class Meta:
        model = UserAchievement
        fields = '__all__'
        read_only_fields = ('earned_at',)

# Actualizar ActivityLogSerializer para incluir modo y categoría
class ActivityLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLog
        fields = '__all__'
        read_only_fields = ('timestamp',)

class PronunciationRecordSerializer(serializers.ModelSerializer):
    object_translation = ObjectTranslationSerializer(read_only=True)
    
    class Meta:
        model = PronunciationRecord
        fields = '__all__'
        read_only_fields = ('created_at', 'approval_date')

# Nuevos serializers
class ProgressCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgressCategory
        fields = '__all__'
        read_only_fields = ('updated_at',)

class StreakRewardSerializer(serializers.ModelSerializer):
    class Meta:
        model = StreakReward
        fields = '__all__'

class PracticeSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PracticeSession
        fields = '__all__'
        read_only_fields = ('start_time', 'duration_minutes')

# NUEVO SERIALIZER PARA ANALYTICS
class AnalyticsEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalyticsEvent
        fields = ['category', 'event_type', 'duration', 'score', 'timestamp']