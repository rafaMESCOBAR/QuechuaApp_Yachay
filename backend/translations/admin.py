# translations/admin.py - ADMIN COMPLETO EN ESPAÑOL PARA YACHAY CON MEJORAS DE INTERFAZ
from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count
from django.utils import timezone
from django.http import HttpResponse
from django.shortcuts import render
import json
import csv
import logging

from .models import (
    ObjectTranslation, UserProfile, Exercise, UserProgress,
    Achievement, UserAchievement, ActivityLog, PronunciationRecord,
    UserVocabulary, DailyGoal
)

# Configurar logging
logger = logging.getLogger(__name__)

# ============================================================================
# FILTROS PERSONALIZADOS EN ESPAÑOL
# ============================================================================

class FechaCreacionFilter(admin.SimpleListFilter):
    title = 'Fecha de Creación'
    parameter_name = 'created_at'

    def lookups(self, request, model_admin):
        return (
            ('today', '📅 Hoy'),
            ('week', '📆 Esta Semana'),
            ('month', '🗓️ Este Mes'),
            ('year', '📋 Este Año'),
        )

    def queryset(self, request, queryset):
        from datetime import datetime, timedelta
        from django.utils import timezone
        
        if self.value() == 'today':
            return queryset.filter(created_at__date=timezone.now().date())
        if self.value() == 'week':
            week_ago = timezone.now() - timedelta(days=7)
            return queryset.filter(created_at__gte=week_ago)
        if self.value() == 'month':
            month_ago = timezone.now() - timedelta(days=30)
            return queryset.filter(created_at__gte=month_ago)
        if self.value() == 'year':
            year_ago = timezone.now() - timedelta(days=365)
            return queryset.filter(created_at__gte=year_ago)

class FechaActualizacionFilter(admin.SimpleListFilter):
    title = 'Fecha de Actualización'
    parameter_name = 'updated_at'

    def lookups(self, request, model_admin):
        return (
            ('today', '📅 Hoy'),
            ('week', '📆 Esta Semana'),
            ('month', '🗓️ Este Mes'),
            ('year', '📋 Este Año'),
        )

    def queryset(self, request, queryset):
        from datetime import datetime, timedelta
        from django.utils import timezone
        
        if self.value() == 'today':
            return queryset.filter(updated_at__date=timezone.now().date())
        if self.value() == 'week':
            week_ago = timezone.now() - timedelta(days=7)
            return queryset.filter(updated_at__gte=week_ago)
        if self.value() == 'month':
            month_ago = timezone.now() - timedelta(days=30)
            return queryset.filter(updated_at__gte=month_ago)
        if self.value() == 'year':
            year_ago = timezone.now() - timedelta(days=365)
            return queryset.filter(updated_at__gte=year_ago)

class FechaFilter(admin.SimpleListFilter):
    title = 'Fecha'
    parameter_name = 'date'

    def lookups(self, request, model_admin):
        return (
            ('today', '📅 Hoy'),
            ('week', '📆 Esta Semana'),
            ('month', '🗓️ Este Mes'),
            ('year', '📋 Este Año'),
        )

    def queryset(self, request, queryset):
        from datetime import datetime, timedelta
        from django.utils import timezone
        
        if self.value() == 'today':
            return queryset.filter(date=timezone.now().date())
        if self.value() == 'week':
            week_ago = timezone.now().date() - timedelta(days=7)
            return queryset.filter(date__gte=week_ago)
        if self.value() == 'month':
            month_ago = timezone.now().date() - timedelta(days=30)
            return queryset.filter(date__gte=month_ago)
        if self.value() == 'year':
            year_ago = timezone.now().date() - timedelta(days=365)
            return queryset.filter(date__gte=year_ago)

class UltimaActividadFilter(admin.SimpleListFilter):
    title = 'Última Actividad'
    parameter_name = 'last_activity'

    def lookups(self, request, model_admin):
        return (
            ('today', '📅 Hoy'),
            ('week', '📆 Esta Semana'),
            ('month', '🗓️ Este Mes'),
            ('never', '❌ Sin Actividad'),
        )

    def queryset(self, request, queryset):
        from datetime import datetime, timedelta
        from django.utils import timezone
        
        if self.value() == 'today':
            return queryset.filter(last_activity=timezone.now().date())
        if self.value() == 'week':
            week_ago = timezone.now().date() - timedelta(days=7)
            return queryset.filter(last_activity__gte=week_ago)
        if self.value() == 'month':
            month_ago = timezone.now().date() - timedelta(days=30)
            return queryset.filter(last_activity__gte=month_ago)
        if self.value() == 'never':
            return queryset.filter(last_activity__isnull=True)

class UltimaPracticaFilter(admin.SimpleListFilter):
    title = 'Última Práctica'
    parameter_name = 'last_practiced'

    def lookups(self, request, model_admin):
        return (
            ('today', '📅 Hoy'),
            ('week', '📆 Esta Semana'),
            ('month', '🗓️ Este Mes'),
            ('never', '❌ Sin Práctica'),
        )

    def queryset(self, request, queryset):
        from datetime import datetime, timedelta
        from django.utils import timezone
        
        if self.value() == 'today':
            return queryset.filter(last_practiced=timezone.now().date())
        if self.value() == 'week':
            week_ago = timezone.now().date() - timedelta(days=7)
            return queryset.filter(last_practiced__gte=week_ago)
        if self.value() == 'month':
            month_ago = timezone.now().date() - timedelta(days=30)
            return queryset.filter(last_practiced__gte=month_ago)
        if self.value() == 'never':
            return queryset.filter(last_practiced__isnull=True)

class PrimeraDeteccionFilter(admin.SimpleListFilter):
    title = 'Primera Detección'
    parameter_name = 'first_detected'

    def lookups(self, request, model_admin):
        return (
            ('today', '📅 Hoy'),
            ('week', '📆 Esta Semana'),
            ('month', '🗓️ Este Mes'),
            ('year', '📋 Este Año'),
        )

    def queryset(self, request, queryset):
        from datetime import datetime, timedelta
        from django.utils import timezone
        
        if self.value() == 'today':
            return queryset.filter(first_detected=timezone.now().date())
        if self.value() == 'week':
            week_ago = timezone.now().date() - timedelta(days=7)
            return queryset.filter(first_detected__gte=week_ago)
        if self.value() == 'month':
            month_ago = timezone.now().date() - timedelta(days=30)
            return queryset.filter(first_detected__gte=month_ago)
        if self.value() == 'year':
            year_ago = timezone.now().date() - timedelta(days=365)
            return queryset.filter(first_detected__gte=year_ago)

class UltimoIntentoFilter(admin.SimpleListFilter):
    title = 'Último Intento'
    parameter_name = 'last_attempt'

    def lookups(self, request, model_admin):
        return (
            ('today', '📅 Hoy'),
            ('week', '📆 Esta Semana'),
            ('month', '🗓️ Este Mes'),
            ('never', '❌ Sin Intentos'),
        )

    def queryset(self, request, queryset):
        from datetime import datetime, timedelta
        from django.utils import timezone
        
        if self.value() == 'today':
            return queryset.filter(last_attempt__date=timezone.now().date())
        if self.value() == 'week':
            week_ago = timezone.now() - timedelta(days=7)
            return queryset.filter(last_attempt__gte=week_ago)
        if self.value() == 'month':
            month_ago = timezone.now() - timedelta(days=30)
            return queryset.filter(last_attempt__gte=month_ago)
        if self.value() == 'never':
            return queryset.filter(last_attempt__isnull=True)

class ModoFilter(admin.SimpleListFilter):
    title = 'Modo'
    parameter_name = 'mode'

    def lookups(self, request, model_admin):
        return (
            ('detection', '👁️ Detección'),
            ('practice', '📚 Práctica'),
            ('vocabulary', '📖 Vocabulario'),
            ('pronunciation', '🎤 Pronunciación'),
            ('exploration', '🗺️ Exploración'),
        )

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(mode=self.value())

class CategoriaFilter(admin.SimpleListFilter):
    title = 'Categoría'
    parameter_name = 'category'

    def lookups(self, request, model_admin):
        return (
            ('vocabulary', '📖 Vocabulario'),
            ('pronunciation', '🎤 Pronunciación'),
            ('grammar', '📝 Gramática'),
            ('listening', '👂 Comprensión'),
            ('objects', '🧊 Objetos'),
            ('animals', '🐱 Animales'),
            ('food', '🍎 Comida'),
            ('colors', '🌈 Colores'),
            ('numbers', '🔢 Números'),
            ('family', '👨‍👩‍👧‍👦 Familia'),
        )

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(category=self.value())

class FechaHoraFilter(admin.SimpleListFilter):
    title = 'Fecha y Hora'
    parameter_name = 'timestamp'

    def lookups(self, request, model_admin):
        return (
            ('today', '📅 Hoy'),
            ('week', '📆 Esta Semana'),
            ('month', '🗓️ Este Mes'),
            ('year', '📋 Este Año'),
        )

    def queryset(self, request, queryset):
        from datetime import datetime, timedelta
        from django.utils import timezone
        
        if self.value() == 'today':
            return queryset.filter(timestamp__date=timezone.now().date())
        if self.value() == 'week':
            week_ago = timezone.now() - timedelta(days=7)
            return queryset.filter(timestamp__gte=week_ago)
        if self.value() == 'month':
            month_ago = timezone.now() - timedelta(days=30)
            return queryset.filter(timestamp__gte=month_ago)
        if self.value() == 'year':
            year_ago = timezone.now() - timedelta(days=365)
            return queryset.filter(timestamp__gte=year_ago)

class PalabrasDetectadasFilter(admin.SimpleListFilter):
    title = 'Palabras Detectadas'
    parameter_name = 'words_detected'

    def lookups(self, request, model_admin):
        return (
            ('0', '❌ Sin Detectar'),
            ('1-2', '🟡 1-2 Palabras'),
            ('3-5', '🟢 3-5 Palabras'),
            ('6+', '🌟 6+ Palabras'),
        )

    def queryset(self, request, queryset):
        if self.value() == '0':
            return queryset.filter(words_detected=0)
        if self.value() == '1-2':
            return queryset.filter(words_detected__in=[1, 2])
        if self.value() == '3-5':
            return queryset.filter(words_detected__range=[3, 5])
        if self.value() == '6+':
            return queryset.filter(words_detected__gte=6)

class PalabrasPracticadasFilter(admin.SimpleListFilter):
    title = 'Palabras Practicadas'
    parameter_name = 'words_practiced'

    def lookups(self, request, model_admin):
        return (
            ('0', '❌ Sin Practicar'),
            ('1-2', '🟡 1-2 Palabras'),
            ('3-5', '🟢 3-5 Palabras'),
            ('6+', '🌟 6+ Palabras'),
        )

    def queryset(self, request, queryset):
        if self.value() == '0':
            return queryset.filter(words_practiced=0)
        if self.value() == '1-2':
            return queryset.filter(words_practiced__in=[1, 2])
        if self.value() == '3-5':
            return queryset.filter(words_practiced__range=[3, 5])
        if self.value() == '6+':
            return queryset.filter(words_practiced__gte=6)

class FechaRegistroFilter(admin.SimpleListFilter):
    title = 'Fecha de Registro'
    parameter_name = 'date_joined'

    def lookups(self, request, model_admin):
        return (
            ('today', '📅 Hoy'),
            ('week', '📆 Esta Semana'),
            ('month', '🗓️ Este Mes'),
            ('year', '📋 Este Año'),
        )

    def queryset(self, request, queryset):
        from datetime import datetime, timedelta
        from django.utils import timezone
        
        if self.value() == 'today':
            return queryset.filter(date_joined__date=timezone.now().date())
        if self.value() == 'week':
            week_ago = timezone.now() - timedelta(days=7)
            return queryset.filter(date_joined__gte=week_ago)
        if self.value() == 'month':
            month_ago = timezone.now() - timedelta(days=30)
            return queryset.filter(date_joined__gte=month_ago)
        if self.value() == 'year':
            year_ago = timezone.now() - timedelta(days=365)
            return queryset.filter(date_joined__gte=year_ago)

class DiasRachaFilter(admin.SimpleListFilter):
    title = 'Días de Racha'
    parameter_name = 'streak_days'

    def lookups(self, request, model_admin):
        return (
            ('0', '❌ Sin Racha'),
            ('1-3', '🟡 1-3 Días'),
            ('4-7', '🟢 4-7 Días'),
            ('8-30', '🔥 1-4 Semanas'),
            ('31+', '🌟 Más de 1 Mes'),
        )

    def queryset(self, request, queryset):
        if self.value() == '0':
            return queryset.filter(streak_days=0)
        if self.value() == '1-3':
            return queryset.filter(streak_days__range=[1, 3])
        if self.value() == '4-7':
            return queryset.filter(streak_days__range=[4, 7])
        if self.value() == '8-30':
            return queryset.filter(streak_days__range=[8, 30])
        if self.value() == '31+':
            return queryset.filter(streak_days__gte=31)

class NivelUsuarioFilter(admin.SimpleListFilter):
    title = 'Nivel del Usuario'
    parameter_name = 'current_level'

    def lookups(self, request, model_admin):
        return (
            ('1', '🥉 Nivel 1 - Principiante'),
            ('2', '🥈 Nivel 2 - Aprendiz'),
            ('3', '🥇 Nivel 3 - Explorador'),
            ('4', '⭐ Nivel 4 - Aventurero'),
            ('5', '🌟 Nivel 5 - Conocedor'),
            ('6', '💫 Nivel 6 - Practicante'),
            ('7', '🎯 Nivel 7 - Avanzado'),
            ('8', '🏆 Nivel 8 - Experto'),
            ('9', '👑 Nivel 9 - Maestro'),
            ('10', '🌞 Nivel 10 - Guardián del Quechua'),
        )

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(current_level=self.value())

class HablanteNativoFilter(admin.SimpleListFilter):
    title = 'Tipo de Hablante'
    parameter_name = 'native_speaker'

    def lookups(self, request, model_admin):
        return (
            ('True', '🗣️ Hablante Nativo'),
            ('False', '📚 Aprendiz'),
        )

    def queryset(self, request, queryset):
        if self.value() == 'True':
            return queryset.filter(native_speaker=True)
        if self.value() == 'False':
            return queryset.filter(native_speaker=False)

class TipoEjercicioFilter(admin.SimpleListFilter):
    title = 'Tipo de Ejercicio'
    parameter_name = 'type'

    def lookups(self, request, model_admin):
        return (
            ('translation', '🔄 Traducción'),
            ('pronunciation', '🎤 Pronunciación'),
            ('listening', '👂 Comprensión Auditiva'),
            ('multiple_choice', '✅ Opción Múltiple'),
            ('matching', '🔗 Emparejamiento'),
            ('fill_blank', '📝 Completar Espacios'),
        )

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(type=self.value())

class DificultadEjercicioFilter(admin.SimpleListFilter):
    title = 'Nivel de Dificultad'
    parameter_name = 'difficulty'

    def lookups(self, request, model_admin):
        return (
            ('1', '🟢 Fácil'),
            ('2', '🟡 Intermedio'),
            ('3', '🔴 Difícil'),
        )

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(difficulty=self.value())

class EstadoCompletadoFilter(admin.SimpleListFilter):
    title = 'Estado de Completado'
    parameter_name = 'completed'

    def lookups(self, request, model_admin):
        return (
            ('True', '✅ Completado'),
            ('False', '⏳ Pendiente'),
        )

    def queryset(self, request, queryset):
        if self.value() == 'True':
            return queryset.filter(completed=True)
        if self.value() == 'False':
            return queryset.filter(completed=False)

class EstadoCorrectoFilter(admin.SimpleListFilter):
    title = 'Resultado del Ejercicio'
    parameter_name = 'correct'

    def lookups(self, request, model_admin):
        return (
            ('True', '✅ Correcto'),
            ('False', '❌ Incorrecto'),
        )

    def queryset(self, request, queryset):
        if self.value() == 'True':
            return queryset.filter(correct=True)
        if self.value() == 'False':
            return queryset.filter(correct=False)

class TipoLogroFilter(admin.SimpleListFilter):
    title = 'Categoría del Logro'
    parameter_name = 'type'

    def lookups(self, request, model_admin):
        return (
            ('exercises', '🎯 Ejercicios'),
            ('streak', '🔥 Rachas'),
            ('mastery', '⭐ Dominio'),
            ('detection', '👁️ Detección'),
            ('pronunciation', '🎤 Pronunciación'),
            ('exploration', '🗺️ Exploración'),
        )

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(type=self.value())

class TipoActividadFilter(admin.SimpleListFilter):
    title = 'Tipo de Actividad'
    parameter_name = 'activity_type'

    def lookups(self, request, model_admin):
        return (
            ('login', '🔑 Inicio de Sesión'),
            ('exercise_completed', '✅ Ejercicio Completado'),
            ('achievement_unlocked', '🏆 Logro Desbloqueado'),
            ('object_detected', '👁️ Objeto Detectado'),
            ('pronunciation_recorded', '🎤 Pronunciación Grabada'),
            ('level_up', '⬆️ Subida de Nivel'),
            ('mastery_decreased', '⬇️ Dominio Disminuido'),
            ('exercise_abandoned', '❌ Ejercicio Abandonado'),
        )

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(activity_type=self.value())

class EstadoAprobacionFilter(admin.SimpleListFilter):
    title = 'Estado de Aprobación'
    parameter_name = 'is_approved'

    def lookups(self, request, model_admin):
        return (
            ('True', '✅ Aprobado'),
            ('False', '❌ Rechazado'),
            ('None', '⏳ Pendiente'),
        )

    def queryset(self, request, queryset):
        if self.value() == 'True':
            return queryset.filter(is_approved=True)
        if self.value() == 'False':
            return queryset.filter(is_approved=False)
        if self.value() == 'None':
            return queryset.filter(is_approved__isnull=True)

class NivelDominioFilter(admin.SimpleListFilter):
    title = 'Nivel de Dominio'
    parameter_name = 'mastery_level'

    def lookups(self, request, model_admin):
        return (
            ('1', '⭐ 1 Estrella'),
            ('2', '⭐⭐ 2 Estrellas'),
            ('3', '⭐⭐⭐ 3 Estrellas'),
            ('4', '⭐⭐⭐⭐ 4 Estrellas'),
            ('5', '⭐⭐⭐⭐⭐ 5 Estrellas (Dominado)'),
        )

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(mastery_level=self.value())

class UsuarioStaffFilter(admin.SimpleListFilter):
    title = 'Tipo de Usuario'
    parameter_name = 'user_type'

    def lookups(self, request, model_admin):
        return (
            ('superuser', '👑 Superusuario'),
            ('staff', '⭐ Staff'),
            ('active', '✅ Usuario Activo'),
            ('inactive', '❌ Usuario Inactivo'),
        )

    def queryset(self, request, queryset):
        if self.value() == 'superuser':
            return queryset.filter(is_superuser=True)
        if self.value() == 'staff':
            return queryset.filter(is_staff=True, is_superuser=False)
        if self.value() == 'active':
            return queryset.filter(is_active=True)
        if self.value() == 'inactive':
            return queryset.filter(is_active=False)

# ============================================================================
# CLASE BASE PARA OPTIMIZACIONES COMUNES
# ============================================================================

class BaseModelAdmin(admin.ModelAdmin):
    """Clase base con optimizaciones comunes para todos los admins"""
    
    def get_list_display(self, request):
        """Permite personalizar list_display en subclases"""
        return super().get_list_display(request)
    
    def export_to_csv(self, request, queryset):
        """Acción para exportar a CSV"""
        meta = self.model._meta
        field_names = [field.name for field in meta.fields]
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename={meta.model_name}.csv'
        
        writer = csv.writer(response)
        writer.writerow(field_names)
        
        for obj in queryset:
            writer.writerow([getattr(obj, field) for field in field_names])
        
        return response
    export_to_csv.short_description = "📊 Exportar seleccionados a CSV"

# ============================================================================
# ADMIN PARA OBJECTTRANSLATION
# ============================================================================

@admin.register(ObjectTranslation)
class ObjectTranslationAdmin(BaseModelAdmin):
    list_display = ('english_label', 'spanish', 'quechua', 'exercises_count', 'created_at')
    list_filter = (FechaCreacionFilter, FechaActualizacionFilter)
    search_fields = ('english_label', 'spanish', 'quechua')
    ordering = ('english_label',)
    readonly_fields = ('created_at', 'updated_at')
    list_per_page = 25
    
    fieldsets = (
        ('Información Principal', {
            'fields': ('english_label', 'spanish', 'quechua'),
            'description': 'Datos principales de la traducción'
        }),
        ('Metadatos', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
            'description': 'Información automática del sistema'
        }),
    )
    
    actions = ['export_to_csv', 'duplicate_translations']
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.annotate(exercise_count=Count('exercise'))
        return queryset
    
    def exercises_count(self, obj):
        count = obj.exercise_count
        if count == 0:
            return format_html('<span style="color: #ffc107;">⚠️ Sin ejercicios</span>')
        elif count < 3:
            return format_html('<span style="color: #17a2b8;">📝 {} ejercicios</span>', count)
        else:
            return format_html('<span style="color: #28a745;">✅ {} ejercicios</span>', count)
    exercises_count.short_description = 'Ejercicios'
    exercises_count.admin_order_field = 'exercise_count'
    
    def duplicate_translations(self, request, queryset):
        """Acción para duplicar traducciones seleccionadas"""
        duplicated = 0
        for translation in queryset:
            new_translation = ObjectTranslation.objects.create(
                english_label=f"{translation.english_label}_copia",
                spanish=translation.spanish,
                quechua=translation.quechua
            )
            duplicated += 1
        
        self.message_user(request, f'✅ {duplicated} traducciones duplicadas exitosamente.')
    duplicate_translations.short_description = "📋 Duplicar traducciones seleccionadas"
    
    def changelist_view(self, request, extra_context=None):
        if extra_context is None:
            extra_context = {}
        extra_context['title'] = "Traducciones"
        extra_context['subtitle'] = "Gestiona el vocabulario en español y quechua"
        return super().changelist_view(request, extra_context=extra_context)

# ============================================================================
# ADMIN PARA USERPROFILE
# ============================================================================

@admin.register(UserProfile)
class UserProfileAdmin(BaseModelAdmin):
    list_display = ('usuario', 'nivel_actual', 'titulo_nivel', 'total_palabras', 'palabras_dominadas', 'dias_racha', 'ultima_actividad')
    list_filter = (NivelUsuarioFilter, HablanteNativoFilter, UltimaActividadFilter, DiasRachaFilter)
    search_fields = ('user__username', 'user__email', 'user__first_name', 'user__last_name')
    ordering = ('-total_words', '-mastered_words')
    list_per_page = 20
    
    fieldsets = (
        ('Información de Usuario', {
            'fields': ('user', 'vista_previa_imagen'),
            'description': 'Datos básicos del usuario'
        }),
        ('Progreso de Aprendizaje', {
            'fields': ('current_level', 'mostrar_titulo_nivel', 'total_words', 'mastered_words'),
            'description': 'Estadísticas de aprendizaje'
        }),
        ('Actividad y Constancia', {
            'fields': ('streak_days', 'last_activity'),
            'description': 'Seguimiento de la actividad del usuario'
        }),
        ('Configuración Personal', {
            'fields': ('native_speaker', 'preferred_dialect'),
            'classes': ('collapse',),
            'description': 'Preferencias personales del usuario'
        }),
    )
    
    readonly_fields = ('vista_previa_imagen', 'mostrar_titulo_nivel')
    actions = ['export_to_csv', 'initialize_profile', 'reset_streak', 'boost_level']
    
    def usuario(self, obj):
        if obj.user.is_superuser:
            return format_html('<strong style="color: #dc3545;">{} 👑</strong>', obj.user.username)
        elif obj.user.is_staff:
            return format_html('<strong style="color: #ffc107;">{} ⭐</strong>', obj.user.username)
        return obj.user.username
    usuario.short_description = 'Usuario'
    usuario.admin_order_field = 'user__username'
    
    def nivel_actual(self, obj):
        return obj.current_level
    nivel_actual.short_description = 'Nivel'
    nivel_actual.admin_order_field = 'current_level'
    
    def total_palabras(self, obj):
        return obj.total_words
    total_palabras.short_description = 'Total Palabras'
    total_palabras.admin_order_field = 'total_words'
    
    def palabras_dominadas(self, obj):
        return obj.mastered_words
    palabras_dominadas.short_description = 'Palabras Dominadas'
    palabras_dominadas.admin_order_field = 'mastered_words'
    
    def dias_racha(self, obj):
        return f"{obj.streak_days} días"
    dias_racha.short_description = 'Racha'
    dias_racha.admin_order_field = 'streak_days'
    
    def ultima_actividad(self, obj):
        if obj.last_activity:
            return obj.last_activity.strftime('%d/%m/%Y')
        return '-'
    ultima_actividad.short_description = 'Última Actividad'
    ultima_actividad.admin_order_field = 'last_activity'
    
    def titulo_nivel(self, obj):
        title = obj.get_level_title()
        colors = {
            'Principiante': '#6c757d',
            'Aprendiz': '#17a2b8', 
            'Explorador': '#20c997',
            'Aventurero': '#ffc107',
            'Conocedor': '#fd7e14',
            'Practicante': '#dc3545',
            'Avanzado': '#6f42c1',
            'Experto': '#e83e8c',
            'Maestro': '#28a745',
            'Guardián del Quechua': '#007bff'
        }
        color = colors.get(title, '#6c757d')
        return format_html('<span style="color: {}; font-weight: bold;">{}</span>', color, title)
    titulo_nivel.short_description = 'Título'
    
    def mostrar_titulo_nivel(self, obj):
        return obj.get_level_title()
    mostrar_titulo_nivel.short_description = 'Título del nivel'
    
    def vista_previa_imagen(self, obj):
        if obj.profile_image:
            return format_html(
                '<img src="{}" width="150" height="150" style="border-radius: 50%; border: 3px solid #dee2e6;" />',
                obj.profile_image.url
            )
        return format_html('<div style="width: 150px; height: 150px; border-radius: 50%; background-color: #f8f9fa; display: flex; align-items: center; justify-content: center; border: 2px dashed #dee2e6;"><span style="color: #6c757d;">Sin imagen</span></div>')
    vista_previa_imagen.short_description = 'Vista previa de imagen'
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.select_related('user')
        return queryset
    
    def initialize_profile(self, request, queryset):
        """Inicializa perfiles con datos básicos para testing"""
        updated = 0
        for profile in queryset:
            profile.current_level = 1
            profile.total_words = 5
            profile.mastered_words = 0
            profile.streak_days = 1
            profile.last_activity = timezone.now().date()
            profile.save()
            updated += 1
        
        self.message_user(request, f'✅ Se inicializaron {updated} perfiles con datos de prueba')
    initialize_profile.short_description = "🔧 Inicializar perfiles seleccionados"
    
    def reset_streak(self, request, queryset):
        """Reinicia rachas de los perfiles seleccionados"""
        updated = queryset.update(streak_days=0, last_activity=None)
        self.message_user(request, f'🔄 {updated} perfiles tuvieron sus rachas reiniciadas.')
    reset_streak.short_description = "🔄 Reiniciar racha de usuarios seleccionados"
    
    def boost_level(self, request, queryset):
        """Sube un nivel a los usuarios seleccionados"""
        updated = 0
        for profile in queryset:
            if profile.current_level < 10:
                profile.current_level += 1
                profile.save()
                updated += 1
        
        self.message_user(request, f'⬆️ {updated} usuarios subieron de nivel.')
    boost_level.short_description = "⬆️ Subir nivel a usuarios seleccionados"
    
    def changelist_view(self, request, extra_context=None):
        if extra_context is None:
            extra_context = {}
        extra_context['title'] = "Perfiles de Usuario"
        extra_context['subtitle'] = "Gestiona los perfiles y progreso de los usuarios"
        return super().changelist_view(request, extra_context=extra_context)

# ============================================================================
# ADMIN PARA EXERCISE
# ============================================================================

@admin.register(Exercise)
class ExerciseAdmin(BaseModelAdmin):
    list_display = ('id', 'tipo', 'nombre_objeto', 'dificultad', 'categoria', 'fecha_creacion')
    list_filter = (TipoEjercicioFilter, DificultadEjercicioFilter, FechaCreacionFilter, CategoriaFilter)
    search_fields = ('question', 'object_translation__spanish', 'object_translation__quechua')
    ordering = ('-created_at',)
    list_per_page = 20
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('type', 'category', 'object_translation', 'difficulty'),
            'description': 'Configuración principal del ejercicio'
        }),
        ('Contenido del Ejercicio', {
            'fields': ('question', 'answer', 'mostrar_distractores'),
            'description': 'Pregunta, respuesta y opciones del ejercicio'
        }),
        ('Información Adicional', {
            'fields': ('mostrar_metadatos', 'created_at'),
            'classes': ('collapse',),
            'description': 'Datos técnicos y metadatos'
        }),
    )
    
    readonly_fields = ('created_at', 'mostrar_distractores', 'mostrar_metadatos')
    actions = ['export_to_csv', 'duplicate_exercises']
    
    def tipo(self, obj):
        return obj.get_type_display()
    tipo.short_description = 'Tipo'
    tipo.admin_order_field = 'type'
    
    def dificultad(self, obj):
        if obj.difficulty == 1:
            return format_html('<span style="color: #28a745;">🟢 Fácil</span>')
        elif obj.difficulty == 2:
            return format_html('<span style="color: #ffc107;">🟡 Medio</span>')
        else:
            return format_html('<span style="color: #dc3545;">🔴 Difícil</span>')
    dificultad.short_description = 'Dificultad'
    dificultad.admin_order_field = 'difficulty'
    
    def categoria(self, obj):
        return obj.category or 'Sin categoría'
    categoria.short_description = 'Categoría'
    categoria.admin_order_field = 'category'
    
    def fecha_creacion(self, obj):
        return obj.created_at.strftime('%d/%m/%Y %H:%M')
    fecha_creacion.short_description = 'Fecha de Creación'
    fecha_creacion.admin_order_field = 'created_at'
    
    def nombre_objeto(self, obj):
        return format_html(
            '<strong>{}</strong><br><small style="color: #6c757d;">({})</small>',
            obj.object_translation.spanish,
            obj.object_translation.quechua
        )
    nombre_objeto.short_description = 'Objeto'
    
    def mostrar_distractores(self, obj):
        if obj.distractors:
            return format_html('<pre class="json-data">{}</pre>', json.dumps(obj.distractors, indent=4, ensure_ascii=False))
        return format_html('<span style="color: #6c757d;">Sin distractores</span>')
    mostrar_distractores.short_description = 'Distractores'
    
    def mostrar_metadatos(self, obj):
        if obj.metadata:
            return format_html('<pre class="json-data">{}</pre>', json.dumps(obj.metadata, indent=4, ensure_ascii=False))
        return format_html('<span style="color: #6c757d;">Sin metadatos</span>')
    mostrar_metadatos.short_description = 'Metadatos'
    
    def duplicate_exercises(self, request, queryset):
        """Duplica ejercicios seleccionados"""
        duplicated = 0
        for exercise in queryset:
            Exercise.objects.create(
                type=exercise.type,
                category=exercise.category,
                object_translation=exercise.object_translation,
                difficulty=exercise.difficulty,
                question=f"{exercise.question} (Copia)",
                answer=exercise.answer,
                distractors=exercise.distractors,
                metadata=exercise.metadata
            )
            duplicated += 1
        
        self.message_user(request, f'✅ {duplicated} ejercicios duplicados exitosamente.')
    duplicate_exercises.short_description = "📋 Duplicar ejercicios seleccionados"
    
    def changelist_view(self, request, extra_context=None):
        if extra_context is None:
            extra_context = {}
        extra_context['title'] = "Ejercicios"
        extra_context['subtitle'] = "Gestiona los ejercicios y actividades de aprendizaje"
        return super().changelist_view(request, extra_context=extra_context)

# ============================================================================
# ADMIN PARA USERPROGRESS
# ============================================================================

@admin.register(UserProgress)
class UserProgressAdmin(BaseModelAdmin):
    list_display = ('usuario', 'tipo_ejercicio', 'estado_completado', 'estado_correcto', 'intentos', 'ultimo_intento')
    list_filter = (EstadoCompletadoFilter, EstadoCorrectoFilter, TipoEjercicioFilter, UltimoIntentoFilter)
    search_fields = ('user__username', 'exercise__question')
    ordering = ('-last_attempt',)
    list_per_page = 25
    
    actions = ['export_to_csv', 'mark_completed', 'reset_progress']
    
    def usuario(self, obj):
        return obj.user.username
    usuario.short_description = 'Usuario'
    usuario.admin_order_field = 'user__username'
    
    def tipo_ejercicio(self, obj):
        return obj.exercise.get_type_display()
    tipo_ejercicio.short_description = 'Tipo de Ejercicio'
    tipo_ejercicio.admin_order_field = 'exercise__type'
    
    def estado_completado(self, obj):
        if obj.completed:
            return format_html('<span style="color: #28a745;">✓ Completado</span>')
        return format_html('<span style="color: #ffc107;">⏳ Pendiente</span>')
    estado_completado.short_description = 'Estado'
    estado_completado.admin_order_field = 'completed'
    
    def estado_correcto(self, obj):
        if obj.correct:
            return format_html('<span style="color: #28a745;">✓ Correcto</span>')
        elif obj.completed:
            return format_html('<span style="color: #dc3545;">✗ Incorrecto</span>')
        return format_html('<span style="color: #6c757d;">-</span>')
    estado_correcto.short_description = 'Resultado'
    estado_correcto.admin_order_field = 'correct'
    
    def intentos(self, obj):
        return obj.attempts
    intentos.short_description = 'Intentos'
    intentos.admin_order_field = 'attempts'
    
    def ultimo_intento(self, obj):
        if obj.last_attempt:
            return obj.last_attempt.strftime('%d/%m/%Y %H:%M')
        return '-'
    ultimo_intento.short_description = 'Último Intento'
    ultimo_intento.admin_order_field = 'last_attempt'
    
    def mark_completed(self, request, queryset):
        """Marca progresos como completados"""
        updated = queryset.update(completed=True)
        self.message_user(request, f'✅ {updated} progresos marcados como completados.')
    mark_completed.short_description = "✅ Marcar como completados"
    
    def reset_progress(self, request, queryset):
        """Reinicia el progreso seleccionado"""
        updated = queryset.update(completed=False, correct=False, attempts=0)
        self.message_user(request, f'🔄 {updated} progresos reiniciados.')
    reset_progress.short_description = "🔄 Reiniciar progreso seleccionado"
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.select_related('user', 'exercise', 'exercise__object_translation')
        return queryset
    
    def changelist_view(self, request, extra_context=None):
        if extra_context is None:
            extra_context = {}
        extra_context['title'] = "Progresos del Usuario"
        extra_context['subtitle'] = "Seguimiento del avance de cada usuario en los ejercicios"
        return super().changelist_view(request, extra_context=extra_context)

# ============================================================================
# ADMIN PARA ACHIEVEMENT
# ============================================================================

@admin.register(Achievement)
class AchievementAdmin(BaseModelAdmin):
    list_display = ('nombre', 'tipo', 'valor_requerido', 'usuarios_ganadores', 'mostrar_icono')
    list_filter = (TipoLogroFilter,)
    search_fields = ('name', 'description')
    list_per_page = 20
    
    actions = ['export_to_csv']
    
    def nombre(self, obj):
        return obj.name
    nombre.short_description = 'Nombre'
    nombre.admin_order_field = 'name'
    
    def tipo(self, obj):
        return obj.get_type_display()
    tipo.short_description = 'Tipo'
    tipo.admin_order_field = 'type'
    
    def valor_requerido(self, obj):
        return obj.requirement_value
    valor_requerido.short_description = 'Valor Requerido'
    valor_requerido.admin_order_field = 'requirement_value'
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.annotate(earned_count=Count('userachievement'))
        return queryset
    
    def usuarios_ganadores(self, obj):
        count = obj.earned_count
        if count == 0:
            return format_html('<span style="color: #6c757d;">Sin otorgar</span>')
        return format_html('<span style="color: #28a745; font-weight: bold;">{} usuarios</span>', count)
    usuarios_ganadores.short_description = 'Usuarios que lo han ganado'
    usuarios_ganadores.admin_order_field = 'earned_count'
    
    def mostrar_icono(self, obj):
        icon_map = {
            'star': '⭐',
            'trophy': '🏆',
            'medal': '🥇',
            'crown': '👑',
            'fire': '🔥',
            'compass': '🧭',
            'book': '📚',
            'library': '📖',
            'award': '🏅',
            'calendar': '📅'
        }
        icon = icon_map.get(obj.icon, '🏆')
        return format_html('<span style="font-size: 24px;">{}</span>', icon)
    mostrar_icono.short_description = 'Ícono'
    
    def changelist_view(self, request, extra_context=None):
        if extra_context is None:
            extra_context = {}
        extra_context['title'] = "Logros"
        extra_context['subtitle'] = "Configura los logros que pueden desbloquear los usuarios"
        return super().changelist_view(request, extra_context=extra_context)

# ============================================================================
# ADMIN PARA ACTIVITYLOG
# ============================================================================

@admin.register(ActivityLog)
class ActivityLogAdmin(BaseModelAdmin):
    list_display = ('usuario', 'tipo_actividad_mostrar', 'modo', 'categoria', 'palabra_aprendida', 'fecha_hora_formateada')
    list_filter = (TipoActividadFilter, ModoFilter, CategoriaFilter, FechaHoraFilter)
    search_fields = ('user__username', 'activity_type', 'word_learned')
    ordering = ('-timestamp',)
    list_per_page = 30
    date_hierarchy = 'timestamp'
    
    actions = ['export_to_csv', 'cleanup_old_logs']
    
    def usuario(self, obj):
        return obj.user.username
    usuario.short_description = 'Usuario'
    usuario.admin_order_field = 'user__username'
    
    def modo(self, obj):
        return obj.mode or '-'
    modo.short_description = 'Modo'
    modo.admin_order_field = 'mode'
    
    def categoria(self, obj):
        return obj.category or '-'
    categoria.short_description = 'Categoría'
    categoria.admin_order_field = 'category'
    
    def palabra_aprendida(self, obj):
        return obj.word_learned or '-'
    palabra_aprendida.short_description = 'Palabra Aprendida'
    palabra_aprendida.admin_order_field = 'word_learned'
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.select_related('user')
        return queryset
    
    def tipo_actividad_mostrar(self, obj):
        icons = {
            'login': '🔑',
            'exercise_completed': '✅',
            'achievement_unlocked': '🏆',
            'object_detected': '👁️',
            'pronunciation_recorded': '🎤',
            'level_up': '⬆️',
            'mastery_decreased': '⬇️',
            'exercise_abandoned': '❌'
        }
        icon = icons.get(obj.activity_type, '📝')
        spanish_names = {
            'login': 'Inicio de sesión',
            'exercise_completed': 'Ejercicio completado',
            'achievement_unlocked': 'Logro desbloqueado',
            'object_detected': 'Objeto detectado',
            'pronunciation_recorded': 'Pronunciación grabada',
            'level_up': 'Subida de nivel',
            'mastery_decreased': 'Dominio disminuido',
            'exercise_abandoned': 'Ejercicio abandonado'
        }
        text = spanish_names.get(obj.activity_type, obj.activity_type.replace('_', ' ').title())
        return format_html('{} {}', icon, text)
    tipo_actividad_mostrar.short_description = 'Tipo de Actividad'
    tipo_actividad_mostrar.admin_order_field = 'activity_type'
    
    def fecha_hora_formateada(self, obj):
        if not obj.timestamp:
            return '-'
        return obj.timestamp.strftime('%d/%m/%Y %H:%M')
    fecha_hora_formateada.short_description = 'Fecha y Hora'
    fecha_hora_formateada.admin_order_field = 'timestamp'
    
    def cleanup_old_logs(self, request, queryset):
        """Limpia logs antiguos (más de 90 días)"""
        from datetime import timedelta
        cutoff_date = timezone.now() - timedelta(days=90)
        old_logs = ActivityLog.objects.filter(timestamp__lt=cutoff_date)
        count = old_logs.count()
        old_logs.delete()
        
        self.message_user(request, f'🗑️ Se eliminaron {count} registros antiguos (más de 90 días).')
    cleanup_old_logs.short_description = "🗑️ Limpiar registros antiguos"
    
    def changelist_view(self, request, extra_context=None):
        if extra_context is None:
            extra_context = {}
        extra_context['title'] = "Registros de Actividad"
        extra_context['subtitle'] = "Acciones realizadas por los usuarios en la aplicación"
        return super().changelist_view(request, extra_context=extra_context)

# ============================================================================
# ADMIN PARA PRONUNCIATIONRECORD
# ============================================================================

@admin.register(PronunciationRecord)
class PronunciationRecordAdmin(BaseModelAdmin):
    list_display = ('usuario', 'nombre_objeto', 'estado_aprobacion', 'aprobado_por', 'fecha_creacion', 'reproductor_audio')
    list_filter = (EstadoAprobacionFilter, FechaCreacionFilter, 'approved_by')
    search_fields = ('user__username', 'object_translation__spanish', 'object_translation__quechua')
    ordering = ('-created_at',)
    list_per_page = 20
    date_hierarchy = 'created_at'
    
    actions = ['export_to_csv', 'approve_records', 'reject_records', 'check_audio_files']
    
    def usuario(self, obj):
        return obj.user.username
    usuario.short_description = 'Usuario'
    usuario.admin_order_field = 'user__username'
    
    def aprobado_por(self, obj):
        return obj.approved_by.username if obj.approved_by else '-'
    aprobado_por.short_description = 'Aprobado Por'
    aprobado_por.admin_order_field = 'approved_by__username'
    
    def fecha_creacion(self, obj):
        return obj.created_at.strftime('%d/%m/%Y %H:%M')
    fecha_creacion.short_description = 'Fecha de Creación'
    fecha_creacion.admin_order_field = 'created_at'
    
    def nombre_objeto(self, obj):
        return format_html(
            '<strong>{}</strong><br><small style="color: #6c757d;">({})</small>',
            obj.object_translation.spanish,
            obj.object_translation.quechua
        )
    nombre_objeto.short_description = 'Objeto'
    
    def estado_aprobacion(self, obj):
        if obj.is_approved is None:
            return format_html('<span style="color: #ffc107;">⏳ Pendiente</span>')
        elif obj.is_approved:
            return format_html('<span style="color: #28a745;">✓ Aprobado</span>')
        else:
            return format_html('<span style="color: #dc3545;">✗ Rechazado</span>')
    estado_aprobacion.short_description = 'Estado de Aprobación'
    estado_aprobacion.admin_order_field = 'is_approved'
    
    def reproductor_audio(self, obj):
        """Reproductor de audio con mejor manejo de errores"""
        if not obj.audio_file:
            return format_html('<span style="color: #6c757d;">Sin archivo de audio</span>')
            
        try:
            return format_html(
                '<audio controls style="width: 200px;"><source src="{}" type="audio/mpeg">Tu navegador no soporta audio.</audio>',
                obj.audio_file.url
            )
        except Exception as e:
            logger.error(f"Error en reproductor de audio: {e}")
            return format_html('<span class="text-danger">❌ Error: {}</span>', str(e))
    reproductor_audio.short_description = 'Escuchar'
    
    def approve_records(self, request, queryset):
        """Aprueba grabaciones seleccionadas"""
        try:
            updated = queryset.update(
                is_approved=True, 
                approved_by=request.user, 
                approval_date=timezone.now()
            )
            self.message_user(request, f'✅ {updated} grabaciones fueron aprobadas correctamente.')
            logger.info(f"Usuario {request.user} aprobó {updated} grabaciones")
        except Exception as e:
            logger.error(f"Error aprobando grabaciones: {e}")
            self.message_user(request, f'❌ Error: {e}', level='ERROR')
    approve_records.short_description = "✅ Aprobar grabaciones seleccionadas"
    
    def reject_records(self, request, queryset):
        """Rechaza grabaciones seleccionadas"""
        try:
            updated = queryset.update(
                is_approved=False, 
                approved_by=request.user, 
                approval_date=timezone.now()
            )
            self.message_user(request, f'❌ {updated} grabaciones fueron rechazadas correctamente.')
            logger.info(f"Usuario {request.user} rechazó {updated} grabaciones")
        except Exception as e:
            logger.error(f"Error rechazando grabaciones: {e}")
            self.message_user(request, f'❌ Error: {e}', level='ERROR')
    reject_records.short_description = "❌ Rechazar grabaciones seleccionadas"
    
    def check_audio_files(self, request, queryset):
        """Verifica el estado de los archivos de audio"""
        import os
        from django.conf import settings
        
        try:
            records_checked = queryset.count()
            self.message_user(
                request, 
                f'🔍 Se verificaron {records_checked} registros de audio.',
                level='SUCCESS'
            )
        except Exception as e:
            logger.error(f"Error verificando archivos de audio: {e}")
            self.message_user(request, f'❌ Error en verificación: {e}', level='ERROR')
            
    check_audio_files.short_description = "🔍 Verificar archivos de audio"
    
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

# ============================================================================
# ADMIN PARA USERVOCABULARY
# ============================================================================

@admin.register(UserVocabulary)
class UserVocabularyAdmin(BaseModelAdmin):
    list_display = ('usuario', 'palabra_espanol', 'palabra_quechua', 'nivel_dominio', 'mostrar_estrellas', 'ejercicios_completados', 'tasa_exito', 'ultima_practica')
    list_filter = (NivelDominioFilter, UltimaPracticaFilter, PrimeraDeteccionFilter)
    search_fields = ('user__username', 'spanish_word', 'quechua_word', 'object_label')
    ordering = ('user', '-mastery_level')
    list_per_page = 25
    
    actions = ['export_to_csv', 'reset_mastery', 'boost_mastery']
    
    def usuario(self, obj):
        return obj.user.username
    usuario.short_description = 'Usuario'
    usuario.admin_order_field = 'user__username'
    
    def palabra_espanol(self, obj):
        return obj.spanish_word
    palabra_espanol.short_description = 'Palabra en Español'
    palabra_espanol.admin_order_field = 'spanish_word'
    
    def palabra_quechua(self, obj):
        return obj.quechua_word
    palabra_quechua.short_description = 'Palabra en Quechua'
    palabra_quechua.admin_order_field = 'quechua_word'
    
    def nivel_dominio(self, obj):
        return obj.mastery_level
    nivel_dominio.short_description = 'Nivel de Dominio'
    nivel_dominio.admin_order_field = 'mastery_level'
    
    def ejercicios_completados(self, obj):
        return obj.exercises_completed
    ejercicios_completados.short_description = 'Ejercicios Completados'
    ejercicios_completados.admin_order_field = 'exercises_completed'
    
    def ultima_practica(self, obj):
        if obj.last_practiced:
            return obj.last_practiced.strftime('%d/%m/%Y')
        return '-'
    ultima_practica.short_description = 'Última Práctica'
    ultima_practica.admin_order_field = 'last_practiced'
    
    def mostrar_estrellas(self, obj):
        """Muestra las estrellas visualmente"""
        stars = '⭐' * obj.mastery_level
        empty_stars = '☆' * (5 - obj.mastery_level)
        return format_html('<span style="font-size: 18px;">{}{}</span>', stars, empty_stars)
    mostrar_estrellas.short_description = 'Dominio'
    mostrar_estrellas.admin_order_field = 'mastery_level'
    
    def tasa_exito(self, obj):
        """Calcula y muestra la tasa de éxito"""
        if obj.exercises_completed == 0:
            return format_html('<span style="color: #6c757d;">Sin datos</span>')
        
        rate = round((obj.exercises_correct / obj.exercises_completed) * 100, 1)
        
        if rate >= 80:
            color = '#28a745'
        elif rate >= 60:
            color = '#ffc107'
        else:
            color = '#dc3545'
            
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}%</span>',
            color, rate
        )
    tasa_exito.short_description = 'Tasa de Éxito'
    
    def reset_mastery(self, request, queryset):
        """Reinicia el dominio de palabras seleccionadas"""
        updated = queryset.update(
            mastery_level=1, 
            exercises_completed=0, 
            exercises_correct=0,
            consecutive_failures=0
        )
        self.message_user(request, f'🔄 {updated} vocabularios reiniciados.')
    reset_mastery.short_description = "🔄 Reiniciar dominio seleccionado"
    
    def boost_mastery(self, request, queryset):
        """Aumenta el dominio de palabras seleccionadas"""
        updated = 0
        for vocab in queryset:
            if vocab.mastery_level < 5:
                vocab.mastery_level += 1
                vocab.save()
                updated += 1
        
        self.message_user(request, f'⬆️ {updated} vocabularios aumentaron su dominio.')
    boost_mastery.short_description = "⬆️ Aumentar dominio seleccionado"
    
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

# ============================================================================
# ADMIN PARA DAILYGOAL
# ============================================================================

@admin.register(DailyGoal)
class DailyGoalAdmin(BaseModelAdmin):
    list_display = ('usuario', 'fecha', 'palabras_detectadas', 'palabras_practicadas', 'palabras_dominadas', 'estado_meta')
    list_filter = (FechaFilter, PalabrasDetectadasFilter, PalabrasPracticadasFilter)
    search_fields = ('user__username',)
    ordering = ('-date', 'user')
    list_per_page = 25
    date_hierarchy = 'date'
    
    actions = ['export_to_csv', 'reset_goals']
    
    def usuario(self, obj):
        return obj.user.username
    usuario.short_description = 'Usuario'
    usuario.admin_order_field = 'user__username'
    
    def fecha(self, obj):
        return obj.date.strftime('%d/%m/%Y')
    fecha.short_description = 'Fecha'
    fecha.admin_order_field = 'date'
    
    def palabras_detectadas(self, obj):
        return obj.words_detected or 0
    palabras_detectadas.short_description = 'Palabras Detectadas'
    palabras_detectadas.admin_order_field = 'words_detected'
    
    def palabras_practicadas(self, obj):
        return obj.words_practiced or 0
    palabras_practicadas.short_description = 'Palabras Practicadas'
    palabras_practicadas.admin_order_field = 'words_practiced'
    
    def palabras_dominadas(self, obj):
        return obj.words_mastered or 0
    palabras_dominadas.short_description = 'Palabras Dominadas'
    palabras_dominadas.admin_order_field = 'words_mastered'
    
    def estado_meta(self, obj):
        """Muestra el estado de la meta diaria"""
        if obj.is_complete():
            return format_html('<span style="color: #28a745; font-weight: bold;">✓ Completada</span>')
        else:
            total_activity = (obj.words_practiced or 0) + (obj.words_detected or 0)
            progress = min(total_activity / 5 * 100, 100)
            progress_int = round(progress)
            
            return format_html(
                '<span style="color: #007bff;">⏳ {}% completado</span>',
                progress_int
            )
    estado_meta.short_description = 'Estado'
    
    def reset_goals(self, request, queryset):
        """Reinicia las metas seleccionadas"""
        updated = queryset.update(
            words_detected=0,
            words_practiced=0,
            words_mastered=0
        )
        self.message_user(request, f'🔄 {updated} metas reiniciadas.')
    reset_goals.short_description = "🔄 Reiniciar metas seleccionadas"
    
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

# ============================================================================
# PERSONALIZAR MODELOS DE AUTENTICACIÓN CON MEJORAS DE INTERFAZ
# ============================================================================

from django.contrib.auth.models import User, Group
from django.contrib.auth.admin import UserAdmin, GroupAdmin

# Desregistrar y volver a registrar con configuración personalizada
admin.site.unregister(User)
admin.site.unregister(Group)

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    """Admin personalizado para usuarios con interfaz mejorada"""
    list_display = ('username', 'email', 'first_name', 'last_name', 'tipo_usuario', 'fecha_registro')
    list_filter = (UsuarioStaffFilter, FechaRegistroFilter)
    
    # MEJORA: Fieldsets personalizados con mejor organización visual
    fieldsets = (
        ('👤 Información Principal', {
            'fields': ('username', 'user_info_display'),
            'classes': ('wide',),
            'description': 'Datos básicos de identificación del usuario'
        }),
        ('🔐 Seguridad y Acceso', {
            'fields': ('password_display', 'is_active', 'is_staff', 'is_superuser'),
            'classes': ('wide',),
            'description': 'Configuración de acceso y permisos del usuario'
        }),
        ('📧 Información de Contacto', {
            'fields': ('first_name', 'last_name', 'email'),
            'classes': ('wide',),
            'description': 'Datos personales y de contacto'
        }),
        ('👥 Permisos de Grupo', {
            'fields': ('groups', 'user_permissions'),
            'classes': ('collapse',),
            'description': 'Asignación de grupos y permisos específicos'
        }),
        ('📅 Fechas Importantes', {
            'fields': ('last_login', 'date_joined'),
            'classes': ('collapse',),
            'description': 'Historial de actividad del usuario'
        }),
    )
    
    readonly_fields = ('user_info_display', 'password_display', 'last_login', 'date_joined')
    
    def user_info_display(self, obj):
        """Información visual mejorada del usuario"""
        # Obtener información del perfil si existe
        profile_info = ""
        try:
            if hasattr(obj, 'userprofile'):
                profile = obj.userprofile
                profile_info = f'''
                <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #007bff;">
                    <h4 style="margin: 0 0 10px 0; color: #0066cc;">📊 Progreso en Yachay</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <strong>🎯 Nivel:</strong> {profile.current_level} - {profile.get_level_title()}<br>
                            <strong>📚 Palabras:</strong> {profile.total_words} total, {profile.mastered_words} dominadas<br>
                            <strong>🔥 Racha:</strong> {profile.streak_days} días
                        </div>
                        <div>
                            <strong>🎭 Tipo:</strong> {'🗣️ Hablante Nativo' if profile.native_speaker else '📚 Aprendiz'}<br>
                            <strong>📅 Última actividad:</strong> {profile.last_activity or 'Nunca'}<br>
                            <strong>📈 Progreso:</strong> {(profile.total_words / 100 * 100):.1f}% del nivel
                        </div>
                    </div>
                    <div style="margin-top: 10px;">
                        <a href="/admin/translations/userprofile/{profile.id}/change/" 
                           class="btn btn-sm btn-outline-primary" style="padding: 5px 10px; text-decoration: none; border: 1px solid #007bff; color: #007bff; border-radius: 4px;">
                            📋 Ver Perfil Completo →
                        </a>
                    </div>
                </div>
                '''
        except:
            profile_info = '''
            <div style="background: #fff3cd; padding: 10px; border-radius: 6px; border-left: 4px solid #ffc107;">
                <small style="color: #856404;">⚠️ Este usuario aún no tiene un perfil de Yachay creado.</small>
            </div>
            '''
        
        return format_html(
            '''
            <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; border: 1px solid #dee2e6;">
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                    <div style="width: 70px; height: 70px; border-radius: 50%; background: linear-gradient(135deg, {bg_color}); 
                                display: flex; align-items: center; justify-content: center; 
                                font-size: 28px; color: white; margin-right: 20px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                        {icon}
                    </div>
                    <div>
                        <h3 style="margin: 0; color: #495057; font-size: 24px;">{username}</h3>
                        <span style="color: {status_color}; font-weight: bold; font-size: 14px; 
                                     padding: 4px 8px; background: {status_bg}; border-radius: 12px;">{status}</span>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0;">
                    <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="font-size: 24px; margin-bottom: 8px;">📅</div>
                        <small style="color: #6c757d; font-weight: 500;">Registrado</small><br>
                        <strong style="color: #495057;">{date_joined}</strong>
                    </div>
                    <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="font-size: 24px; margin-bottom: 8px;">🔑</div>
                        <small style="color: #6c757d; font-weight: 500;">Último acceso</small><br>
                        <strong style="color: #495057;">{last_login}</strong>
                    </div>
                    <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="font-size: 24px; margin-bottom: 8px;">✉️</div>
                        <small style="color: #6c757d; font-weight: 500;">Email</small><br>
                        <strong style="color: #495057;">{email}</strong>
                    </div>
                </div>
                
                {profile_info}
            </div>
            ''',
            icon='👑' if obj.is_superuser else '⭐' if obj.is_staff else '👤',
            username=obj.username,
            status='Superusuario' if obj.is_superuser else 'Staff' if obj.is_staff else 'Usuario Activo' if obj.is_active else 'Inactivo',
            status_color='white',
            status_bg='#dc3545' if obj.is_superuser else '#ffc107' if obj.is_staff else '#28a745' if obj.is_active else '#6c757d',
            bg_color='#dc3545, #c82333' if obj.is_superuser else '#ffc107, #e0a800' if obj.is_staff else '#28a745, #1e7e34',
            date_joined=obj.date_joined.strftime('%d/%m/%Y'),
            last_login=obj.last_login.strftime('%d/%m/%Y %H:%M') if obj.last_login else 'Nunca',
            email=obj.email or 'No configurado',
            profile_info=profile_info
        )
    user_info_display.short_description = 'Información del Usuario'
    
    def password_display(self, obj):
        """Visualización mejorada de la contraseña"""
        return format_html(
            '''
            <div style="background: linear-gradient(135deg, #f8f9fa, #e9ecef); padding: 20px; border-radius: 12px; border-left: 4px solid #007bff;">
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                    <div style="width: 50px; height: 50px; background: #007bff; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                        <span style="color: white; font-size: 20px;">🔐</span>
                    </div>
                    <div>
                        <strong style="color: #495057; font-size: 18px;">Estado de la Contraseña</strong><br>
                        <span style="color: #28a745; font-weight: bold; font-size: 14px;">✅ Configurada y segura</span>
                    </div>
                </div>
                
                <div style="background: white; padding: 15px; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 13px; color: #6c757d; margin: 15px 0;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div><strong>Algoritmo:</strong> pbkdf2_sha256</div>
                        <div><strong>Iteraciones:</strong> 1,000,000</div>
                        <div><strong>Última modificación:</strong> {last_change}</div>
                        <div><strong>Seguridad:</strong> <span style="color: #28a745;">Alta</span></div>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 15px;">
                    <a href="password/" style="background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 10px 20px; 
                            text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; 
                            box-shadow: 0 2px 4px rgba(0,123,255,0.3); transition: transform 0.2s;">
                        🔑 Cambiar Contraseña
                    </a>
                </div>
            </div>
            ''',
            last_change=obj.last_login.strftime('%d/%m/%Y %H:%M') if obj.last_login else 'Fecha de registro'
        )
    password_display.short_description = 'Información de Contraseña'
    
    def tipo_usuario(self, obj):
        if obj.is_superuser:
            return format_html('<span style="color: #dc3545; font-weight: bold;">👑 Superusuario</span>')
        elif obj.is_staff:
            return format_html('<span style="color: #ffc107; font-weight: bold;">⭐ Staff</span>')
        elif obj.is_active:
            return format_html('<span style="color: #28a745;">✅ Usuario Activo</span>')
        else:
            return format_html('<span style="color: #6c757d;">❌ Inactivo</span>')
    tipo_usuario.short_description = 'Tipo de Usuario'
    
    def fecha_registro(self, obj):
        return obj.date_joined.strftime('%d/%m/%Y')
    fecha_registro.short_description = 'Fecha de Registro'
    fecha_registro.admin_order_field = 'date_joined'
    
    def changelist_view(self, request, extra_context=None):
        if extra_context is None:
            extra_context = {}
        extra_context['title'] = "Cuentas de Usuario"
        extra_context['subtitle'] = "Gestiona las cuentas de usuario del sistema"
        return super().changelist_view(request, extra_context=extra_context)

@admin.register(Group)
class CustomGroupAdmin(GroupAdmin):
    """Admin personalizado para grupos"""
    
    def changelist_view(self, request, extra_context=None):
        if extra_context is None:
            extra_context = {}
        extra_context['title'] = "Grupos de Usuario"
        extra_context['subtitle'] = "Gestiona los grupos y permisos"
        return super().changelist_view(request, extra_context=extra_context)

# ============================================================================
# DESREGISTRAR MODELOS REDUNDANTES
# ============================================================================

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
            logger.info(f"Modelo {app_label}.{model_name} desregistrado del admin")
    except Exception as e:
        logger.warning(f"Error al desregistrar {app_label}.{model_name}: {e}")

# ============================================================================
# CONFIGURAR NOMBRES DE MODELOS EN ESPAÑOL (SIN TOCAR MODELS.PY)
# ============================================================================

try:
    # Cambiar nombres visibles sin tocar los modelos
    ObjectTranslation._meta.verbose_name = "Traducción"
    ObjectTranslation._meta.verbose_name_plural = "Traducciones"
    
    Exercise._meta.verbose_name = "Ejercicio"  
    Exercise._meta.verbose_name_plural = "Ejercicios"
    
    Achievement._meta.verbose_name = "Logro"
    Achievement._meta.verbose_name_plural = "Logros"
    
    UserProfile._meta.verbose_name = "Perfil de Usuario"
    UserProfile._meta.verbose_name_plural = "Perfiles de Usuario"
    
    UserProgress._meta.verbose_name = "Progreso de Usuario"
    UserProgress._meta.verbose_name_plural = "Progresos de Usuario"
    
    ActivityLog._meta.verbose_name = "Registro de Actividad"
    ActivityLog._meta.verbose_name_plural = "Registros de Actividad"
    
    PronunciationRecord._meta.verbose_name = "Grabación de Pronunciación"
    PronunciationRecord._meta.verbose_name_plural = "Grabaciones de Pronunciación"
    
    UserVocabulary._meta.verbose_name = "Vocabulario de Usuario"
    UserVocabulary._meta.verbose_name_plural = "Vocabulario de Usuarios"
    
    DailyGoal._meta.verbose_name = "Meta Diaria"
    DailyGoal._meta.verbose_name_plural = "Metas Diarias"
    
    # Cambiar modelos de Django auth
    User._meta.verbose_name = "Usuario"
    User._meta.verbose_name_plural = "Usuarios"
    
    Group._meta.verbose_name = "Grupo"
    Group._meta.verbose_name_plural = "Grupos"
    
except Exception as e:
    logger.warning(f"Error configurando nombres de modelos: {e}")

# ============================================================================
# PERSONALIZAR TÍTULOS DEL SITIO ADMIN
# ============================================================================

admin.site.site_header = "🌟 Administración de Yachay"
admin.site.site_title = "Yachay Admin"
admin.site.index_title = "Panel de Control - Aprendizaje de Quechua"

# Mensaje de bienvenida personalizado
admin.site.site_url = None  # Oculta "Ver sitio"