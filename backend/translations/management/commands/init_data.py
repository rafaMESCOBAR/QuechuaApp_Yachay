# translations/management/commands/init_data.py
from django.core.management.base import BaseCommand
from translations.initial_data import load_initial_data
from translations.sample_data import generate_sample_data
from translations.models import Achievement

class Command(BaseCommand):
    help = 'Inicializa datos para la aplicación Yachay'

    def handle(self, *args, **kwargs):
        # Cargar traducciones iniciales
        self.stdout.write(self.style.NOTICE('Cargando traducciones iniciales...'))
        load_initial_data()
        self.stdout.write(self.style.SUCCESS('Traducciones iniciales cargadas correctamente.'))
        
        # Cargar logros predefinidos
        self.stdout.write(self.style.NOTICE('Cargando logros predefinidos...'))
        self._load_achievements()
        self.stdout.write(self.style.SUCCESS('Logros predefinidos cargados correctamente.'))
        
        # Generar datos de muestra
        self.stdout.write(self.style.NOTICE('Generando datos de muestra...'))
        generate_sample_data()
        self.stdout.write(self.style.SUCCESS('Datos de muestra generados correctamente.'))
        
        self.stdout.write(self.style.SUCCESS('¡Inicialización de datos completada!'))
    
    def _load_achievements(self):
        achievements = [
            {
                'name': 'Principiante',
                'description': 'Completar 10 ejercicios',
                'icon': 'star',
                'required_value': 10,
                'achievement_type': 'exercises_completed'
            },
            {
                'name': 'Estudiante Aplicado',
                'description': 'Completar 50 ejercicios',
                'icon': 'school',
                'required_value': 50,
                'achievement_type': 'exercises_completed'
            },
            {
                'name': 'Maestro del Quechua',
                'description': 'Completar 100 ejercicios',
                'icon': 'trophy',
                'required_value': 100,
                'achievement_type': 'exercises_completed'
            },
            {
                'name': 'Racha Corta',
                'description': 'Mantener una racha de 3 días',
                'icon': 'flame',
                'required_value': 3,
                'achievement_type': 'streak_days'
            },
            {
                'name': 'Racha Constante',
                'description': 'Mantener una racha de 7 días',
                'icon': 'flame',
                'required_value': 7,
                'achievement_type': 'streak_days'
            },
            {
                'name': 'Racha Dedicada',
                'description': 'Mantener una racha de 30 días',
                'icon': 'flame',
                'required_value': 30,
                'achievement_type': 'streak_days'
            },
            {
                'name': 'Vocabulario Básico',
                'description': 'Aprender 20 palabras diferentes',
                'icon': 'book',
                'required_value': 20,
                'achievement_type': 'words_learned'
            },
            {
                'name': 'Vocabulario Intermedio',
                'description': 'Aprender 50 palabras diferentes',
                'icon': 'book',
                'required_value': 50,
                'achievement_type': 'words_learned'
            },
            {
                'name': 'Pronunciación Clara',
                'description': 'Completar 10 ejercicios de pronunciación',
                'icon': 'mic',
                'required_value': 10,
                'achievement_type': 'pronunciation_exercises'
            }
        ]
        
        created_count = 0
        updated_count = 0
        
        for achievement_data in achievements:
            achievement, created = Achievement.objects.update_or_create(
                name=achievement_data['name'],
                defaults=achievement_data
            )
            
            if created:
                created_count += 1
            else:
                updated_count += 1
        
        self.stdout.write(f"Logros creados: {created_count}")
        self.stdout.write(f"Logros actualizados: {updated_count}")