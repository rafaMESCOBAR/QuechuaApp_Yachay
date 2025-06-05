# translations/management/commands/init_data.py
from django.core.management.base import BaseCommand
from translations.initial_data import load_initial_data
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
        
        self.stdout.write(self.style.SUCCESS('¡Inicialización de datos completada!'))
    
    def _load_achievements(self):
        """Carga logros iniciales basados en el nuevo sistema"""
        achievements = [
            # Logros por vocabulario
            {
                'name': 'Primer Paso',
                'description': 'Descubre tu primera palabra en quechua',
                'type': 'vocabulary',
                'requirement_value': 1,
                'icon': 'star'
            },
            {
                'name': 'Explorador',
                'description': 'Aprende 10 palabras diferentes',
                'type': 'vocabulary',
                'requirement_value': 10,
                'icon': 'compass'
            },
            {
                'name': 'Coleccionista de Palabras',
                'description': 'Alcanza 50 palabras en tu vocabulario',
                'type': 'vocabulary',
                'requirement_value': 50,
                'icon': 'book'
            },
            {
                'name': 'Diccionario Viviente',
                'description': 'Domina 100 palabras en quechua',
                'type': 'vocabulary',
                'requirement_value': 100,
                'icon': 'library'
            },
            
            # Logros por dominio
            {
                'name': 'Primera Estrella',
                'description': 'Domina tu primera palabra (5 estrellas)',
                'type': 'mastery',
                'requirement_value': 1,
                'icon': 'star'
            },
            {
                'name': 'Maestro Principiante',
                'description': 'Domina 5 palabras completamente',
                'type': 'mastery',
                'requirement_value': 5,
                'icon': 'award'
            },
            {
                'name': 'Sabio del Quechua',
                'description': 'Domina 25 palabras a la perfección',
                'type': 'mastery',
                'requirement_value': 25,
                'icon': 'crown'
            },
            
            # Logros por racha
            {
                'name': 'Inicio Constante',
                'description': 'Mantén una racha de 3 días',
                'type': 'streak',
                'requirement_value': 3,
                'icon': 'fire'
            },
            {
                'name': 'Semana Perfecta',
                'description': 'Estudia 7 días seguidos',
                'type': 'streak',
                'requirement_value': 7,
                'icon': 'calendar'
            },
            {
                'name': 'Mes Dedicado',
                'description': 'Increíble racha de 30 días',
                'type': 'streak',
                'requirement_value': 30,
                'icon': 'trophy'
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