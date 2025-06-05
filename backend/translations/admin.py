# translations/admin.py
from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count
from django.utils import timezone
import json

from .models import (
    ObjectTranslation, UserProfile, Exercise, UserProgress,
    Achievement, UserAchievement, ActivityLog, PronunciationRecord,
    UserVocabulary, DailyGoal
)

# Clase base para optimizaciones comunes
class BaseModelAdmin(admin.ModelAdmin):
    """Clase base con optimizaciones comunes para todos los admins"""
    
    def get_list_display(self, request):
        """Permite personalizar list_display en subclases"""
        return super().get_list_display(request)

# Admin para ObjectTranslation
@admin.register(ObjectTranslation)
class ObjectTranslationAdmin(BaseModelAdmin):
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
    
    def changelist_view(self, request, extra_context=None):
        if extra_context is None:
            extra_context = {}
        extra_context['title'] = "Traducciones"
        extra_context['subtitle'] = "Gestiona el vocabulario en español y quechua"
        return super().changelist_view(request, extra_context=extra_context)

# Admin para UserProfile - ACTUALIZADO
@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('username', 'current_level', 'level_title', 'total_words', 'mastered_words', 'streak_days', 'last_activity')
    list_filter = ('current_level', 'native_speaker', 'last_activity')
    search_fields = ('user__username', 'user__email')
    ordering = ('-total_words', '-mastered_words')
    
    fieldsets = (
        ('Información de Usuario', {
            'fields': ('user', 'profile_image_preview')
        }),
        ('Progreso de Aprendizaje', {
            'fields': ('current_level', 'level_title_display', 'total_words', 'mastered_words')
        }),
        ('Actividad', {
            'fields': ('streak_days', 'last_activity', 'study_time')
        }),
        ('Información de Idioma', {
            'fields': ('native_speaker', 'preferred_dialect')
        }),
    )
    
    readonly_fields = ('profile_image_preview', 'level_title_display',)
    
    def username(self, obj):
        return obj.user.username
    username.short_description = 'Usuario'
    
    def level_title(self, obj):
        return obj.get_level_title()
    level_title.short_description = 'Título'
    
    def level_title_display(self, obj):
        return obj.get_level_title()
    level_title_display.short_description = 'Título del nivel'
    
    def profile_image_preview(self, obj):
        if obj.profile_image:
            return format_html('<img src="{}" width="150" height="150" style="border-radius: 50%;" />', obj.profile_image.url)
        return "Sin imagen de perfil"
    profile_image_preview.short_description = 'Vista previa de imagen'
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.select_related('user')
        return queryset
    
    # Acciones para facilitar la gestión
    actions = ['initialize_profile', 'reset_streak']
    
    def initialize_profile(self, request, queryset):
        """Inicializa perfiles con datos básicos para probar"""
        updated = 0
        for profile in queryset:
            profile.current_level = 1
            profile.total_words = 5
            profile.mastered_words = 0
            profile.streak_days = 1
            profile.last_activity = timezone.now()
            profile.save()
            updated += 1
        
        self.message_user(
            request, 
            f'Se inicializaron {updated} perfiles con datos de prueba'
        )
    initialize_profile.short_description = "Inicializar perfiles seleccionados"
    
    def reset_streak(self, request, queryset):
        """Reinicia rachas de los perfiles seleccionados"""
        updated = queryset.update(streak_days=0, last_activity=None)
        self.message_user(request, f'{updated} perfiles tuvieron sus rachas reiniciadas.')
    reset_streak.short_description = "Reiniciar racha de los usuarios seleccionados"
    
    def changelist_view(self, request, extra_context=None):
        if extra_context is None:
            extra_context = {}
        extra_context['title'] = "Perfiles de Usuario"
        extra_context['subtitle'] = "Gestiona los perfiles y progreso de los usuarios"
        return super().changelist_view(request, extra_context=extra_context)

# Admin para Exercise
@admin.register(Exercise)
class ExerciseAdmin(BaseModelAdmin):
    list_display = ('id', 'type', 'object_name', 'difficulty', 'category', 'created_at')
    list_filter = ('type', 'difficulty', 'created_at', 'category')
    search_fields = ('question', 'object_translation__spanish', 'object_translation__quechua')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('type', 'category', 'object_translation', 'difficulty')
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
            return format_html('<pre class="json-data">{}</pre>', json.dumps(obj.distractors, indent=4, ensure_ascii=False))
        return "Sin distractores"
    distractors_formatted.short_description = 'Distractores'
    
    def metadata_formatted(self, obj):
        if obj.metadata:
            return format_html('<pre class="json-data">{}</pre>', json.dumps(obj.metadata, indent=4, ensure_ascii=False))
        return "Sin metadatos"
    metadata_formatted.short_description = 'Metadatos'
    
    def changelist_view(self, request, extra_context=None):
        if extra_context is None:
            extra_context = {}
        extra_context['title'] = "Ejercicios"
        extra_context['subtitle'] = "Gestiona los ejercicios y actividades de aprendizaje"
        return super().changelist_view(request, extra_context=extra_context)

# Admin para UserProgress
@admin.register(UserProgress)
class UserProgressAdmin(BaseModelAdmin):
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
    
    def changelist_view(self, request, extra_context=None):
        if extra_context is None:
            extra_context = {}
        extra_context['title'] = "Progresos del Usuario"
        extra_context['subtitle'] = "Seguimiento del avance de cada usuario en los ejercicios"
        return super().changelist_view(request, extra_context=extra_context)

# Admin para Achievement
@admin.register(Achievement)
class AchievementAdmin(BaseModelAdmin):
    list_display = ('name', 'type', 'requirement_value', 'earned_count')
    list_filter = ('type',)
    search_fields = ('name', 'description')
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.annotate(earned_count=Count('userachievement'))
        return queryset
    
    def earned_count(self, obj):
        return obj.earned_count
    earned_count.short_description = 'Usuarios que lo han ganado'
    earned_count.admin_order_field = 'earned_count'
    
    def changelist_view(self, request, extra_context=None):
        if extra_context is None:
            extra_context = {}
        extra_context['title'] = "Logros"
        extra_context['subtitle'] = "Configura los logros que pueden desbloquear los usuarios"
        return super().changelist_view(request, extra_context=extra_context)

# Admin para ActivityLog - ACTUALIZADO
@admin.register(ActivityLog)
class ActivityLogAdmin(BaseModelAdmin):
    list_display = ('user', 'activity_type', 'mode', 'category', 'word_learned', 'formatted_timestamp')
    list_filter = ('activity_type', 'mode', 'category', 'timestamp')
    search_fields = ('user__username', 'activity_type', 'word_learned')
    ordering = ('-timestamp',)
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.select_related('user')
        return queryset
    
    def formatted_timestamp(self, obj):
        """Formato consistente para timestamps"""
        if not obj.timestamp:
            return '-'
        return obj.timestamp.strftime('%d/%m/%Y %H:%M')
    formatted_timestamp.short_description = 'Fecha y hora'
    formatted_timestamp.admin_order_field = 'timestamp'
    
    def changelist_view(self, request, extra_context=None):
        if extra_context is None:
            extra_context = {}
        extra_context['title'] = "Registros de Actividad"
        extra_context['subtitle'] = "Acciones realizadas por los usuarios en la aplicación"
        return super().changelist_view(request, extra_context=extra_context)

# Admin para PronunciationRecord
@admin.register(PronunciationRecord)
class PronunciationRecordAdmin(BaseModelAdmin):
    list_display = ('user', 'object_name', 'is_approved', 'approved_by', 'created_at', 'audio_player')
    list_filter = ('is_approved', 'created_at')
    search_fields = ('user__username', 'object_translation__spanish', 'object_translation__quechua')
    ordering = ('-created_at',)
    
    actions = ['approve_records', 'reject_records', 'check_audio_files']
    
    def object_name(self, obj):
        return f"{obj.object_translation.spanish} ({obj.object_translation.quechua})"
    object_name.short_description = 'Objeto'
    
    def audio_player(self, obj):
        """Reproductor de audio con mejor manejo de errores"""
        if not obj.audio_file:
            return "Sin archivo de audio"
            
        try:
            # Verificar si el archivo existe físicamente
            if not obj.audio_file.storage.exists(obj.audio_file.name):
                return format_html('<span class="text-danger">Archivo no encontrado</span>')
                
            return format_html('<audio controls><source src="{}" type="audio/mpeg"></audio>', obj.audio_file.url)
        except Exception as e:
            return format_html('<span class="text-danger">Error: {}</span>', str(e))
    audio_player.short_description = 'Escuchar'
    
    def approve_records(self, request, queryset):
        updated = queryset.update(is_approved=True, approved_by=request.user, approval_date=timezone.now())
        self.message_user(request, f'{updated} grabaciones fueron aprobadas correctamente.')
    approve_records.short_description = "Aprobar grabaciones seleccionadas"
    
    def reject_records(self, request, queryset):
        updated = queryset.update(is_approved=False, approved_by=request.user, approval_date=timezone.now())
        self.message_user(request, f'{updated} grabaciones fueron rechazadas correctamente.')
    reject_records.short_description = "Rechazar grabaciones seleccionadas"
    
    def check_audio_files(self, request, queryset):
        """Verifica el estado de los archivos de audio"""
        import os
        from django.conf import settings
        
        media_root = settings.MEDIA_ROOT
        records_checked = 0
        files_missing = 0
        
        for record in queryset:
            records_checked += 1
            if not record.audio_file:
                files_missing += 1
                continue
                
            file_path = os.path.join(media_root, str(record.audio_file))
            if not os.path.exists(file_path):
                files_missing += 1
                
        if files_missing > 0:
            self.message_user(
                request, 
                f'Se verificaron {records_checked} registros. Faltan {files_missing} archivos de audio.',
                level='WARNING'
            )
        else:
            self.message_user(
                request, 
                f'Se verificaron {records_checked} registros. Todos los archivos existen.',
                level='SUCCESS'
            )
            
        # Verificar directorio de medios
        audio_dir = os.path.join(media_root, 'pronunciation_records')
        if not os.path.exists(audio_dir):
            try:
                os.makedirs(audio_dir)
                self.message_user(
                    request, 
                    f'Se ha creado el directorio {audio_dir}', 
                    level='SUCCESS'
                )
            except Exception as e:
                self.message_user(
                    request, 
                    f'Error al crear directorio de audio: {str(e)}', 
                    level='ERROR'
                )
    check_audio_files.short_description = "Verificar archivos de audio"
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.select_related('user', 'object_translation', 'approved_by')
        return queryset
    
    def changelist_view(self, request, extra_context=None):
        if extra_context is None:
            extra_context = {}
        extra_context['title'] = "Grabaciones de Pronunciación"
        extra_context['subtitle'] = "Grabaciones de pronunciación enviadas por los usuarios"
        return super().changelist_view(request, extra_context=extra_context)

# Admin para UserVocabulary - NUEVO
@admin.register(UserVocabulary)
class UserVocabularyAdmin(BaseModelAdmin):
    list_display = ('user', 'spanish_word', 'quechua_word', 'mastery_level', 'star_display', 'exercises_completed', 'last_practiced')
    list_filter = ('mastery_level', 'last_practiced', 'first_detected')
    search_fields = ('user__username', 'spanish_word', 'quechua_word', 'object_label')
    ordering = ('user', '-mastery_level')
    
    def star_display(self, obj):
        """Muestra las estrellas visualmente"""
        stars = '⭐' * obj.mastery_level
        empty_stars = '☆' * (5 - obj.mastery_level)
        return format_html('<span style="font-size: 18px;">{}{}</span>', stars, empty_stars)
    star_display.short_description = 'Dominio'
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.select_related('user')
        return queryset
    
    def changelist_view(self, request, extra_context=None):
        if extra_context is None:
            extra_context = {}
        extra_context['title'] = "Vocabulario de Usuarios"
        extra_context['subtitle'] = "Palabras aprendidas por cada usuario"
        return super().changelist_view(request, extra_context=extra_context)

# Admin para DailyGoal - NUEVO
@admin.register(DailyGoal)
class DailyGoalAdmin(BaseModelAdmin):
    list_display = ('user', 'date', 'words_detected', 'words_practiced', 'words_mastered', 'goal_status')
    list_filter = ('date', 'words_detected', 'words_practiced')
    search_fields = ('user__username',)
    ordering = ('-date', 'user')
    
    def goal_status(self, obj):
        """Muestra el estado de la meta diaria"""
        if obj.is_complete():
            return format_html('<span style="color: green;">✓ Completada</span>')
        else:
            # Calcular progreso de manera segura
            total_activity = (obj.words_practiced or 0) + (obj.words_detected or 0)
            progress = min(total_activity / 5 * 100, 100)
            progress_int = int(round(progress))
            
            return format_html(
                '<span style="color: #007bff;">{}% completado</span>',
                progress_int
            )
    goal_status.short_description = 'Estado' 
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.select_related('user')
        return queryset
    
    def changelist_view(self, request, extra_context=None):
        if extra_context is None:
            extra_context = {}
        extra_context['title'] = "Metas Diarias"
        extra_context['subtitle'] = "Progreso diario de los usuarios"
        return super().changelist_view(request, extra_context=extra_context)

# Desregistrar modelos redundantes
from django.apps import apps

# Lista de modelos a ocultar completamente
models_to_hide = [
    ('authtoken', 'token'),             # Tokens de autenticación
    ('translations', 'userachievement'), # Logros de usuario (redundante)
]

# Desregistrar modelos
for app_label, model_name in models_to_hide:
    try:
        model = apps.get_model(app_label, model_name)
        if model in admin.site._registry:
            admin.site.unregister(model)
    except Exception as e:
        print(f"Error al desregistrar {app_label}.{model_name}: {e}")

# Renombrar modelos de autenticación
from django.contrib.auth.models import User, Group
from django.contrib.auth.admin import UserAdmin, GroupAdmin

# Desregistrar y volver a registrar con nombres en español
admin.site.unregister(User)
admin.site.unregister(Group)

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    def get_model_perms(self, request):
        """
        Return empty perms dict thus hiding the model from admin index.
        """
        return super().get_model_perms(request)

@admin.register(Group)
class CustomGroupAdmin(GroupAdmin):
    def get_model_perms(self, request):
        """
        Return empty perms dict thus hiding the model from admin index.
        """
        return super().get_model_perms(request)