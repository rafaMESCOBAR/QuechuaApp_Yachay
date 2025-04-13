#backend/translations/serializers.py

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    ObjectTranslation, UserProfile, Exercise, UserProgress,
    Achievement, UserAchievement, ActivityLog, PronunciationRecord
)

# Serializer existente
class ObjectTranslationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ObjectTranslation
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')

# Nuevos serializers
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name')
        read_only_fields = ('id',)

class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = UserProfile
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'experience_points', 'level', 'streak_days')

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