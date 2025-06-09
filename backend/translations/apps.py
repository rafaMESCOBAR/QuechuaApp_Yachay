# translations/apps.py
from django.apps import AppConfig

class TranslationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'translations'
    verbose_name = "Yachay"
    
    def ready(self):
        # Remover esta línea: from . import signals
        
        # Personalizar nombres de modelos para el admin
        from django.db.models.signals import class_prepared
        
        def customize_model_names(sender, **kwargs):
            # En apps.py, agrega estos modelos que faltan:
            model_translations = {
                'ObjectTranslation': ('Traducción', 'Traducciones'),
                'Exercise': ('Ejercicio', 'Ejercicios'),
                'UserProfile': ('Perfil de Usuario', 'Perfiles de Usuario'),
                'UserProgress': ('Progreso de Usuario', 'Progresos de Usuario'),
                'Achievement': ('Logro', 'Logros'),
                'ActivityLog': ('Registro de Actividad', 'Registros de Actividad'),
                'PronunciationRecord': ('Grabación', 'Grabaciones de Pronunciación'),
                'UserVocabulary': ('Vocabulario', 'Vocabulario de Usuarios'),
                'DailyGoal': ('Meta Diaria', 'Metas Diarias'),
                
                # Para modelos de Django:
                'User': ('Usuario', 'Usuarios'),
                'Group': ('Grupo', 'Grupos'),
            }
            
            model_name = sender.__name__
            if model_name in model_translations and sender._meta.app_label == 'translations':
                singular, plural = model_translations[model_name]
                sender._meta.verbose_name = singular
                sender._meta.verbose_name_plural = plural
        
        class_prepared.connect(customize_model_names)