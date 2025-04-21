from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count
from django.utils import timezone
import json

from .models import (
    ObjectTranslation, UserProfile, Exercise, UserProgress,
    Achievement, UserAchievement, ActivityLog, PronunciationRecord
)

# Admin para ObjectTranslation
@admin.register(ObjectTranslation)
class ObjectTranslationAdmin(admin.ModelAdmin):
    list_display = ('english_label', 'spanish', 'quechua', 'exercises_count', 'created_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('english_label', 'spanish', 'quechua')
    ordering = ('english_label',)
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Información Principal', {
            'fields': ('english_label', 'spanish', 'quechua')
        }),
        ('Metadatos', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.annotate(exercise_count=Count('exercise'))
        return queryset
    
    def exercises_count(self, obj):
        return obj.exercise_count
    exercises_count.short_description = 'Ejercicios'
    exercises_count.admin_order_field = 'exercise_count'

# Admin para UserProfile
@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('username', 'level', 'experience_points', 'streak_days', 'native_speaker', 'last_activity')
    list_filter = ('level', 'native_speaker', 'last_activity')
    search_fields = ('user__username', 'user__email')
    ordering = ('-level', '-experience_points')
    
    fieldsets = (
        ('Información de Usuario', {
            'fields': ('user', 'profile_image_preview')
        }),
        ('Nivel y Experiencia', {
            'fields': ('level', 'experience_points', 'streak_days', 'last_activity')
        }),
        ('Información de Idioma', {
            'fields': ('native_speaker', 'preferred_dialect')
        }),
    )
    
    readonly_fields = ('profile_image_preview',)
    
    def username(self, obj):
        return obj.user.username
    username.short_description = 'Usuario'
    
    def profile_image_preview(self, obj):
        if obj.profile_image:
            return format_html('<img src="{}" width="150" height="150" style="border-radius: 50%;" />', obj.profile_image.url)
        return "Sin imagen de perfil"
    profile_image_preview.short_description = 'Vista previa de imagen'
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.select_related('user')
        return queryset

# Admin para Exercise
@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ('id', 'type', 'object_name', 'difficulty', 'points', 'created_at')
    list_filter = ('type', 'difficulty', 'created_at')
    search_fields = ('question', 'object_translation__spanish', 'object_translation__quechua')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('type', 'object_translation', 'difficulty', 'points')
        }),
        ('Contenido del Ejercicio', {
            'fields': ('question', 'answer', 'distractors_formatted')
        }),
        ('Metadatos', {
            'fields': ('metadata_formatted', 'created_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'distractors_formatted', 'metadata_formatted')
    
    def object_name(self, obj):
        return f"{obj.object_translation.spanish} ({obj.object_translation.quechua})"
    object_name.short_description = 'Objeto'
    
    def distractors_formatted(self, obj):
        if obj.distractors:
            return format_html('<pre>{}</pre>', json.dumps(obj.distractors, indent=4))
        return "Sin distractores"
    distractors_formatted.short_description = 'Distractores'
    
    def metadata_formatted(self, obj):
        if obj.metadata:
            return format_html('<pre>{}</pre>', json.dumps(obj.metadata, indent=4))
        return "Sin metadatos"
    metadata_formatted.short_description = 'Metadatos'

# Admin para UserProgress
@admin.register(UserProgress)
class UserProgressAdmin(admin.ModelAdmin):
    list_display = ('user', 'exercise_type', 'completed', 'correct', 'attempts', 'last_attempt')
    list_filter = ('completed', 'correct', 'exercise__type', 'last_attempt')
    search_fields = ('user__username', 'exercise__question')
    ordering = ('-last_attempt',)
    
    def exercise_type(self, obj):
        return obj.exercise.get_type_display()
    exercise_type.short_description = 'Tipo de Ejercicio'
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.select_related('user', 'exercise')
        return queryset

# Admin para Achievement
@admin.register(Achievement)
class AchievementAdmin(admin.ModelAdmin):
    list_display = ('name', 'achievement_type', 'required_value', 'earned_count')
    list_filter = ('achievement_type',)
    search_fields = ('name', 'description')
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.annotate(earned_count=Count('userachievement'))
        return queryset
    
    def earned_count(self, obj):
        return obj.earned_count
    earned_count.short_description = 'Usuarios que lo han ganado'
    earned_count.admin_order_field = 'earned_count'

# Admin para UserAchievement
@admin.register(UserAchievement)
class UserAchievementAdmin(admin.ModelAdmin):
    list_display = ('user', 'achievement_name', 'earned_at')
    list_filter = ('earned_at', 'achievement__achievement_type')
    search_fields = ('user__username', 'achievement__name')
    ordering = ('-earned_at',)
    
    def achievement_name(self, obj):
        return obj.achievement.name
    achievement_name.short_description = 'Logro'
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.select_related('user', 'achievement')
        return queryset

# Admin para ActivityLog
@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'activity_type', 'points', 'timestamp')
    list_filter = ('activity_type', 'timestamp')
    search_fields = ('user__username', 'activity_type')
    ordering = ('-timestamp',)
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.select_related('user')
        return queryset

# Admin para PronunciationRecord
@admin.register(PronunciationRecord)
class PronunciationRecordAdmin(admin.ModelAdmin):
    list_display = ('user', 'object_name', 'is_approved', 'approved_by', 'created_at')
    list_filter = ('is_approved', 'created_at')
    search_fields = ('user__username', 'object_translation__spanish', 'object_translation__quechua')
    ordering = ('-created_at',)
    
    actions = ['approve_records', 'reject_records']
    
    def object_name(self, obj):
        return f"{obj.object_translation.spanish} ({obj.object_translation.quechua})"
    object_name.short_description = 'Objeto'
    
    def approve_records(self, request, queryset):
        updated = queryset.update(is_approved=True, approved_by=request.user, approval_date=timezone.now())
        self.message_user(request, f'{updated} grabaciones fueron aprobadas correctamente.')
    approve_records.short_description = "Aprobar grabaciones seleccionadas"
    
    def reject_records(self, request, queryset):
        updated = queryset.update(is_approved=False, approved_by=request.user, approval_date=timezone.now())
        self.message_user(request, f'{updated} grabaciones fueron rechazadas correctamente.')
    reject_records.short_description = "Rechazar grabaciones seleccionadas"
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.select_related('user', 'object_translation', 'approved_by')
        return queryset